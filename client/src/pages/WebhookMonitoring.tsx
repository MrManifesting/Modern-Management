import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Shield, 
  Database, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface WebhookLog {
  id: number;
  webhookType: string;
  shopifyId: string;
  processedAt: string;
  status: string;
  errorMessage?: string;
  payload: any;
}

interface MonitoringData {
  recentLogs: WebhookLog[];
  webhookCounts: Record<string, number>;
  totalWebhooks: number;
  lastProcessed: string;
  mode: string;
}

interface HealthData {
  success: boolean;
  status: string;
  webhookSecretConfigured: boolean;
  databaseConnected: boolean;
  mode: string;
  timestamp: string;
}

const getWebhookIcon = (type: string) => {
  switch (type) {
    case 'orders/create': return <ShoppingCart className="h-4 w-4" />;
    case 'customers/create': return <Users className="h-4 w-4" />;
    case 'products/update': return <Package className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'logged_read_only': return 'bg-blue-100 text-blue-800';
    case 'processed': return 'bg-green-100 text-green-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function WebhookMonitoring() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch monitoring data
  const { data: monitoringData, isLoading: monitoringLoading, refetch: refetchMonitoring } = useQuery<MonitoringData>({
    queryKey: ['/api/webhooks/monitoring'],
    queryFn: async () => {
      const response = await fetch('/api/webhooks/monitoring');
      if (!response.ok) throw new Error('Failed to fetch monitoring data');
      const result = await response.json();
      return result.data;
    },
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds
  });

  // Fetch health data
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery<HealthData>({
    queryKey: ['/api/webhooks/health'],
    queryFn: async () => {
      const response = await fetch('/api/webhooks/health');
      if (!response.ok) throw new Error('Failed to fetch health data');
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatWebhookType = (type: string) => {
    return type.split('/').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const refreshAll = () => {
    refetchMonitoring();
    refetchHealth();
  };

  if (monitoringLoading || healthLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webhook Monitoring</h1>
          <p className="text-gray-600">Real-time webhook monitoring for $100K/day store operations</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button onClick={refreshAll} variant="outline">
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Health Status Alert */}
      {healthData && (
        <Alert className={healthData.status === 'healthy' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                System Status: <strong>{healthData.status.toUpperCase()}</strong> | 
                Mode: <strong>{healthData.mode.toUpperCase()}</strong> | 
                Webhook Security: {healthData.webhookSecretConfigured ? '✓ Configured' : '✗ Missing'}
              </span>
              <span className="text-sm text-gray-500">
                Last Check: {formatDate(healthData.timestamp)}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringData?.totalWebhooks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {monitoringData?.mode === 'read-only' ? 'Read-only mode' : 'Processing mode'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Webhooks</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoringData?.webhookCounts['orders/create'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Orders processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Webhooks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoringData?.webhookCounts['customers/create'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Customers tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Updates</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoringData?.webhookCounts['products/update'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Product changes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Webhook Activity</CardTitle>
              <CardDescription>
                Latest webhook events processed in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Shopify ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringData?.recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getWebhookIcon(log.webhookType)}
                          <span className="font-medium">
                            {formatWebhookType(log.webhookType)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.shopifyId}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(log.processedAt)}
                      </TableCell>
                      <TableCell>
                        {log.errorMessage ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : (
                          <Badge variant="secondary">Success</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!monitoringData?.recentLogs || monitoringData.recentLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No webhook activity yet. Webhooks will appear here when received.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Type Distribution</CardTitle>
              <CardDescription>Breakdown of webhook types received</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(monitoringData?.webhookCounts || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getWebhookIcon(type)}
                      <div>
                        <p className="font-medium">{formatWebhookType(type)}</p>
                        <p className="text-sm text-gray-600">{type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-gray-600">events</p>
                    </div>
                  </div>
                ))}
                {Object.keys(monitoringData?.webhookCounts || {}).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No webhook data available yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Status</CardTitle>
              <CardDescription>Webhook security and verification status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">Webhook Secret</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">HMAC-SHA256 signature verification</p>
                  <Badge className={healthData?.webhookSecretConfigured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {healthData?.webhookSecretConfigured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Database Connection</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Webhook logging and storage</p>
                  <Badge className={healthData?.databaseConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {healthData?.databaseConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Processing Mode</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Current webhook processing mode</p>
                  <Badge className="bg-purple-100 text-purple-800">
                    {healthData?.mode?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold">Last Activity</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Most recent webhook processed</p>
                  <p className="text-sm font-medium">
                    {monitoringData?.lastProcessed ? formatDate(monitoringData.lastProcessed) : 'No activity yet'}
                  </p>
                </div>
              </div>

              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Read-Only Mode:</strong> Webhooks are being logged for monitoring without making changes to inventory. 
                  This ensures safe operation while testing webhook integration for your high-volume store.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}