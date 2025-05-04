import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader, Check, Key, Store, ShoppingBag, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequestSimple } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from "@/components/ui/select";

export type MarketplaceType = 'shopify' | 'etsy' | 'amazon' | 'ebay' | 'woocommerce' | 'general';

type MarketplaceCredentials = {
  name: string;
  type: MarketplaceType;
  storeUrl: string;
  apiKey: string;
  apiSecret?: string;
  apiEndpoint?: string;
};

interface MarketplaceCredentialsFormProps {
  marketplaceId?: number;
  onSaved?: (id: number) => void;
}

export default function MarketplaceCredentialsForm({ marketplaceId, onSaved }: MarketplaceCredentialsFormProps) {
  const [credentials, setCredentials] = useState<MarketplaceCredentials>({
    name: '',
    type: 'general',
    storeUrl: '',
    apiKey: '',
    apiSecret: '',
    apiEndpoint: '',
  });
  
  const [loading, setLoading] = useState(marketplaceId ? true : false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  
  // Fetch current credentials if editing an existing marketplace
  useEffect(() => {
    if (marketplaceId) {
      fetchCredentials();
    }
  }, [marketplaceId]);
  
  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const result = await apiRequestSimple<{
        id: number;
        name: string;
        type: MarketplaceType;
        storeUrl: string;
        apiKey: string;
        apiSecret?: string;
        apiEndpoint?: string;
      }>(`/api/marketplaces/${marketplaceId}`);
      
      setCredentials({
        name: result.name || '',
        type: result.type || 'general',
        storeUrl: result.storeUrl || '',
        apiKey: result.apiKey || '',
        apiSecret: result.apiSecret || '',
        apiEndpoint: result.apiEndpoint || '',
      });
    } catch (error) {
      console.error("Failed to fetch marketplace credentials:", error);
      toast({
        title: "Error",
        description: "Failed to fetch current marketplace credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSuccess(false); // Reset success status on changes
  };
  
  const handleSelectChange = (name: string) => (value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSuccess(false);
  };
  
  const saveCredentials = async () => {
    setSaving(true);
    setSuccess(false);
    
    try {
      const endpoint = marketplaceId 
        ? `/api/marketplaces/${marketplaceId}` 
        : '/api/marketplaces';
      
      const method = marketplaceId ? 'PATCH' : 'POST';
      
      const result = await apiRequestSimple<{
        success: boolean;
        message: string;
        marketplace: { id: number }
      }>(endpoint, {
        method,
        body: JSON.stringify({
          name: credentials.name,
          type: credentials.type,
          credentials: {
            storeUrl: credentials.storeUrl,
            apiKey: credentials.apiKey,
            apiSecret: credentials.apiSecret,
            apiEndpoint: credentials.apiEndpoint,
          },
          storeUrl: credentials.storeUrl,
          apiEndpoint: credentials.apiEndpoint,
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setSuccess(true);
      toast({
        title: `Marketplace ${marketplaceId ? 'Updated' : 'Created'}`,
        description: `${credentials.name} has been ${marketplaceId ? 'updated' : 'added'} successfully.`,
      });
      
      // Call the callback if provided
      if (onSaved && result.marketplace?.id) {
        onSaved(result.marketplace.id);
      }
      
      // Test connection with new credentials after a short delay
      setTimeout(() => {
        testConnection();
      }, 1000);
    } catch (error) {
      console.error(`Failed to ${marketplaceId ? 'update' : 'create'} marketplace:`, error);
      toast({
        title: "Error",
        description: `Failed to ${marketplaceId ? 'update' : 'create'} marketplace.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  const testConnection = async () => {
    if (!credentials.name || !credentials.type) {
      toast({
        title: "Validation Error",
        description: "Marketplace name and type are required.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const endpoint = marketplaceId 
        ? `/api/marketplaces/${marketplaceId}/test` 
        : '/api/marketplaces/test';
      
      const result = await apiRequestSimple<{
        connected: boolean;
        name: string;
        message: string;
      }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          type: credentials.type,
          credentials: {
            storeUrl: credentials.storeUrl,
            apiKey: credentials.apiKey,
            apiSecret: credentials.apiSecret,
            apiEndpoint: credentials.apiEndpoint,
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (result.connected) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${result.name || credentials.name}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message || `Failed to connect to ${credentials.name}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to test connection:", error);
      toast({
        title: "Connection Test Failed",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
    }
  };

  // Get marketplace-specific help text
  const getCredentialHelp = () => {
    switch(credentials.type) {
      case 'shopify':
        return {
          apiTitle: 'Shopify Access Token',
          apiHelp: 'Admin API access token with necessary permissions for inventory management',
          urlHelp: (
            <>
              <p>Enter your Shopify store URL in any of these formats:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>your-store.myshopify.com</li>
                <li>https://your-store.myshopify.com</li>
                <li>https://admin.shopify.com/store/your-store</li>
              </ul>
            </>
          )
        };
      case 'etsy':
        return {
          apiTitle: 'Etsy API Key',
          apiHelp: 'The API key from your Etsy Developer account',
          secretRequired: true,
          secretTitle: 'Etsy API Secret',
          secretHelp: 'The API secret from your Etsy Developer account',
          urlHelp: 'Your Etsy shop URL (e.g., https://www.etsy.com/shop/yourshopname)'
        };
      case 'woocommerce':
        return {
          apiTitle: 'WooCommerce Consumer Key',
          apiHelp: 'The consumer key from your WooCommerce API settings',
          secretRequired: true,
          secretTitle: 'WooCommerce Consumer Secret',
          secretHelp: 'The consumer secret from your WooCommerce API settings',
          urlHelp: 'Your WordPress site URL (e.g., https://yourdomain.com)'
        };
      case 'amazon':
        return {
          apiTitle: 'Amazon Seller ID',
          apiHelp: 'Your Amazon Seller ID',
          secretRequired: true,
          secretTitle: 'Amazon MWS Auth Token',
          secretHelp: 'Your Amazon MWS Authentication Token',
          urlHelp: 'The Amazon marketplace URL (e.g., https://sellercentral.amazon.com)'
        };
      case 'ebay':
        return {
          apiTitle: 'eBay Client ID',
          apiHelp: 'Your eBay Developer Application Client ID',
          secretRequired: true,
          secretTitle: 'eBay Client Secret',
          secretHelp: 'Your eBay Developer Application Client Secret',
          urlHelp: 'The eBay site URL (e.g., https://www.ebay.com)'
        };
      default:
        return {
          apiTitle: 'API Key',
          apiHelp: 'API key for this marketplace',
          secretRequired: false,
          secretTitle: 'API Secret',
          secretHelp: 'API secret for this marketplace (if needed)',
          urlHelp: 'The URL of your store on this marketplace'
        };
    }
  };
  
  const help = getCredentialHelp();
  
  return (
    <Card className="border-blue-500/30 bg-gradient-to-b from-background to-muted/30 shadow-md">
      <CardHeader className="border-b border-blue-500/20 bg-gradient-to-r from-background to-background/80">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-blue-500">
            {marketplaceId ? 'Edit Marketplace' : 'Add New Marketplace'}
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          {marketplaceId 
            ? 'Update your marketplace connection details' 
            : 'Connect to a new sales channel or marketplace'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-blue-500" />
                  Marketplace Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Store"
                  value={credentials.name}
                  onChange={handleInputChange}
                  className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50"
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name to identify this marketplace
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type" className="text-foreground flex items-center gap-2">
                  <Store className="h-4 w-4 text-blue-500" />
                  Marketplace Type
                </Label>
                <Select 
                  value={credentials.type} 
                  onValueChange={handleSelectChange('type')}
                >
                  <SelectTrigger id="type" className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50">
                    <SelectValue placeholder="Select marketplace type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shopify">Shopify</SelectItem>
                    <SelectItem value="etsy">Etsy</SelectItem>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="ebay">eBay</SelectItem>
                    <SelectItem value="woocommerce">WooCommerce</SelectItem>
                    <SelectItem value="general">Other Marketplace</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The type of marketplace or e-commerce platform
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storeUrl" className="text-foreground flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-500" />
                  Store URL
                </Label>
                <Input
                  id="storeUrl"
                  name="storeUrl"
                  placeholder="https://your-store.com"
                  value={credentials.storeUrl}
                  onChange={handleInputChange}
                  className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  {help.urlHelp}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-500" />
                  {help.apiTitle}
                </Label>
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder={`Enter your ${help.apiTitle}`}
                  value={credentials.apiKey}
                  onChange={handleInputChange}
                  className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50"
                />
                <p className="text-xs text-muted-foreground">
                  {help.apiHelp}
                </p>
              </div>
              
              {help.secretRequired && (
                <div className="space-y-2">
                  <Label htmlFor="apiSecret" className="text-foreground flex items-center gap-2">
                    <Key className="h-4 w-4 text-blue-500" />
                    {help.secretTitle}
                  </Label>
                  <Input
                    id="apiSecret"
                    name="apiSecret"
                    type="password"
                    placeholder={`Enter your ${help.secretTitle}`}
                    value={credentials.apiSecret}
                    onChange={handleInputChange}
                    className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    {help.secretHelp}
                  </p>
                </div>
              )}
              
              {credentials.type === 'general' && (
                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint" className="text-foreground flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                    API Endpoint
                  </Label>
                  <Input
                    id="apiEndpoint"
                    name="apiEndpoint"
                    placeholder="https://api.example.com/v1"
                    value={credentials.apiEndpoint}
                    onChange={handleInputChange}
                    className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    The base API endpoint URL for this marketplace (if applicable)
                  </p>
                </div>
              )}
            </div>
            
            {success && (
              <Alert className="border-green-500/30 bg-green-500/10">
                <Check className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">
                  {marketplaceId ? 'Marketplace Updated' : 'Marketplace Added'}
                </AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  {`Your ${credentials.type} marketplace "${credentials.name}" has been ${marketplaceId ? 'updated' : 'added'} successfully.`}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="border-t border-blue-500/20 pt-4 flex justify-between">
        <Button 
          variant="outline" 
          className="border-blue-500/40 text-blue-500 hover:bg-blue-500/10"
          onClick={testConnection}
          disabled={loading || saving}
        >
          Test Connection
        </Button>
        
        <Button 
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={saveCredentials}
          disabled={loading || saving}
        >
          {saving ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              {marketplaceId ? 'Update Marketplace' : 'Add Marketplace'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}