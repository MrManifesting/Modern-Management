import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface LiveInventoryUpdate {
  itemId: string;
  itemName: string;
  quantity: number;
  tier: string;
  bulk: string;
  needsSync: boolean;
}

interface LiveUpdateResponse {
  success: boolean;
  updates: LiveInventoryUpdate[];
  timestamp: string;
  totalItems: number;
  needsSync: number;
}

export function LiveInventoryView() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const { data: liveData, isLoading, error, refetch } = useQuery<LiveUpdateResponse>({
    queryKey: ['/api/inventory/live-update'],
    refetchInterval: autoRefresh ? 15000 : false, // Refresh every 15 seconds
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0
  });

  useEffect(() => {
    if (liveData?.success) {
      setLastUpdate(new Date());
    }
  }, [liveData]);

  const handleManualRefresh = async () => {
    await refetch();
  };

  const handleSyncQuantity = async (itemId: number, quantity: number) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/sync-quantity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      
      if (response.ok) {
        // Refresh live data after sync
        await refetch();
        // Also refresh main inventory
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      }
    } catch (error) {
      console.error('Failed to sync quantity:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load live inventory updates</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const updates = liveData?.updates || [];
  const itemsNeedingSync = updates.filter(u => u.needsSync);

  return (
    <div className="space-y-4">
      {/* Live Status Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Live Inventory Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                Auto-refresh {autoRefresh ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{liveData?.totalItems || 0}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(liveData?.totalItems || 0) - (liveData?.needsSync || 0)}
              </div>
              <div className="text-sm text-muted-foreground">In Sync</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {liveData?.needsSync || 0}
              </div>
              <div className="text-sm text-muted-foreground">Need Sync</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">
                {lastUpdate ? formatTime(lastUpdate) : '--:--:--'}
              </div>
              <div className="text-sm text-muted-foreground">Last Update</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Needing Sync */}
      {itemsNeedingSync.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Items Needing Sync ({itemsNeedingSync.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {itemsNeedingSync.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between p-3 border rounded-lg bg-amber-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.itemName}</div>
                    <div className="text-sm text-muted-foreground">
                      Tier: {item.tier} • Bulk Price: {item.bulk}
                    </div>
                    <div className="text-sm">
                      <span className="text-green-600">Shopify Quantity: {item.quantity} lbs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.needsSync ? "destructive" : "default"}>
                      {item.needsSync ? "Needs Sync" : "Synced"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Items Status */}
      <Card>
        <CardHeader>
          <CardTitle>All Items Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {updates.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2 rounded ${
                  item.needsSync ? 'bg-amber-50' : 'bg-green-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-xs" title={item.name}>
                      {item.name}
                    </span>
                    {item.needsSync ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Needs Sync
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Synced
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.sku} • {item.status}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-mono">
                    Local: {item.localQuantity} | Shopify: {item.shopifyQuantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}