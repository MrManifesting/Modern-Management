import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Item } from "@shared/schema";
import { FileSpreadsheet, Download } from "lucide-react";

export default function Marketplace() {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);

  // Fetch items and marketplaces
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/items'],
  });

  const { data: marketplaces = [], isLoading: isLoadingMarketplaces } = useQuery({
    queryKey: ['/api/marketplaces'],
  });

  // Generate CSV export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/export-csv", {
        items: selectedItems,
        marketplaces: selectedMarketplaces,
      });
      
      // Create and download CSV file
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marketplace-listings-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return true;
      }
      
      throw new Error("Failed to generate CSV");
    },
    onSuccess: () => {
      toast({
        title: "CSV exported successfully",
        description: "Your marketplace listings have been exported as CSV.",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export listings as CSV. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle item selection
  const toggleItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Toggle all items
  const toggleAllItems = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item: Item) => item.id));
    }
  };

  // Toggle marketplace selection
  const toggleMarketplace = (name: string) => {
    setSelectedMarketplaces(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  // Toggle all marketplaces
  const toggleAllMarketplaces = () => {
    if (selectedMarketplaces.length === marketplaces.length) {
      setSelectedMarketplaces([]);
    } else {
      setSelectedMarketplaces(marketplaces.map((m: any) => m.name));
    }
  };

  // Handle CSV export
  const handleExport = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to export.",
        variant: "destructive",
      });
      return;
    }

    if (selectedMarketplaces.length === 0) {
      toast({
        title: "No marketplaces selected",
        description: "Please select at least one marketplace to export to.",
        variant: "destructive",
      });
      return;
    }

    exportMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Export</CardTitle>
          <CardDescription>
            Generate CSV files to bulk upload your listings to various marketplaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Marketplace Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Marketplaces</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMarketplaces ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                        <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-marketplaces"
                        checked={selectedMarketplaces.length === marketplaces.length}
                        onCheckedChange={toggleAllMarketplaces}
                      />
                      <Label htmlFor="all-marketplaces">All Marketplaces</Label>
                    </div>
                    
                    {marketplaces.map((marketplace: any) => (
                      <div 
                        key={marketplace.id} 
                        className="flex items-center space-x-2 ml-4"
                      >
                        <Checkbox
                          id={`marketplace-${marketplace.id}`}
                          checked={selectedMarketplaces.includes(marketplace.name)}
                          onCheckedChange={() => toggleMarketplace(marketplace.name)}
                          disabled={!marketplace.isConnected}
                        />
                        <Label 
                          htmlFor={`marketplace-${marketplace.id}`}
                          className={!marketplace.isConnected ? "text-gray-400" : ""}
                        >
                          {marketplace.name}
                          {!marketplace.isConnected && " (Not connected)"}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>CSV Format</Label>
                  <div className="flex justify-between items-center p-2 rounded-md border">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary-500" />
                      <span className="text-sm font-medium">Standard CSV</span>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Change
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button
                    onClick={handleExport}
                    disabled={
                      exportMutation.isPending || 
                      selectedItems.length === 0 || 
                      selectedMarketplaces.length === 0
                    }
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportMutation.isPending ? "Generating..." : "Generate & Download CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Item Selection Table */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Items to Export</CardTitle>
              <CardDescription>
                {selectedItems.length} of {items.length} items selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.length === items.length && items.length > 0}
                          onCheckedChange={toggleAllItems}
                          disabled={isLoadingItems}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingItems ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : items.length > 0 ? (
                      items.map((item: Item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium rounded-full px-2 py-1 ${
                              item.status === "listed" 
                                ? "bg-green-100 text-green-800" 
                                : item.status === "sold" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-orange-100 text-orange-800"
                            }`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No items available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
