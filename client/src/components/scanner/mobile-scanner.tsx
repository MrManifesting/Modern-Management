import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Camera, 
  CameraOff, 
  ScanLine, 
  Package, 
  AlertCircle, 
  Check,
  Plus,
  Minus,
  Flashlight,
  FlashlightOff,
  RotateCcw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScannedItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  category?: string;
  brand?: string;
}

interface MobileScannerProps {
  onItemScanned?: (item: ScannedItem) => void;
  onActionComplete?: (result: any) => void;
}

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

const MobileScanner: React.FC<MobileScannerProps> = ({
  onItemScanned,
  onActionComplete
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstance = useRef<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [manualSku, setManualSku] = useState('');
  const [action, setAction] = useState<'check' | 'add' | 'remove'>('check');
  const [quantity, setQuantity] = useState(1);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scannerReady, setScannerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load HTML5 QR code scanner
  useEffect(() => {
    const loadScanner = async () => {
      if (!window.Html5Qrcode && !document.getElementById('html5-qrcode-script')) {
        const script = document.createElement('script');
        script.id = 'html5-qrcode-script';
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.async = true;
        script.onload = () => {
          setScannerReady(true);
          getCameras();
        };
        script.onerror = () => {
          setError('Failed to load scanner library');
        };
        document.body.appendChild(script);
      } else if (window.Html5Qrcode) {
        setScannerReady(true);
        getCameras();
      }
    };

    loadScanner();

    return () => {
      stopScanning();
    };
  }, []);

  const getCameras = async () => {
    try {
      if (window.Html5Qrcode) {
        const devices = await window.Html5Qrcode.getCameras();
        setCameras(devices);
        
        // Default to back camera if available
        const backCamera = devices.find((device: any) => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera?.id || devices[0]?.id || '');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Camera access not available');
    }
  };

  const startScanning = useCallback(async () => {
    if (!scannerReady || !selectedCamera || isScanning) return;

    try {
      setError(null);
      setIsScanning(true);

      if (scannerInstance.current) {
        await scannerInstance.current.stop();
      }

      scannerInstance.current = new window.Html5Qrcode("mobile-scanner");

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          window.Html5QrcodeSupportedFormats.QR_CODE,
          window.Html5QrcodeSupportedFormats.CODE_128,
          window.Html5QrcodeSupportedFormats.CODE_39,
          window.Html5QrcodeSupportedFormats.EAN_13,
          window.Html5QrcodeSupportedFormats.EAN_8,
          window.Html5QrcodeSupportedFormats.UPC_A,
          window.Html5QrcodeSupportedFormats.UPC_E,
        ]
      };

      await scannerInstance.current.start(
        selectedCamera,
        config,
        (decodedText: string) => {
          handleScan(decodedText);
        },
        (errorMessage: string) => {
          // Ignore scan errors (normal when nothing is detected)
        }
      );

    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera scanner');
      setIsScanning(false);
    }
  }, [scannerReady, selectedCamera, isScanning]);

  const stopScanning = useCallback(async () => {
    if (scannerInstance.current && isScanning) {
      try {
        await scannerInstance.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }, [isScanning]);

  const handleScan = async (scannedText: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    await stopScanning();

    try {
      await searchItem(scannedText);
    } finally {
      setIsProcessing(false);
    }
  };

  const inventoryMutation = useMutation({
    mutationFn: async (data: { sku: string; action: string; quantity: number }) => {
      const response = await apiRequest('POST', '/api/inventory/action', data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: 'Action Complete',
        description: `${action === 'check' ? 'Checked' : action === 'add' ? 'Added' : 'Removed'} ${action !== 'check' ? quantity : ''} ${result.name}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      
      if (onActionComplete) {
        onActionComplete(result);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Action Failed',
        description: error.message || 'Failed to perform inventory action',
        variant: 'destructive',
      });
    }
  });

  const searchItem = async (searchText: string) => {
    try {
      setError(null);
      
      // Try finding by barcode first
      let response = await apiRequest('GET', `/api/items/barcode/${searchText}`);
      let item = await response.json();
      
      // If not found by barcode, try by SKU
      if (!item) {
        response = await apiRequest('GET', `/api/items/sku/${searchText}`);
        item = await response.json();
      }

      if (item) {
        setScannedItem(item);
        
        if (action !== 'check') {
          // Perform inventory action
          inventoryMutation.mutate({
            sku: item.sku,
            action,
            quantity
          });
        }

        if (onItemScanned) {
          onItemScanned(item);
        }

        toast({
          title: 'Item Found',
          description: item.name,
        });
      } else {
        setError('Item not found in inventory');
        toast({
          title: 'Item Not Found',
          description: 'No matching item in inventory',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error searching item:', err);
      setError('Failed to search for item');
      toast({
        title: 'Search Error',
        description: 'Failed to search for item',
        variant: 'destructive',
      });
    }
  };

  const handleManualSubmit = () => {
    if (!manualSku.trim()) return;
    searchItem(manualSku.trim());
  };

  const toggleFlashlight = async () => {
    if (scannerInstance.current && isScanning) {
      try {
        if (flashlightOn) {
          await scannerInstance.current.applyVideoConstraints({
            advanced: [{ torch: false }]
          });
        } else {
          await scannerInstance.current.applyVideoConstraints({
            advanced: [{ torch: true }]
          });
        }
        setFlashlightOn(!flashlightOn);
      } catch (err) {
        console.error('Flashlight not supported:', err);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Scanner Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Mobile Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Controls */}
          {cameras.length > 0 && (
            <div className="space-y-2">
              <Label>Camera</Label>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.label || `Camera ${camera.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Scanner Display */}
          <div className="relative">
            <div
              id="mobile-scanner"
              ref={scannerRef}
              className={`w-full h-64 rounded-lg border-2 border-dashed ${
                isScanning ? 'border-green-500 bg-black' : 'border-gray-300 bg-gray-50'
              } overflow-hidden`}
            >
              {!isScanning && !isProcessing && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Camera className="h-12 w-12 mb-2" />
                  <p className="text-sm text-center">Tap Start to begin scanning</p>
                </div>
              )}
              {isProcessing && (
                <div className="flex flex-col items-center justify-center h-full text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                  <p className="text-sm">Processing...</p>
                </div>
              )}
            </div>
            
            {/* Scanner Controls Overlay */}
            {isScanning && (
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={toggleFlashlight}
                  className="h-8 w-8 p-0"
                >
                  {flashlightOn ? (
                    <FlashlightOff className="h-4 w-4" />
                  ) : (
                    <Flashlight className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    stopScanning();
                    setTimeout(startScanning, 100);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Scanner Action Buttons */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button
                onClick={startScanning}
                disabled={!scannerReady || !selectedCamera || isProcessing}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                Start Scanner
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="outline"
                className="flex-1"
              >
                <CameraOff className="mr-2 h-4 w-4" />
                Stop Scanner
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Manual Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>SKU or Barcode</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter SKU or barcode"
                value={manualSku}
                onChange={(e) => setManualSku(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                className="flex-1"
              />
              <Button
                onClick={handleManualSubmit}
                disabled={!manualSku.trim() || isProcessing}
                size="sm"
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Settings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Action Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Action Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={action === 'check' ? 'default' : 'outline'}
                onClick={() => setAction('check')}
                size="sm"
                className="text-xs"
              >
                <Check className="mr-1 h-3 w-3" />
                Check
              </Button>
              <Button
                variant={action === 'add' ? 'default' : 'outline'}
                onClick={() => setAction('add')}
                size="sm"
                className="text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
              <Button
                variant={action === 'remove' ? 'default' : 'outline'}
                onClick={() => setAction('remove')}
                size="sm"
                className="text-xs"
              >
                <Minus className="mr-1 h-3 w-3" />
                Remove
              </Button>
            </div>
          </div>

          {(action === 'add' || action === 'remove') && (
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanned Item Display */}
      {scannedItem && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Scanned Item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{scannedItem.name}</span>
              <Badge variant="secondary">{scannedItem.sku}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Quantity:</span>
                <div className="font-medium">{scannedItem.quantity}</div>
              </div>
              <div>
                <span className="text-gray-500">Price:</span>
                <div className="font-medium">${scannedItem.price}</div>
              </div>
              {scannedItem.category && (
                <div>
                  <span className="text-gray-500">Category:</span>
                  <div className="font-medium">{scannedItem.category}</div>
                </div>
              )}
              {scannedItem.brand && (
                <div>
                  <span className="text-gray-500">Brand:</span>
                  <div className="font-medium">{scannedItem.brand}</div>
                </div>
              )}
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => inventoryMutation.mutate({
                  sku: scannedItem.sku,
                  action: 'add',
                  quantity: 1
                })}
                disabled={inventoryMutation.isPending}
                className="flex-1"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add 1
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => inventoryMutation.mutate({
                  sku: scannedItem.sku,
                  action: 'remove',
                  quantity: 1
                })}
                disabled={inventoryMutation.isPending}
                className="flex-1"
              >
                <Minus className="mr-1 h-3 w-3" />
                Remove 1
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileScanner;
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileScanner;