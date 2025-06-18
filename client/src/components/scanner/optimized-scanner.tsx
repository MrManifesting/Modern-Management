import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, Package, Plus, Minus, ScanLine, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';

interface ScannedItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  basePrice?: string;
  salePrice?: string;
  category?: string;
  brand?: string;
  weight?: string;
  status?: string;
}

interface InventoryAction {
  type: 'intake' | 'fulfillment' | 'adjustment';
  quantity: number;
  notes?: string;
}

interface OptimizedScannerProps {
  mode?: 'intake' | 'fulfillment' | 'both';
  onActionComplete?: (result: any) => void;
}

export function OptimizedScanner({ mode = 'both', onActionComplete }: OptimizedScannerProps) {
  const [currentMode, setCurrentMode] = useState<'intake' | 'fulfillment'>(mode === 'both' ? 'intake' : mode);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [actionQuantity, setActionQuantity] = useState(1);
  const [actionNotes, setActionNotes] = useState('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [scanCount, setScanCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  const startScanning = useCallback(async () => {
    if (!codeReader.current || !videoRef.current) return;

    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      codeReader.current.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
        if (result) {
          const code = result.getText();
          handleBarcodeDetected(code);
          stopScanning();
        }
      });
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const handleBarcodeDetected = useCallback(async (code: string) => {
    setIsProcessing(true);
    setScanCount(prev => prev + 1);
    
    try {
      // Search for item by barcode, SKU, or name
      const response = await fetch(`/api/items?search=${encodeURIComponent(code)}`);
      const items = await response.json();
      
      const foundItem = items.find((item: any) => 
        item.sku === code || 
        item.barcode === code || 
        item.name.toLowerCase().includes(code.toLowerCase())
      );

      if (foundItem) {
        setScannedItem({
          id: foundItem.id,
          name: foundItem.name,
          sku: foundItem.sku || code,
          quantity: foundItem.quantity || 0,
          basePrice: foundItem.base_price || foundItem.basePrice,
          salePrice: foundItem.sale_price || foundItem.salePrice,
          category: foundItem.category,
          brand: foundItem.brand,
          weight: foundItem.weight,
          status: foundItem.status
        });
        setShowActionDialog(true);
        
        // Audio feedback
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIgBAybzvLdizEGGGW57+GSNQMYX7Xq7a5KDgRBqOHwtVEcBjiZ2e7CdyYEJITL7+GVSA0PVa3j7K1QDwRAqOz5sVAcBjuZz+vdlXAGGGS67+KENQMTX73k6J9KGwc8k9Drr3YiCAyZze7+uHAGFI/B6Xp+tKHNzOhvfH8gCQ6Jx+54c6C8w+l8e7m/wOF2e79MAAEAAgADAPL/8P/y/yMB,ywFRBdwCaGgAbwABAAPAAQAEAAEAAwABAAU=');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore audio errors
        
        toast({
          title: "Item Found",
          description: `${foundItem.name} (${foundItem.quantity} in stock)`,
        });
      } else {
        toast({
          title: "Item Not Found",
          description: `No item found for code: ${code}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching for item:', error);
      toast({
        title: "Search Error",
        description: "Unable to search inventory. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleManualSubmit = useCallback(() => {
    if (manualCode.trim()) {
      handleBarcodeDetected(manualCode.trim());
      setManualCode('');
    }
  }, [manualCode, handleBarcodeDetected]);

  const executeInventoryAction = useCallback(async () => {
    if (!scannedItem) return;

    setIsProcessing(true);
    try {
      const action: InventoryAction = {
        type: currentMode,
        quantity: currentMode === 'intake' ? actionQuantity : -actionQuantity,
        notes: actionNotes || `${currentMode === 'intake' ? 'Added' : 'Removed'} via scanner`
      };

      // Update item quantity
      const newQuantity = Math.max(0, scannedItem.quantity + action.quantity);
      
      await apiRequest(`/api/items/${scannedItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQuantity })
      });

      // Log inventory action
      await apiRequest('/api/inventory/actions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: scannedItem.id,
          actionType: currentMode,
          quantity: Math.abs(action.quantity),
          previousQuantity: scannedItem.quantity,
          newQuantity: newQuantity,
          notes: action.notes,
          employeeId: 1 // System employee
        })
      });

      const actionResult = {
        item: scannedItem,
        action: action,
        previousQuantity: scannedItem.quantity,
        newQuantity: newQuantity,
        timestamp: new Date().toISOString()
      };

      setRecentActions(prev => [actionResult, ...prev.slice(0, 9)]);
      
      toast({
        title: `${currentMode === 'intake' ? 'Stock Added' : 'Stock Removed'}`,
        description: `${scannedItem.name}: ${scannedItem.quantity} → ${newQuantity}`,
      });

      if (onActionComplete) {
        onActionComplete(actionResult);
      }

      // Reset for next scan
      setScannedItem(null);
      setShowActionDialog(false);
      setActionQuantity(1);
      setActionNotes('');
      
    } catch (error) {
      console.error('Error executing inventory action:', error);
      toast({
        title: "Action Failed",
        description: "Unable to update inventory. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [scannedItem, currentMode, actionQuantity, actionNotes, onActionComplete, toast]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Selection and Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Optimized Scanner
            </div>
            <Badge variant="outline">
              {scanCount} scans today
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'both' && (
            <div className="flex items-center justify-center space-x-4">
              <Label htmlFor="mode-toggle" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Mode:
              </Label>
              <div className="flex items-center space-x-2">
                <span className={currentMode === 'intake' ? 'font-bold text-green-600' : 'text-gray-500'}>
                  Intake
                </span>
                <Switch 
                  id="mode-toggle" 
                  checked={currentMode === 'fulfillment'}
                  onCheckedChange={(checked) => setCurrentMode(checked ? 'fulfillment' : 'intake')}
                />
                <span className={currentMode === 'fulfillment' ? 'font-bold text-red-600' : 'text-gray-500'}>
                  Fulfillment
                </span>
              </div>
            </div>
          )}

          <div className="text-center">
            <Badge variant={currentMode === 'intake' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {currentMode === 'intake' ? (
                <>
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Adding Stock
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Removing Stock
                </>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Interface */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Camera Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {isScanning ? (
                <div className="space-y-4">
                  <video 
                    ref={videoRef}
                    className="w-full max-w-sm mx-auto rounded border"
                    autoPlay
                    playsInline
                    muted
                  />
                  <Button onClick={stopScanning} variant="outline" className="w-full">
                    <X className="mr-2 h-4 w-4" />
                    Stop Scanning
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Camera className="mx-auto h-16 w-16 text-gray-400" />
                  <Button onClick={startScanning} className="w-full" disabled={isProcessing}>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera Scanner
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Manual Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-code">Barcode / SKU / Item Name</Label>
              <Input
                id="manual-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter or paste barcode/SKU..."
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                disabled={isProcessing}
              />
            </div>
            <Button onClick={handleManualSubmit} className="w-full" disabled={!manualCode.trim() || isProcessing}>
              <Search className="mr-2 h-4 w-4" />
              Search Item
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActions.slice(0, 5).map((action, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {action.action.type === 'intake' ? (
                      <ArrowUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{action.item.name}</div>
                      <div className="text-sm text-gray-500">
                        {action.previousQuantity} → {action.newQuantity}
                      </div>
                    </div>
                  </div>
                  <Badge variant={action.action.type === 'intake' ? 'default' : 'destructive'}>
                    {action.action.type === 'intake' ? '+' : '-'}{Math.abs(action.action.quantity)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentMode === 'intake' ? (
                <ArrowUp className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowDown className="h-5 w-5 text-red-600" />
              )}
              {currentMode === 'intake' ? 'Add Stock' : 'Remove Stock'}
            </DialogTitle>
            <DialogDescription>
              {scannedItem && (
                <div className="space-y-2">
                  <div className="font-medium">{scannedItem.name}</div>
                  <div className="text-sm">
                    SKU: {scannedItem.sku} | Current Stock: {scannedItem.quantity}
                  </div>
                  {scannedItem.category && (
                    <Badge variant="outline">{scannedItem.category}</Badge>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action-quantity">Quantity</Label>
              <Input
                id="action-quantity"
                type="number"
                min="1"
                value={actionQuantity}
                onChange={(e) => setActionQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="action-notes">Notes (Optional)</Label>
              <Input
                id="action-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add notes..."
              />
            </div>

            {scannedItem && (
              <div className="p-3 bg-gray-50 rounded border">
                <div className="text-sm">
                  <div>Current: {scannedItem.quantity}</div>
                  <div className={`font-medium ${
                    currentMode === 'intake' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    New: {Math.max(0, scannedItem.quantity + (currentMode === 'intake' ? actionQuantity : -actionQuantity))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setShowActionDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={executeInventoryAction} 
                disabled={isProcessing}
                className="flex-1"
                variant={currentMode === 'intake' ? 'default' : 'destructive'}
              >
                <Check className="mr-2 h-4 w-4" />
                {currentMode === 'intake' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}