import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface WorkingBarcodeProps {
  item: Item;
}

export function WorkingBarcode({ item }: WorkingBarcodeProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    if (!item.sku) return;
    
    const cleanSku = (item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Barcode Label - ${item.sku}</title></head>
          <body style="margin: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h2>${item.name}</h2>
            <div style="border: 2px solid #000; padding: 20px; margin: 20px 0; background: white;">
              <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0" alt="Barcode for ${item.sku}" style="max-width: 100%;" />
            </div>
            <p>SKU: ${item.sku}</p>
            <p>Category: ${item.category || 'N/A'}</p>
            <p>Quantity: ${item.quantity || 0}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
      
      const response = await fetch(barcodeUrl);
      if (!response.ok) throw new Error('Failed to generate barcode');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barcode-${cleanSku}.gif`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: `Barcode for ${item.sku} downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download barcode image",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}