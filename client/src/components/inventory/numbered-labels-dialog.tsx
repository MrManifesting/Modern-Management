import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const { toast } = useToast();

  // Get available label formats
  const { data: formats = [], isLoading: formatsLoading } = useQuery<LabelFormat[]>({
    queryKey: ["/api/labels/formats"],
    enabled: open
  });

  // Generate numbered labels
  const generateLabels = useMutation({
    mutationFn: async ({ itemId, quantity, format }: { itemId: number; quantity: number; format: string }) => {
      const response = await fetch("/api/labels/numbered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity, format })
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate labels");
      }
      
      return response.text();
    },
    onSuccess: (htmlContent) => {
      // Open print preview in new window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
      
      toast({
        title: "Labels Generated",
        description: `Generated ${quantity} numbered labels for ${item.name}`,
      });
      
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate numbered labels",
        variant: "destructive",
      });
    },
  });

  // Generate numbered SKUs preview
  const generateSKUs = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      const response = await fetch(`/api/items/${itemId}/generate-numbered-skus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate SKUs");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Generated SKUs:", data.numberedSkus);
    }
  });

  const handleGenerateLabels = () => {
    if (quantity < 1 || quantity > 100) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be between 1 and 100",
        variant: "destructive",
      });
      return;
    }
    
    generateLabels.mutate({ 
      itemId: item.id, 
      quantity, 
      format: selectedFormat 
    });
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
            Create individual labels for each unit with sequential SKU numbers
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
              placeholder="Enter quantity"
            />
            <div className="text-xs text-muted-foreground">
              Each label will have a unique SKU number (1, 2, 3, etc.)
            </div>
          </div>

          {/* SKU Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">SKU Preview</Label>
            <div className="p-3 bg-muted rounded-md">
              <div className="space-y-1">
                {previewSkus.map((sku, index) => (
                  <div key={index} className="text-sm font-mono">
                    {sku}
                  </div>
                ))}
                {quantity > 5 && (
                  <div className="text-sm text-muted-foreground">
                    ... and {quantity - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Label Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Label Format</Label>
            {formatsLoading ? (
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading formats...</span>
              </div>
            ) : (
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select label format" />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      <div className="flex flex-col">
                        <div className="font-medium">{format.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format.size} • {format.labelsPerPage} labels per page
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedFormat && (
              <div className="text-xs text-muted-foreground">
                {Math.ceil(quantity / (formats.find(f => f.id === selectedFormat)?.labelsPerPage || 30))} page(s) needed
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateLabels}
              disabled={generateLabels.isPending || quantity < 1}
              className="flex-1"
            >
              {generateLabels.isPending ? (
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