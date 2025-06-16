import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthDirectPage() {
  const { toast } = useToast();
  const [authCode, setAuthCode] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  // Automatically redirect to Google authorization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      setAuthCode(code);
      handleExchange(code);
      return;
    }

    // Generate and redirect to auth URL
    const redirectToAuth = async () => {
      try {
        const response = await fetch('/api/google-oauth/auto-generate-token', { method: 'POST' });
        const data = await response.json();
        
        if (data.success && data.authUrl) {
          // Redirect to Google OAuth in the same tab
          window.location.href = data.authUrl;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to start authorization",
          variant: "destructive",
        });
      }
    };

    redirectToAuth();
  }, []);

  const handleExchange = async (code: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/google-oauth/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
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

  const handleManualExchange = () => {
    if (!authCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the authorization code",
        variant: "destructive",
      });
      return;
    }
    handleExchange(authCode.trim());
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
          <h1 className="text-3xl font-bold">Authorizing Google Sheets Access</h1>
          <p className="text-muted-foreground mt-2">
            Setting up automatic THCa inventory deduction
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Processing authorization...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Manual Authorization Code Entry</CardTitle>
              <CardDescription>
                If you were redirected back with a code, enter it below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Enter authorization code here"
                className="font-mono"
              />
              <Button
                onClick={handleManualExchange}
                disabled={!authCode || loading}
                className="w-full"
              >
                Activate THCa System
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}