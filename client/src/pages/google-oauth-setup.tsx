import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, Key, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export default function GoogleOAuthSetupPage() {
  const { toast } = useToast();
  const [authCode, setAuthCode] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  // Get the actual auth URL from backend
  const { data: authData, isLoading } = useQuery({
    queryKey: ['/api/google-oauth/auth-url'],
  });

  const authUrl = authData?.authUrl || '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "URL copied to clipboard",
    });
  };

  const exchangeCodeForToken = async () => {
    if (!authCode) {
      toast({
        title: "Error",
        description: "Please enter the authorization code",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/google-oauth/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setRefreshToken(result.refresh_token);
        toast({
          title: "Success",
          description: "Refresh token generated successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to exchange code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to exchange authorization code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Google Sheets OAuth Setup</h1>
          <p className="text-muted-foreground">
            Get your Google Sheets refresh token for THCa inventory automation
          </p>
        </div>

        <div className="grid gap-6">
          {/* Step 1: Authorization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                Authorize Application
              </CardTitle>
              <CardDescription>
                Click the link below to authorize the application to access your Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-mono break-all">{authUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(authUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Authorization URL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(authUrl)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Enter Authorization Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                Enter Authorization Code
              </CardTitle>
              <CardDescription>
                After authorizing, Google will provide an authorization code. Enter it below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="authCode">Authorization Code</Label>
                <Input
                  id="authCode"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Enter the authorization code from Google"
                  className="font-mono"
                />
              </div>
              <Button
                onClick={exchangeCodeForToken}
                disabled={!authCode}
                className="flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                Generate Refresh Token
              </Button>
            </CardContent>
          </Card>

          {/* Step 3: Your Refresh Token */}
          {refreshToken && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                  Your Refresh Token
                </CardTitle>
                <CardDescription>
                  Copy this refresh token to your environment variables as GOOGLE_REFRESH_TOKEN
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border">
                  <p className="text-sm font-mono break-all text-green-800">{refreshToken}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(refreshToken)}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Refresh Token
                  </Button>
                </div>
                <Alert>
                  <AlertDescription>
                    <strong>Important:</strong> Save this refresh token as the <code>GOOGLE_REFRESH_TOKEN</code> environment variable. 
                    Once you add this token, the THCa inventory system will automatically deduct quantities from column B 
                    when orders are placed, using the KEY-ID in column G for matching.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Alternative Method */}
          <Card>
            <CardHeader>
              <CardTitle>Alternative: Google OAuth 2.0 Playground</CardTitle>
              <CardDescription>
                Use Google's official OAuth playground for a guided setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Steps for OAuth Playground:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to <a href="https://developers.google.com/oauthplayground" target="_blank" className="text-blue-600 underline">Google OAuth 2.0 Playground</a></li>
                    <li>Click the gear icon (Settings) and check "Use your own OAuth credentials"</li>
                    <li>Enter your Google Client ID and Client Secret</li>
                    <li>In Step 1, select "Google Sheets API v4" and authorize</li>
                    <li>In Step 2, click "Exchange authorization code for tokens"</li>
                    <li>Copy the refresh_token from the response</li>
                  </ol>
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => window.open('https://developers.google.com/oauthplayground', '_blank')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open OAuth Playground
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Once you have the refresh token, add it to your environment variables as <code>GOOGLE_REFRESH_TOKEN</code>. 
                  This will enable automatic THCa inventory deduction from column B when orders are placed, 
                  using the KEY-ID in column G for matching.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}