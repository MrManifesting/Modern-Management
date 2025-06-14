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
      itemId: item.id,
      action: action,
      quantity: quantity
    });
  }, [action, quantity, inventoryMutation]);

  const handleManualSubmit = () => {
    if (!manualSku.trim()) return;
    searchItem(manualSku.trim());
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, just show a message that image scanning isn't available
    toast({
      title: "Image Scanning",
      description: "Image-based barcode scanning is not available. Please use manual entry.",
      variant: "default"
    });
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              <p className="text-sm text-gray-500">Camera scanning unavailable</p>
              <p className="text-xs text-gray-400">Use manual entry below</p>
            </div>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo of Barcode
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