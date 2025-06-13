import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Printer, Package, QrCode, BarChart3 } from "lucide-react";

interface LabelOptions {
  format: 'standard' | 'compact' | 'detailed' | 'thermal';
  size: 'small' | 'medium' | 'large';
  includeBarcode: boolean;
  includeQRCode: boolean;
  includePrice: boolean;
  includeWeight: boolean;
  includeDate: boolean;
  copies: number;
}

interface Item {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  basePrice: string;
  category: string;
  brand: string;
}

export default function LabelGenerationPage() {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [skuList, setSkuList] = useState<string>("");
  const [labelOptions, setLabelOptions] = useState<LabelOptions>({
    format: 'standard',
    size: 'medium',
    includeBarcode: true,
    includeQRCode: true,
    includePrice: true,
    includeWeight: true,
    includeDate: true,
    copies: 1
  });

  // Fetch all items
  const { data: items = [], isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  // Fetch label formats
  const { data: formats } = useQuery({
    queryKey: ["/api/labels/formats"],
  });

  // Single label generation mutation
  const generateSingleLabel = useMutation({
    mutationFn: async ({ itemId, options }: { itemId: number; options: LabelOptions }) => {
      const response = await apiRequest("POST", `/api/items/${itemId}/label`, options);
      return response.text();
    },
    onSuccess: (htmlContent) => {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.print();
      }
      toast({
        title: "Label Generated",
        description: "Label opened in new window for printing",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate label",
        variant: "destructive",
      });
    },
  });

  // Batch label generation mutation
  const generateBatchLabels = useMutation({
    mutationFn: async ({ itemIds, options }: { itemIds: number[]; options: LabelOptions }) => {
      const response = await apiRequest("POST", "/api/labels/batch", {
        itemIds,
        labelOptions: options
      });
      return response.text();
    },
    onSuccess: (htmlContent) => {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.print();
      }
      toast({
        title: "Batch Labels Generated",
        description: `Generated ${selectedItems.length} labels for printing`,
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate batch labels",
        variant: "destructive",
      });
    },
  });

  // SKU-based label generation mutation
  const generateSkuLabels = useMutation({
    mutationFn: async ({ skus, options }: { skus: string[]; options: LabelOptions }) => {
      const response = await apiRequest("POST", "/api/labels/by-sku", {
        skus,
        labelOptions: options
      });
      return response.text();
    },
    onSuccess: (htmlContent) => {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.print();
      }
      toast({
        title: "SKU Labels Generated",
        description: "Labels generated from SKU list",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate labels from SKU list",
        variant: "destructive",
      });
    },
  });

  // Low stock labels mutation
  const generateLowStockLabels = useMutation({
    mutationFn: async (options: LabelOptions) => {
      const response = await apiRequest("POST", "/api/labels/low-stock", options);
      return response.text();
    },
    onSuccess: (htmlContent) => {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.print();
      }
      toast({
        title: "Low Stock Labels Generated",
        description: "Generated labels for low stock items",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate low stock labels",
        variant: "destructive",
      });
    },
  });

  const handleItemSelection = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleGenerateSingleLabel = (itemId: number) => {
    generateSingleLabel.mutate({ itemId, options: labelOptions });
  };

  const handleGenerateBatchLabels = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to generate labels for",
        variant: "destructive",
      });
      return;
    }
    generateBatchLabels.mutate({ itemIds: selectedItems, options: labelOptions });
  };

  const handleGenerateSkuLabels = () => {
    const skus = skuList.split('\n').map(sku => sku.trim()).filter(sku => sku);
    if (skus.length === 0) {
      toast({
        title: "No SKUs Provided",
        description: "Please enter SKUs to generate labels for",
        variant: "destructive",
      });
      return;
    }
    generateSkuLabels.mutate({ skus, options: labelOptions });
  };

  const handleGenerateLowStockLabels = () => {
    generateLowStockLabels.mutate(labelOptions);
  };

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Printer className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Label Generation</h1>
          <p className="text-muted-foreground">Generate printable labels with barcodes, QR codes, and item information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Label Options Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5" />
              <span>Label Options</span>
            </CardTitle>
            <CardDescription>Configure label format and content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={labelOptions.format} onValueChange={(value: any) => 
                setLabelOptions(prev => ({ ...prev, format: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="thermal">Thermal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={labelOptions.size} onValueChange={(value: any) => 
                setLabelOptions(prev => ({ ...prev, size: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copies">Copies</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={labelOptions.copies}
                onChange={(e) => setLabelOptions(prev => ({ 
                  ...prev, 
                  copies: parseInt(e.target.value) || 1 
                }))}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Include Options</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={labelOptions.includeBarcode}
                  onCheckedChange={(checked) => 
                    setLabelOptions(prev => ({ ...prev, includeBarcode: !!checked }))
                  }
                />
                <Label>Barcode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={labelOptions.includeQRCode}
                  onCheckedChange={(checked) => 
                    setLabelOptions(prev => ({ ...prev, includeQRCode: !!checked }))
                  }
                />
                <Label>QR Code</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={labelOptions.includePrice}
                  onCheckedChange={(checked) => 
                    setLabelOptions(prev => ({ ...prev, includePrice: !!checked }))
                  }
                />
                <Label>Price</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={labelOptions.includeWeight}
                  onCheckedChange={(checked) => 
                    setLabelOptions(prev => ({ ...prev, includeWeight: !!checked }))
                  }
                />
                <Label>Weight</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={labelOptions.includeDate}
                  onCheckedChange={(checked) => 
                    setLabelOptions(prev => ({ ...prev, includeDate: !!checked }))
                  }
                />
                <Label>Date</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Label Generation Tabs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Generate Labels</span>
            </CardTitle>
            <CardDescription>Choose items and generate printable labels</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="individual">Individual</TabsTrigger>
                <TabsTrigger value="batch">Batch</TabsTrigger>
                <TabsTrigger value="sku">By SKU</TabsTrigger>
                <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Items for Individual Labels</Label>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku} • Qty: {item.quantity} • ${item.basePrice}
                          </div>
                          {item.category && (
                            <Badge variant="secondary" className="mt-1">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateSingleLabel(item.id)}
                          disabled={generateSingleLabel.isPending}
                        >
                          {generateSingleLabel.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Printer className="h-4 w-4" />
                          )}
                          Generate
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="batch" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Items for Batch Printing</Label>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {selectedItems.length} items selected
                    </span>
                    <Button
                      onClick={handleGenerateBatchLabels}
                      disabled={selectedItems.length === 0 || generateBatchLabels.isPending}
                    >
                      {generateBatchLabels.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Printer className="h-4 w-4 mr-2" />
                      )}
                      Generate Batch Labels
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => handleItemSelection(item.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku} • Qty: {item.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sku" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skuList">SKU List (one per line)</Label>
                  <Textarea
                    id="skuList"
                    placeholder="Enter SKUs, one per line..."
                    value={skuList}
                    onChange={(e) => setSkuList(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <Button
                    onClick={handleGenerateSkuLabels}
                    disabled={!skuList.trim() || generateSkuLabels.isPending}
                    className="w-full"
                  >
                    {generateSkuLabels.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Printer className="h-4 w-4 mr-2" />
                    )}
                    Generate Labels from SKUs
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="lowstock" className="space-y-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-orange-500 mb-4" />
                    <h3 className="text-lg font-semibold">Low Stock Items</h3>
                    <p className="text-muted-foreground">
                      Generate labels for items that are running low on stock
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateLowStockLabels}
                    disabled={generateLowStockLabels.isPending}
                    className="w-full"
                  >
                    {generateLowStockLabels.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Printer className="h-4 w-4 mr-2" />
                    )}
                    Generate Low Stock Labels
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}