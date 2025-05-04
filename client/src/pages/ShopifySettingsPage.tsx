import React from 'react';
import ShopifyControlPanel from '@/components/shopify/shopify-control-panel';
import ShopifyCredentialsForm from '@/components/shopify/shopify-credentials-form';
import ShopifySafetyPanel from '@/components/shopify/shopify-safety-panel';
import { ArrowLeft, Settings, Shield, Info, KeyIcon } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ShopifySettingsPage() {
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 text-blue-500" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold blue-gradient-text flex items-center">
            <Settings className="h-6 w-6 mr-2" /> 
            Marketplace Integration Settings
          </h1>
        </div>
      </div>
      
      <Alert className="mb-6 border-blue-500/30 bg-blue-950/20">
        <Shield className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-500">Enhanced Safety Features Active</AlertTitle>
        <AlertDescription>
          Safety features have been implemented to prevent unwanted marketplace operations. 
          Use the Safety Controls tab to manage permissions and review all operations.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList className="bg-background border border-blue-500/30">
          <TabsTrigger value="credentials" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">
            API Credentials
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">
            General Controls
          </TabsTrigger>
          <TabsTrigger value="safety" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">
            Safety Controls
          </TabsTrigger>
          <TabsTrigger value="info" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">
            Information
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="credentials">
          <div className="space-y-6">
            <Alert className="border-blue-500/30 bg-blue-950/20 mb-4">
              <KeyIcon className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-500">About Shopify Credentials</AlertTitle>
              <AlertDescription>
                <p>You'll need to provide your Shopify store URL and Admin API access token to connect your store.</p>
                <p className="mt-2">To get your Shopify Admin API access token:</p>
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                  <li>Go to your Shopify admin dashboard</li>
                  <li>Navigate to Settings → Apps and sales channels → Develop apps</li>
                  <li>Create a private app with "Read and write" permissions for Products, Orders, and Inventory</li>
                  <li>Copy the Admin API access token provided</li>
                </ol>
              </AlertDescription>
            </Alert>
            <ShopifyCredentialsForm />
          </div>
        </TabsContent>
        
        <TabsContent value="general">
          <ShopifyControlPanel />
        </TabsContent>
        
        <TabsContent value="safety">
          <ShopifySafetyPanel />
        </TabsContent>
        
        <TabsContent value="info">
          <div className="p-6 border border-blue-500/20 rounded-lg bg-gradient-to-b from-background to-muted/30">
            <h2 className="text-xl font-semibold blue-gradient-text mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2 text-blue-500" /> 
              About Marketplace Integrations
            </h2>
            
            <ul className="space-y-3 list-disc pl-5">
              <li>
                <strong className="font-medium">Multi-Layer Safety:</strong> The system includes multiple safety mechanisms including mode settings, confirmation requirements, and operation logging.
              </li>
              <li>
                <strong className="font-medium">Safe SKU Generation:</strong> Products will have SKUs generated locally without triggering API calls, using a consistent pattern across all connected marketplaces.
              </li>
              <li>
                <strong className="font-medium">Operation Confirmation:</strong> When in strict mode, all operations require explicit confirmation and expire after 5 minutes.
              </li>
              <li>
                <strong className="font-medium">Comprehensive Logging:</strong> All marketplace operations are logged with timestamps, details, and outcomes for auditing.
              </li>
              <li>
                <strong className="font-medium">Read-Only Option:</strong> Set to read-only mode to allow browsing marketplace data without any risk of modifications.
              </li>
            </ul>
            
            <div className="bg-blue-500/5 p-4 mt-6 border border-blue-500/20 rounded">
              <p className="text-blue-500 font-medium">Important Safety Notice:</p>
              <p className="mt-1">
                These enhanced safety features were implemented to prevent accidental product publishing and duplicate item creation.
                When creating new SKUs or working with products in bulk, we recommend using the Safety Controls tab to set appropriate
                permissions and review the operation log before and after making changes.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}