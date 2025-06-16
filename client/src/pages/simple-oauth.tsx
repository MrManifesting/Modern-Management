import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Key, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

export default function SimpleOAuthPage() {
  const { toast } = useToast();
  const [authCode, setAuthCode] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [step, setStep] = useState(1);

  // Generate OAuth URL
  const generateUrlMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-oauth/auto-generate-token', { method: 'POST' });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setAuthUrl(data.authUrl);
        setStep(2);
        // Automatically open the URL
        window.open(data.authUrl, '_blank');
        toast({
          title: "Authorization URL Ready",
          description: "Click the link to authorize, then return with your code",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate authorization URL",
        variant: "destructive",
      });
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
        setStep(3);
        toast({
          title: "THCa Inventory System Activated!",
          description: "Automatic quantity deduction is now working",
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

  const handleStartAuth = () => {
    generateUrlMutation.mutate();
  };

  const handleExchangeCode = () => {
    if (!authCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the authorization code",
        variant: "destructive",
      });
      return;
    }
    exchangeTokenMutation.mutate(authCode.trim());
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">THCa Inventory Setup</h1>
          <p className="text-muted-foreground mt-2">
            Enable automatic quantity deduction from column B in your spreadsheet
          </p>
        </div>

        {/* Step 1: Start Authorization */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Enable Automatic Inventory Deduction</CardTitle>
              <CardDescription>
                This will allow the system to automatically update THCa quantities when orders are placed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleStartAuth}
                disabled={generateUrlMutation.isPending}
                className="w-full flex items-center gap-2"
                size="lg"
              >
                <Key className="h-4 w-4" />
                {generateUrlMutation.isPending ? "Setting up..." : "Start Setup"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Get Authorization Code */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  Authorize Access
                </CardTitle>
                <CardDescription>
                  A new tab opened with Google authorization. Complete the authorization and copy the code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.open(authUrl, '_blank')}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Reopen Authorization Page
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  Enter Authorization Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste authorization code here"
                  className="font-mono"
                />
                <Button
                  onClick={handleExchangeCode}
                  disabled={!authCode || exchangeTokenMutation.isPending}
                  className="w-full flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  {exchangeTokenMutation.isPending ? "Activating..." : "Activate THCa System"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-6 w-6" />
                THCa Inventory System Active!
              </CardTitle>
              <CardDescription className="text-green-700">
                Automatic quantity deduction is now working
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  <strong>System Ready:</strong> When orders are placed through Shopify, the system will automatically:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Find the matching product using KEY-ID from column G</li>
                    <li>Deduct the ordered quantity from column B</li>
                    <li>Update your THCa Flower spreadsheet in real-time</li>
                    <li>Log all changes for tracking</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}