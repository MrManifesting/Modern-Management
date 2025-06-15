import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  Settings, 
  Key, 
  ExternalLink,
  Copy,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AuthConfig {
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  spreadsheetId?: string;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'error';
}

export default function GoogleSheetsAuthConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [refreshToken, setRefreshToken] = useState("");

  // Fetch current configuration
  const { data: config, isLoading } = useQuery<AuthConfig>({
    queryKey: ['/api/google-sheets/config'],
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-sheets/test-connection", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Test",
        description: data.success ? "Successfully connected to Google Sheets" : "Connection failed",
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/google-sheets/config'] });
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Failed to test Google Sheets connection",
        variant: "destructive"
      });
    }
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await apiRequest("POST", "/api/google-sheets/config", configData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Google Sheets authentication settings updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/google-sheets/config'] });
    },
    onError: () => {
      toast({
        title: "Save Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    }
  });

  const handleSaveConfig = () => {
    if (!clientId || !clientSecret || !spreadsheetId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    saveConfigMutation.mutate({
      clientId,
      clientSecret,
      spreadsheetId,
      refreshToken: refreshToken || undefined
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`
    });
  };

  const generateAuthUrl = () => {
    const redirectUri = `${window.location.origin}/google-sheets-auth`;
    const scope = "https://www.googleapis.com/auth/spreadsheets";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&access_type=offline&prompt=consent`;
    
    window.open(authUrl, '_blank');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-gold" />
          <div>
            <h1 className="text-3xl font-bold text-gold">Google Sheets Authentication</h1>
            <p className="text-muted-foreground">Configure Google Sheets integration for inventory synchronization</p>
          </div>
        </div>

        {/* Status Overview */}
        <Card className="border-gold/30 bg-black/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {config?.hasClientId ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Client ID</span>
                <Badge variant={config?.hasClientId ? "default" : "destructive"}>
                  {config?.hasClientId ? "Set" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {config?.hasClientSecret ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Client Secret</span>
                <Badge variant={config?.hasClientSecret ? "default" : "destructive"}>
                  {config?.hasClientSecret ? "Set" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {config?.hasRefreshToken ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Refresh Token</span>
                <Badge variant={config?.hasRefreshToken ? "default" : "destructive"}>
                  {config?.hasRefreshToken ? "Set" : "Missing"}
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button 
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                variant="outline"
                size="sm"
              >
                {testConnectionMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
              
              {config?.status && (
                <Badge variant={config.status === 'connected' ? 'default' : 'destructive'}>
                  {config.status === 'connected' ? 'Connected' : 'Disconnected'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card className="border-gold/30 bg-black/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Authentication Configuration
            </CardTitle>
            <CardDescription>
              Configure Google Sheets API credentials for inventory synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                To get these credentials, visit the{" "}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gold hover:underline inline-flex items-center gap-1"
                >
                  Google Cloud Console
                  <ExternalLink className="h-3 w-3" />
                </a>
                {" "}and create OAuth 2.0 credentials.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="clientId"
                    type="password"
                    placeholder="Enter Google OAuth Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="bg-black/40 border-gold/30"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(clientId, "Client ID")}
                    disabled={!clientId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="Enter Google OAuth Client Secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="bg-black/40 border-gold/30"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(clientSecret, "Client Secret")}
                    disabled={!clientSecret}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
              <div className="flex gap-2">
                <Input
                  id="spreadsheetId"
                  placeholder="Enter Google Sheets Spreadsheet ID"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="bg-black/40 border-gold/30"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(spreadsheetId, "Spreadsheet ID")}
                  disabled={!spreadsheetId}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Found in the Google Sheets URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="refreshToken"
                  type="password"
                  placeholder="Enter refresh token if available"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  className="bg-black/40 border-gold/30"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(refreshToken, "Refresh Token")}
                  disabled={!refreshToken}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex gap-3">
              <Button 
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending}
                className="bg-gold text-black hover:bg-gold/80"
              >
                {saveConfigMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>

              {clientId && (
                <Button 
                  onClick={generateAuthUrl}
                  variant="outline"
                  className="border-gold/50 text-gold hover:bg-gold/20"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Authorize with Google
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="border-gold/30 bg-black/60">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Create Google Cloud Project</h4>
              <p className="text-sm text-muted-foreground">
                Visit Google Cloud Console and create a new project or select an existing one.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">2. Enable Google Sheets API</h4>
              <p className="text-sm text-muted-foreground">
                In the API Library, search for and enable the Google Sheets API.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">3. Create OAuth 2.0 Credentials</h4>
              <p className="text-sm text-muted-foreground">
                Go to Credentials → Create Credentials → OAuth 2.0 Client ID. Set authorized redirect URI to:
              </p>
              <div className="bg-black/40 p-2 rounded border border-gold/30 font-mono text-sm">
                {window.location.origin}/google-sheets-auth
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">4. Get Spreadsheet ID</h4>
              <p className="text-sm text-muted-foreground">
                Copy the ID from your Google Sheets URL between /d/ and /edit.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}