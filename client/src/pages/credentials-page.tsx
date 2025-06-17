import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Credentials {
  shopify?: {
    isValid: boolean;
    lastUsed?: string;
  };
  googleSheets?: {
    isValid: boolean;
    lastUsed?: string;
  };
}

export default function CredentialsPage() {
  const { toast } = useToast();
  const [showShopifyToken, setShowShopifyToken] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);

  // Fetch current credentials status
  const { data: credentials = {}, isLoading } = useQuery<Credentials>({
    queryKey: ["/api/credentials/status"],
  });

  // Shopify credentials mutation
  const shopifyMutation = useMutation({
    mutationFn: async (data: { store: string; accessToken: string }) => {
      const res = await apiRequest("POST", "/api/credentials/shopify", {
        name: "Shopify Store Credentials",
        credentials: {
          shopifyStore: data.store,
          shopifyAccessToken: data.accessToken
        }
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials/status"] });
      toast({
        title: "Shopify credentials updated",
        description: "Successfully connected to your Shopify store",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update Shopify credentials",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Google Sheets credentials mutation
  const googleSheetsMutation = useMutation({
    mutationFn: async (data: { clientId: string; clientSecret: string; spreadsheetId: string }) => {
      const res = await apiRequest("POST", "/api/credentials/google-sheets", {
        name: "Google Sheets Credentials",
        credentials: data
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials/status"] });
      toast({
        title: "Google Sheets credentials updated",
        description: "Successfully connected to your Google Sheets",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update Google Sheets credentials",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection mutations
  const testShopifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/credentials/test/shopify");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Shopify connection successful",
        description: `Connected to store: ${data.shopName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Shopify connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testGoogleSheetsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/credentials/test/google-sheets");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Google Sheets connection successful",
        description: `Connected to spreadsheet: ${data.title}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Google Sheets connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleShopifySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    shopifyMutation.mutate({
      store: formData.get("store") as string,
      accessToken: formData.get("accessToken") as string,
    });
  };

  const handleGoogleSheetsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    googleSheetsMutation.mutate({
      clientId: formData.get("clientId") as string,
      clientSecret: formData.get("clientSecret") as string,
      spreadsheetId: formData.get("spreadsheetId") as string,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading credentials...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Integration Credentials</h1>
          <p className="text-muted-foreground mt-2">
            Configure your Shopify and Google Sheets credentials for automatic syncing
          </p>
        </div>

        <Tabs defaultValue="shopify" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shopify" className="flex items-center gap-2">
              Shopify
              {credentials.shopify?.isValid && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="google-sheets" className="flex items-center gap-2">
              Google Sheets
              {credentials.googleSheets?.isValid && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shopify">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Shopify Configuration
                  {credentials.shopify?.isValid ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Connect your Shopify store to sync products and orders automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You'll need a Private App access token from your Shopify admin.{" "}
                    <a
                      href="https://help.shopify.com/en/manual/apps/private-apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                    >
                      Learn how to create one
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleShopifySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store">Store URL</Label>
                    <Input
                      id="store"
                      name="store"
                      placeholder="your-store.myshopify.com"
                      defaultValue={credentials?.shopify?.store || ""}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Private App Access Token</Label>
                    <div className="relative">
                      <Input
                        id="accessToken"
                        name="accessToken"
                        type={showShopifyToken ? "text" : "password"}
                        placeholder="shppa_..."
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowShopifyToken(!showShopifyToken)}
                      >
                        {showShopifyToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={shopifyMutation.isPending}
                    >
                      {shopifyMutation.isPending ? "Saving..." : "Save Credentials"}
                    </Button>
                    
                    {credentials?.shopify?.isValid && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => testShopifyMutation.mutate()}
                        disabled={testShopifyMutation.isPending}
                      >
                        {testShopifyMutation.isPending ? "Testing..." : "Test Connection"}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="google-sheets">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Google Sheets Configuration
                  {credentials?.googleSheets?.isValid ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Connect your Google Sheets to sync inventory data automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You'll need to create OAuth2 credentials in the Google Cloud Console.{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                    >
                      Google Cloud Console
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleGoogleSheetsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      name="clientId"
                      placeholder="client-id.googleusercontent.com"
                      defaultValue={credentials?.googleSheets?.clientId || ""}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="clientSecret"
                        name="clientSecret"
                        type={showGoogleSecret ? "text" : "password"}
                        placeholder="GOCSPX-..."
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                      >
                        {showGoogleSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                    <Input
                      id="spreadsheetId"
                      name="spreadsheetId"
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      defaultValue={credentials?.googleSheets?.spreadsheetId || ""}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Found in the URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={googleSheetsMutation.isPending}
                    >
                      {googleSheetsMutation.isPending ? "Saving..." : "Save Credentials"}
                    </Button>
                    
                    {credentials?.googleSheets?.isValid && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => testGoogleSheetsMutation.mutate()}
                        disabled={testGoogleSheetsMutation.isPending}
                      >
                        {testGoogleSheetsMutation.isPending ? "Testing..." : "Test Connection"}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}