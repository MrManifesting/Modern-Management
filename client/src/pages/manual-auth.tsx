import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ManualAuthPage() {
  const { toast } = useToast();
  const [authCode, setAuthCode] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  // The authorization URL that works with manual code entry
  const authUrl = "https://accounts.google.com/o/oauth2/auth?client_id=536787707205-m341hd8k20lii5tt71k443bakhtec5s0.apps.googleusercontent.com&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&response_type=code&access_type=offline&prompt=consent";

  const copyUrl = () => {
    navigator.clipboard.writeText(authUrl);
    toast({
      title: "Copied",
      description: "Authorization URL copied to clipboard",
    });
  };

  const handleExchange = async () => {
    if (!authCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the authorization code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/google-oauth/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsComplete(true);
        toast({
          title: "THCa System Activated!",
          description: "Automatic inventory deduction is now working",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to activate system",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to complete authorization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isComplete) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-6 w-6" />
              THCa Inventory System Active!
            </CardTitle>
            <CardDescription className="text-green-700">
              Automatic quantity deduction is now operational
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <strong>System Ready:</strong> When Shopify orders are placed, the system will automatically:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Find matching products using KEY-ID from column G</li>
                  <li>Deduct ordered quantities from column B</li>
                  <li>Update your THCa Flower spreadsheet in real-time</li>
                  <li>Log all changes for tracking</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Authorize Google Sheets Access</h1>
          <p className="text-muted-foreground mt-2">
            Enable automatic THCa inventory deduction
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step 1: Visit Authorization URL</CardTitle>
            <CardDescription>
              Copy and paste this URL into a new browser tab to authorize access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border text-sm font-mono break-all">
              {authUrl}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyUrl} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
              <Button 
                onClick={() => window.open(authUrl, '_blank')} 
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Enter Authorization Code</CardTitle>
            <CardDescription>
              After authorizing, Google will show you a code. Copy and paste it here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Paste authorization code here"
              className="font-mono"
            />
            <Button
              onClick={handleExchange}
              disabled={!authCode || loading}
              className="w-full"
            >
              {loading ? "Activating..." : "Activate THCa System"}
            </Button>
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click "Open in New Tab" or copy the URL above</li>
              <li>Sign in with your Google account that has access to your THCa spreadsheet</li>
              <li>Click "Allow" to grant spreadsheet permissions</li>
              <li>Copy the authorization code Google shows you</li>
              <li>Paste the code in the field above and click "Activate THCa System"</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}