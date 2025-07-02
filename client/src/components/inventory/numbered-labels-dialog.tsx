import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Printer, Hash, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Item } from "@shared/schema";

interface NumberedLabelsDialogProps {
  item: Item;
  children: React.ReactNode;
}

interface LabelFormat {
  id: string;
  name: string;
  size: string;
  labelsPerPage: number;
  columns: number;
  rows: number;
}

export function NumberedLabelsDialog({ item, children }: NumberedLabelsDialogProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [selectedFormat, setSelectedFormat] = useState("avery-5160");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Available label formats - predefined locally
  const formats: LabelFormat[] = [
    { id: "avery-5160", name: "Avery 5160 - Address Labels", size: "1 x 2.625 in", labelsPerPage: 30, columns: 3, rows: 10 },
    { id: "avery-5161", name: "Avery 5161 - Address Labels", size: "1 x 4 in", labelsPerPage: 20, columns: 2, rows: 10 },
    { id: "avery-5162", name: "Avery 5162 - Address Labels", size: "1.333 x 4 in", labelsPerPage: 14, columns: 2, rows: 7 },
    { id: "product-labels", name: "Product Labels", size: "2 x 3 in", labelsPerPage: 12, columns: 3, rows: 4 },
    { id: "dymo-small", name: "DYMO Small", size: "0.875 x 2.125 in", labelsPerPage: 1, columns: 1, rows: 1 }
  ];

  const generateLabelsLocally = (itemData: Item, labelQuantity: number, format: string): string => {
    const selectedFormat = formats.find(f => f.id === format) || formats[0];
    const baseSku = itemData.sku?.replace(/-\d+$/, '') || itemData.sku || 'NO-SKU';
    const itemName = itemData.name || 'Unknown Item';
    const itemPrice = itemData.base_price ? `$${itemData.base_price}` : (itemData.sale_price ? `$${itemData.sale_price}` : 'No Price');
    
    // Generate product image URL and COA link
    const productImage = itemData.imageUrl || (itemData.images && Array.isArray(itemData.images) && itemData.images.length > 0 ? itemData.images[0] : null);
    const strainName = itemData.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-|\-$/g, '');
    const coaLink = `https://goldcbd.com/coa/${strainName}`;
    
    // Generate numbered labels
    const labels = Array.from({ length: labelQuantity }, (_, index) => {
      const labelNumber = index + 1;
      const numberedSku = `${baseSku}-${labelNumber.toString().padStart(3, '0')}`;
      
      return `
        <div class="label">
          <div class="label-header">
            <div class="item-name">${itemName} #${labelNumber}</div>
            ${productImage ? 
              `<img src="${productImage}" alt="Product" class="product-image" />` : 
              `<div class="no-image">No Image</div>`
            }
          </div>
          <div class="label-body">
            <div class="sku-barcode">
              <div class="barcode-lines">${numberedSku}</div>
              <div class="sku-text">${numberedSku}</div>
            </div>
            <div class="item-details">
              <div>Price: ${itemPrice}</div>
              <div>Label ${labelNumber}/${labelQuantity}</div>
            </div>
          </div>
          <div class="coa-info">COA: ${coaLink}</div>
        </div>
      `;
    }).join('');

    return `
      <html>
        <head>
          <title>Numbered Labels - ${itemName}</title>
          <style>
            body { 
              margin: 0; 
              font-family: Arial, sans-serif; 
              background: white;
              padding: 0.25in;
            }
            .labels-grid {
              display: grid;
              grid-template-columns: repeat(${selectedFormat.columns}, 1fr);
              gap: 0.125in;
              page-break-inside: avoid;
            }
            .label {
              border: 1px solid #000;
              padding: 8px;
              background: white;
              width: ${selectedFormat.size.split(' x ')[1]};
              height: ${selectedFormat.size.split(' x ')[0]};
              box-sizing: border-box;
              font-size: 9px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .label-header {
              text-align: center;
              border-bottom: 1px solid #ccc;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .item-name {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 2px;
            }
            .product-image {
              width: 30px;
              height: 25px;
              object-fit: cover;
              border: 1px solid #ccc;
              border-radius: 2px;
              margin: 0 auto;
            }
            .no-image {
              width: 30px;
              height: 25px;
              background: #f0f0f0;
              border: 1px solid #ccc;
              border-radius: 2px;
              margin: 0 auto;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 6px;
              color: #666;
            }
            .label-body {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .sku-barcode {
              text-align: center;
              margin: 2px 0;
            }
            .barcode-lines {
              font-family: 'Courier New', monospace;
              background: repeating-linear-gradient(
                90deg,
                #000 0px,
                #000 1px,
                #fff 1px,
                #fff 2px
              );
              color: transparent;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 2px 0;
            }
            .sku-text {
              font-family: 'Courier New', monospace;
              font-size: 8px;
              margin: 2px 0;
            }
            .item-details {
              font-size: 7px;
              text-align: center;
              margin: 2px 0;
            }
            .coa-info {
              font-size: 6px;
              text-align: center;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 2px;
            }
            @media print {
              body { margin: 0; padding: 0.125in; }
              @page { size: letter; margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${labels}
          </div>
        </body>
      </html>
    `;
  };

  const handleGenerateLabels = () => {
    if (quantity < 1 || quantity > 100) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be between 1 and 100",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate labels locally
      const htmlContent = generateLabelsLocally(item, quantity, selectedFormat);
      
      // Open print preview in new window
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
        
        toast({
          title: "Labels Generated",
          description: `Generated ${quantity} numbered labels for ${item.name}`,
        });
        
        setOpen(false);
      } else {
        throw new Error("Unable to open print window");
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate numbered labels. Please check your browser's popup settings.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const baseSku = item.sku?.replace(/-\d+$/, '') || item.sku || '';
  const previewSkus = Array.from({ length: Math.min(quantity, 5) }, (_, i) => `${baseSku}-${i + 1}`);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Generate Numbered Labels
          </DialogTitle>
          <DialogDescription>
            Create individual labels for each unit with sequential SKU numbers, product images, and COA links
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item</Label>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">Base SKU: {item.sku}</div>
              <div className="text-sm text-muted-foreground">Current Quantity: {item.quantity || 0}</div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Labels</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Maximum 100 labels per batch
            </div>
          </div>

          {/* Label Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Label Format</Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select label format" />
              </SelectTrigger>
              <SelectContent>
                {formats.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    {format.name} ({format.size})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SKU Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">SKU Preview</Label>
            <div className="p-3 bg-muted rounded-md space-y-1">
              {previewSkus.map((sku, index) => (
                <div key={index} className="text-sm font-mono">
                  {sku}
                </div>
              ))}
              {quantity > 5 && (
                <div className="text-xs text-muted-foreground">
                  ... and {quantity - 5} more
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateLabels}
              disabled={isGenerating || quantity < 1}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Generate & Print Labels
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}