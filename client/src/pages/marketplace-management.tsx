import React from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Settings, List, Activity } from "lucide-react";
import MarketplaceList from '@/components/marketplace/marketplace-list';

export default function MarketplaceManagementPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Helmet>
        <title>Marketplace Management - Inventory Pro</title>
      </Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace Management</h1>
          <p className="text-muted-foreground">
            Connect and manage your online sales channels
          </p>
        </div>
      </div>

      <Tabs defaultValue="marketplaces" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="marketplaces" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Marketplaces
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Operations Log
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="marketplaces">
          <MarketplaceList />
        </TabsContent>
        
        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Operations Log</CardTitle>
              <CardDescription>
                View recent marketplace operations and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Select a marketplace to view its operation logs
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Settings</CardTitle>
              <CardDescription>
                Configure global settings for marketplace integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Global marketplace settings will be available in a future update
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}