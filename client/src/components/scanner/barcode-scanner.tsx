import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Camera, Search, Package, Plus, Edit } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [showItemNotFoundDialog, setShowItemNotFoundDialog] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState('');
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: 'Flower',
    weight: '1 pound',
    vendor: 'Gold Standard',
    quality: 'Top Shelf',
    quantity: 1,
    basePrice: ''
  });

  // Auto-generate item name from barcode
  const generateItemName = useCallback((barcode: string) => {
    // Extract meaningful parts from barcode
    const parts = barcode.split(/[^A-Za-z0-9]/);
    let name = parts.join(' ').trim();
    
    // If barcode looks like a standard format, create a better name
    if (barcode.includes('FLW')) {
      name = 'Flower Product';
    } else if (barcode.includes('CON')) {
      name = 'Concentrate Product';
    } else if (barcode.includes('EDI')) {
      name = 'Edible Product';
    } else {
      // Use first meaningful part or default
      name = parts.find(p => p.length > 2) || 'Scanned Product';
    }
    
    return `${name} (${barcode})`;
  }, []);
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
        // Show dialog for creating new item with this barcode
        setNotFoundCode(code);
        // Auto-generate name when dialog opens
        const autoName = generateItemName(code);
        setNewItemForm(prev => ({ ...prev, name: autoName }));
        setShowItemNotFoundDialog(true);
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

  // Create new item with scanned barcode
  const createNewItem = useCallback(async () => {
    if (!newItemForm.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a product name",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newItemForm.name,
          category: newItemForm.category,
          weight: newItemForm.weight,
          vendor: newItemForm.vendor,
          quality: newItemForm.quality,
          quantity: newItemForm.quantity,
          basePrice: parseFloat(newItemForm.basePrice) || 0,
          barcode: notFoundCode, // Use the scanned barcode
          status: 'available', // Set as available/in stock
          isActive: true, // Mark as active
          generateCodes: true // Auto-generate SKU and QR codes
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        
        toast({
          title: "Item Created",
          description: `${newItem.name} added to inventory with barcode ${notFoundCode}`,
          variant: "default"
        });

        setShowItemNotFoundDialog(false);
        setScannedItem(newItem);
        
        // Reset form
        setNewItemForm({
          name: '',
          category: 'Flower',
          weight: '1 pound',
          vendor: 'Gold Standard',
          quality: 'Top Shelf',
          quantity: 1,
          basePrice: ''
        });

        if (onItemScanned) {
          onItemScanned(newItem);
        }
        
        if (onActionComplete) {
          onActionComplete({ action: 'created', item: newItem });
        }
      } else {
        const error = await response.json();
        toast({
          title: "Creation Failed",
          description: error.message || "Could not create item",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Create item error:', error);
      toast({
        title: "Creation Failed",
        description: "Could not create item",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [newItemForm, notFoundCode, onItemScanned, onActionComplete, toast]);

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

      {/* Item Not Found Dialog */}
      <Dialog open={showItemNotFoundDialog} onOpenChange={setShowItemNotFoundDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Not Found</DialogTitle>
            <DialogDescription>
              Barcode "{notFoundCode}" was not found in your inventory. Would you like to create a new item with this barcode?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="item-name">Product Name *</Label>
              <Input
                id="item-name"
                value={newItemForm.name}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newItemForm.category} 
                  onValueChange={(value) => setNewItemForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flower">Flower</SelectItem>
                    <SelectItem value="Concentrates">Concentrates</SelectItem>
                    <SelectItem value="Edibles">Edibles</SelectItem>
                    <SelectItem value="Topicals">Topicals</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Select 
                  value={newItemForm.weight} 
                  onValueChange={(value) => setNewItemForm(prev => ({ ...prev, weight: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 pound">1 pound</SelectItem>
                    <SelectItem value="half pound">half pound</SelectItem>
                    <SelectItem value="quarter pound">quarter pound</SelectItem>
                    <SelectItem value="ounce">ounce</SelectItem>
                    <SelectItem value="half ounce">half ounce</SelectItem>
                    <SelectItem value="quarter ounce">quarter ounce</SelectItem>
                    <SelectItem value="eighth">eighth</SelectItem>
                    <SelectItem value="gram">gram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Select 
                  value={newItemForm.vendor} 
                  onValueChange={(value) => setNewItemForm(prev => ({ ...prev, vendor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gold Standard">Gold Standard</SelectItem>
                    <SelectItem value="Mason Jar Co">Mason Jar Co</SelectItem>
                    <SelectItem value="Premium Supply">Premium Supply</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quality">Quality</Label>
                <Select 
                  value={newItemForm.quality} 
                  onValueChange={(value) => setNewItemForm(prev => ({ ...prev, quality: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Top Shelf">Top Shelf</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Budget">Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newItemForm.quantity}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
              
              <div>
                <Label htmlFor="price">Base Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newItemForm.basePrice}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, basePrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">
                <strong>Barcode:</strong> {notFoundCode}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                SKU and QR code will be generated automatically
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowItemNotFoundDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={createNewItem}
              disabled={isProcessing || !newItemForm.name.trim()}
              className="flex-1"
            >
              {isProcessing ? 'Creating...' : 'Create Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}