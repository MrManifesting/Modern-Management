import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, ShoppingCart, TrendingDown, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderRow {
  handle: string;
  title: string;
  sku: string;
  variantPrice: string;
  variantInventoryQty: number;
  shopifyProductId: string;
  shopifyVariantId: string;
  orderId: string;
  email: string;
  currency: string;
  createdAt: string;
  lineItemQuantity: number;
  lineItemPrice: string;
  lineItemName: string;
  lineItemSku: string;
}

export default function OrdersTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Default spreadsheet IDs
  const [orderSpreadsheetId, setOrderSpreadsheetId] = useState("1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s");
  const [inventorySpreadsheetId, setInventorySpreadsheetId] = useState("1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU");

  // Fetch orders from Google Sheets
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['/api/google-sheets/orders', orderSpreadsheetId],
    enabled: !!orderSpreadsheetId,
  });

  // Process orders mutation
  const processOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-sheets/process-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderSpreadsheetId,
          inventorySpreadsheetId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process orders');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Orders Processed Successfully",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      refetchOrders();
    },
    onError: (error) => {
      toast({
        title: "Error Processing Orders",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const orders: OrderRow[] = ordersData?.orders || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-900">Orders Tracking</h1>
          <p className="text-amber-700">Sync orders from Google Sheets and update inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-amber-600" />
          <span className="text-sm text-amber-600">{orders.length} orders found</span>
        </div>
      </div>

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Google Sheets Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderSpreadsheet">Orders Spreadsheet ID</Label>
              <Input
                id="orderSpreadsheet"
                value={orderSpreadsheetId}
                onChange={(e) => setOrderSpreadsheetId(e.target.value)}
                placeholder="Enter orders spreadsheet ID"
              />
              <p className="text-xs text-gray-500">
                Orders will be read from the 'Inventory' sheet starting at column AM
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventorySpreadsheet">Inventory Spreadsheet ID</Label>
              <Input
                id="inventorySpreadsheet"
                value={inventorySpreadsheetId}
                onChange={(e) => setInventorySpreadsheetId(e.target.value)}
                placeholder="Enter inventory spreadsheet ID"
              />
              <p className="text-xs text-gray-500">
                Inventory will be updated in the 'InventorySync' tab
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => refetchOrders()}
              disabled={ordersLoading || !orderSpreadsheetId}
              variant="outline"
            >
              {ordersLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Fetch Orders
            </Button>
            
            <Button
              onClick={() => processOrdersMutation.mutate()}
              disabled={processOrdersMutation.isPending || !orderSpreadsheetId || !inventorySpreadsheetId}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {processOrdersMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2" />
              )}
              Process Orders & Update Inventory
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Display */}
      {ordersLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading orders from Google Sheets...</p>
          </CardContent>
        </Card>
      ) : orders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Orders from Google Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order, index) => (
                <div key={`${order.orderId}-${index}`} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        Order #{order.orderId}
                      </Badge>
                      <span className="text-sm text-gray-600">{order.email}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.createdAt}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="font-medium">{order.lineItemName || order.title}</p>
                      <p className="text-sm text-gray-600">SKU: {order.lineItemSku || order.sku}</p>
                      <p className="text-sm text-gray-600">Handle: {order.handle}</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {order.lineItemQuantity}
                      </p>
                      <p className="text-sm text-gray-600">Quantity Ordered</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {order.currency} {order.lineItemPrice}
                      </p>
                      <p className="text-sm text-gray-600">
                        Unit: {order.variantPrice}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
            <p className="text-gray-600 mb-4">
              No orders were found in the specified Google Sheets spreadsheet.
            </p>
            <Button 
              onClick={() => refetchOrders()}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Processing Results */}
      {processOrdersMutation.data && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Processing Complete:</strong> {processOrdersMutation.data.message}
            {processOrdersMutation.data.errors?.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside text-sm">
                  {processOrdersMutation.data.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}