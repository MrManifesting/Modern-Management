import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertCircle,
  Eye,
  Shield
} from "lucide-react";

interface WebhookStatus {
  endpoint: string;
  status: 'active' | 'inactive' | 'error';
  lastTrigger: string | null;
  successRate: number;
  totalRequests: number;
  errorCount: number;
  avgResponseTime: number;
}

interface SystemHealth {
  webhooks: WebhookStatus[];
  database: {
    status: 'healthy' | 'warning' | 'error';
    connectionCount: number;
    avgQueryTime: number;
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    zeroStockItems: number;
    syncStatus: 'synced' | 'syncing' | 'error';
  };
  sales: {
    todayRevenue: number;
    todayOrders: number;
    avgOrderValue: number;
    hourlyRate: number;
  };
}

export default function WebhookMonitoring() {
  const [safetyMode, setSafetyMode] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real-time system health monitoring
  const { data: systemHealth, refetch } = useQuery<SystemHealth>({
    queryKey: ['/api/system/health'],
    refetchInterval: autoRefresh ? 5000 : false, // 5 second updates
  });

  // Webhook activity logs
  const { data: webhookLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/webhooks/logs'],
    refetchInterval: autoRefresh ? 3000 : false, // 3 second updates
  });

  // Recent sales for high-value monitoring
  const { data: recentSales = [] } = useQuery<any[]>({
    queryKey: ['/api/sales/recent'],
    refetchInterval: autoRefresh ? 2000 : false, // 2 second updates for sales
  });

  const criticalWebhooks = [
    'orders/create',
    'inventory_levels/update', 
    'orders/cancelled',
    'refunds/create'
  ];

  const readOnlyWebhooks = [
    'inventory_levels/update',
    'products/update',
    'customers/create'
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Real-Time System Monitor</h1>
          <p className="text-muted-foreground">$100K/day Store Deployment Safety Dashboard</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="safety-mode"
              checked={safetyMode}
              onCheckedChange={setSafetyMode}
            />
            <Label htmlFor="safety-mode" className="flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              Safety Mode
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh">Auto Refresh</Label>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {safetyMode && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Safety Mode Active:</strong> Only read-only webhooks are enabled. 
            Critical order processing webhooks are disabled for safe testing.
          </AlertDescription>
        </Alert>
      )}

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${systemHealth?.sales.todayRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${systemHealth?.sales.hourlyRate?.toLocaleString() || '0'}/hour rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.sales.todayOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${systemHealth?.sales.avgOrderValue?.toFixed(2) || '0'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.inventory.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.inventory.lowStockItems || 0} low stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={systemHealth?.database.status === 'healthy' ? 'default' : 'destructive'}>
                {systemHealth?.database.status === 'healthy' ? 'Healthy' : 'Issues'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemHealth?.database.avgQueryTime || 0}ms avg query
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Status</CardTitle>
          <CardDescription>Real-time monitoring of all Shopify webhook endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth?.webhooks?.map((webhook, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{webhook.endpoint}</h4>
                  <Badge variant={
                    webhook.status === 'active' ? 'default' : 
                    webhook.status === 'error' ? 'destructive' : 'secondary'
                  }>
                    {webhook.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate:</span>
                    <span>{webhook.successRate}%</span>
                  </div>
                  {criticalWebhooks.includes(webhook.endpoint) && (
                    <Badge variant="outline" className="text-xs">
                      Critical
                    </Badge>
                  )}
                  {readOnlyWebhooks.includes(webhook.endpoint) && (
                    <Badge variant="outline" className="text-xs bg-green-50">
                      Safe
                    </Badge>
                  )}
                  <Progress value={webhook.successRate} className="h-2" />
                </div>
              </div>
            )) || <p>Loading webhook status...</p>}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Webhook Activity</CardTitle>
            <CardDescription>Last 10 webhook triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {webhookLogs.slice(0, 10).map((log, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center space-x-2">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{log.endpoint}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High-Value Orders</CardTitle>
            <CardDescription>Orders over $500 (last 24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSales
                .filter(sale => parseFloat(sale.totalAmount) > 500)
                .slice(0, 10)
                .map((sale, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">{sale.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      Order #{sale.orderId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${parseFloat(sale.totalAmount).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safety Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Deployment Safety Controls
          </CardTitle>
          <CardDescription>
            Emergency controls for high-volume store deployment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <Eye className="w-4 h-4 mr-2" />
              Enable Read-Only Mode
            </Button>
            <Button variant="outline" className="justify-start">
              <AlertCircle className="w-4 h-4 mr-2" />
              Pause Order Processing
            </Button>
            <Button variant="destructive" className="justify-start">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Stop All Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}