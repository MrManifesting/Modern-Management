import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Item } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Package, Hash, QrCode } from 'lucide-react';

const generateUnitsSchema = z.object({
  quantity: z.number().min(2, 'Quantity must be at least 2').max(100, 'Maximum 100 units allowed'),
});

type GenerateUnitsForm = z.infer<typeof generateUnitsSchema>;

interface GenerateUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onUnitsGenerated: () => void;
}

export function GenerateUnitsDialog({
  open,
  onOpenChange,
  item,
  onUnitsGenerated,
}: GenerateUnitsDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUnits, setGeneratedUnits] = useState<any[]>([]);

  const form = useForm<GenerateUnitsForm>({
    resolver: zodResolver(generateUnitsSchema),
    defaultValues: {
      quantity: 2,
    },
  });

  const onSubmit = async (data: GenerateUnitsForm) => {
    if (!item) return;
    
    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/items/generate-units', {
        method: 'POST',
        body: {
          itemId: item.id,
          quantity: data.quantity,
        },
      });

      if (response.success) {
        setGeneratedUnits(response.units || []);
        toast({
          title: 'Units Generated Successfully',
          description: `Created ${data.quantity} individual units with unique SKUs and barcodes.`,
        });
        
        onUnitsGenerated();
      }
    } catch (error) {
      console.error('Failed to generate units:', error);
      toast({
        title: 'Generation Failed',
        description: 'There was an error generating individual units. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setGeneratedUnits([]);
    form.reset();
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Individual Units</DialogTitle>
          <DialogDescription>
            Create individual units with unique SKUs and barcodes for {item.name}
          </DialogDescription>
        </DialogHeader>
        
        {generatedUnits.length === 0 ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Original Item</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Name:</span> {item.name}</div>
                  <div><span className="font-medium">SKU:</span> {item.sku || 'Not set'}</div>
                  <div><span className="font-medium">Current Qty:</span> {item.quantity}</div>
                  <div><span className="font-medium">Price:</span> ${item.basePrice}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Number of Individual Units to Create</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="2"
                  max="100"
                  placeholder="Enter quantity"
                  {...form.register('quantity', { valueAsNumber: true })}
                />
                {form.formState.errors.quantity && (
                  <p className="text-sm text-red-600">{form.formState.errors.quantity.message}</p>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  What will be created:
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• {form.watch('quantity')} individual items, each with quantity = 1</li>
                  <li className="flex items-center">
                    <Hash className="h-3 w-3 mr-1" />
                    Unique SKU for each unit (e.g., {item.sku || 'FLW-GOL-ITEM'}-U001, -U002, etc.)
                  </li>
                  <li className="flex items-center">
                    <QrCode className="h-3 w-3 mr-1" />
                    Individual barcode and QR code for each unit
                  </li>
                  <li>• Perfect for tracking individual items separately</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate Units'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-green-800">
                ✓ Successfully Generated {generatedUnits.length} Units
              </h4>
              <p className="text-sm text-green-700">
                Each unit has been created with a unique SKU, barcode, and QR code for individual tracking.
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {generatedUnits.map((unit, index) => (
                <div key={unit.id} className="border p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{unit.name}</p>
                      <p className="text-xs text-gray-600">SKU: {unit.sku}</p>
                    </div>
                    <Badge variant="outline">Unit {index + 1}</Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}