import { useState } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Package, ArrowDownToLine, FileSpreadsheet, Table, Grid2X2 } from "lucide-react";
import ItemGrid from "@/components/inventory/item-grid";
import AddItemModal from "@/components/modals/add-item-modal";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Inventory() {
  const [location] = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    location === "/inventory?action=new"
  );
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch items for table view
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/items'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get unique categories from items
  const categories = ["all", ...new Set(items.map((item: Item) => item.category))];

  // Filter items by category
  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter((item: Item) => item.category === selectedCategory);

  // Function to handle CSV export
  const handleExportCSV = () => {
    const link = document.createElement('a');
    link.href = '/api/export-csv?format=all';
    link.download = 'inventory-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to handle price sheet export
  const handlePriceSheet = () => {
    const link = document.createElement('a');
    link.href = '/api/price-sheet';
    link.download = 'price-sheet.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Inventory Management | MrManifestLister</title>
      </Helmet>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Package className="mr-2 h-6 w-6" />
            Inventory Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your products inventory across all marketplaces
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setViewMode("grid")}
          >
            <Grid2X2 className="h-4 w-4" />
            Grid View
          </Button>
          <Button 
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setViewMode("table")}
          >
            <Table className="h-4 w-4" />
            Table View
          </Button>
          <Button variant="outline" className="gap-1" size="sm" onClick={handlePriceSheet}>
            <FileSpreadsheet className="h-4 w-4" />
            Price Sheet
          </Button>
          <Button variant="outline" className="gap-1" size="sm" onClick={handleExportCSV}>
            <ArrowDownToLine className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <div className="mb-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="max-w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {viewMode === "grid" ? (
        <ItemGrid showHeader={false} showViewAll={false} />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-lg">Inventory Table View</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">Loading inventory items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center">No inventory items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium">Product</th>
                      <th className="text-left py-3 px-4 font-medium">SKU</th>
                      <th className="text-center py-3 px-4 font-medium">Category</th>
                      <th className="text-center py-3 px-4 font-medium">Price</th>
                      <th className="text-center py-3 px-4 font-medium">Stock</th>
                      <th className="text-center py-3 px-4 font-medium">Type</th>
                      <th className="text-center py-3 px-4 font-medium">Strain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item: Item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-4">{item.name}</td>
                        <td className="py-3 px-4 font-mono text-sm">{item.sku}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline">{item.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">${item.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={item.quantity > 10 ? "default" : item.quantity > 0 ? "warning" : "destructive"}>
                            {item.quantity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">{item.type || '-'}</td>
                        <td className="py-3 px-4 text-center">{item.strain || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
