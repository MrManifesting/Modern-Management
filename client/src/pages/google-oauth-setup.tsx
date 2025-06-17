import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, CheckCircle, AlertCircle, Key, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface GoogleStatus {
  authenticated: boolean;
  isExpired?: boolean;
  hasRefreshToken?: boolean;
  scopes?: string[];
  message: string;
}

interface AuthUrlResponse {
  success: boolean;
  authUrl: string;
  message: string;
}

export default function GoogleOAuthSetupPage() {
  const [authCode, setAuthCode] = useState('');
  const { toast } = useToast();

  // Check current Google OAuth status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<GoogleStatus>({
    queryKey: ['/api/google/status'],
  });

  // Get authorization URL
  const { data: authInfo, refetch: getAuthUrl } = useQuery<AuthUrlResponse>({
    queryKey: ['/api/google/auth'],
    enabled: false
  });

  // Exchange authorization code for tokens
  const exchangeCode = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/google/callback', { code });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Authentication Successful",
        description: data.message,
      });
      setAuthCode('');
      queryClient.invalidateQueries({ queryKey: ['/api/google/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to complete OAuth authentication",
        variant: "destructive",
      });
    },
  });

  // Refresh access token
  const refreshToken = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google/refresh');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Token Refreshed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/google/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh access token",
        variant: "destructive",
      });
    },
  });

  // Test Google Sheets access
  const testSheets = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/google/test-sheets');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sheets Test Successful",
        description: `Connected to: ${data.spreadsheet?.title}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sheets Test Failed",
        description: error.message || "Failed to access Google Sheets",
        variant: "destructive",
      });
    },
  });

  // Revoke tokens
  const revokeTokens = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google/revoke');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Tokens Revoked",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/google/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Revoke Failed",
        description: error.message || "Failed to revoke tokens",
        variant: "destructive",
      });
    },
  });

  const handleGetAuthUrl = () => {
    getAuthUrl();
  };

  const handleExchangeCode = () => {
    if (!authCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter the authorization code from Google",
        variant: "destructive",
      });
      return;
    }
    exchangeCode.mutate(authCode.trim());
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google OAuth Setup</h1>
        <p className="text-gray-600">
          Configure Google OAuth authentication for enhanced Google Sheets integration
        </p>
      </div>

      <div className="grid gap-6">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Checking authentication status...</span>
              </div>
            ) : status ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {status.authenticated ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {status.authenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                  {status.isExpired && (
                    <Badge variant="destructive">Token Expired</Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-600">{status.message}</p>
                
                {status.authenticated && (
                  <div className="space-y-2">
                    {status.hasRefreshToken && (
                      <Badge variant="secondary">Has Refresh Token</Badge>
                    )}
                    {status.scopes && status.scopes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Granted Scopes:</p>
                        <div className="flex flex-wrap gap-1">
                          {status.scopes.map((scope, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {scope.replace('https://www.googleapis.com/auth/', '')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchStatus()}
                    disabled={statusLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${statusLoading ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </Button>
                  
                  {status.authenticated && status.isExpired && status.hasRefreshToken && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshToken.mutate()}
                      disabled={refreshToken.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${refreshToken.isPending ? 'animate-spin' : ''}`} />
                      Refresh Token
                    </Button>
                  )}

                  {status.authenticated && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testSheets.mutate()}
                      disabled={testSheets.isPending}
                    >
                      Test Sheets Access
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to check authentication status. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* OAuth Setup Card */}
        {(!status?.authenticated || status?.isExpired) && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Google OAuth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Follow these steps to authenticate with Google:
                </p>
                <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                  <li>Click "Get Authorization URL" to generate the authentication link</li>
                  <li>Visit the URL and grant permissions to your application</li>
                  <li>Copy the authorization code from Google</li>
                  <li>Paste the code below and click "Complete Authentication"</li>
                </ol>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handleGetAuthUrl}
                  disabled={getAuthUrl.isLoading}
                  className="w-full"
                >
                  {getAuthUrl.isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Get Authorization URL
                </Button>

                {authInfo?.authUrl && (
                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                      <p>Click the link below to authorize your application:</p>
                      <a
                        href={authInfo.authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {authInfo.authUrl}
                      </a>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label htmlFor="authCode" className="text-sm font-medium">
                    Authorization Code from Google:
                  </label>
                  <Input
                    id="authCode"
                    type="text"
                    placeholder="Paste the authorization code here..."
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleExchangeCode}
                  disabled={!authCode.trim() || exchangeCode.isPending}
                  className="w-full"
                >
                  {exchangeCode.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Complete Authentication
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Management Actions */}
        {status?.authenticated && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Manage your Google OAuth authentication and test connectivity.
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => testSheets.mutate()}
                    disabled={testSheets.isPending}
                  >
                    {testSheets.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Test Google Sheets
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => revokeTokens.mutate()}
                    disabled={revokeTokens.isPending}
                  >
                    {revokeTokens.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    Revoke Access
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}