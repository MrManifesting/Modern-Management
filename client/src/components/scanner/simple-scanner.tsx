import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Camera, 
  ScanLine, 
  Package, 
  Check,
  Plus,
  Minus
} from 'lucide-react';
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

interface SimpleScannerProps {
  onItemScanned?: (item: ScannedItem) => void;
  onActionComplete?: (result: any) => void;
}

const SimpleScanner: React.FC<SimpleScannerProps> = ({
  onItemScanned,
  onActionComplete
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [manualSku, setManualSku] = useState('');
  const [action, setAction] = useState<'check' | 'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);

  const searchItemMutation = useMutation({
    mutationFn: async (sku: string) => {
      // Try SKU first, then barcode if SKU fails
      try {
        const response = await fetch(`/api/items/sku/${encodeURIComponent(sku)}`);
        if (response.ok) {
          return await response.json();
        }
        // If SKU fails, try barcode
        const barcodeResponse = await fetch(`/api/items/barcode/${encodeURIComponent(sku)}`);
        if (barcodeResponse.ok) {
          return await barcodeResponse.json();
        }
        throw new Error('Item not found');
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data: any) => {
      if (data && data.id) {
        setScannedItem(data);
        onItemScanned?.(data);
        
        if (action !== 'check') {
          processInventoryAction(data);
        }
      }
    },
    onError: (error) => {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search for item. Please try again.",
        variant: "destructive"
      });
    }
  });

  const inventoryMutation = useMutation({
    mutationFn: async ({ sku, action, quantity }: { sku: string; action: string; quantity: number }) => {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sku, action, quantity })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update inventory');
      }
      
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      
      const actionText = variables.action === 'add' ? 'Added' : 'Removed';
      toast({
        title: "Inventory Updated",
        description: `${actionText} ${variables.quantity} units successfully`
      });
      
      onActionComplete?.(data);
      setScannedItem(null);
      setManualSku('');
    },
    onError: (error) => {
      console.error('Inventory update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update inventory. Please try again.",
        variant: "destructive"
      });
    }
  });

  const searchItem = useCallback((sku: string) => {
    if (!sku.trim()) return;
    setIsProcessing(true);
    searchItemMutation.mutate(sku, {
      onSettled: () => setIsProcessing(false)
    });
  }, [searchItemMutation]);

  const processInventoryAction = useCallback((item: ScannedItem) => {
    if (action === 'check') return;
    
    inventoryMutation.mutate({
      sku: item.sku,
      action: action,
      quantity: quantity
    });
  }, [action, quantity, inventoryMutation]);

  const handleManualSubmit = () => {
    if (!manualSku.trim()) return;
    searchItem(manualSku.trim());
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      // Create a canvas to process the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx?.drawImage(img, 0, 0);
        
        // Try to extract text/numbers from the image using basic image processing
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        
        // Apply multiple image enhancement techniques for better barcode detection
        if (imageData && ctx) {
          const data = imageData.data;
          const width = canvas.width;
          const height = canvas.height;
          
          // Step 1: Convert to grayscale with better weighting
          for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            data[i] = gray;     // red
            data[i + 1] = gray; // green  
            data[i + 2] = gray; // blue
          }
          ctx.putImageData(imageData, 0, 0);
          
          // Step 2: Apply histogram equalization for better contrast
          const histogram = new Array(256).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
          }
          
          // Calculate cumulative distribution
          const cdf = new Array(256);
          cdf[0] = histogram[0];
          for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
          }
          
          // Normalize and apply equalization
          const totalPixels = width * height;
          for (let i = 0; i < data.length; i += 4) {
            const equalizedValue = Math.round((cdf[data[i]] * 255) / totalPixels);
            data[i] = equalizedValue;
            data[i + 1] = equalizedValue;
            data[i + 2] = equalizedValue;
          }
          
          // Step 3: Apply adaptive thresholding for better barcode contrast
          const newImageData = ctx.createImageData(width, height);
          const newData = newImageData.data;
          
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              
              // Calculate local average in 15x15 window
              let sum = 0;
              let count = 0;
              const windowSize = 7;
              
              for (let dy = -windowSize; dy <= windowSize; dy++) {
                for (let dx = -windowSize; dx <= windowSize; dx++) {
                  const ny = y + dy;
                  const nx = x + dx;
                  if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                    const nidx = (ny * width + nx) * 4;
                    sum += data[nidx];
                    count++;
                  }
                }
              }
              
              const localAvg = sum / count;
              const threshold = localAvg * 0.85; // Adaptive threshold
              const value = data[idx] > threshold ? 255 : 0;
              
              newData[idx] = value;     // red
              newData[idx + 1] = value; // green
              newData[idx + 2] = value; // blue
              newData[idx + 3] = 255;   // alpha
            }
          }
          
          ctx.putImageData(newImageData, 0, 0);
        }
        
        // Convert canvas to blob and send to server for processing
        canvas.toBlob(async (blob) => {
          if (blob) {
            const formData = new FormData();
            formData.append('image', blob, 'barcode.png');
            
            try {
              const response = await fetch('/api/analyze-image', {
                method: 'POST',
                body: formData
              });
              
              if (response.ok) {
                const result = await response.json();
                
                // Look for barcode patterns in the extracted text
                const extractedText = result.extractedText || '';
                console.log('Extracted text from image:', extractedText);
                
                // Enhanced pattern matching for various barcode formats
                const barcodePatterns = [
                  /\b\d{12,14}\b/g,        // UPC/EAN barcodes
                  /\b[A-Z0-9]{8,15}\b/g,   // Code128/Code39 
                  /\b\d{8,12}\b/g,         // General numeric codes
                  /\b[A-Z]{2,4}\d{4,8}\b/g, // Mixed alphanumeric
                  /\b\d{6,10}\b/g          // Shorter numeric codes
                ];
                
                let detectedCode = null;
                
                // Try each pattern until we find a match
                for (const pattern of barcodePatterns) {
                  const matches = extractedText.match(pattern);
                  if (matches && matches.length > 0) {
                    // Prefer longer codes as they're more likely to be complete barcodes
                    detectedCode = matches.sort((a, b) => b.length - a.length)[0];
                    break;
                  }
                }
                
                if (detectedCode) {
                  console.log('Detected barcode:', detectedCode);
                  setManualSku(detectedCode);
                  
                  toast({
                    title: "Barcode Detected",
                    description: `Found barcode: ${detectedCode}`,
                    variant: "default"
                  });
                  
                  // Auto-search the detected code
                  searchItem(detectedCode);
                } else {
                  // Fallback: show all extracted text for manual selection
                  if (extractedText.trim()) {
                    setManualSku(extractedText.trim().split(/\s+/)[0]); // Use first word
                    toast({
                      title: "Text Extracted", 
                      description: "Please verify the code in the input field",
                      variant: "default"
                    });
                  } else {
                    toast({
                      title: "No Text Found", 
                      description: "Could not extract text from image. Try manual entry.",
                      variant: "destructive"
                    });
                  }
                }
              } else {
                throw new Error('Image analysis failed');
              }
            } catch (error) {
              console.error('Image processing error:', error);
              toast({
                title: "Processing Failed",
                description: "Could not process the image. Try manual entry.",
                variant: "destructive"
              });
            }
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        toast({
          title: "Image Load Failed",
          description: "Could not load the image. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      };
      
      // Load the image
      img.src = URL.createObjectURL(file);
      
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Could not process the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Camera/Image Input Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="w-full h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center">
              <Camera className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Enhanced barcode detection</p>
              <p className="text-xs text-gray-400">Upload image for AI analysis</p>
            </div>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  Processing Image...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo of Barcode
                </>
              )}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
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
              >
                <Package className="mr-1 h-3 w-3" />
                Check
              </Button>
              <Button
                variant={action === 'add' ? 'default' : 'outline'}
                onClick={() => setAction('add')}
                size="sm"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
              <Button
                variant={action === 'remove' ? 'default' : 'outline'}
                onClick={() => setAction('remove')}
                size="sm"
              >
                <Minus className="mr-1 h-3 w-3" />
                Remove
              </Button>
            </div>
          </div>

          {action !== 'check' && (
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanned Item Display */}
      {scannedItem && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-800 flex items-center gap-2">
              <Check className="h-5 w-5" />
              Item Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {scannedItem.name}</div>
              <div><strong>SKU:</strong> {scannedItem.sku}</div>
              <div><strong>Current Stock:</strong> {scannedItem.quantity}</div>
              {scannedItem.category && <div><strong>Category:</strong> {scannedItem.category}</div>}
              {scannedItem.brand && <div><strong>Brand:</strong> {scannedItem.brand}</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleScanner;