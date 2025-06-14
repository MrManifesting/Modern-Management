import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Camera, 
  Scan, 
  Package, 
  Minus, 
  Plus,
  AlertTriangle, 
  CheckCircle, 
  Volume2,
  VolumeX,
  Truck,
  Bell,
  Users,
  ShoppingCart,
  Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ScanResult {
  success: boolean;
  item?: {
    id: number;
    name: string;
    sku: string;
    previousQuantity: number;
    newQuantity: number;
    quantityFulfilled: number;
    category: string;
    lowStockThreshold?: number;
  };
  error?: string;
  message?: string;
  availableQuantity?: number;
  isLowStock?: boolean;
  action?: 'intake' | 'fulfillment';
}

interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  status: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    fulfilled: number;
  }>;
}

interface BatchScanItem {
  sku: string;
  quantity: number;
  scanned: boolean;
  result?: ScanResult;
}

export default function AdvancedBarcodeScanner() {
  const [scanInput, setScanInput] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [activeMode, setActiveMode] = useState<'fulfillment' | 'intake'>('fulfillment');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [batchItems, setBatchItems] = useState<BatchScanItem[]>([]);
  const [batchInput, setBatchInput] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Voice feedback function
  const playVoiceFeedback = (message: string, isSuccess: boolean = true) => {
    if (!voiceEnabled) return;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.2;
      utterance.pitch = isSuccess ? 1.1 : 0.9;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // Initialize camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  // Load orders for matching
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await apiRequest("GET", "/api/orders/pending");
        const ordersData = await response.json();
        setOrders(ordersData);
      } catch (error) {
        console.error("Failed to load orders:", error);
      }
    };
    loadOrders();
  }, []);

  // Handle single scan
  const handleScan = async () => {
    if (!scanInput.trim()) {
      toast({
        title: "Missing Input",
        description: "Please enter a SKU or barcode to scan",
        variant: "destructive",
      });
      return;
    }

    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    
    try {
      const endpoint = activeMode === 'intake' 
        ? "/api/barcode/scan-intake" 
        : "/api/barcode/scan-fulfill";
      
      const response = await apiRequest("POST", endpoint, {
        sku: scanInput.trim(),
        quantity: quantity,
        employeeId: 1,
        orderId: selectedOrder ? parseInt(selectedOrder) : null,
        lowStockThreshold: lowStockThreshold,
        notes: `${activeMode} scan from advanced scanner`
      });
      
      const result = await response.json() as ScanResult;
      result.action = activeMode;
      
      if (result.success && result.item) {
        const actionText = activeMode === 'intake' ? "added to" : "fulfilled from";
        const message = `${result.item.name} - ${result.item.quantityFulfilled} units ${actionText} inventory`;
        
        toast({
          title: "Scan Successful",
          description: `${message}. New stock: ${result.item.newQuantity}`,
        });
        
        // Voice feedback
        playVoiceFeedback(`${result.item.name}, ${result.item.quantityFulfilled} units ${actionText} inventory`, true);
        
        // Low stock alert
        if (result.isLowStock) {
          toast({
            title: "Low Stock Alert",
            description: `${result.item.name} is running low: ${result.item.newQuantity} units remaining`,
            variant: "destructive",
          });
          playVoiceFeedback(`Warning: ${result.item.name} is running low on stock`, false);
        }
        
        setScanHistory(prev => [result, ...prev.slice(0, 19)]);
        setScanInput("");
        
        // Auto-notify customer if order matched
        if (selectedOrder && activeMode === 'fulfillment') {
          handleCustomerNotification(result);
        }
        
      } else {
        toast({
          title: "Scan Failed",
          description: result.message || result.error || "Failed to process scan",
          variant: "destructive",
        });
        playVoiceFeedback("Scan failed", false);
      }
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Failed to process barcode scan",
        variant: "destructive",
      });
      playVoiceFeedback("Scan error", false);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle batch scan
  const handleBatchScan = async () => {
    if (batchItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items to the batch scan list",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    
    try {
      const endpoint = activeMode === 'intake' 
        ? "/api/barcode/batch-scan-intake" 
        : "/api/barcode/batch-scan-fulfill";
      
      const response = await apiRequest("POST", endpoint, {
        items: batchItems.map(item => ({
          sku: item.sku,
          quantity: item.quantity
        })),
        employeeId: 1,
        orderId: selectedOrder ? parseInt(selectedOrder) : null,
        lowStockThreshold: lowStockThreshold
      });
      
      const results = await response.json() as ScanResult[];
      
      // Update batch items with results
      const updatedBatchItems = batchItems.map((item, index) => ({
        ...item,
        scanned: true,
        result: results[index]
      }));
      setBatchItems(updatedBatchItems);
      
      // Add successful scans to history
      const successfulScans = results.filter(r => r.success);
      setScanHistory(prev => [...successfulScans, ...prev.slice(0, 20 - successfulScans.length)]);
      
      const successCount = successfulScans.length;
      const totalCount = results.length;
      
      toast({
        title: "Batch Scan Complete",
        description: `${successCount}/${totalCount} items processed successfully`,
      });
      
      playVoiceFeedback(`Batch scan complete. ${successCount} of ${totalCount} items processed`, successCount === totalCount);
      
    } catch (error) {
      toast({
        title: "Batch Scan Error",
        description: "Failed to process batch scan",
        variant: "destructive",
      });
      playVoiceFeedback("Batch scan failed", false);
    } finally {
      setIsScanning(false);
    }
  };

  // Add item to batch
  const addToBatch = () => {
    if (!batchInput.trim() || quantity <= 0) return;
    
    const newItem: BatchScanItem = {
      sku: batchInput.trim(),
      quantity: quantity,
      scanned: false
    };
    
    setBatchItems(prev => [...prev, newItem]);
    setBatchInput("");
    setQuantity(1);
  };

  // Handle customer notification
  const handleCustomerNotification = async (scanResult: ScanResult) => {
    if (!selectedOrder || !scanResult.item) return;
    
    try {
      await apiRequest("POST", "/api/orders/notify-customer", {
        orderId: parseInt(selectedOrder),
        itemSku: scanResult.item.sku,
        itemName: scanResult.item.name,
        quantityFulfilled: scanResult.item.quantityFulfilled
      });
      
      toast({
        title: "Customer Notified",
        description: "Customer has been notified of item fulfillment",
      });
    } catch (error) {
      console.error("Failed to notify customer:", error);
    }
  };

  // Print shipping label
  const printShippingLabel = async () => {
    if (!selectedOrder) {
      toast({
        title: "No Order Selected",
        description: "Please select an order to print shipping label",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/orders/print-shipping-label", {
        orderId: parseInt(selectedOrder)
      });
      
      const labelData = await response.json();
      
      // Open print dialog with label
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(labelData.labelHtml);
        printWindow.document.close();
        printWindow.print();
      }
      
      toast({
        title: "Shipping Label Ready",
        description: "Shipping label has been generated and sent to printer",
      });
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to generate shipping label",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        handleScan();
      } else if (e.ctrlKey) {
        addToBatch();
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Scanner Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Advanced Barcode Scanner
          </CardTitle>
          <CardDescription>
            Comprehensive inventory scanning with camera integration, batch processing, and order matching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="mode-toggle" 
                  checked={activeMode === 'intake'}
                  onCheckedChange={(checked) => setActiveMode(checked ? 'intake' : 'fulfillment')}
                />
                <Label htmlFor="mode-toggle">
                  {activeMode === 'intake' ? 'Intake Mode' : 'Fulfillment Mode'}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="voice-toggle" 
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                />
                <Label htmlFor="voice-toggle" className="flex items-center gap-1">
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Voice Feedback
                </Label>
              </div>
            </div>
            
            <Badge variant={activeMode === 'intake' ? 'default' : 'secondary'}>
              {activeMode === 'intake' ? 'Adding to Inventory' : 'Fulfilling Orders'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Single Scan</TabsTrigger>
          <TabsTrigger value="batch">Batch Scan</TabsTrigger>
          <TabsTrigger value="camera">Camera Scan</TabsTrigger>
        </TabsList>

        {/* Single Scan Tab */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Single Item Scanning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Selection */}
              {activeMode === 'fulfillment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Select Order (Optional)</Label>
                    <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose order to fulfill..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific order</SelectItem>
                        {orders.map(order => (
                          <SelectItem key={order.id} value={order.id.toString()}>
                            Order #{order.id} - {order.customerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Low Stock Threshold</Label>
                    <Input
                      type="number"
                      min="0"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>SKU or Barcode</Label>
                  <Input
                    placeholder="Scan or enter SKU/barcode..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleScan}
                  disabled={isScanning}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isScanning ? "Processing..." : `${activeMode === 'intake' ? 'Add to' : 'Fulfill from'} Inventory`}
                </Button>
                
                {selectedOrder && activeMode === 'fulfillment' && (
                  <Button
                    onClick={printShippingLabel}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Label
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Press Shift+Enter to scan, Ctrl+Enter to add to batch
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Scan Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Batch Scanning
              </CardTitle>
              <CardDescription>
                Scan multiple items at once for efficient processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label>SKU or Barcode</Label>
                  <Input
                    placeholder="Enter SKU/barcode..."
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addToBatch} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Batch
                  </Button>
                </div>
              </div>

              {/* Batch Items List */}
              {batchItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Batch Items ({batchItems.length})</Label>
                    <Button
                      onClick={handleBatchScan}
                      disabled={isScanning}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isScanning ? "Processing..." : "Process Batch"}
                    </Button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {batchItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.scanned ? 
                            (item.result?.success ? "default" : "destructive") : "secondary"
                          }>
                            {item.scanned ? 
                              (item.result?.success ? "Success" : "Failed") : "Pending"
                            }
                          </Badge>
                          <span className="font-mono text-sm">{item.sku}</span>
                          <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                        </div>
                        
                        <Button
                          onClick={() => setBatchItems(prev => prev.filter((_, i) => i !== index))}
                          variant="ghost"
                          size="sm"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Camera Scan Tab */}
        <TabsContent value="camera" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Scanning
              </CardTitle>
              <CardDescription>
                Use device camera to scan barcodes directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={isCameraActive ? stopCamera : startCamera}
                  variant={isCameraActive ? "destructive" : "default"}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isCameraActive ? "Stop Camera" : "Start Camera"}
                </Button>
              </div>

              {isCameraActive && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg border"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-red-500 w-64 h-16 bg-transparent" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scan History and Results */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Scan History
            </CardTitle>
            <CardDescription>
              Recent scanning activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanHistory.map((scan, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={scan.success ? "default" : "destructive"}>
                        {scan.success ? "Success" : "Failed"}
                      </Badge>
                      <Badge variant="outline">
                        {scan.action === 'intake' ? 'Intake' : 'Fulfillment'}
                      </Badge>
                      {scan.item && (
                        <span className="text-sm font-medium">{scan.item.name}</span>
                      )}
                      {scan.isLowStock && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    
                    {scan.item ? (
                      <div className="text-xs text-muted-foreground">
                        SKU: {scan.item.sku} • 
                        {scan.action === 'intake' ? 'Added' : 'Fulfilled'}: {scan.item.quantityFulfilled} units • 
                        Stock: {scan.item.previousQuantity} → {scan.item.newQuantity}
                      </div>
                    ) : (
                      <div className="text-xs text-red-600">
                        {scan.message || scan.error}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {scan.success && scan.item && (
                      <div className="flex items-center gap-1 text-green-600">
                        {scan.action === 'intake' ? (
                          <Plus className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        <span className="text-xs">{scan.item.quantityFulfilled}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}