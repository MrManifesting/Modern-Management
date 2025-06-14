import { useState, useEffect, useRef, useCallback } from "react";
import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleBarcodeProps {
  item: Item;
}

export function SimpleBarcode({ item }: SimpleBarcodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const generateBarcode = useCallback(async () => {
    if (!item.sku) {
      setIsLoading(false);
      setError("No SKU available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Wait longer for canvas to be ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas element not found in DOM");
      }

      console.log("Canvas found:", canvas);
      console.log("Canvas parent:", canvas.parentElement);

      // Use external barcode service instead of client-side jsbarcode
      
      // Validate and clean the SKU
      console.log("Original SKU:", item.sku);
      const cleanSku = item.sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      console.log("Cleaned SKU:", cleanSku);
      if (cleanSku.length < 1) {
        throw new Error("SKU contains no valid characters for barcode");
      }
      
      // Set canvas size explicitly
      canvas.width = 200;
      canvas.height = 80;
      console.log("Canvas size set to:", canvas.width, "x", canvas.height);
      
      // Generate barcode with validation
      console.log("Generating barcode...");
      try {
        JsBarcode(canvas, cleanSku, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          textMargin: 2,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 5,
          valid: function(valid) {
            console.log("Barcode validation result:", valid);
            if (!valid) {
              throw new Error(`Invalid barcode data for SKU: ${cleanSku}`);
            }
          }
        });
        console.log("Barcode generated successfully");
      } catch (barcodeError) {
        console.error("JsBarcode generation failed:", barcodeError);
        throw new Error(`Barcode generation failed: ${barcodeError.message}`);
      }

      setIsLoading(false);

    } catch (error) {
      console.error("Error generating barcode:", error);
      console.error("SKU:", item.sku);
      console.error("Canvas:", canvasRef.current);
      console.error("Canvas width/height:", canvasRef.current?.width, canvasRef.current?.height);
      console.error("Error type:", typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      setError(error instanceof Error ? error.message : "Barcode generation failed");
      setIsLoading(false);
    }
  }, [item.sku]);

  useEffect(() => {
    generateBarcode();
  }, [generateBarcode]);

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
          <div className="flex justify-center p-2 bg-white border rounded relative">
            <canvas 
              ref={canvasRef} 
              style={{ display: !isLoading && !error ? 'block' : 'none' }}
            />
            {isLoading && (
              <div className="h-16 w-48 animate-pulse bg-muted rounded"></div>
            )}
            {error && (
              <div className="text-center py-6">
                <div className="font-mono text-lg font-bold">{item.sku}</div>
                <div className="text-xs text-amber-600 mt-1">Barcode unavailable</div>
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