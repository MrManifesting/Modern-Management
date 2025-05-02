import React from 'react';
import ShopifyControlPanel from '@/components/shopify/shopify-control-panel';
import ShopifySafetyPanel from '@/components/shopify/shopify-safety-panel';
import { ArrowLeft, Settings, Shield, Info } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ShopifySettingsPage() {
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 text-gold" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gold flex items-center">
            <Settings className="h-6 w-6 mr-2" /> 
            Shopify Integration Settings
          </h1>
        </div>
      </div>
      
      <Alert className="mb-6 border-amber-500/30 bg-amber-950/20">
        <Shield className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">Enhanced Safety Features Active</AlertTitle>
        <AlertDescription className="text-gray-300">
          New safety features have been implemented to prevent unwanted Shopify operations. 
          Use the Safety Controls tab to manage permissions and review all Shopify operations.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-black border border-gold/30">
          <TabsTrigger value="general" className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            General Controls
          </TabsTrigger>
          <TabsTrigger value="safety" className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            Safety Controls
          </TabsTrigger>
          <TabsTrigger value="info" className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            Information
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <ShopifyControlPanel />
        </TabsContent>
        
        <TabsContent value="safety">
          <ShopifySafetyPanel />
        </TabsContent>
        
        <TabsContent value="info">
          <div className="p-6 border border-gold/20 rounded-lg bg-black text-gray-300">
            <h2 className="text-xl font-semibold text-gold mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2 text-gold" /> 
              About Shopify Integration
            </h2>
            
            <ul className="space-y-3 list-disc pl-5">
              <li>
                <strong className="text-white">Multi-Layer Safety:</strong> The system now includes multiple safety mechanisms including mode settings, confirmation requirements, and operation logging.
              </li>
              <li>
                <strong className="text-white">Safe SKU Generation:</strong> Products will have SKUs generated locally without triggering Shopify API calls, using the pattern: <code className="text-amber-400">GSC-CATEGORY-ID</code> for general products and <code className="text-amber-400">INITIALS-TIER-THCVALUE</code> for flower.
              </li>
              <li>
                <strong className="text-white">Operation Confirmation:</strong> When in strict mode, all operations require explicit confirmation and expire after 5 minutes.
              </li>
              <li>
                <strong className="text-white">Comprehensive Logging:</strong> All Shopify operations are logged with timestamps, details, and outcomes for auditing.
              </li>
              <li>
                <strong className="text-white">Read-Only Option:</strong> Set to read-only mode to allow browsing Shopify data without any risk of modifications.
              </li>
            </ul>
            
            <div className="bg-black/40 p-4 mt-6 border border-gold/30 rounded">
              <p className="text-amber-500 font-medium">Important Safety Notice:</p>
              <p className="text-gray-400 mt-1">
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