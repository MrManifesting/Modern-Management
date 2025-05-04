import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiRequestSimple } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  ShoppingBag,
  ShoppingCart,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { SiShopify, SiEtsy, SiWoocommerce, SiAmazon, SiEbay } from "react-icons/si";

// Marketplace types with their icons and fields
const MARKETPLACE_TYPES = [
  {
    id: 'shopify',
    name: 'Shopify',
    icon: SiShopify,
    color: '#96bf48',
    fields: ['storeUrl', 'apiKey', 'apiSecret'],
    helpText: 'Connect your Shopify store to synchronize products, inventory, and orders.'
  },
  {
    id: 'etsy',
    name: 'Etsy',
    icon: SiEtsy,
    color: '#f45800',
    fields: ['apiKey', 'apiSecret'],
    helpText: 'Connect your Etsy shop to manage listings and process orders.'
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    icon: SiWoocommerce,
    color: '#7f54b3',
    fields: ['storeUrl', 'apiKey', 'apiSecret'],
    helpText: 'Connect your WooCommerce store to synchronize with your WordPress site.'
  },
  {
    id: 'amazon',
    name: 'Amazon',
    icon: SiAmazon,
    color: '#ff9900',
    fields: ['apiKey', 'apiSecret'],
    helpText: 'Connect your Amazon seller account to manage inventory and fulfill orders.'
  },
  {
    id: 'ebay',
    name: 'eBay',
    icon: SiEbay,
    color: '#e53238',
    fields: ['apiKey', 'apiSecret', 'apiEndpoint'],
    helpText: 'Connect your eBay seller account to list products and track sales.'
  }
];

// Interface for the form data
interface MarketplaceFormData {
  name: string;
  type: string;
  credentials: {
    storeUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    apiEndpoint?: string;
  };
}

interface MarketplaceCredentialsFormProps {
  marketplaceId?: number;
  onSaved: (id: number) => void;
}

