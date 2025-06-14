import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleSkuDisplayProps {
  item: Item;
}

export function SimpleSkuDisplay({ item }: SimpleSkuDisplayProps) {
  const { toast } = useToast();

  const handlePrint = () => {
    if (!item.sku) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>SKU Label - ${item.sku}</title></head>
          <body style="margin: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h2>${item.name}</h2>
            <div style="border: 2px solid #000; padding: 20px; margin: 20px 0; background: white;">
              <div style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                ${item.sku}
              </div>
              <div style="font-size: 12px; margin-top: 10px; color: #666;">
                SKU Code
              </div>
            </div>
            <p>Category: ${item.category || 'N/A'}</p>
            <p>Price: $${item.retailPrice || item.wholesalePrice || 'N/A'}</p>
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Product Code</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-center p-4 bg-white border-2 border-dashed border-gray-300 rounded">
            {item.sku ? (
              <div className="text-center">
                <div className="font-mono text-xl font-bold tracking-widest bg-gray-100 px-4 py-2 rounded border">
                  {item.sku}
                </div>
                <div className="text-xs text-muted-foreground mt-2">SKU Code</div>
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
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-3 w-3 mr-1" />
                  Print Label
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}