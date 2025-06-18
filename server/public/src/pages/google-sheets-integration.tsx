import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  Sheet, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Settings, 
  ExternalLink,
  Upload,
  Download
} from "lucide-react";

interface GoogleSheetsStatus {
  configured: boolean;
  message: string;
}

interface ConfigStep {
  step: number;
  title: string;
  description: string;
}

interface ConfigGuide {
  steps: ConfigStep[];
  requiredEnvVars: string[];
  links: {
    googleCloudConsole: string;
    sheetsApiDocs: string;
  };
}

export default function GoogleSheetsIntegrationPage() {
  const { toast } = useToast();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [worksheetName, setWorksheetName] = useState("Inventory");

  // Check Google Sheets status
  const { data: status, isLoading: statusLoading } = useQuery<GoogleSheetsStatus>({
    queryKey: ["/api/google-sheets/status"],
  });

  // Get configuration guide
  const { data: configGuide } = useQuery<ConfigGuide>({
    queryKey: ["/api/google-sheets/config-guide"],
  });

  // Setup worksheet mutation
  const setupWorksheet = useMutation({
    mutationFn: async ({ spreadsheetId, worksheetName }: { spreadsheetId: string; worksheetName: string }) => {
      const response = await apiRequest("POST", "/api/google-sheets/setup", {
        spreadsheetId,
        worksheetName
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Worksheet Setup Complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup worksheet",
        variant: "destructive",
      });
    },
  });

  // Sync inventory mutation
  const syncInventory = useMutation({
    mutationFn: async ({ spreadsheetId, worksheetName }: { spreadsheetId: string; worksheetName: string }) => {
      const response = await apiRequest("POST", "/api/google-sheets/sync", {
        spreadsheetId,
        worksheetName
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inventory Synced",
        description: `${data.message} - ${data.itemCount} items synced`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync inventory",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnection = useMutation({
    mutationFn: async (spreadsheetId: string) => {
      const response = await apiRequest("POST", "/api/google-sheets/test-connection", {
        spreadsheetId
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Sheets",
        variant: "destructive",
      });
    },
  });

  const handleSetupWorksheet = () => {
    if (!spreadsheetId.trim() || !worksheetName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both spreadsheet ID and worksheet name",
        variant: "destructive",
      });
      return;
    }
    setupWorksheet.mutate({ spreadsheetId: spreadsheetId.trim(), worksheetName: worksheetName.trim() });
  };

  const handleSyncInventory = () => {
    if (!spreadsheetId.trim() || !worksheetName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both spreadsheet ID and worksheet name",
        variant: "destructive",
      });
      return;
    }
    syncInventory.mutate({ spreadsheetId: spreadsheetId.trim(), worksheetName: worksheetName.trim() });
  };

  const handleTestConnection = () => {
    if (!spreadsheetId.trim()) {
      toast({
        title: "Missing Spreadsheet ID",
        description: "Please provide a spreadsheet ID to test",
        variant: "destructive",
      });
      return;
    }
    testConnection.mutate(spreadsheetId.trim());
  };

  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleSpreadsheetUrlChange = (value: string) => {
    const id = extractSpreadsheetId(value);
    setSpreadsheetId(id);
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Sheet className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Google Sheets Integration</h1>
          <p className="text-muted-foreground">Automatically sync inventory data to Google Sheets for real-time tracking</p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {status?.configured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            <span>Integration Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={status?.configured ? "default" : "secondary"}>
                {status?.configured ? "Active" : "Not Configured"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {status?.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Spreadsheet Configuration</span>
            </CardTitle>
            <CardDescription>Configure your Google Sheets connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheetUrl">Google Sheets URL or ID</Label>
              <Input
                id="spreadsheetUrl"
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit or just the ID"
                value={spreadsheetId}
                onChange={(e) => handleSpreadsheetUrlChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste the full URL or just the spreadsheet ID from your Google Sheet
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="worksheetName">Worksheet Name</Label>
              <Input
                id="worksheetName"
                placeholder="Inventory"
                value={worksheetName}
                onChange={(e) => setWorksheetName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Name of the worksheet/tab where inventory data will be stored
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleTestConnection}
                disabled={!spreadsheetId.trim() || testConnection.isPending}
                variant="outline"
                className="w-full"
              >
                {testConnection.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSetupWorksheet}
                disabled={!spreadsheetId.trim() || !worksheetName.trim() || setupWorksheet.isPending}
                className="w-full"
              >
                {setupWorksheet.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Setup Worksheet
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSyncInventory}
                disabled={!spreadsheetId.trim() || !worksheetName.trim() || syncInventory.isPending}
                variant="secondary"
                className="w-full"
              >
                {syncInventory.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Inventory Now
              </Button>
            </div>

            {spreadsheetId && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Sheets
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Guide</CardTitle>
            <CardDescription>Follow these steps to configure Google Sheets integration</CardDescription>
          </CardHeader>
          <CardContent>
            {configGuide ? (
              <div className="space-y-4">
                {configGuide.steps.map((step) => (
                  <div key={step.step} className="flex space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-medium">Required Environment Variables</h4>
                  <div className="space-y-1">
                    {configGuide.requiredEnvVars.map((envVar) => (
                      <Badge key={envVar} variant="outline" className="mr-2">
                        {envVar}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-medium">Helpful Links</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(configGuide.links.googleCloudConsole, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Google Cloud Console
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(configGuide.links.sheetsApiDocs, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Sheets API Documentation
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Features</CardTitle>
          <CardDescription>What you can do with Google Sheets integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Real-time Sync</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically sync inventory changes to Google Sheets in real-time
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Sheet className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">Structured Data</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Organized inventory data with SKU, name, category, quantity, and pricing
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-purple-500" />
                <h4 className="font-medium">Change Tracking</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Track all inventory changes with timestamps and action details
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!status?.configured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Google Sheets integration is not configured. Please set up the required environment variables and follow the setup guide above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}