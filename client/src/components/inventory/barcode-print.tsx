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
  imageUrl?: string;
  images?: string[];
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
      
      // Generate actual printable content
      const printContent = generatePrintableContent();
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Trigger print dialog
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
        
        toast({
          title: "Print dialog opened",
          description: `Print dialog opened for ${item.name} ${printType}.`,
        });
      } else {
        throw new Error("Unable to open print window. Please check your browser's popup settings.");
      }
      
      onClose();
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "There was an error opening the print dialog.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePrintableContent = () => {
    const codeValue = item.barcode || item.sku || item.id.toString();
    const itemName = item.name || 'Unknown Item';
    const itemSKU = item.sku || 'No SKU';
    const itemPrice = item.price ? `$${item.price}` : 'No Price';
    
    // Get product image - prioritize imageUrl, then first image from images array
    const productImage = item.imageUrl || (item.images && item.images.length > 0 ? item.images[0] : null);
    
    // Generate COA link based on strain name
    const strainName = item.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-|\-$/g, '');
    const coaLink = `https://goldcbd.com/coa/${strainName}`;
    
    if (printType === 'barcode') {
      return `
        <html>
          <head>
            <title>Barcode - ${itemName}</title>
            <style>
              body { 
                margin: 0; 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                background: white;
              }
              .label {
                border: 2px solid #000;
                padding: 15px;
                text-align: center;
                background: white;
                width: 4in;
                height: 3in;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
              }
              .product-image {
                width: 80px;
                height: 60px;
                object-fit: cover;
                margin: 0 auto 5px auto;
                border: 1px solid #ccc;
                border-radius: 4px;
              }
              .no-image {
                width: 80px;
                height: 60px;
                background: #f0f0f0;
                margin: 0 auto 5px auto;
                border: 1px solid #ccc;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #666;
              }
              .barcode {
                font-family: 'Courier New', monospace;
                font-size: 20px;
                letter-spacing: 2px;
                margin: 5px 0;
                background: repeating-linear-gradient(
                  90deg,
                  #000 0px,
                  #000 2px,
                  #fff 2px,
                  #fff 4px
                );
                color: transparent;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .code-text {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                margin: 3px 0;
              }
              .item-info {
                font-size: 11px;
                margin: 1px 0;
                font-weight: bold;
              }
              .coa-info {
                font-size: 9px;
                margin: 2px 0;
                color: #333;
              }
              @media print {
                body { margin: 0; }
                @page { size: 4.25in 3.25in; margin: 0.125in; }
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="item-info">${itemName}</div>
              ${productImage ? 
                `<img src="${productImage}" alt="Product Image" class="product-image" />` : 
                `<div class="no-image">No Image</div>`
              }
              <div class="barcode">${codeValue}</div>
              <div class="code-text">${codeValue}</div>
              <div class="item-info">SKU: ${itemSKU} | ${itemPrice}</div>
              <div class="coa-info">COA: ${coaLink}</div>
            </div>
          </body>
        </html>
      `;
    } else {
      // QR Code using a simple CSS representation
      return `
        <html>
          <head>
            <title>QR Code - ${itemName}</title>
            <style>
              body { 
                margin: 0; 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                background: white;
              }
              .label {
                border: 2px solid #000;
                padding: 15px;
                text-align: center;
                background: white;
                width: 4in;
                height: 3in;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
              }
              .product-image {
                width: 80px;
                height: 60px;
                object-fit: cover;
                margin: 0 auto 5px auto;
                border: 1px solid #ccc;
                border-radius: 4px;
              }
              .no-image {
                width: 80px;
                height: 60px;
                background: #f0f0f0;
                margin: 0 auto 5px auto;
                border: 1px solid #ccc;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #666;
              }
              .qr-code {
                width: 80px;
                height: 80px;
                background: #000;
                margin: 5px auto;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 8px;
                overflow: hidden;
                border-radius: 4px;
              }
              .qr-code::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: repeating-linear-gradient(
                  0deg,
                  #000 0px,
                  #000 5px,
                  #fff 5px,
                  #fff 10px
                ),
                repeating-linear-gradient(
                  90deg,
                  #000 0px,
                  #000 5px,
                  #fff 5px,
                  #fff 10px
                );
                opacity: 0.8;
              }
              .code-text {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                margin: 3px 0;
              }
              .item-info {
                font-size: 11px;
                margin: 1px 0;
                font-weight: bold;
              }
              .coa-info {
                font-size: 9px;
                margin: 2px 0;
                color: #333;
              }
              @media print {
                body { margin: 0; }
                @page { size: 4.25in 3.25in; margin: 0.125in; }
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="item-info">${itemName}</div>
              ${productImage ? 
                `<img src="${productImage}" alt="Product Image" class="product-image" />` : 
                `<div class="no-image">No Image</div>`
              }
              <div class="qr-code">QR</div>
              <div class="code-text">${codeValue}</div>
              <div class="item-info">SKU: ${itemSKU} | ${itemPrice}</div>
              <div class="coa-info">COA: ${coaLink}</div>
            </div>
          </body>
        </html>
      `;
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