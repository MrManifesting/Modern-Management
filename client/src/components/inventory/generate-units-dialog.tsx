import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Package2 } from 'lucide-react';

interface GenerateUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  onUnitsGenerated: () => void;
}

export function GenerateUnitsDialog({ 
  open, 
  onOpenChange, 
  item, 
  onUnitsGenerated 
}: GenerateUnitsDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [unitWeight, setUnitWeight] = useState('ounce');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateUnits = async () => {
    if (!item) return;

    setIsGenerating(true);
    try {
      const response = await apiRequest('POST', `/api/items/${item.id}/generate-units`, {
        quantity,
        unitWeight,
        basePrice: item.price || 0,
        baseRetailPrice: item.retailPrice || 0,
        baseWholesalePrice: item.wholesalePrice || 0
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Units Generated Successfully",
          description: `Generated ${quantity} individual units from ${item.name}`,
        });
        onUnitsGenerated();
        onOpenChange(false);
        
        // Reset form
        setQuantity(1);
        setUnitWeight('ounce');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate units');
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate units",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Generate Individual Units
          </DialogTitle>
          <DialogDescription>
            Break down "{item.name}" into individual sellable units with unique SKUs and barcodes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unitWeight" className="text-right">
              Unit Size
            </Label>
            <Select value={unitWeight} onValueChange={setUnitWeight}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select unit size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ounce">Ounce</SelectItem>
                <SelectItem value="half ounce">Half Ounce</SelectItem>
                <SelectItem value="quarter ounce">Quarter Ounce</SelectItem>
                <SelectItem value="eighth">Eighth</SelectItem>
                <SelectItem value="gram">Gram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Generation Preview:</p>
            <p>• {quantity} individual units will be created</p>
            <p>• Each unit will have a unique SKU and barcode</p>
            <p>• Original item quantity will be reduced by {quantity}</p>
            <p>• Unit size: {unitWeight}</p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGenerateUnits}
            disabled={isGenerating || quantity < 1}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Package2 className="h-4 w-4" />
                Generate {quantity} Units
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}