import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Printer, QrCode, Barcode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Item {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  quantity: number;
}

interface BarcodePrintProps {
  item: Item;
  onClose: () => void;
}

const BarcodePrint: React.FC<BarcodePrintProps> = ({ item, onClose }) => {
  const [printType, setPrintType] = useState<'barcode' | 'qrcode'>('barcode');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePrint = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call to generate and print barcode
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      toast({
        title: "Print job sent",
        description: `The ${printType} for ${item.name} has been sent to the printer.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Print failed",
        description: "There was an error sending the print job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="print-type">Print Type</Label>
        <Select value={printType} onValueChange={(value) => setPrintType(value as 'barcode' | 'qrcode')}>
          <SelectTrigger id="print-type">
            <SelectValue placeholder="Select print type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="barcode">Barcode</SelectItem>
            <SelectItem value="qrcode">QR Code</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col space-y-2">
        <Label htmlFor="size">Size</Label>
        <Select value={size} onValueChange={(value) => setSize(value as 'small' | 'medium' | 'large')}>
          <SelectTrigger id="size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-4 flex items-center justify-center bg-muted/30">
        <div className="h-40 w-full flex flex-col items-center justify-center">
          {printType === 'barcode' ? (
            <div className="flex flex-col items-center gap-2">
              <Barcode className="w-48 h-20" />
              <span className="text-xs font-mono">{item.barcode || item.sku}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <QrCode className="w-32 h-32" />
              <span className="text-xs font-mono">{item.sku}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col space-y-2">
        <p className="text-xs text-muted-foreground">
          Print will include: Item name, {printType}, SKU, and price
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handlePrint} disabled={isLoading}>
          {isLoading ? "Printing..." : "Print"}
          <Printer className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BarcodePrint;