export default function MarketplaceCredentialsForm({ marketplaceId, onSaved }: MarketplaceCredentialsFormProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(MARKETPLACE_TYPES[0].id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Define the form
  const form = useForm<MarketplaceFormData>({
    defaultValues: {
      name: '',
      type: MARKETPLACE_TYPES[0].id,
      credentials: {
        storeUrl: '',
        apiKey: '',
        apiSecret: '',
        apiEndpoint: '',
      }
    }
  });

  // Fetch marketplace details if editing
  const { data: marketplaceData, isLoading: isLoadingMarketplace } = useQuery({
    queryKey: ['/api/marketplaces', marketplaceId],
    queryFn: () => apiRequest<any>(`/api/marketplaces/${marketplaceId}`),
    enabled: !!marketplaceId,
  });

  // Update form values when marketplace data loads
  useEffect(() => {
    if (marketplaceData) {
      form.reset({
        name: marketplaceData.name,
        type: marketplaceData.type,
        credentials: marketplaceData.credentials || {},
      });
      
      setSelectedType(marketplaceData.type);
    }
  }, [marketplaceData, form]);

  // Create new marketplace
  const createMarketplaceMutation = useMutation({
    mutationFn: (data: MarketplaceFormData) => 
      apiRequest<{id: number}>('/api/marketplaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (response) => {
      toast({
        title: "Marketplace Added",
        description: "Your marketplace has been added successfully.",
      });
      onSaved(response.id);
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Marketplace",
        description: "An error occurred while adding the marketplace.",
        variant: "destructive",
      });
      console.error("Error adding marketplace:", error);
    }
  });

  // Update existing marketplace
  const updateMarketplaceMutation = useMutation({
    mutationFn: (data: MarketplaceFormData) => 
      apiRequest<{id: number}>(`/api/marketplaces/${marketplaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (response) => {
      toast({
        title: "Marketplace Updated",
        description: "Your marketplace settings have been updated successfully.",
      });
      onSaved(response.id);
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Marketplace",
        description: "An error occurred while updating the marketplace.",
        variant: "destructive",
      });
      console.error("Error updating marketplace:", error);
    }
  });

  // Test connection
  const testConnection = async (formData: MarketplaceFormData) => {
    setIsTestingConnection(true);
    try {
      let result;
      
      if (marketplaceId) {
        // Test existing marketplace connection
        result = await apiRequestSimple(`/api/marketplaces/${marketplaceId}/test`, {
          method: 'POST'
        });
      } else {
        // Test connection with form data
        result = await apiRequestSimple('/api/marketplaces/test', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      if (result.connected) {
        toast({
          title: "Connection Successful",
          description: result.message || "Successfully connected to marketplace",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message || "Failed to connect to marketplace",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "An error occurred while testing the connection",
        variant: "destructive",
      });
      console.error("Error testing connection:", error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Submit form handler
  const onSubmit = (data: MarketplaceFormData) => {
    if (marketplaceId) {
      updateMarketplaceMutation.mutate(data);
    } else {
      createMarketplaceMutation.mutate(data);
    }
  };

  // Get current marketplace type information
  const getCurrentTypeInfo = () => {
    return MARKETPLACE_TYPES.find(type => type.id === selectedType) || MARKETPLACE_TYPES[0];
  };

  // Handle marketplace type change
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    form.setValue('type', value);
  };

  // Loading state
  if (marketplaceId && isLoadingMarketplace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Loading Marketplace...
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10">
          <div className="flex justify-center">
            <CircularProgress size={40} className="text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentType = getCurrentTypeInfo();
  const IconComponent = currentType.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-blue-600" />
          {marketplaceId ? 'Edit Marketplace' : 'Add New Marketplace'}
        </CardTitle>
        <CardDescription>
          Connect your online store to synchronize inventory, orders, and products
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marketplace Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Store" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this marketplace
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marketplace Type</FormLabel>
                  <Select
                    onValueChange={handleTypeChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select marketplace type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MARKETPLACE_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="flex items-center">
                          <div className="flex items-center">
                            <type.icon className="mr-2 h-4 w-4" style={{ color: type.color }} />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="flex items-center mt-2">
                    <IconComponent className="mr-2 h-5 w-5" style={{ color: currentType.color }} />
                    {currentType.helpText}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <h3 className="text-lg font-medium flex items-center mb-2">
                <IconComponent className="mr-2 h-5 w-5" style={{ color: currentType.color }} />
                {currentType.name} Connection Details
              </h3>
              <Separator className="mb-4" />
              
              {currentType.fields.includes('storeUrl') && (
                <FormField
                  control={form.control}
                  name="credentials.storeUrl"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Store URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your-store.myshopify.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL of your {currentType.name} store
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {currentType.fields.includes('apiKey') && (
                <FormField
                  control={form.control}
                  name="credentials.apiKey"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Your API Key" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        The API key for your {currentType.name} account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {currentType.fields.includes('apiSecret') && (
                <FormField
                  control={form.control}
                  name="credentials.apiSecret"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>API Secret</FormLabel>
                      <FormControl>
                        <Input placeholder="Your API Secret" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        The API secret for your {currentType.name} account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {currentType.fields.includes('apiEndpoint') && (
                <FormField
                  control={form.control}
                  name="credentials.apiEndpoint"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>API Endpoint</FormLabel>
                      <FormControl>
                        <Input placeholder="API Endpoint URL" {...field} />
                      </FormControl>
                      <FormDescription>
                        The API endpoint for {currentType.name} integration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex items-center space-x-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => testConnection(form.getValues())}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <>
                      <CircularProgress size={16} className="mr-2" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                
                <a 
                  href={`https://${currentType.id}.com/admin/apps`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Get API credentials
                </a>
              </div>
            </div>

            <CardFooter className="px-0 pb-0 pt-6">
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMarketplaceMutation.isPending || updateMarketplaceMutation.isPending}
              >
                {(createMarketplaceMutation.isPending || updateMarketplaceMutation.isPending) ? (
                  <>
                    <CircularProgress size={16} className="mr-2" />
                    {marketplaceId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{marketplaceId ? 'Update Marketplace' : 'Add Marketplace'}</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}