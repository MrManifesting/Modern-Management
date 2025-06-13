import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Database,
  FileSpreadsheet,
  ShoppingBag,
  Settings,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";

interface SyncStatus {
  isActive: boolean;
  lastSync: string | null;
  direction: 'bidirectional' | 'app-to-sheets' | 'shopify-to-app' | 'disabled';
  itemsInSync: number;
  conflictsDetected: number;
  lastError: string | null;
}

interface SyncLog {
  id: number;
  source: string;
  target: string;
  operation: string;
  status: string;
  itemsAffected: number;
  errorMessage: string | null;
  timestamp: string;
}

export default function SyncDashboard() {
  const [activeSync, setActiveSync] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/sync/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch sync logs
  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/sync/logs'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Sync mutations
  const startSyncMutation = useMutation({
    mutationFn: async ({ direction, force = false }: { direction: string; force?: boolean }) => {
      const response = await apiRequest('POST', `/api/sync/start`, { direction, force });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Sync Started",
        description: `${variables.direction} synchronization has been initiated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
      setActiveSync(variables.direction);
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to start synchronization.",
        variant: "destructive",
      });
    }
  });

  const stopSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/sync/stop`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Stopped",
        description: "Synchronization has been stopped.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
      setActiveSync(null);
    }
  });

  const resolveConflictMutation = useMutation({
    mutationFn: async ({ conflictId, resolution }: { conflictId: number; resolution: string }) => {
      const response = await apiRequest('POST', `/api/sync/conflicts/${conflictId}/resolve`, { resolution });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conflict Resolved",
        description: "Synchronization conflict has been resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
    }
  });

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'in_progress': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getSyncIcon = (direction: string) => {
    switch (direction) {
      case 'app-to-sheets': return <ArrowUpRight className="h-4 w-4" />;
      case 'shopify-to-app': return <ArrowDownLeft className="h-4 w-4" />;
      case 'bidirectional': return <RefreshCw className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sync Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage bidirectional synchronization between your app, Google Sheets, and Shopify
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
              queryClient.invalidateQueries({ queryKey: ['/api/sync/logs'] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">App Inventory</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStatus?.app?.itemCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last updated: {syncStatus?.app?.lastUpdate || 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Sheets</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStatus?.sheets?.itemCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Status: {syncStatus?.sheets?.connected ? 
                <Badge variant="default" className="text-xs">Connected</Badge> : 
                <Badge variant="destructive" className="text-xs">Disconnected</Badge>
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shopify Store</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStatus?.shopify?.productCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Status: {syncStatus?.shopify?.connected ? 
                <Badge variant="default" className="text-xs">Connected</Badge> : 
                <Badge variant="destructive" className="text-xs">Disconnected</Badge>
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sync Status */}
      {syncStatus?.isActive && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Sync in Progress</AlertTitle>
          <AlertDescription>
            {syncStatus.currentOperation} - {syncStatus.progress}% complete
            <Progress value={syncStatus.progress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Conflicts Alert */}
      {syncStatus?.conflictsDetected > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conflicts Detected</AlertTitle>
          <AlertDescription>
            {syncStatus.conflictsDetected} synchronization conflicts need resolution.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="sync-controls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sync-controls">Sync Controls</TabsTrigger>
          <TabsTrigger value="sync-logs">Sync History</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="sync-controls" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5" />
                  App to Google Sheets
                </CardTitle>
                <CardDescription>
                  Sync inventory changes from your app to Google Sheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <Badge variant={syncStatus?.appToSheets?.enabled ? "default" : "secondary"}>
                    {syncStatus?.appToSheets?.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => startSyncMutation.mutate({ direction: 'app-to-sheets' })}
                    disabled={startSyncMutation.isPending || activeSync !== null}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Sync
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => startSyncMutation.mutate({ direction: 'app-to-sheets', force: true })}
                    disabled={startSyncMutation.isPending || activeSync !== null}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Force Sync
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5" />
                  Shopify to App
                </CardTitle>
                <CardDescription>
                  Sync product updates from Shopify to your app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <Badge variant={syncStatus?.shopifyToApp?.enabled ? "default" : "secondary"}>
                    {syncStatus?.shopifyToApp?.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => startSyncMutation.mutate({ direction: 'shopify-to-app' })}
                    disabled={startSyncMutation.isPending || activeSync !== null}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Sync
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => startSyncMutation.mutate({ direction: 'shopify-to-app', force: true })}
                    disabled={startSyncMutation.isPending || activeSync !== null}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Force Sync
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Bidirectional Sync
                </CardTitle>
                <CardDescription>
                  Complete synchronization between app, Google Sheets, and Shopify
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <Badge variant={syncStatus?.bidirectional?.enabled ? "default" : "secondary"}>
                    {syncStatus?.bidirectional?.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => startSyncMutation.mutate({ direction: 'bidirectional' })}
                    disabled={startSyncMutation.isPending || activeSync !== null}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Full Sync
                  </Button>
                  {activeSync && (
                    <Button
                      variant="outline"
                      onClick={() => stopSyncMutation.mutate()}
                      disabled={stopSyncMutation.isPending}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Sync
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization History</CardTitle>
              <CardDescription>
                Recent synchronization operations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading sync logs...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncLogs?.map((log: SyncLog) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getSyncStatusColor(log.status)}`} />
                        <div>
                          <div className="font-medium">
                            {log.source} → {log.target}
                          </div>
                          <div className="text-sm text-gray-600">
                            {log.operation} - {log.itemsAffected} items affected
                          </div>
                          {log.errorMessage && (
                            <div className="text-sm text-red-600">{log.errorMessage}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No sync operations found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Conflicts</CardTitle>
              <CardDescription>
                Resolve conflicts between different data sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncStatus?.conflicts?.length > 0 ? (
                <div className="space-y-4">
                  {syncStatus.conflicts.map((conflict: any) => (
                    <div key={conflict.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{conflict.itemName}</h4>
                          <p className="text-sm text-gray-600">SKU: {conflict.sku}</p>
                        </div>
                        <Badge variant="destructive">Conflict</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h5 className="font-medium text-sm">App Data</h5>
                          <p className="text-sm">Quantity: {conflict.appData.quantity}</p>
                          <p className="text-sm">Price: ${conflict.appData.price}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm">Google Sheets</h5>
                          <p className="text-sm">Quantity: {conflict.sheetsData.quantity}</p>
                          <p className="text-sm">Price: ${conflict.sheetsData.price}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm">Shopify</h5>
                          <p className="text-sm">Quantity: {conflict.shopifyData.quantity}</p>
                          <p className="text-sm">Price: ${conflict.shopifyData.price}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => resolveConflictMutation.mutate({ 
                            conflictId: conflict.id, 
                            resolution: 'use-app' 
                          })}
                        >
                          Use App Data
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveConflictMutation.mutate({ 
                            conflictId: conflict.id, 
                            resolution: 'use-sheets' 
                          })}
                        >
                          Use Sheets Data
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveConflictMutation.mutate({ 
                            conflictId: conflict.id, 
                            resolution: 'use-shopify' 
                          })}
                        >
                          Use Shopify Data
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  No conflicts detected
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Sync Settings
              </CardTitle>
              <CardDescription>
                Configure synchronization behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-sync on changes</h4>
                    <p className="text-sm text-gray-600">Automatically sync when items are modified</p>
                  </div>
                  <Badge variant={syncStatus?.settings?.autoSync ? "default" : "secondary"}>
                    {syncStatus?.settings?.autoSync ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Conflict resolution</h4>
                    <p className="text-sm text-gray-600">Default action when conflicts are detected</p>
                  </div>
                  <Badge variant="outline">
                    {syncStatus?.settings?.conflictResolution || "Manual"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Sync frequency</h4>
                    <p className="text-sm text-gray-600">How often to check for changes</p>
                  </div>
                  <Badge variant="outline">
                    {syncStatus?.settings?.syncFrequency || "Every 5 minutes"}
                  </Badge>
                </div>
              </div>
              <Button className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Configure Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}