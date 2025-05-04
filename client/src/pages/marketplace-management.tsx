import React from 'react';
import MarketplaceList from '@/components/marketplace/marketplace-list';
import MainLayout from '@/components/layout/main-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, RefreshCw, Info } from 'lucide-react';

export default function MarketplaceManagementPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketplace Management</h1>
            <p className="text-muted-foreground">
              Connect and manage your sales channels in one place
            </p>
          </div>
        </div>

        <Tabs defaultValue="marketplaces" className="space-y-4">
          <TabsList>
            <TabsTrigger value="marketplaces" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span>Marketplaces</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Sync Settings</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Getting Started</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="marketplaces" className="space-y-4">
            <MarketplaceList />
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                  Sync Settings
                </CardTitle>
                <CardDescription>
                  Configure automatic synchronization between your inventory and marketplaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Sync settings will be available after connecting at least one marketplace.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="help" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Getting Started with Marketplaces
                </CardTitle>
                <CardDescription>
                  Learn how to connect and manage your marketplaces
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Step 1: Connect a Marketplace</h3>
                  <p>Click the "Add Marketplace" button to connect your online store. You'll need your API credentials for the selected marketplace.</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Step 2: Test the Connection</h3>
                  <p>After adding your credentials, test the connection to ensure everything is working properly.</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Step 3: Sync Your Products</h3>
                  <p>Use the sync button to import your products from the marketplace or push your inventory to your store.</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Step 4: Configure Automatic Sync</h3>
                  <p>Set up automatic synchronization to keep your inventory and marketplace in sync.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}