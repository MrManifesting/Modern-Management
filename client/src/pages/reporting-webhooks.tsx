import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Send, Settings, Users, DollarSign, Package, AlertTriangle } from "lucide-react";

export default function ReportingWebhooks() {
  const [testEvent, setTestEvent] = useState('daily_sales');
  const [testData, setTestData] = useState('{"test": true}');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configuredWebhooks, isLoading } = useQuery({
    queryKey: ['/api/webhooks/reporting/configured'],
  });

  const testWebhookMutation = useMutation({
    mutationFn: (data: { event: string; data: any }) => 
      apiRequest('/api/webhooks/reporting/test', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "Test Webhook Sent",
        description: "Test webhook has been sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to send test webhook",
        variant: "destructive",
      });
    },
  });

  const sendDailySalesReportMutation = useMutation({
    mutationFn: () => apiRequest('/api/webhooks/reporting/daily-sales', { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Daily Sales Report Sent",
        description: "Daily sales report has been sent to configured webhooks",
      });
    },
    onError: () => {
      toast({
        title: "Report Failed",
        description: "Failed to send daily sales report",
        variant: "destructive",
      });
    },
  });

  const handleTestWebhook = () => {
    try {
      const parsedData = JSON.parse(testData);
      testWebhookMutation.mutate({ event: testEvent, data: parsedData });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON test data",
        variant: "destructive",
      });
    }
  };

  const eventTypes = [
    { value: 'daily_sales', label: 'Daily Sales Report', icon: DollarSign, description: 'Automated daily sales summary' },
    { value: 'customer_tier_update', label: 'Customer Tier Update', icon: Users, description: 'When customers change tiers' },
    { value: 'inventory_alert', label: 'Inventory Alert', icon: Package, description: 'Low stock notifications' },
    { value: 'big_spender_activity', label: 'Big Spender Activity', icon: AlertTriangle, description: 'High-value customer orders' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Reporting Webhooks</h1>
        <div className="text-center py-8">Loading webhook configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reporting Webhooks</h1>
        <p className="text-gray-600">Configure and test automated reporting webhooks for big spender prioritization</p>
      </div>

      {/* Configured Webhooks Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Currently configured webhook endpoints for automated reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configuredWebhooks?.webhooks?.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {configuredWebhooks.webhooks.map((webhook: string) => (
                <div key={webhook} className="flex items-center gap-2">
                  <Badge variant="default" className="capitalize">
                    {webhook.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-green-600">Configured</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No webhooks configured. Set environment variables:
              <ul className="mt-2 text-sm">
                <li>DAILY_SALES_WEBHOOK_URL</li>
                <li>CUSTOMER_TIER_WEBHOOK_URL</li>
                <li>INVENTORY_ALERT_WEBHOOK_URL</li>
                <li>BIG_SPENDER_WEBHOOK_URL</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Event Types</CardTitle>
          <CardDescription>
            Webhook events available for customer prioritization and reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {eventTypes.map((event) => {
              const Icon = event.icon;
              return (
                <div key={event.value} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-blue-600" />
                    <h3 className="font-medium">{event.label}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Daily Sales Report
            </CardTitle>
            <CardDescription>
              Manually trigger daily sales report for big spender analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => sendDailySalesReportMutation.mutate()}
              disabled={sendDailySalesReportMutation.isPending}
              className="w-full"
            >
              {sendDailySalesReportMutation.isPending ? 'Sending...' : 'Send Daily Report'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Test Webhook
            </CardTitle>
            <CardDescription>
              Send test webhook to verify configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={testEvent} onValueChange={setTestEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="test-data">Test Data (JSON)</Label>
              <Textarea
                id="test-data"
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                placeholder='{"test": true, "message": "Test webhook"}'
                rows={3}
              />
            </div>
            
            <Button 
              onClick={handleTestWebhook}
              disabled={testWebhookMutation.isPending}
              className="w-full"
            >
              {testWebhookMutation.isPending ? 'Sending...' : 'Send Test Webhook'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Environment Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Configure webhook URLs in your environment to enable automated reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Environment Variables:</h4>
            <div className="space-y-1 text-sm font-mono">
              <div>DAILY_SALES_WEBHOOK_URL=https://your-endpoint.com/daily-sales</div>
              <div>CUSTOMER_TIER_WEBHOOK_URL=https://your-endpoint.com/tier-updates</div>
              <div>INVENTORY_ALERT_WEBHOOK_URL=https://your-endpoint.com/inventory</div>
              <div>BIG_SPENDER_WEBHOOK_URL=https://your-endpoint.com/big-spenders</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}