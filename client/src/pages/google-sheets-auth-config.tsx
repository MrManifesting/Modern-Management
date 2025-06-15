import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, XCircle, AlertCircle, Key, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GoogleSheetsAuthConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [credentials, setCredentials] = useState({
    clientId: "",
    clientSecret: "",
    refreshToken: ""
  });

  // Check current Google Sheets status
  const { data: sheetsStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/google-sheets/status'],
  });

  // Test Google Sheets connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-sheets/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: '1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Connection test failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: data.message,
      });
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const isConfigured = sheetsStatus?.configured;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-900">Google Sheets Authentication</h1>
          <p className="text-amber-700">Configure Google Sheets API access for order processing</p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-4 w-4 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking connection status...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Google Sheets Integration:</span>
                <Badge variant={isConfigured ? "default" : "destructive"}>
                  {isConfigured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Order Spreadsheet:</p>
                  <p className="text-gray-600">1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s</p>
                </div>
                <div>
                  <p className="font-medium">Inventory Spreadsheet:</p>
                  <p className="text-gray-600">1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU</p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending}
                  variant="outline"
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Google Sheets API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To enable Google Sheets integration, you need to set up Google Cloud credentials and add them as environment variables.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Step 1: Create Google Cloud Project</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Enable the Google Sheets API for your project</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Step 2: Create Service Account</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Navigate to "IAM & Admin" → "Service Accounts"</li>
              <li>Click "Create Service Account"</li>
              <li>Give it a name and description</li>
              <li>Download the JSON credentials file</li>
              <li>Extract the following values from the JSON file:</li>
            </ol>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">Required Environment Variables:</p>
              <div className="space-y-2 text-sm font-mono">
                <div>GOOGLE_CLIENT_ID=your_client_id_here</div>
                <div>GOOGLE_CLIENT_SECRET=your_client_secret_here</div>
                <div>GOOGLE_REFRESH_TOKEN=your_refresh_token_here</div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Step 3: Share Spreadsheets</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open your Google Sheets spreadsheets</li>
              <li>Click "Share" in the top right</li>
              <li>Add your service account email address</li>
              <li>Give it "Editor" permissions</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Step 4: OAuth Setup (for Refresh Token)</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to "APIs & Services" → "Credentials"</li>
              <li>Create "OAuth 2.0 Client ID" credentials</li>
              <li>Set application type to "Desktop application"</li>
              <li>Use the OAuth playground to generate a refresh token</li>
              <li>Visit <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OAuth 2.0 Playground</a></li>
              <li>Select "Google Sheets API v4" scope</li>
              <li>Exchange authorization code for tokens</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testConnectionMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={testConnectionMutation.data.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Status:</strong> {testConnectionMutation.data.success ? "Success" : "Failed"}
                <br />
                <strong>Message:</strong> {testConnectionMutation.data.message}
                {testConnectionMutation.data.spreadsheetUrl && (
                  <>
                    <br />
                    <strong>Spreadsheet:</strong> <a href={testConnectionMutation.data.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open in Google Sheets</a>
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}