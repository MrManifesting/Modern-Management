import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, ScanLine, Loader2, Check, Search, AlertCircle, Plus, Minus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiRequestSimple } from '@/lib/queryClient';

// For barcode scanning
declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

interface QuickScannerProps {
  onItemFound?: (item: any) => void;
  onActionComplete?: (result: any) => void;
}

interface ScannedItem {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  price: number;
  category?: string;
  images?: string[];
}

const QuickScanner: React.FC<QuickScannerProps> = ({
  onItemFound,
  onActionComplete
}) => {
  const { toast } = useToast();
  const [barcodeValue, setBarcodeValue] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scannerReady, setScannerReady] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'scan' | 'result'>('scan');
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string>('check');
  const [actionQuantity, setActionQuantity] = useState<number>(1);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstance = useRef<any>(null);
  const queryClient = useQueryClient();
  
  // Load HTML5 QR code scanner script dynamically
  useEffect(() => {
    const loadScanner = async () => {
      if (!window.Html5Qrcode && !document.getElementById('html5-qrcode-script')) {
        const script = document.createElement('script');
        script.id = 'html5-qrcode-script';
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.async = true;
        script.onload = () => setScannerReady(true);
        document.body.appendChild(script);
      } else {
        setScannerReady(true);
      }
    };
    
    loadScanner();
  }, []);
  
  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerInstance.current) {
        scannerInstance.current.stop().catch((err: any) => {
          console.error('Error stopping scanner:', err);
        });
      }
    };
  }, []);
  
  // Start the barcode scanner
  const startScanner = async () => {
    if (!scannerReady) {
      toast({
        title: 'Scanner not ready',
        description: 'Please wait for the scanner to initialize.',
        variant: 'destructive',
      });
      return;
    }
    
    if (scannerRef.current) {
      try {
        setIsScanning(true);
        setError(null);
        
        // Configure for faster scanning with smaller viewfinder
        const config = { fps: 15, qrbox: { width: 200, height: 100 } };
        scannerInstance.current = new window.Html5Qrcode("quick-scanner");
        
        const qrCodeSuccessCallback = (decodedText: string) => {
          handleScannedCode(decodedText);
          stopScanner();
        };
        
        const qrCodeErrorCallback = (error: any) => {
          // Don't show errors during scanning, just log them
          console.log(error);
        };
        
        await scannerInstance.current.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
        
        toast({
          title: 'Quick Scanner Active',
          description: 'Point at a barcode to scan',
        });
      } catch (err) {
        console.error('Error starting scanner:', err);
        setIsScanning(false);
        setError('Failed to start camera. Please check permissions and try again.');
        
        toast({
          title: 'Scanner Error',
          description: 'Could not access camera. Check permissions.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Stop the barcode scanner
  const stopScanner = () => {
    if (scannerInstance.current && scannerInstance.current.isScanning) {
      scannerInstance.current.stop().then(() => {
        setIsScanning(false);
      }).catch((err: any) => {
        console.error('Error stopping scanner:', err);
      });
    } else {
      setIsScanning(false);
    }
  };
  
  // Handle a scanned barcode
  const handleScannedCode = (decodedText: string) => {
    setBarcodeValue(decodedText);
    setManualBarcode(decodedText);
    
    // Auto-search after scanning
    searchItem(decodedText);
  };
  
  // Search for an item using the barcode or SKU
  const searchItem = async (code: string = '') => {
    const barcodeToSearch = code || manualBarcode || barcodeValue;
    
    if (!barcodeToSearch) {
      toast({
        title: 'No Barcode or SKU',
        description: 'Please enter or scan a barcode or SKU first',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setScannedItem(null);
    
    try {
      // First try to find by barcode
      let itemResult = await apiRequestSimple(`/api/items/barcode/${barcodeToSearch}`, {
        method: 'GET',
      }).catch(() => null);
      
      // If not found by barcode, try by SKU
      if (!itemResult) {
        itemResult = await apiRequestSimple(`/api/items/sku/${barcodeToSearch}`, {
          method: 'GET',
        }).catch(() => null);
      }
      
      // If still not found, try external lookup
      if (!itemResult) {
        itemResult = await apiRequestSimple('/api/scan', {
          method: 'POST',
          body: JSON.stringify({ barcode: barcodeToSearch }),
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch(() => null);
      }
      
      if (itemResult) {
        setScannedItem(itemResult);
        setScannerMode('result');
        
        if (onItemFound) {
          onItemFound(itemResult);
        }
        
        toast({
          title: 'Item Found',
          description: itemResult.name,
        });
      } else {
        setError('Item not found. Please check the barcode or SKU and try again.');
        toast({
          title: 'Item Not Found',
          description: 'No matching item found',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching item:', error);
      setError('Error searching for item. Please try again.');
      
      toast({
        title: 'Search Error',
        description: 'Failed to search for item',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Perform inventory action
  const performAction = async () => {
    if (!scannedItem) return;
    
    setIsProcessing(true);
    
    try {
      const response = await apiRequestSimple('/api/scan', {
        method: 'POST',
        body: JSON.stringify({
          sku: scannedItem.sku,
          action: actionType,
          quantity: actionQuantity
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response) {
        // Invalidate queries to refresh inventory data
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        
        toast({
          title: 'Action Completed',
          description: `Successfully ${actionType === 'add' ? 'added' : actionType === 'remove' ? 'removed' : 'checked'} ${actionQuantity} ${actionType !== 'check' ? 'units' : ''}`,
        });
        
        if (onActionComplete) {
          onActionComplete(response);
        }
        
        // Reset for next scan
        resetScanner();
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast({
        title: 'Action Failed',
        description: 'Could not complete the inventory action',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Reset scanner for next item
  const resetScanner = () => {
    setBarcodeValue('');
    setManualBarcode('');
    setScannedItem(null);
    setError(null);
    setScannerMode('scan');
    setActionType('check');
    setActionQuantity(1);
  };
  
  // Handle input changes
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setActionQuantity(value);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Quick Item Scanner</CardTitle>
        <CardDescription>
          Quickly scan items to check, add, or remove from inventory
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {scannerMode === 'scan' ? (
          <div className="space-y-4">
            <div 
              id="quick-scanner" 
              ref={scannerRef} 
              className={`w-full h-48 overflow-hidden rounded-md border border-gray-200 bg-black ${isScanning ? 'block' : 'hidden'}`}
            ></div>
            
            {!isScanning && (
              <div className="flex justify-center items-center h-48 border border-dashed rounded-md border-gray-300 bg-gray-50">
                <div className="text-center">
                  <ScanLine className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Ready to scan</h3>
                  <p className="mt-1 text-sm text-gray-500">Scan barcode or SKU for quick inventory actions</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="manual-barcode">Manual Entry</Label>
                <div className="flex mt-1">
                  <Input
                    id="manual-barcode"
                    placeholder="Enter barcode or SKU"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => searchItem()}
                    disabled={isProcessing || !manualBarcode}
                    className="ml-2"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              {!isScanning ? (
                <Button onClick={startScanner} className="flex items-center">
                  <Camera className="mr-2 h-4 w-4" />
                  Start Scanner
                </Button>
              ) : (
                <Button onClick={stopScanner} variant="destructive" className="flex items-center">
                  Stop Scanner
                </Button>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          // Result view after scanning
          <div className="space-y-4">
            {scannedItem && (
              <>
                <div className="rounded-md border p-4">
                  <div className="flex items-start gap-4">
                    {scannedItem.images && scannedItem.images.length > 0 ? (
                      <img 
                        src={scannedItem.images[0]} 
                        alt={scannedItem.name}
                        className="h-20 w-20 object-cover rounded-md"
                      />
                    ) : (
                      <div className="h-20 w-20 bg-gray-100 flex items-center justify-center rounded-md">
                        <ScanLine className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{scannedItem.name}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                        <div>SKU: {scannedItem.sku}</div>
                        <div>Price: ${scannedItem.price.toFixed(2)}</div>
                        <div>In Stock: {scannedItem.quantity}</div>
                        {scannedItem.category && <div>Category: {scannedItem.category}</div>}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="action-type">Action</Label>
                    <Select value={actionType} onValueChange={setActionType}>
                      <SelectTrigger id="action-type">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">Check Inventory</SelectItem>
                        <SelectItem value="add">Add Inventory</SelectItem>
                        <SelectItem value="remove">Remove Inventory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <div className="flex mt-1">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setActionQuantity(Math.max(1, actionQuantity - 1))}
                        disabled={actionQuantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={actionQuantity}
                        onChange={handleQuantityChange}
                        className="flex-1 mx-2 text-center"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setActionQuantity(actionQuantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={resetScanner}>
                    Scan Another
                  </Button>
                  <Button 
                    onClick={performAction}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : actionType === 'add' ? (
                      <Plus className="mr-2 h-4 w-4" />
                    ) : actionType === 'remove' ? (
                      <Minus className="mr-2 h-4 w-4" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    {actionType === 'add' ? 'Add to Inventory' : 
                     actionType === 'remove' ? 'Remove from Inventory' : 
                     'Check Inventory'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickScanner;