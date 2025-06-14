import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Webhook {
  topic: string;
  endpoint: string;
  description: string;
  required: boolean;
}

const webhooks: Webhook[] = [
  {
    topic: "products/create",
    endpoint: "/api/shopify/webhooks/products/create",
    description: "Automatically create inventory items when products are added to Shopify",
    required: true
  },
  {
    topic: "products/update", 
    endpoint: "/api/shopify/webhooks/products/update",
    description: "Update inventory items when products are modified in Shopify",
    required: true
  },
  {
    topic: "products/delete",
    endpoint: "/api/shopify/webhooks/products/delete", 
    description: "Mark inventory items as inactive when products are deleted from Shopify",
    required: true
  },
  {
    topic: "inventory_levels/update",
    endpoint: "/api/shopify/webhooks/inventory_levels/update",
    description: "Sync inventory quantities when stock levels change in Shopify",
    required: true
  },
  {
    topic: "orders/create",
    endpoint: "/api/shopify/webhooks/orders/create",
    description: "Automatically reduce inventory when orders are placed",
    required: true
  },
  {
    topic: "orders/cancelled",
    endpoint: "/api/shopify/webhooks/orders/cancelled",
    description: "Restore inventory when orders are cancelled",
    required: false
  },
  {
    topic: "refunds/create",
    endpoint: "/api/shopify/webhooks/refunds/create", 
    description: "Restore inventory when refunds are processed",
    required: false
  },
  {
    topic: "customers/create",
    endpoint: "/api/shopify/webhooks/customers/create",
    description: "Track new customer registrations",
    required: false
  },
  {
    topic: "app/uninstalled",
    endpoint: "/api/shopify/webhooks/app/uninstalled",
    description: "Clean up data when app is uninstalled",
    required: false
  }
];

export default function ShopifyWebhooksPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhookStatus();
  }, []);

  const fetchWebhookStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/shopify/webhooks/status');
      const data = await response.json();
      
      if (data.success) {
        setBaseUrl(data.baseUrl);
        setWebhookSecret(data.webhookSecret === 'configured' ? 'CONFIGURED' : 'NOT SET');
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Failed to fetch webhook status:", error);
      setStatus("error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL copied successfully",
    });
  };

  const getFullWebhookUrl = (endpoint: string) => {
    return `${baseUrl}${endpoint}`;
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shopify Webhook Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Set up these webhooks in your Shopify admin to enable real-time synchronization between your store and inventory system.
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {webhookSecret === "CONFIGURED" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Base URL</Label>
              <div className="flex gap-2">
                <Input value={baseUrl} readOnly />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(baseUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Webhook Secret</Label>
              <Badge variant={webhookSecret === "CONFIGURED" ? "default" : "secondary"}>
                {webhookSecret}
              </Badge>
            </div>
          </div>
          
          {webhookSecret !== "CONFIGURED" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Configure SHOPIFY_WEBHOOK_SECRET environment variable for enhanced security.
                This is optional but recommended for production use.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to configure webhooks in your Shopify admin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">1</Badge>
              <div>
                <p className="font-medium">Access Shopify Admin</p>
                <p className="text-sm text-muted-foreground">
                  Go to your Shopify admin → Settings → Notifications
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">2</Badge>
              <div>
                <p className="font-medium">Scroll to Webhooks Section</p>
                <p className="text-sm text-muted-foreground">
                  Find the "Webhooks" section at the bottom of the Notifications page
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">3</Badge>
              <div>
                <p className="font-medium">Create Webhooks</p>
                <p className="text-sm text-muted-foreground">
                  Click "Create webhook" and add each webhook URL from the list below
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">4</Badge>
              <div>
                <p className="font-medium">Set Format to JSON</p>
                <p className="text-sm text-muted-foreground">
                  Ensure the webhook format is set to JSON for all webhooks
                </p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open('https://admin.shopify.com/settings/notifications', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Shopify Admin Notifications
          </Button>
        </CardContent>
      </Card>

      {/* Webhook URLs */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Webhook URLs</h2>
        
        {/* Required Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required Webhooks</CardTitle>
            <CardDescription>
              These webhooks are essential for core inventory synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhooks.filter(w => w.required).map((webhook) => (
              <div key={webhook.topic} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">REQUIRED</Badge>
                    <span className="font-medium">{webhook.topic}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getFullWebhookUrl(webhook.endpoint))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{webhook.description}</p>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
                  {getFullWebhookUrl(webhook.endpoint)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optional Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optional Webhooks</CardTitle>
            <CardDescription>
              These webhooks provide additional functionality and are recommended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhooks.filter(w => !w.required).map((webhook) => (
              <div key={webhook.topic} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">OPTIONAL</Badge>
                    <span className="font-medium">{webhook.topic}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getFullWebhookUrl(webhook.endpoint))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{webhook.description}</p>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
                  {getFullWebhookUrl(webhook.endpoint)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Testing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Webhooks</CardTitle>
          <CardDescription>
            After setting up webhooks, test them to ensure they're working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>To test webhooks:</strong>
              <br />
              1. Create a test product in your Shopify admin
              <br />
              2. Check your inventory system to see if the product appears
              <br />
              3. Update the product in Shopify and verify changes sync
              <br />
              4. Place a test order and verify inventory quantities decrease
            </AlertDescription>
          </Alert>
          
          <Button
            variant="outline"
            onClick={fetchWebhookStatus}
            className="w-full"
          >
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}