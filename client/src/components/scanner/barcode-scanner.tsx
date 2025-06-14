import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Camera, Search, Package } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface ScannedItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  category?: string;
  brand?: string;
}

interface BarcodeScannerProps {
  onItemScanned?: (item: ScannedItem) => void;
  onActionComplete?: (result: any) => void;
  actionType?: 'scan' | 'intake' | 'fulfillment';
}

export function BarcodeScanner({ onItemScanned, onActionComplete, actionType = 'scan' }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  // Search for item by barcode/SKU
  const searchItem = useCallback(async (code: string) => {
    if (!code.trim()) {
      toast({
        title: "No Code Entered",
        description: "Please enter a barcode or SKU",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Try barcode lookup first
      let response = await fetch(`/api/items/barcode/${encodeURIComponent(code)}`);
      
      // If not found by barcode, try SKU
      if (!response.ok) {
        response = await fetch(`/api/items/sku/${encodeURIComponent(code)}`);
      }
      
      if (response.ok) {
        const item = await response.json();
        setScannedItem(item);
        
        toast({
          title: "Item Found",
          description: `${item.name} - Quantity: ${item.quantity}`,
          variant: "default"
        });
        
        if (onItemScanned) {
          onItemScanned(item);
        }
      } else {
        toast({
          title: "Item Not Found",
          description: "No matching item in inventory",
          variant: "destructive"
        });
        setScannedItem(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Could not search for item",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onItemScanned, toast]);

  // Start camera scanning
  const startScanning = useCallback(async () => {
    try {
      setIsScanning(true);
      
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      
      const videoInputDevices = await readerRef.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera found');
      }
      
      // Use the back camera if available (usually better for barcode scanning)
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      ) || videoInputDevices[0];
      
      const result = await readerRef.current.decodeOnceFromVideoDevice(backCamera.deviceId, videoRef.current!);
      
      if (result) {
        const barcodeText = result.getText();
        setManualCode(barcodeText);
        stopScanning();
        
        toast({
          title: "Barcode Scanned",
          description: `Detected: ${barcodeText}`,
          variant: "default"
        });
        
        // Auto-search the scanned barcode
        await searchItem(barcodeText);
      }
    } catch (error) {
      console.error('Scanning error:', error);
      
      if (error instanceof NotFoundException) {
        toast({
          title: "No Barcode Found",
          description: "Point camera at a barcode and try again",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Camera Error",
          description: "Could not access camera for scanning",
          variant: "destructive"
        });
      }
      
      stopScanning();
    }
  }, [searchItem, toast]);

  // Stop camera scanning
  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  }, []);

  // Handle photo capture for offline scanning
  const capturePhoto = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsProcessing(true);
      
      try {
        if (!readerRef.current) {
          readerRef.current = new BrowserMultiFormatReader();
        }
        
        const result = await readerRef.current.decodeFromImageElement(
          await createImageElement(file)
        );
        
        if (result) {
          const barcodeText = result.getText();
          setManualCode(barcodeText);
          
          toast({
            title: "Barcode Detected",
            description: `Found: ${barcodeText}`,
            variant: "default"
          });
          
          await searchItem(barcodeText);
        } else {
          toast({
            title: "No Barcode Found",
            description: "Could not detect barcode in image",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Photo decode error:', error);
        toast({
          title: "Decode Failed",
          description: "Could not read barcode from photo",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    input.click();
  }, [searchItem, toast]);

  // Helper to create image element from file
  const createImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Process inventory action
  const processInventoryAction = useCallback(async (item: ScannedItem) => {
    if (!item || actionType === 'scan') return;
    
    try {
      const action = actionType === 'intake' ? 'add' : 'remove';
      const response = await fetch(`/api/items/${item.id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          quantity: 1,
          reason: `${actionType} via scanner`
        })
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        
        toast({
          title: `${actionType === 'intake' ? 'Added' : 'Removed'} Item`,
          description: `${item.name} - New quantity: ${updatedItem.quantity}`,
          variant: "default"
        });
        
        if (onActionComplete) {
          onActionComplete(updatedItem);
        }
      } else {
        throw new Error('Inventory update failed');
      }
    } catch (error) {
      console.error('Inventory action error:', error);
      toast({
        title: "Action Failed",
        description: "Could not update inventory",
        variant: "destructive"
      });
    }
  }, [actionType, onActionComplete, toast]);

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="text-center">
        <Package className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Barcode Scanner</h2>
        <p className="text-gray-600">Scan or enter barcodes to find inventory items</p>
      </div>

      {/* Camera Scanner */}
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {isScanning ? (
            <div className="space-y-4">
              <video 
                ref={videoRef}
                className="w-full max-w-xs mx-auto rounded"
                autoPlay
                playsInline
              />
              <Button onClick={stopScanning} variant="outline">
                Stop Scanning
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Camera className="mx-auto h-16 w-16 text-gray-400" />
              <div className="space-y-2">
                <Button onClick={startScanning} className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera Scanner
                </Button>
                <Button onClick={capturePhoto} variant="outline" className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo of Barcode
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Manual Entry</h3>
        <div className="flex space-x-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter barcode or SKU"
            onKeyPress={(e) => e.key === 'Enter' && searchItem(manualCode)}
          />
          <Button 
            onClick={() => searchItem(manualCode)}
            disabled={isProcessing}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scanned Item Display */}
      {scannedItem && (
        <div className="border rounded-lg p-4 bg-green-50">
          <h3 className="font-semibold text-green-800">{scannedItem.name}</h3>
          <p className="text-sm text-green-600">SKU: {scannedItem.sku}</p>
          <p className="text-sm text-green-600">Quantity: {scannedItem.quantity}</p>
          {scannedItem.price && (
            <p className="text-sm text-green-600">Price: ${scannedItem.price}</p>
          )}
          
          {actionType !== 'scan' && (
            <Button
              onClick={() => processInventoryAction(scannedItem)}
              className="mt-3 w-full"
              variant={actionType === 'intake' ? 'default' : 'destructive'}
            >
              {actionType === 'intake' ? 'Add to Inventory' : 'Remove from Inventory'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}