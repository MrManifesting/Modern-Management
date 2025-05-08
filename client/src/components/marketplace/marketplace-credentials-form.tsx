import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CircularProgress } from '../ui/circular-progress';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SiShopify, SiEtsy, SiWoocommerce, SiAmazon, SiEbay } from 'react-icons/si';

// Marketplace configuration info
const MARKETPLACE_CONFIG = {
  shopify: {
    icon: SiShopify,
    color: '#96bf48',
    name: 'Shopify',
    fields: [
      { name: 'storeUrl', label: 'Shop URL', placeholder: 'your-store.myshopify.com', required: true },
      { name: 'apiKey', label: 'API Key', placeholder: 'Your Shopify API Key', required: true },
      { name: 'apiSecret', label: 'API Secret', placeholder: 'Your Shopify API Secret', required: true }
    ]
  },
  etsy: {
    icon: SiEtsy,
    color: '#f45800',
    name: 'Etsy',
    fields: [
      { name: 'apiKey', label: 'API Key', placeholder: 'Your Etsy API Key', required: true },
      { name: 'apiSecret', label: 'API Secret', placeholder: 'Your Etsy API Secret', required: true }
    ]
  },
  woocommerce: {
    icon: SiWoocommerce,
    color: '#7f54b3',
    name: 'WooCommerce',
    fields: [
      { name: 'storeUrl', label: 'Store URL', placeholder: 'https://your-store.com', required: true },
      { name: 'apiKey', label: 'Consumer Key', placeholder: 'Your WooCommerce Consumer Key', required: true },
      { name: 'apiSecret', label: 'Consumer Secret', placeholder: 'Your WooCommerce Consumer Secret', required: true }
    ]
  },
  amazon: {
    icon: SiAmazon,
    color: '#ff9900',
    name: 'Amazon',
    fields: [
      { name: 'apiKey', label: 'Access Key', placeholder: 'Your Amazon MWS Access Key', required: true },
      { name: 'apiSecret', label: 'Secret Key', placeholder: 'Your Amazon MWS Secret Key', required: true },
      { name: 'sellerId', label: 'Seller ID', placeholder: 'Your Amazon Seller ID', required: true },
      { name: 'marketplaceId', label: 'Marketplace ID', placeholder: 'Your Amazon Marketplace ID', required: true }
    ]
  },
  ebay: {
    icon: SiEbay,
    color: '#e53238',
    name: 'eBay',
    fields: [
      { name: 'apiKey', label: 'App ID', placeholder: 'Your eBay App ID', required: true },
      { name: 'apiSecret', label: 'Cert ID', placeholder: 'Your eBay Cert ID', required: true },
      { name: 'devId', label: 'Dev ID', placeholder: 'Your eBay Dev ID', required: true },
    ]
  }
};

// Generic form field type
type FormField = {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
};

interface MarketplaceCredentialsFormProps {
  marketplace?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MarketplaceCredentialsForm({
  marketplace,
  onSuccess,
  onCancel
}: MarketplaceCredentialsFormProps) {
  const isEditing = !!marketplace?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create a dynamic schema based on the selected marketplace type
  const createFormSchema = (type: string | null) => {
    if (!type) {
      return z.object({
        name: z.string().min(1, "Name is required"),
        type: z.string().min(1, "Type is required")
      });
    }

    const selectedType = type as keyof typeof MARKETPLACE_CONFIG;
    const fields = MARKETPLACE_CONFIG[selectedType]?.fields || [];
    
    // Base schema with required fields
    const schemaObject: Record<string, any> = {
      name: z.string().min(1, "Name is required"),
      type: z.string().min(1, "Type is required")
    };
    
    // Add fields based on the selected type
    fields.forEach((field: FormField) => {
      schemaObject[field.name] = field.required 
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional();
    });
    
    return z.object(schemaObject);
  };
  
  // Initialize form with marketplace data or default values
  const form = useForm({
    resolver: zodResolver(createFormSchema(marketplace?.type || null)),
    defaultValues: {
      name: marketplace?.name || '',
      type: marketplace?.type || '',
      storeUrl: marketplace?.credentials?.storeUrl || '',
      apiKey: marketplace?.credentials?.apiKey || '',
      apiSecret: marketplace?.credentials?.apiSecret || '',
      sellerId: marketplace?.credentials?.sellerId || '',
      marketplaceId: marketplace?.credentials?.marketplaceId || '',
      devId: marketplace?.credentials?.devId || '',
    }
  });

  const { watch, setValue } = form;
  const selectedType = watch('type');
  
  // Handle marketplace type change
  React.useEffect(() => {
    form.clearErrors();
    form.reset({
      ...form.getValues(),
      type: selectedType
    });
  }, [selectedType, form]);

  // Create or update marketplace mutation
  const mutation = useMutation({
    mutationFn: (data: any) => {
      const credentials: Record<string, string> = {};
      
      // Only include relevant fields for the selected marketplace type
      const relevantFields = MARKETPLACE_CONFIG[data.type as keyof typeof MARKETPLACE_CONFIG]?.fields || [];
      relevantFields.forEach((field: FormField) => {
        if (data[field.name]) {
          credentials[field.name] = data[field.name];
        }
      });
      
      const payload = {
        name: data.name,
        type: data.type,
        credentials
      };
      
      if (isEditing) {
        return apiRequest('PATCH', `/api/marketplaces/${marketplace.id}`, payload);
      } else {
        return apiRequest('POST', '/api/marketplaces', payload);
      }
    },
    onSuccess: (data) => {
      toast({
        title: isEditing ? "Marketplace updated" : "Marketplace added",
        description: `${form.getValues().name} has been ${isEditing ? 'updated' : 'added'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'add'} marketplace. Please try again.`,
        variant: "destructive",
      });
    }
  });

  // Function to handle form submission
  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marketplace Type</FormLabel>
              <Select
                disabled={isEditing}
                onValueChange={(value) => {
                  field.onChange(value);
                  // Reset the form with new schema when type changes
                  form.reset({
                    ...form.getValues(),
                    type: value,
                    name: isEditing ? form.getValues().name : value.charAt(0).toUpperCase() + value.slice(1)
                  });
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a marketplace" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(MARKETPLACE_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type} className="flex items-center">
                      <div className="flex items-center">
                        <config.icon className="h-4 w-4 mr-2" style={{ color: config.color }} />
                        <span>{config.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the marketplace platform you want to connect
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedType && (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a name for this connection" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this marketplace connection
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Render fields based on the selected marketplace type */}
            {MARKETPLACE_CONFIG[selectedType as keyof typeof MARKETPLACE_CONFIG]?.fields.map((fieldConfig: FormField) => (
              <FormField
                key={fieldConfig.name}
                control={form.control}
                name={fieldConfig.name as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldConfig.label}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={fieldConfig.placeholder} 
                        type={fieldConfig.name.toLowerCase().includes('secret') ? 'password' : 'text'} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={mutation.isPending || !selectedType}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {mutation.isPending && <CircularProgress className="mr-2" size={16} />}
            {isEditing ? 'Update' : 'Add'} Marketplace
          </Button>
        </div>
      </form>
    </Form>
  );
}