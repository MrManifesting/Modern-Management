import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertCircle, ExternalLink, FileSpreadsheet } from "lucide-react";

interface GoogleSheetsStatus {
  configured: boolean;
  connected: boolean;
  spreadsheetId: string | null;
  requiredEnvVars: string[];
}

export function GoogleSheetsSetup() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<GoogleSheetsStatus>({
    queryKey: ["/api/google-sheets/status"],
  });

  const configureSheets = useMutation({
    mutationFn: async (data: { spreadsheetId: string }) => {
      const response = await fetch("/api/google-sheets/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to configure Google Sheets");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Google Sheets integration configured successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/google-sheets/test", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Connection test failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Test",
        description: data.message || "Google Sheets connection successful",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfigure = () => {
    if (!spreadsheetId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a spreadsheet ID",
        variant: "destructive",
      });
      return;
    }
    configureSheets.mutate({ spreadsheetId: spreadsheetId.trim() });
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Google Sheets Integration</h1>
        <p className="text-muted-foreground">
          Connect your inventory with Google Sheets for real-time collaboration and data management
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
          
          {status?.spreadsheetId && (
            <div className="space-y-2">
              <Label>Current Spreadsheet ID</Label>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted p-2 rounded flex-1">
                  {status.spreadsheetId}
                </code>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${status.spreadsheetId}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configure Google Sheets</CardTitle>
          <CardDescription>
            Enter your Google Sheets spreadsheet ID to connect your inventory data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spreadsheet-id">Google Sheets Spreadsheet ID</Label>
            <Input
              id="spreadsheet-id"
              placeholder="1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Find this in your Google Sheets URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleConfigure}
              disabled={configureSheets.isPending}
            >
              {configureSheets.isPending ? "Configuring..." : "Configure"}
            </Button>
            
            {status?.configured && (
              <Button 
                variant="outline"
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? "Testing..." : "Test Connection"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your Google OAuth credentials are already configured. You just need to specify which spreadsheet to use.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Current Configuration:</h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Google OAuth Client configured
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Project ID: autoshopifysheet
              </li>
              <li className="flex items-center gap-2">
                {status?.spreadsheetId ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                Spreadsheet ID: {status?.spreadsheetId || "Not configured"}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}