import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle,
  FileSpreadsheet,
  Webhook,
  RotateCcw
} from "lucide-react";

interface GoogleSheetsStatus {
  success: boolean;
  configured: boolean;
  requiredEnvVars: string[];
  webhookUrl: string;
}

export default function GoogleSheetsIntegration() {
  const { toast } = useToast();
  const [isSettingUp, setIsSettingUp] = useState(false);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<GoogleSheetsStatus>({
    queryKey: ["/api/shopify/sheets/status"],
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/shopify/sheets/setup");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Setup Complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shopify/sheets/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/shopify/sync/inventory");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/shopify/test/webhook");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Successful",
        description: `Test order ${data.testOrder} processed successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      await setupMutation.mutateAsync();
    } finally {
      setIsSettingUp(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Sheets Integration</h1>
          <p className="text-muted-foreground mt-2">
            Automatically sync Shopify orders with Google Sheets to prevent employee overselling
          </p>
        </div>
        <Button
          onClick={() => refetchStatus()}
          variant="outline"
          size="sm"
          disabled={statusLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Configuration Status
          </CardTitle>
          <CardDescription>
            Current status of your Google Sheets integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {status?.configured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="font-medium">
              {status?.configured ? "Configured" : "Not Configured"}
            </span>
            <Badge variant={status?.configured ? "default" : "destructive"}>
              {status?.configured ? "Ready" : "Setup Required"}
            </Badge>
          </div>

          {!status?.configured && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Setup Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need to configure these environment variables:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                    {status?.requiredEnvVars?.map((envVar) => (
                      <li key={envVar}>
                        <code className="bg-yellow-100 px-1 rounded">{envVar}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {status?.configured && (
            <div className="space-y-3">
              <Button
                onClick={handleSetup}
                disabled={isSettingUp || setupMutation.isPending}
                className="w-full"
              >
                {isSettingUp || setupMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                {isSettingUp ? "Setting up..." : "Setup Google Sheets"}
              </Button>
              <p className="text-sm text-muted-foreground">
                This will create the necessary sheets and sync your current inventory
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Shopify Webhook Setup
          </CardTitle>
          <CardDescription>
            Configure Shopify to automatically send order data to Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Webhook URL</h4>
            <div className="flex items-center gap-2">
              <code className="bg-blue-100 px-2 py-1 rounded text-sm flex-1">
                {status?.webhookUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(status?.webhookUrl || "");
                  toast({
                    title: "Copied!",
                    description: "Webhook URL copied to clipboard",
                  });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to your Shopify Admin → Settings → Notifications</li>
              <li>Scroll to "Webhooks" section</li>
              <li>Click "Create webhook"</li>
              <li>Set Event to "Order creation"</li>
              <li>Set Format to "JSON"</li>
              <li>Paste the webhook URL above</li>
              <li>Click "Save webhook"</li>
            </ol>
          </div>

          <Button
            onClick={() => testWebhookMutation.mutate()}
            variant="outline"
            disabled={testWebhookMutation.isPending}
          >
            {testWebhookMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Webhook className="h-4 w-4 mr-2" />
            )}
            Test Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Manual Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Manual Sync
          </CardTitle>
          <CardDescription>
            Manually sync your current inventory to Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !status?.configured}
            variant="outline"
            className="w-full"
          >
            {syncMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Sync Inventory Now
          </Button>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium">Order Received</h4>
              <p className="text-sm text-muted-foreground">
                Customer places order on Shopify
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h4 className="font-medium">Webhook Triggered</h4>
              <p className="text-sm text-muted-foreground">
                Shopify sends order data to your webhook
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h4 className="font-medium">Inventory Updated</h4>
              <p className="text-sm text-muted-foreground">
                Google Sheets and database automatically updated
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}