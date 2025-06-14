import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Cloud, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Activity,
  Database
} from "lucide-react";

interface GoogleAppsScriptStatus {
  configured: boolean;
  webhookUrl: string;
  apiUrl: string;
  syncSheetId: string;
  lastSync: string;
}

export default function GoogleAppsScriptAdminPage() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  // Check Google Apps Script status
  const { data: status, isLoading, refetch } = useQuery<GoogleAppsScriptStatus>({
    queryKey: ["/api/google-apps-script/status"],
  });

  // Sync inventory mutation
  const syncInventory = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-apps-script/sync-inventory");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Completed",
        description: `Successfully synced ${data.syncedItems} items to Google Sheets`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-apps-script/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSyncInventory = async () => {
    setSyncing(true);
    try {
      await syncInventory.mutateAsync();
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading configuration...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Cloud className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Google Apps Script Integration</h1>
          <p className="text-muted-foreground">
            Manage bidirectional sync between inventory, Shopify, and Google Sheets
          </p>
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.configured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            Integration Status
          </CardTitle>
          <CardDescription>
            Current configuration and connectivity status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Webhook URL</div>
              <Badge variant={status?.webhookUrl === 'Configured' ? 'default' : 'secondary'}>
                {status?.webhookUrl || 'Not configured'}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">API URL</div>
              <Badge variant={status?.apiUrl === 'Configured' ? 'default' : 'secondary'}>
                {status?.apiUrl || 'Not configured'}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Sync Sheet ID</div>
              <Badge variant={status?.syncSheetId !== 'Not set' ? 'default' : 'secondary'}>
                {status?.syncSheetId === 'Not set' ? 'Not configured' : 'Configured'}
              </Badge>
            </div>
          </div>

          {status?.configured ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Google Apps Script integration is fully configured and ready for use.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Google Apps Script integration requires configuration. Please ensure all URLs and IDs are set up.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Inventory Sync
            </CardTitle>
            <CardDescription>
              Push current inventory data to Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This will send all current inventory items to your Google Apps Script, 
              which will update the connected Google Sheets with the latest data.
            </div>
            
            <Button 
              onClick={handleSyncInventory}
              disabled={!status?.configured || syncing || syncInventory.isPending}
              className="w-full"
            >
              {syncing || syncInventory.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Sync Inventory to Sheets
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Webhook Status
            </CardTitle>
            <CardDescription>
              Monitor incoming webhook activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Your Google Apps Script can send webhooks to this system for 
              real-time updates from Shopify and Google Sheets changes.
            </div>
            
            <div className="text-xs font-mono bg-muted p-2 rounded">
              Webhook endpoint: /api/google-apps-script/webhook
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Details</CardTitle>
          <CardDescription>
            Your Google Apps Script configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Configured URLs</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Web App:</span>
                  <div className="font-mono text-xs text-muted-foreground break-all">
                    https://script.google.com/macros/s/AKfycbwkuyDk2hruKO0WRDOppaAJWD5TGvnt-Iky5LuTWtGBHMA4la3LapAexT9Wqw0ZQjZw/exec
                  </div>
                </div>
                <div>
                  <span className="font-medium">API Executable:</span>
                  <div className="font-mono text-xs text-muted-foreground break-all">
                    https://script.googleapis.com/v1/scripts/AKfycbwkuyDk2hruKO0WRDOppaAJWD5TGvnt-Iky5LuTWtGBHMA4la3LapAexT9Wqw0ZQjZw:run
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Connected Sheets</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Inventory Sheet:</span>
                  <div className="text-muted-foreground">1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU</div>
                </div>
                <div>
                  <span className="font-medium">Sync Sheet:</span>
                  <div className="text-muted-foreground">1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" asChild>
              <a 
                href="https://docs.google.com/spreadsheets/d/1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Sync Sheet
              </a>
            </Button>
            
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Flow Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Understanding the bidirectional sync flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium">Inventory App</h4>
              <p className="text-xs text-muted-foreground">
                Your inventory management system with 332+ items
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Cloud className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium">Google Apps Script</h4>
              <p className="text-xs text-muted-foreground">
                Middleware handling Shopify webhooks and Sheet updates
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <ExternalLink className="h-6 w-6 text-yellow-600" />
              </div>
              <h4 className="font-medium">Google Sheets</h4>
              <p className="text-xs text-muted-foreground">
                Live spreadsheet for team collaboration and tracking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}