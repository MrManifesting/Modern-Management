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
import { Loader, Check, Key, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequestSimple } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ShopifyCredentials = {
  shopifyStore: string;
  shopifyAccessToken: string;
};

export default function ShopifyCredentialsForm() {
  const [credentials, setCredentials] = useState<ShopifyCredentials>({
    shopifyStore: '',
    shopifyAccessToken: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  
  // Fetch current credentials (masked)
  useEffect(() => {
    fetchCredentials();
  }, []);
  
  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const result = await apiRequestSimple<{
        shopifyStore: string;
        shopifyAccessToken: string;
      }>('/api/shopify/credentials');
      
      setCredentials({
        shopifyStore: result.shopifyStore || '',
        shopifyAccessToken: result.shopifyAccessToken || '',
      });
    } catch (error) {
      console.error("Failed to fetch Shopify credentials:", error);
      toast({
        title: "Error",
        description: "Failed to fetch current Shopify credentials.",
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
  
  const saveCredentials = async () => {
    setSaving(true);
    setSuccess(false);
    
    try {
      await apiRequestSimple<{
        success: boolean;
        message: string;
      }>('/api/credentials/shopify', {
        method: 'POST',
        body: JSON.stringify({
          name: "Shopify Store Credentials",
          credentials: credentials
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setSuccess(true);
      toast({
        title: "Credentials Updated",
        description: "Shopify credentials have been updated successfully.",
      });
      
      // Test connection with new credentials after a short delay
      setTimeout(() => {
        testConnection();
      }, 1000);
    } catch (error) {
      console.error("Failed to update Shopify credentials:", error);
      toast({
        title: "Error",
        description: "Failed to update Shopify credentials.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  const testConnection = async () => {
    try {
      const result = await apiRequestSimple<{
        connected: boolean;
        store: string;
        message: string;
      }>('/api/shopify/test-connection');
      
      if (result.connected) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to Shopify store: ${result.store}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message || "Failed to connect to Shopify.",
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
  
  return (
    <Card className="border-blue-500/30 bg-gradient-to-b from-background to-muted/30 shadow-md">
      <CardHeader className="border-b border-blue-500/20 bg-gradient-to-r from-background to-background/80">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-blue-500">Shopify API Credentials</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Update your Shopify store credentials to connect to a different store
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
                <Label htmlFor="shopifyStore" className="text-foreground flex items-center gap-2">
                  <Store className="h-4 w-4 text-blue-500" />
                  Shopify Store URL
                </Label>
                <Input
                  id="shopifyStore"
                  name="shopifyStore"
                  placeholder="mrlisterscurations.myshopify.com"
                  value={credentials.shopifyStore}
                  onChange={handleInputChange}
                  className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50"
                />
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>Enter your Shopify store URL. Common formats:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>mrlisterscurations.myshopify.com</li>
                    <li>https://mrlisterscurations.myshopify.com</li>
                    <li>https://admin.shopify.com/store/mrlisterscurations</li>
                  </ul>
                  {credentials.shopifyStore.includes('curatioins') && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-red-600 font-medium">⚠️ Check spelling: "curations" not "curatioins"</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shopifyAccessToken" className="text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-500" />
                  Shopify Access Token
                </Label>
                <Input
                  id="shopifyAccessToken"
                  name="shopifyAccessToken"
                  type="password"
                  placeholder="Enter your Shopify access token"
                  value={credentials.shopifyAccessToken}
                  onChange={handleInputChange}
                  className="border-blue-500/30 bg-background focus:border-blue-500 focus:ring-blue-500/50"
                />
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                    <p className="font-medium text-red-600">Current Issue: Getting "Unauthorized" errors</p>
                    <p>Your store URL is correct, but the Admin API token needs to be recreated with proper permissions.</p>
                    
                    <div className="mt-2">
                      <p className="font-medium">Steps to fix:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-xs">
                        <li>Go to your Shopify admin → Settings → Apps and sales channels</li>
                        <li>Click "Develop apps"</li>
                        <li>If "MrLister Inventory" app exists, delete it and create new</li>
                        <li>Click "Create an app" → Name: "MrLister Inventory"</li>
                        <li>Click "Configure Admin API scopes" and enable:
                          <ul className="list-disc pl-4 mt-1">
                            <li><strong>read_products, write_products</strong></li>
                            <li><strong>read_inventory, write_inventory</strong></li>
                            <li><strong>read_orders</strong></li>
                          </ul>
                        </li>
                        <li>Save → "Install app" → Copy the "Admin API access token"</li>
                        <li>Paste the complete token here (it should be 32+ characters)</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {success && (
              <Alert className="border-green-500/30 bg-green-500/10">
                <Check className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Credentials Updated</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Your Shopify API credentials have been updated successfully.
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
              Save Credentials
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}