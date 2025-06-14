import { useState, useEffect, useRef } from "react";
import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReliableBarcodeProps {
  item: Item;
}

export function ReliableBarcode({ item }: ReliableBarcodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!item.sku) {
      setIsLoading(false);
      setError("No SKU available");
      return;
    }

    generateBarcode();
  }, [item.sku]);

  const generateBarcode = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setBarcodeDataUrl(null);

      // Wait a moment to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clean the SKU for barcode generation
      const cleanSku = (item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleanSku.length < 1) {
        throw new Error("SKU contains no valid characters");
      }

      // Create a temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 200;
      tempCanvas.height = 80;

      // Import and use jsbarcode
      const JsBarcode = (await import('jsbarcode')).default;
      
      // Generate barcode on temporary canvas
      JsBarcode(tempCanvas, cleanSku, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
        textMargin: 3,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 5
      });

      // Convert to data URL
      const dataUrl = tempCanvas.toDataURL('image/png');
      setBarcodeDataUrl(dataUrl);
      setIsLoading(false);

    } catch (error) {
      console.error("Barcode generation error:", error);
      setError(error instanceof Error ? error.message : "Barcode generation failed");
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (!barcodeDataUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Barcode - ${item.sku}</title></head>
          <body style="margin: 20px; text-align: center;">
            <h3>${item.name}</h3>
            <p>SKU: ${item.sku}</p>
            <img src="${barcodeDataUrl}" style="border: 1px solid #ccc; padding: 10px;"/>
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Product Barcode</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-center p-2 bg-white border rounded">
            {isLoading ? (
              <div className="h-16 w-48 animate-pulse bg-muted rounded"></div>
            ) : error ? (
              <div className="text-center py-6">
                <div className="font-mono text-lg font-bold">{item.sku}</div>
                <div className="text-xs text-amber-600 mt-1">Barcode unavailable</div>
              </div>
            ) : barcodeDataUrl ? (
              <img 
                src={barcodeDataUrl} 
                alt={`Barcode for ${item.sku}`}
                className="max-w-full h-auto"
              />
            ) : (
              <div className="text-center py-6">
                <div className="font-mono text-lg font-bold">{item.sku}</div>
                <div className="text-xs text-muted-foreground mt-1">No barcode generated</div>
              </div>
            )}
          </div>

          {item.sku && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">{item.sku}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopySku}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                {error && (
                  <Button size="sm" variant="outline" onClick={generateBarcode}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
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