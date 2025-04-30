import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, ShieldAlert, ShieldCheck, Store, RefreshCw, BarChart3, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ShopifyControlPanel() {
  const [status, setStatus] = useState<{
    pushEnabled: boolean;
    message: string;
  }>({ pushEnabled: false, message: "" });
  
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    store: string;
    message: string;
  }>({ connected: false, store: "", message: "" });
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success?: boolean;
    imported?: number;
    updated?: number;
    total?: number;
    message?: string;
    errors?: string[];
  } | null>(null);
  const { toast } = useToast();
  
  // Fetch initial status
  useEffect(() => {
    fetchShopifyStatus();
  }, []);
  
  const fetchShopifyStatus = async () => {
    setLoading(true);
    try {
      const statusResult = await apiRequest<{pushEnabled: boolean; message: string}>('/api/shopify/status');
      setStatus(statusResult);
      
      const connectionResult = await apiRequest<{connected: boolean; store: string; message: string}>('/api/shopify/test-connection');
      setConnectionStatus(connectionResult);
    } catch (error) {
      console.error("Failed to fetch Shopify status:", error);
      toast({
        title: "Error",
        description: "Failed to fetch Shopify integration status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const togglePushStatus = async () => {
    setUpdating(true);
    try {
      const result = await apiRequest<{pushEnabled: boolean; message: string}>('/api/shopify/set-push-status', {
        method: 'POST',
        body: JSON.stringify({ enabled: !status.pushEnabled }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setStatus(result);
      
      toast({
        title: result.pushEnabled ? "Shopify Push Enabled" : "Shopify Push Disabled",
        description: result.message,
        variant: result.pushEnabled ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Failed to toggle Shopify push status:", error);
      toast({
        title: "Error",
        description: "Failed to update Shopify push settings.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <Card className="border-gold/30 bg-black text-white">
      <CardHeader className="border-b border-gold/20 bg-gradient-to-r from-black to-black/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-gold" />
            <CardTitle className="text-gold">Shopify Integration</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gold/40 text-gold hover:bg-gold/10"
            onClick={fetchShopifyStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
        <CardDescription className="text-gray-400">
          Manage synchronization between your inventory and Shopify store
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 rounded border border-gold/20 bg-black/50">
          <div className="flex items-center gap-3">
            {connectionStatus.connected ? (
              <ShieldCheck className="h-8 w-8 text-green-500" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            )}
            <div>
              <h3 className="font-medium text-white">
                {connectionStatus.connected ? 'Connected to Shopify' : 'Not Connected to Shopify'}
              </h3>
              <p className="text-sm text-gray-400">
                {connectionStatus.connected 
                  ? `Connected to store: ${connectionStatus.store}` 
                  : connectionStatus.message || 'Check your Shopify API credentials'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Push Status Toggle */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-medium text-gold">Shopify Push Status</h3>
            <p className="text-sm text-gray-400">
              When enabled, inventory changes will automatically synchronize with your Shopify store.
              <strong className="block mt-1 text-amber-500">
                {status.pushEnabled 
                  ? '⚠️ Items will be pushed to Shopify when updated.' 
                  : '✓ Safe mode: Items will NOT be pushed to Shopify.'}
              </strong>
            </p>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded border border-gold/20 bg-black/50">
            <div className="flex items-center space-x-2">
              <Switch 
                id="shopify-push" 
                checked={status.pushEnabled}
                onCheckedChange={togglePushStatus}
                disabled={updating || !connectionStatus.connected}
                className={status.pushEnabled ? "bg-green-600" : ""}
              />
              <Label htmlFor="shopify-push" className="text-white cursor-pointer">
                {status.pushEnabled ? 'Push Enabled' : 'Push Disabled'}
              </Label>
            </div>
            
            <div className="flex items-center">
              {status.pushEnabled ? (
                <span className="px-2 py-1 text-xs rounded bg-green-600/20 text-green-500 border border-green-500/30">
                  Pushing to Shopify
                </span>
              ) : (
                <span className="px-2 py-1 text-xs rounded bg-amber-600/10 text-amber-500 border border-amber-500/30">
                  Not Pushing
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Status Message */}
        <div className="px-4 py-3 bg-black/40 border border-gold/10 rounded-md text-sm text-gray-300">
          Status: {status.message || "Loading status..."}
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-gold/20 pt-4 flex justify-between">
        <Button 
          variant="outline" 
          className="border-gold/40 text-gold hover:bg-gold/10"
          disabled={!connectionStatus.connected}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Shopify Analytics
        </Button>
        
        <Button 
          className="gold-btn"
          disabled={!connectionStatus.connected}
          onClick={() => {
            toast({
              title: "Coming Soon",
              description: "Shopify product sync panel will be available in the next update.",
            });
          }}
        >
          Manage Products
        </Button>
      </CardFooter>
    </Card>
  );
}