import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Copy, Download, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { createPrintLabels } from "./auto-print-labels";

interface WorkingBarcodeProps {
  item: Item;
}

export function WorkingBarcode({ item }: WorkingBarcodeProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [labelQuantity, setLabelQuantity] = useState(1);

  const handlePrint = async () => {
    if (!item.sku) return;
    
    setLoading(true);
    try {
      const cleanSku = (item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Barcode Label - ${item.sku}</title>
              <style>
                body { margin: 20px; text-align: center; font-family: Arial, sans-serif; }
                .barcode-container { border: 2px solid #000; padding: 20px; margin: 20px 0; background: white; }
                img { max-width: 100%; height: auto; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <h2>${item.name}</h2>
              <div class="barcode-container">
                <img src="${barcodeUrl}" alt="Barcode for ${item.sku}" onload="window.print(); window.close();" onerror="alert('Failed to load barcode image');" />
              </div>
              <p>SKU: ${item.sku}</p>
              <p>Category: ${item.category || 'N/A'}</p>
              <p>Quantity: ${item.quantity || 0}</p>
              <div class="no-print">
                <p><em>Close this window after printing</em></p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        toast({
          title: "Print Window Opened",
          description: "Barcode label ready for printing",
        });
      } else {
        toast({
          title: "Print Blocked",
          description: "Please allow popups for this site to enable printing",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to open print window",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySku = () => {
    if (!item.sku) return;
    
    navigator.clipboard.writeText(item.sku).then(() => {
      toast({
        title: "SKU Copied",
        description: `${item.sku} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy SKU to clipboard",
        variant: "destructive"
      });
    });
  };

  const handleDownload = async () => {
    if (!item.sku) return;
    
    setLoading(true);
    try {
      const cleanSku = (item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=150&imagetype=Png&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
      
      // Direct link approach for better mobile/browser compatibility
      const link = document.createElement('a');
      link.href = barcodeUrl;
      link.download = `barcode-${cleanSku}.png`;
      link.target = '_blank';
      
      // For mobile devices, open in new tab with instructions
      if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
        window.open(barcodeUrl, '_blank');
        toast({
          title: "Barcode Opened",
          description: "Long press the barcode image to save it to your device",
        });
      } else {
        // Desktop - attempt direct download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: "Download Started",
          description: `Barcode for ${item.sku} downloading`,
        });
      }
    } catch (error) {
      // Fallback - always open in new tab
      const cleanSku = (item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=150&imagetype=Png&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
      window.open(barcodeUrl, '_blank');
      toast({
        title: "Barcode Opened",
        description: "Right-click the barcode image to save it",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintLabels = () => {
    if (!item.sku || labelQuantity < 1) return;
    
    const printLabels = createPrintLabels(item, labelQuantity);
    const success = printLabels.openPrintPreview(labelQuantity);
    
    if (success) {
      toast({
        title: "Print Labels Ready",
        description: `${labelQuantity} barcode label${labelQuantity > 1 ? 's' : ''} ready for printing`,
      });
    } else {
      toast({
        title: "Print Blocked",
        description: "Please allow popups to print barcode labels",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Barcode</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-center p-4 bg-white border-2 border-dashed border-gray-300 rounded">
            {item.sku ? (
              <div className="text-center">
                <div className="text-center">
                  <img 
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent((item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase())}&code=Code128&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`}
                    alt={`Barcode for ${item.sku}`}
                    className="max-w-full h-auto mx-auto"
                    onError={(e) => {
                      console.error('Barcode image failed to load');
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div className="barcode-fallback text-center py-4" style={{ display: 'none' }}>
                    <div className="font-mono text-xl font-bold tracking-widest bg-gray-100 px-4 py-2 rounded border">
                      {item.sku}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">SKU Code</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">No SKU assigned</div>
              </div>
            )}
          </div>

          {item.sku && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs">{item.sku}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopySku}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDownload}
                  disabled={loading}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {loading ? 'Downloading...' : 'Download'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handlePrint}
                  disabled={loading}
                >
                  <Printer className="h-3 w-3 mr-1" />
                  {loading ? 'Opening...' : 'Print'}
                </Button>
              </div>
            </div>
          )}

          {/* Print Labels Section */}
          {item.sku && (
            <div className="pt-3 border-t">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Print Labels</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="label-quantity" className="text-xs">Quantity:</Label>
                  <Input
                    id="label-quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={labelQuantity}
                    onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 h-8 text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handlePrintLabels}
                    disabled={loading || !item.sku}
                    className="flex-1"
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    Print {labelQuantity} Label{labelQuantity > 1 ? 's' : ''}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Perfect for warehouse labeling and inventory tracking
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}