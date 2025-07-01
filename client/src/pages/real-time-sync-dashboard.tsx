import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, TrendingDown, Zap, RefreshCw } from 'lucide-react';

interface WebhookStatus {
  success: boolean;
  webhooks: Array<{
    topic: string;
    endpoint: string;
  }>;
  baseUrl: string;
  webhookSecret: string;
}

interface InventoryAction {
  id: number;
  itemId: number;
  actionType: string;
  quantity: number;
  notes: string;
  previousQuantity: number;
  newQuantity: number;
  createdAt: string;
  item?: {
    name: string;
    sku: string;
  };
}

interface SaleRecord {
  id: number;
  orderId: string;
  orderNumber?: string;
  customerEmail: string;
  customerName: string;
  totalAmount: string;
  marketplace: string;
  status: string;
  orderDate: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function RealTimeSyncDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Webhook status query
  const { data: webhookStatus, isLoading: webhookLoading } = useQuery<WebhookStatus>({
    queryKey: ['/api/shopify/webhooks/status', refreshKey],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Recent inventory actions query
  const { data: recentActions, isLoading: actionsLoading } = useQuery<InventoryAction[]>({
    queryKey: ['/api/inventory-actions/recent', refreshKey],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Recent sales query
  const { data: recentSales, isLoading: salesLoading } = useQuery<SaleRecord[]>({
    queryKey: ['/api/sales/recent', refreshKey],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'configured':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'not configured':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'fulfillment':
      case 'sale':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'intake':
        return <TrendingDown className="w-4 h-4 text-green-500 rotate-180" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Sync Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor live inventory updates and order processing</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Webhook Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Webhook System Status
          </CardTitle>
          <CardDescription>
            Real-time connection status between Shopify and your inventory system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhookLoading ? (
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Checking webhook status...</span>
            </div>
          ) : webhookStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Webhook Secret:</span>
                {getStatusBadge(webhookStatus.webhookSecret)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {webhookStatus.webhooks.map((webhook, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">{webhook.topic}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {webhook.endpoint}
                    </div>
                    <Badge variant="default" className="mt-2 bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Base URL:</strong> {webhookStatus.baseUrl}
              </div>
            </div>
          ) : (
            <div className="text-red-600">Failed to load webhook status</div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions">Recent Inventory Actions</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Live Inventory Changes</CardTitle>
              <CardDescription>
                Real-time inventory updates triggered by orders and manual adjustments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionsLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading recent actions...</span>
                </div>
              ) : recentActions && recentActions.length > 0 ? (
                <div className="space-y-3">
                  {recentActions.slice(0, 10).map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getActionIcon(action.actionType)}
                        <div>
                          <div className="font-medium">
                            {action.item?.name || `Item ID ${action.itemId}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {action.item?.sku || 'Unknown'} • {action.notes}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {action.previousQuantity} → {action.newQuantity}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(action.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent inventory actions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Latest orders processed through your inventory system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading recent orders...</span>
                </div>
              ) : recentSales && recentSales.length > 0 ? (
                <div className="space-y-3">
                  {recentSales.slice(0, 10).map((sale) => (
                    <div key={sale.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {sale.orderNumber || sale.orderId}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${sale.totalAmount}</div>
                          <Badge variant="outline" className="text-xs">
                            {sale.marketplace}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Customer: {sale.customerName || sale.customerEmail}</div>
                        <div>Date: {formatTime(sale.orderDate)}</div>
                        {sale.items && sale.items.length > 0 && (
                          <div className="mt-1">
                            Items: {sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent orders found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}