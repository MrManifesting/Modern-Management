import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scan, Package, Minus, AlertTriangle, CheckCircle } from "lucide-react";
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
  };
  error?: string;
  message?: string;
  availableQuantity?: number;
}

interface VerificationResult {
  success: boolean;
  item?: {
    id: number;
    name: string;
    sku: string;
    category: string;
    currentQuantity: number;
    price: number;
  };
  verification?: {
    canFulfill: boolean;
    requestedQuantity: number;
    availableQuantity: number;
    shortfall: number;
  };
  error?: string;
  message?: string;
}

export default function BarcodeScanner() {
  const [scanInput, setScanInput] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!scanInput.trim()) {
      toast({
        title: "Missing Input",
        description: "Please enter a SKU or barcode to verify",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/barcode/verify", {
        sku: scanInput.trim(),
        quantity: quantity
      });
      
      const result = await response.json() as VerificationResult;
      setVerificationResult(result);
      
      if (result.success && result.verification?.canFulfill) {
        toast({
          title: "Item Verified",
          description: `${result.item?.name} - ${result.verification.availableQuantity} units available`,
        });
      } else if (result.verification && !result.verification.canFulfill) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${result.verification.availableQuantity} units available, need ${result.verification.requestedQuantity}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Failed to verify item",
        variant: "destructive",
      });
      setVerificationResult({
        success: false,
        error: "Verification failed",
        message: "Could not verify item availability"
      });
    } finally {
      setIsVerifying(false);
    }
  };

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
      const response = await apiRequest("POST", "/api/barcode/scan-fulfill", {
        sku: scanInput.trim(),
        quantity: quantity,
        employeeId: 1,
        notes: `Manual scan fulfillment from scanner interface`
      });
      
      const result = await response.json() as ScanResult;
      
      if (result.success && result.item) {
        toast({
          title: "Scan Successful",
          description: `${result.item.name} - ${result.item.quantityFulfilled} units fulfilled. New stock: ${result.item.newQuantity}`,
        });
        
        setScanHistory(prev => [result, ...prev.slice(0, 9)]);
        setScanInput("");
        setVerificationResult(null);
      } else {
        toast({
          title: "Scan Failed",
          description: result.message || result.error || "Failed to process scan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Failed to process barcode scan",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        handleScan();
      } else {
        handleVerify();
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Barcode Scanner - Fulfillment
          </CardTitle>
          <CardDescription>
            Scan barcodes to automatically subtract items from inventory for order fulfillment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">SKU or Barcode</label>
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
              <label className="text-sm font-medium">Quantity</label>
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
              onClick={handleVerify}
              disabled={isVerifying || isScanning}
              variant="outline"
            >
              {isVerifying ? "Checking..." : "Verify (Enter)"}
            </Button>
            <Button 
              onClick={handleScan}
              disabled={isScanning || isVerifying}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? "Processing..." : "Scan & Fulfill (Shift+Enter)"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Press Enter to verify item availability, Shift+Enter to scan and fulfill
          </p>
        </CardContent>
      </Card>

      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Item Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificationResult.success && verificationResult.item ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Item Name</p>
                    <p className="text-sm text-muted-foreground">{verificationResult.item.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">SKU</p>
                    <p className="text-sm font-mono text-muted-foreground">{verificationResult.item.sku}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground">{verificationResult.item.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Current Stock</p>
                    <p className="text-sm text-muted-foreground">{verificationResult.item.currentQuantity} units</p>
                  </div>
                </div>
                
                {verificationResult.verification && (
                  <div className="mt-4 p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 mb-2">
                      {verificationResult.verification.canFulfill ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {verificationResult.verification.canFulfill ? "Can Fulfill" : "Cannot Fulfill"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested: {verificationResult.verification.requestedQuantity} units, 
                      Available: {verificationResult.verification.availableQuantity} units
                      {verificationResult.verification.shortfall > 0 && 
                        `, Shortfall: ${verificationResult.verification.shortfall} units`
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-red-600">
                {verificationResult.message || verificationResult.error || "Item not found"}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recent Scans
            </CardTitle>
            <CardDescription>
              Last {scanHistory.length} fulfillment scans
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
                      {scan.item && (
                        <span className="text-sm font-medium">{scan.item.name}</span>
                      )}
                    </div>
                    
                    {scan.item ? (
                      <div className="text-xs text-muted-foreground">
                        SKU: {scan.item.sku} • 
                        Fulfilled: {scan.item.quantityFulfilled} units • 
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
                        <Minus className="h-3 w-3" />
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