import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Package,
  ArrowUpDown,
  TrendingUp
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  success: boolean;
  message: string;
  updated: number;
  created?: number;
  errors: string[];
}

interface SyncStatus {
  success: boolean;
  lastFullSync: string | null;
  lastPriceSync: string | null;
  isConnected: boolean;
  message: string;
}

export function InventorySyncDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncProgress, setSyncProgress] = useState(0);
  const [isManualSync, setIsManualSync] = useState(false);

  // Get sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery<SyncStatus>({
    queryKey: ['/api/shopify/sync-status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Full inventory sync mutation
  const fullSyncMutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      setSyncProgress(10);
      const response = await apiRequest('POST', '/api/shopify/sync-inventory-full');
      setSyncProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopify/sync-status'] });
      setSyncProgress(0);
      
      toast({
        title: "Full Sync Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      setSyncProgress(0);
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Price and quantity sync mutation
  const priceQuantitySyncMutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      setSyncProgress(10);
      const response = await apiRequest('POST', '/api/shopify/sync-prices-quantities');
      setSyncProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopify/sync-status'] });
      setSyncProgress(0);
      
      toast({
        title: "Price/Quantity Sync Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      setSyncProgress(0);
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Real inventory quantity sync mutation
  const realQuantitySyncMutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      setSyncProgress(10);
      const response = await apiRequest('POST', '/api/shopify/sync-real-quantities');
      setSyncProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopify/sync-status'] });
      setSyncProgress(0);
      
      toast({
        title: "Real Quantities Synced",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      setSyncProgress(0);
      toast({
        title: "Quantity Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const isAnyMutationLoading = fullSyncMutation.isPending || priceQuantitySyncMutation.isPending || realQuantitySyncMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shopify Inventory Sync</h2>
          <p className="text-muted-foreground">
            Keep your inventory prices and quantities accurate with live Shopify data
          </p>
        </div>
        <Badge 
          variant={syncStatus?.isConnected ? "default" : "destructive"}
          className="px-3 py-1"
        >
          {syncStatus?.isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Connection Status Alert */}
      {!statusLoading && !syncStatus?.isConnected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Shopify Not Connected</AlertTitle>
          <AlertDescription>
            Please configure your Shopify credentials before syncing inventory data.
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Progress */}
      {(isAnyMutationLoading || syncProgress > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing inventory data...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full Inventory Sync */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-800">Full Inventory Import</CardTitle>
            </div>
            <CardDescription>
              Import all products, prices, and quantities from your Shopify store. 
              Creates new items and updates existing ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">What this does:</span>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>• Imports all Shopify products</li>
                <li>• Updates all prices to match store</li>
                <li>• Syncs current inventory quantities</li>
                <li>• Creates items for new products</li>
                <li>• Updates product images and details</li>
              </ul>
            </div>
            <Separator />
            <Button 
              onClick={() => fullSyncMutation.mutate()}
              disabled={!syncStatus?.isConnected || isAnyMutationLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {fullSyncMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import All Products
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Price & Quantity Sync */}
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Quick Price & Quantity Update</CardTitle>
            </div>
            <CardDescription>
              Fast sync of current prices and stock levels for existing inventory items.
              Recommended for daily updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">What this does:</span>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>• Updates prices to match Shopify</li>
                <li>• Syncs current stock quantities</li>
                <li>• Updates sale prices and discounts</li>
                <li>• Fast operation for existing items</li>
                <li>• Maintains accurate inventory levels</li>
              </ul>
            </div>
            <Separator />
            <Button 
              onClick={() => priceQuantitySyncMutation.mutate()}
              disabled={!syncStatus?.isConnected || isAnyMutationLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {priceQuantitySyncMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Update Prices & Quantities
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Real Inventory Quantities Sync */}
        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">Real Inventory Quantities</CardTitle>
            </div>
            <CardDescription>
              Fetch authentic inventory quantities from your Shopify store's inventory API.
              Replaces default quantities with real stock levels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">What this does:</span>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>• Fetches real inventory quantities from Shopify</li>
                <li>• Updates all items with authentic stock levels</li>
                <li>• Replaces placeholder quantities (like 50)</li>
                <li>• Uses Shopify's inventory API for accuracy</li>
                <li>• Shows true available quantities</li>
              </ul>
            </div>
            <Separator />
            <Button 
              onClick={() => realQuantitySyncMutation.mutate()}
              disabled={!syncStatus?.isConnected || isAnyMutationLoading}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {realQuantitySyncMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Real Quantities...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Sync Real Quantities
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Sync History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Full Sync:</span>
                <span className="text-sm text-muted-foreground">
                  {syncStatus?.lastFullSync || "Never"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Price Update:</span>
                <span className="text-sm text-muted-foreground">
                  {syncStatus?.lastPriceSync || "Never"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connection Status:</span>
                <Badge variant={syncStatus?.isConnected ? "default" : "destructive"}>
                  {syncStatus?.isConnected ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto-sync:</span>
                <Badge variant="outline">Manual Only</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {(fullSyncMutation.data || priceQuantitySyncMutation.data) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Last Sync Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fullSyncMutation.data && (
              <div className="space-y-2">
                <h4 className="font-medium">Full Inventory Sync</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Items Updated:</span>
                    <div className="font-semibold">{fullSyncMutation.data.updated}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Items Created:</span>
                    <div className="font-semibold">{fullSyncMutation.data.created || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <div className="font-semibold">{fullSyncMutation.data.errors.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={fullSyncMutation.data.success ? "default" : "destructive"}>
                      {fullSyncMutation.data.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            
            {priceQuantitySyncMutation.data && (
              <div className="space-y-2">
                <h4 className="font-medium">Price & Quantity Sync</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Items Updated:</span>
                    <div className="font-semibold">{priceQuantitySyncMutation.data.updated}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <div className="font-semibold">{priceQuantitySyncMutation.data.errors.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={priceQuantitySyncMutation.data.success ? "default" : "destructive"}>
                      {priceQuantitySyncMutation.data.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Important Notes */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important Notes</AlertTitle>
        <AlertDescription className="space-y-2">
          <div>• <strong>Full Import:</strong> Use this when setting up or when you have new products in Shopify</div>
          <div>• <strong>Quick Update:</strong> Use this daily to keep prices and quantities current</div>
          <div>• <strong>Live Data:</strong> All syncs pull real-time data directly from your Shopify store</div>
          <div>• <strong>No Mock Data:</strong> Only authentic store data is used - never placeholder values</div>
        </AlertDescription>
      </Alert>
    </div>
  );
}