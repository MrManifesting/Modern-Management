import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, Key, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function QuickOAuthSetupPage() {
  const { toast } = useToast();
  const [authCode, setAuthCode] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Get OAuth setup info
  const { data: authData, isLoading } = useQuery({
    queryKey: ['/api/google-oauth/auto-generate-token'],
    queryFn: async () => {
      const response = await fetch('/api/google-oauth/auto-generate-token', { method: 'POST' });
      return response.json();
    }
  });

  // Exchange code for token
  const exchangeTokenMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/google-oauth/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setRefreshToken(data.refresh_token);
        setIsComplete(true);
        toast({
          title: "Success!",
          description: "Refresh token generated. THCa inventory system is now ready!",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to generate token",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to exchange authorization code",
        variant: "destructive",
      });
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const handleExchange = () => {
    if (!authCode) {
      toast({
        title: "Error",
        description: "Please enter the authorization code",
        variant: "destructive",
      });
      return;
    }
    exchangeTokenMutation.mutate(authCode);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Quick OAuth Setup</h1>
          <p className="text-muted-foreground mt-2">
            Enable THCa inventory automation in 2 simple steps
          </p>
        </div>

        {!isComplete && (
          <>
            {/* Step 1: Authorization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  Get Authorization Code
                </CardTitle>
                <CardDescription>
                  Click to authorize the application with your Google account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => window.open(authData?.authUrl, '_blank')}
                  className="w-full flex items-center gap-2"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4" />
                  Authorize Google Sheets Access
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  This will open Google's authorization page in a new tab
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Enter Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  Enter Authorization Code
                </CardTitle>
                <CardDescription>
                  Copy the code from Google and paste it below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="authCode">Authorization Code</Label>
                  <Input
                    id="authCode"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste authorization code here"
                    className="font-mono"
                  />
                </div>
                <Button
                  onClick={handleExchange}
                  disabled={!authCode || exchangeTokenMutation.isPending}
                  className="w-full flex items-center gap-2"
                  size="lg"
                >
                  <Key className="h-4 w-4" />
                  {exchangeTokenMutation.isPending ? "Generating..." : "Generate Refresh Token"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Success State */}
        {isComplete && refreshToken && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-6 w-6" />
                Setup Complete!
              </CardTitle>
              <CardDescription className="text-green-700">
                Your THCa inventory system is now fully operational
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Refresh Token Generated:</strong> The system can now automatically deduct quantities from column B 
                  in your THCa spreadsheet when orders are placed, using KEY-ID matching from column G.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-white rounded-lg border">
                <Label className="text-sm font-medium">Refresh Token (save this securely)</Label>
                <div className="mt-2 p-2 bg-gray-50 rounded font-mono text-xs break-all">
                  {refreshToken}
                </div>
                <Button
                  onClick={() => copyToClipboard(refreshToken)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Token
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">What happens next:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Shopify orders automatically reduce THCa inventory quantities</li>
                  <li>Column B amounts update in real-time using KEY-ID matching</li>
                  <li>All inventory changes are logged for tracking</li>
                  <li>System works seamlessly with your existing workflow</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}