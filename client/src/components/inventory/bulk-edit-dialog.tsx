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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Item } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const bulkEditSchema = z.object({
  saleType: z.enum(['percentage', 'fixed']).optional(),
  saleValue: z.number().min(0).optional(),
  newQuantity: z.number().min(0).optional(),
  quantityOperation: z.enum(['set', 'add', 'subtract']).optional(),
  newStatus: z.string().optional(),
  generateSKU: z.boolean().default(false),
  generateBarcode: z.boolean().default(false),
  generateQRCode: z.boolean().default(false),
});

type BulkEditForm = z.infer<typeof bulkEditSchema>;

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: Item[];
  editType: 'sale' | 'quantity' | 'status' | 'codes';
  onUpdate?: (updates: any) => void;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedItems,
  editType,
  onUpdate,
}: BulkEditDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BulkEditForm>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      saleType: 'percentage',
      quantityOperation: 'set',
      generateSKU: false,
      generateBarcode: false,
      generateQRCode: false,
    },
  });

  const onSubmit = async (data: BulkEditForm) => {
    setIsLoading(true);
    try {
      const itemIds = selectedItems.map(item => item.id);
      
      let updatePayload: any = { itemIds };

      switch (editType) {
        case 'sale':
          if (data.saleType && data.saleValue !== undefined) {
            updatePayload.saleDiscount = {
              type: data.saleType,
              value: data.saleValue,
            };
          }
          break;
        case 'quantity':
          if (data.newQuantity !== undefined && data.quantityOperation) {
            updatePayload.quantity = {
              operation: data.quantityOperation,
              value: data.newQuantity,
            };
          }
          break;
        case 'status':
          if (data.newStatus) {
            updatePayload.status = data.newStatus;
          }
          break;
        case 'codes':
          updatePayload.generateCodes = {
            sku: data.generateSKU,
            barcode: data.generateBarcode,
            qrCode: data.generateQRCode,
          };
          break;
      }

      const response = await apiRequest('/api/items/bulk-update', {
        method: 'PUT',
        body: updatePayload,
      });

      if (response.success) {
        toast({
          title: 'Bulk Update Successful',
          description: `Updated ${selectedItems.length} items successfully.`,
        });
        
        if (onUpdate) {
          onUpdate(updatePayload);
        }
        
        onOpenChange(false);
        form.reset();
      }
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast({
        title: 'Update Failed',
        description: 'There was an error updating the items. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDialogTitle = () => {
    switch (editType) {
      case 'sale': return 'Apply Sale/Discount';
      case 'quantity': return 'Update Quantities';
      case 'status': return 'Change Status';
      case 'codes': return 'Generate Codes';
      default: return 'Bulk Edit';
    }
  };

  const renderSaleContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Discount Type</Label>
        <Select 
          value={form.watch('saleType')} 
          onValueChange={(value: 'percentage' | 'fixed') => form.setValue('saleType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select discount type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Percentage Off</SelectItem>
            <SelectItem value="fixed">Fixed Amount Off</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>
          Discount Value {form.watch('saleType') === 'percentage' ? '(%)' : '($)'}
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder={form.watch('saleType') === 'percentage' ? "10" : "5.00"}
          value={form.watch('saleValue') || ''}
          onChange={(e) => form.setValue('saleValue', parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );

  const renderQuantityContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Operation</Label>
        <Select 
          value={form.watch('quantityOperation')} 
          onValueChange={(value: 'set' | 'add' | 'subtract') => form.setValue('quantityOperation', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="set">Set to specific amount</SelectItem>
            <SelectItem value="add">Add to current quantity</SelectItem>
            <SelectItem value="subtract">Subtract from current quantity</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Quantity</Label>
        <Input
          type="number"
          min="0"
          placeholder="Enter quantity"
          value={form.watch('newQuantity') || ''}
          onChange={(e) => form.setValue('newQuantity', parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );

  const renderStatusContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>New Status</Label>
        <Select 
          value={form.watch('newStatus') || ''} 
          onValueChange={(value) => form.setValue('newStatus', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="listed">Listed</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderCodesContent = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="generateSKU"
            checked={form.watch('generateSKU')}
            onCheckedChange={(checked) => form.setValue('generateSKU', !!checked)}
          />
          <Label htmlFor="generateSKU">Generate SKU codes</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="generateBarcode"
            checked={form.watch('generateBarcode')}
            onCheckedChange={(checked) => form.setValue('generateBarcode', !!checked)}
          />
          <Label htmlFor="generateBarcode">Generate barcodes</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="generateQRCode"
            checked={form.watch('generateQRCode')}
            onCheckedChange={(checked) => form.setValue('generateQRCode', !!checked)}
          />
          <Label htmlFor="generateQRCode">Generate QR codes</Label>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (editType) {
      case 'sale': return renderSaleContent();
      case 'quantity': return renderQuantityContent();
      case 'status': return renderStatusContent();
      case 'codes': return renderCodesContent();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            Apply changes to {selectedItems.length} selected items
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {renderContent()}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Applying...' : 'Apply Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}