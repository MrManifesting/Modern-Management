import { useState, useEffect } from "react";
import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServerBarcodeProps {
  item: Item;
}

export function ServerBarcode({ item }: ServerBarcodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);
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
      setBarcodeUrl(null);

      // Clean the SKU for barcode generation
      const cleanSku = (item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleanSku.length < 1) {
        throw new Error("SKU contains no valid characters");
      }

      // Use a free barcode generation service
      const barcodeApiUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(cleanSku)}`;
      
      // Test if the barcode API is accessible
      const response = await fetch(barcodeApiUrl);
      if (response.ok) {
        setBarcodeUrl(barcodeApiUrl);
      } else {
        throw new Error("Barcode service unavailable");
      }

      setIsLoading(false);

    } catch (error) {
      console.error("Barcode generation error:", error);
      setError(error instanceof Error ? error.message : "Barcode generation failed");
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (!barcodeUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Barcode - ${item.sku}</title></head>
          <body style="margin: 20px; text-align: center;">
            <h3>${item.name}</h3>
            <p>SKU: ${item.sku}</p>
            <img src="${barcodeUrl}" style="border: 1px solid #ccc; padding: 10px;" alt="Barcode for ${item.sku}"/>
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
            ) : barcodeUrl ? (
              <img 
                src={barcodeUrl} 
                alt={`Barcode for ${item.sku}`}
                className="max-w-full h-auto"
                onError={() => setError("Failed to load barcode image")}
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