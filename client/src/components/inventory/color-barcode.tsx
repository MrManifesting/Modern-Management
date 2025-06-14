import { useState, useEffect, useRef } from "react";
import { Item } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleHelp, Printer, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ColorBarcodeProps {
  item: Item;
}

interface ColorBarcode {
  barcodeSvg: string;
  primaryColor: string;
  secondaryColor: string;
  colorClass: string;
}

// Color mapping for different categories
const getCategoryColors = (category: string) => {
  const colors = {
    'Flower': { primary: '#10B981', secondary: '#059669' }, // Green
    'Edibles': { primary: '#F59E0B', secondary: '#D97706' }, // Amber
    'Concentrates': { primary: '#8B5CF6', secondary: '#7C3AED' }, // Purple
    'Vapes': { primary: '#EF4444', secondary: '#DC2626' }, // Red
    'Topicals': { primary: '#06B6D4', secondary: '#0891B2' }, // Cyan
    'Accessories': { primary: '#6B7280', secondary: '#4B5563' }, // Gray
    'Bulk': { primary: '#FB7185', secondary: '#F43F5E' }, // Rose
    'Other': { primary: '#84CC16', secondary: '#65A30D' }, // Lime
  };
  
  return colors[category as keyof typeof colors] || colors['Other'];
};

export function ColorBarcode({ item }: ColorBarcodeProps) {
  const [barcode, setBarcode] = useState<ColorBarcode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!item.sku) {
      setIsLoading(false);
      setError("No SKU available for barcode generation");
      return;
    }

    const generateBarcode = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for canvas to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!canvasRef.current) {
          throw new Error("Canvas ref not available");
        }

        // Dynamically import jsbarcode
        const JsBarcode = (await import('jsbarcode')).default;

        // Get category colors
        const colors = getCategoryColors(item.category || 'Other');
        
        // Generate barcode using jsbarcode directly on canvas
        JsBarcode(canvasRef.current, item.sku, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 12,
          textMargin: 5,
          background: "#ffffff",
          lineColor: "#000000"
        });

        // Set barcode state to trigger re-render
        setBarcode({
          barcodeSvg: "canvas-rendered", // Just a flag since we're using canvas directly
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          colorClass: item.category || 'Other'
        });

      } catch (error) {
        console.error("Error generating barcode:", error);
        setError("Failed to generate barcode");
        toast({
          title: "Error",
          description: "Failed to generate barcode",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    generateBarcode();
  }, [item.sku, item.category]);

  // Function to open the printable barcode in a new window
  const openPrintableBarcode = () => {
    if (!item.id) return;
    window.open(`/api/items/${item.id}/printable-barcode`, '_blank');
  };

  // Function to copy the SKU to clipboard
  const copySku = () => {
    if (!item.sku) return;
    
    navigator.clipboard.writeText(item.sku)
      .then(() => {
        toast({
          title: "SKU Copied",
          description: `SKU ${item.sku} copied to clipboard`,
        });
      })
      .catch(() => {
        toast({
          title: "Copy Failed",
          description: "Failed to copy SKU to clipboard",
          variant: "destructive"
        });
      });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex justify-between items-center">
          <span>Product Barcode</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleHelp className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Color-coded barcode for warehouse visibility. 
                  The left bar color represents the product category, 
                  and the right bar color represents the quality grade or subcategory.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 w-full animate-pulse bg-muted rounded-md"></div>
        ) : error ? (
          <div className="text-center py-3 text-sm text-red-600">
            {error}
          </div>
        ) : barcode ? (
          <div 
            className="barcode-container"
            style={{ 
              borderLeft: `5px solid ${barcode.primaryColor}`,
              borderRight: `5px solid ${barcode.secondaryColor}`,
              padding: '0.5rem',
              borderRadius: '0.25rem',
              background: `linear-gradient(90deg, ${barcode.primaryColor}15 0%, white 50%, ${barcode.secondaryColor}15 100%)`
            }}
          >
            <div className="flex justify-center">
              <canvas 
                ref={canvasRef}
                className="max-w-full"
                style={{ display: barcode ? 'block' : 'none' }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-3 text-sm text-muted-foreground">
            No barcode available for this item
          </div>
        )}

        {item.sku && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm font-mono">
              SKU: <span className="font-semibold">{item.sku}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={copySku}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={openPrintableBarcode}
          disabled={isLoading || !barcode}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Barcode
        </Button>
      </CardFooter>
    </Card>
  );
}

// Component to display a color legend for the category color coding system
export function CategoryColorLegend() {
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch the category color mapping
    const fetchColorMap = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/category-colors');
        
        if (!response.ok) {
          throw new Error("Failed to fetch category colors");
        }
        
        const data = await response.json();
        if (data.success && data.colors) {
          setColorMap(data.colors);
        }
      } catch (error) {
        console.error("Error fetching category colors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColorMap();
  }, []);

  // Group colors by category type
  const groupedColors = Object.entries(colorMap).reduce<Record<string, Record<string, string>>>(
    (groups, [category, color]) => {
      // Determine which group this category belongs to
      let group = "Other";
      
      if (category === "Flower" || category === "Concentrates" || category === "Edibles" || 
          category === "Vapes" || category === "Pre-Rolls" || category === "Tinctures" || 
          category === "Topicals" || category === "Accessories" || category === "Bulk") {
        group = "Main Categories";
      } else if (category.includes("THCA")) {
        group = "Flower Qualities";
      } else if (category === "Indica" || category === "Sativa" || category === "Hybrid") {
        group = "Strain Types";
      }
      
      // Create the group if it doesn't exist
      if (!groups[group]) {
        groups[group] = {};
      }
      
      // Add the category to the group
      groups[group][category] = color as string;
      
      return groups;
    },
    {}
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Color Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-full animate-pulse bg-muted rounded-md"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Category Color Legend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedColors).map(([group, categories]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold mb-2">{group}</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(categories).map(([category, color]) => (
                  <div key={category} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs truncate" title={category}>
                      {category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}