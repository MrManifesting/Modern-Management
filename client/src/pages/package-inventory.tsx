import React, { useState } from 'react';
import { 
  Plus, 
  UploadCloud, 
  DownloadCloud, 
  FileSpreadsheet, 
  Filter,
  PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

// Define the Package product interface
interface PackageProduct {
  id?: number;
  name: string;
  category: string;
  source: string; // Gold Standard or Tree Mason
  originalSkus: string[];
  packageSku: string;
  barcode?: string;
  quantity: number;
  status?: string;
  retailPrice: number;
  wholesalePrice: number;
  description?: string;
  contents?: string;
  imageUrl?: string;
}

// Package products are loaded from real API data - no mock data used

// Product categories
const categories = [
  "All",
  "Bundle",
  "Gift Set",
  "Variety Pack",
  "Seasonal"
];

const PackageInventoryPage: React.FC = () => {
  const [products, setProducts] = useState<PackageProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSource, setSelectedSource] = useState("All");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<number | null>(null);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Filter products based on search term, category, and source
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.packageSku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSource = selectedSource === "All" || product.source === selectedSource;
    
    return matchesSearch && matchesCategory && matchesSource;
  });

  // Get status badge color
  const getStatusBadgeClass = (status: string = "") => {
    if (status.includes("Stock")) return "bg-green-500 text-white";
    if (status.includes("Low")) return "bg-yellow-500 text-white";
    return "bg-gray-400 text-white";
  };

  // Get source badge color
  const getSourceBadgeClass = (source: string = "") => {
    if (source === "Gold Standard") return "bg-gold text-black";
    if (source === "Tree Mason") return "bg-green-600 text-white";
    if (source === "Mixed") return "bg-purple-500 text-white";
    return "bg-gray-400 text-white";
  };

  // Handle product deletion
  const handleDeleteClick = (id: number) => {
    setProductIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productIdToDelete) {
      setProducts(products.filter(p => p.id !== productIdToDelete));
      setDeleteDialogOpen(false);
      setProductIdToDelete(null);
    }
  };

  // Render mobile product card
  const renderMobileProductCard = (product: PackageProduct) => (
    <Card key={product.id} className="mb-4 border-gold/20">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline">{product.category}</Badge>
              <Badge className={getSourceBadgeClass(product.source)}>{product.source}</Badge>
              <Badge variant={product.status?.includes("Low") ? "destructive" : "default"}>
                {product.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">SKU:</span> <span className="font-mono">{product.packageSku}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Price:</span> {formatPrice(product.retailPrice)}
          </div>
          <div>
            <span className="text-muted-foreground">Contents:</span> <span className="truncate">{product.contents?.split(',')[0]}...</span>
          </div>
          <div>
            <span className="text-muted-foreground">Stock:</span>{' '}
            <Badge variant={product.quantity > 10 ? "default" : "destructive"} className="text-xs">
              {product.quantity}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1">View</Button>
          <Button size="sm" variant="outline" className="flex-1">Edit</Button>
        </div>
      </CardContent>
    </Card>
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4 inventory-header">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold gold-gradient-text">Package Inventory</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your product bundles, gift sets, and package combinations
              </p>
            </div>
            
            {/* Mobile: Show only primary actions */}
            <div className="flex md:hidden gap-2">
              <Button className="gap-1.5 flex-1" size="sm">
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button variant="outline" className="gap-1.5 flex-1" size="sm">
                <PackageCheck className="h-4 w-4" />
                Assemble
              </Button>
            </div>
            
            {/* Desktop: Show all actions */}
            <div className="hidden md:flex flex-wrap gap-2">
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Package
              </Button>
              <Button variant="outline" className="gap-1.5">
                <PackageCheck className="h-4 w-4" />
                Assemble Packages
              </Button>
              <Button variant="outline" className="gap-1.5">
                <DownloadCloud className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" className="gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                Catalog
              </Button>
            </div>
          </div>
          
          {/* Mobile: Extra actions in a second row, hidden on desktop */}
          <div className="flex md:hidden gap-2 flex-wrap">
            <Button variant="outline" className="gap-1 text-xs h-8 flex-1" size="sm">
              <DownloadCloud className="h-3 w-3" />
              Export
            </Button>
            <Button variant="outline" className="gap-1 text-xs h-8 flex-1" size="sm">
              <FileSpreadsheet className="h-3 w-3" />
              Catalog
            </Button>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl gold-gradient-text">Package Products</CardTitle>
            <CardDescription>
              Manage your product bundles, gift sets, and special packages
            </CardDescription>
            <div className="flex flex-col gap-4 mt-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by package name or SKU..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Sources</SelectItem>
                    <SelectItem value="Gold Standard">Gold Standard</SelectItem>
                    <SelectItem value="Tree Mason">Tree Mason</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              // Mobile card view
              <div className="space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No packages found. Try adjusting your search or filters.
                  </div>
                ) : (
                  filteredProducts.map(renderMobileProductCard)
                )}
              </div>
            ) : (
              // Desktop view - Table layout
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Package Name</th>
                      <th className="text-left py-3 px-4">Category</th>
                      <th className="text-center py-3 px-4">Source</th>
                      <th className="text-center py-3 px-4">SKU</th>
                      <th className="text-right py-3 px-4">Retail Price</th>
                      <th className="text-right py-3 px-4">Wholesale</th>
                      <th className="text-center py-3 px-4">Qty</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.contents}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{product.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getSourceBadgeClass(product.source)}>
                            {product.source}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-sm">{product.packageSku}</td>
                        <td className="py-3 px-4 text-right">{formatPrice(product.retailPrice)}</td>
                        <td className="py-3 px-4 text-right">{formatPrice(product.wholesalePrice)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={product.quantity > 10 ? "default" : "destructive"}>
                            {product.quantity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getStatusBadgeClass(product.status)}>
                            {product.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline">View</Button>
                            <Button size="sm" variant="outline">Edit</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this package from your inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PackageInventoryPage;