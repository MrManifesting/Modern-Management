import { useState, useEffect, useRef } from "react";
import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleBarcodeProps {
  item: Item;
}

export function SimpleBarcode({ item }: SimpleBarcodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!item.sku) {
      setIsLoading(false);
      setError("No SKU available");
      return;
    }

    const generateBarcode = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Small delay to ensure canvas is ready
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (!canvasRef.current) {
          throw new Error("Canvas not ready");
        }

        // Import and use jsbarcode
        const JsBarcode = (await import('jsbarcode')).default;
        
        // Generate barcode directly on canvas
        JsBarcode(canvasRef.current, item.sku, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 11,
          textMargin: 3,
          background: "#ffffff",
          lineColor: "#000000"
        });

        setIsLoading(false);

      } catch (error) {
        console.error("Barcode generation failed:", error);
        setError("Could not generate barcode");
        setIsLoading(false);
      }
    };

    generateBarcode();
  }, [item.sku]);

  const handlePrint = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Barcode - ${item.sku}</title></head>
          <body style="margin: 20px; text-align: center;">
            <h3>${item.name}</h3>
            <p>SKU: ${item.sku}</p>
            <img src="${dataUrl}" style="border: 1px solid #ccc; padding: 10px;"/>
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
          {isLoading ? (
            <div className="h-16 w-full animate-pulse bg-muted rounded"></div>
          ) : error ? (
            <div className="text-center py-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="flex justify-center p-2 bg-white border rounded">
              <canvas ref={canvasRef} />
            </div>
          )}

          {item.sku && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">{item.sku}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopySku}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
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