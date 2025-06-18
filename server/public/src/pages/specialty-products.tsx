import React, { useState } from 'react';
import { 
  Plus, 
  UploadCloud, 
  DownloadCloud, 
  FileSpreadsheet, 
  Filter
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

// Define the product interface for specialty products
interface SpecialtyProduct {
  id?: number;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  retailPrice: number;
  wholesalePrice: number;
  sku: string;
  barcode?: string;
  quantity: number;
  status?: string;
  strength?: string; // renamed from potency
  volume?: string;
  description?: string;
  imageUrl?: string;
  variant?: string; // renamed from strain
  type?: string;
}

// Mock data for demonstration
const mockSpecialtyProducts: SpecialtyProduct[] = [
  {
    id: 1,
    name: "Premium Sport Drink",
    category: "Beverages",
    subcategory: "Sports",
    price: 39.99,
    retailPrice: 39.99,
    wholesalePrice: 19.99,
    sku: "SP-SPT-BEV-1",
    quantity: 32,
    strength: "500mg",
    variant: "Berry Blast",
    type: "Recovery",
    status: "In Stock",
    description: "Premium recovery sports beverage"
  },
  {
    id: 2,
    name: "Protein Gummies",
    category: "Supplements",
    subcategory: "Protein",
    price: 29.99,
    retailPrice: 29.99,
    wholesalePrice: 14.99,
    sku: "SP-PRO-GUM-1",
    quantity: 48,
    strength: "25g",
    volume: "10 count",
    status: "In Stock",
    description: "Protein-packed gummies for post-workout"
  },
  {
    id: 3,
    name: "Multi-Vitamin Pack",
    category: "Supplements",
    subcategory: "Vitamins",
    price: 34.99,
    retailPrice: 34.99,
    wholesalePrice: 17.49,
    sku: "SP-VIT-MUL-1",
    quantity: 15,
    strength: "100%",
    variant: "Performance",
    type: "Daily",
    status: "Low Stock",
    description: "Complete daily multi-vitamin pack"
  },
  {
    id: 4,
    name: "Omega-3 Oil Drops",
    category: "Oils",
    subcategory: "Omega",
    price: 49.99,
    retailPrice: 49.99,
    wholesalePrice: 24.99,
    sku: "SP-OMG-OIL-1",
    quantity: 22,
    strength: "1500mg",
    volume: "30ml",
    status: "In Stock",
    description: "High-potency omega-3 oil"
  },
  {
    id: 5,
    name: "Energy & Focus Gummies",
    category: "Supplements",
    subcategory: "Energy",
    price: 39.99,
    retailPrice: 39.99,
    wholesalePrice: 19.99,
    sku: "SP-ENR-GUM-1",
    quantity: 8,
    strength: "200mg",
    volume: "20 count",
    status: "Low Stock",
    description: "Energy and focus supplement gummies"
  }
];

// Product categories
const categories = [
  "All",
  "Beverages",
  "Supplements",
  "Oils",
  "Powders",
  "Performance",
  "Nutrition"
];

const SpecialtyProductsPage: React.FC = () => {
  const [products, setProducts] = useState<SpecialtyProduct[]>(mockSpecialtyProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<number | null>(null);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Filter products based on search term and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get status badge color
  const getStatusBadgeClass = (status: string = "") => {
    if (status.includes("Stock")) return "bg-green-500 text-white";
    if (status.includes("Low")) return "bg-yellow-500 text-white";
    return "bg-gray-400 text-white";
  };

  // Get type badge color
  const getTypeBadgeClass = (type: string = "") => {
    if (type === "Recovery") return "bg-blue-500 text-white";
    if (type === "Daily") return "bg-purple-600 text-white";
    if (type === "Performance") return "bg-green-500 text-white";
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
  const renderMobileProductCard = (product: SpecialtyProduct) => (
    <Card key={product.id} className="mb-4 border-blue-500/20">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline">{product.category}</Badge>
              {product.type && (
                <Badge className={getTypeBadgeClass(product.type)}>{product.type}</Badge>
              )}
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
            <span className="text-muted-foreground">Strength:</span> {product.strength}
          </div>
          <div>
            <span className="text-muted-foreground">SKU:</span> <span className="font-mono">{product.sku}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Price:</span> {formatPrice(product.price)}
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
              <h1 className="text-2xl sm:text-3xl font-bold blue-gradient-text">Specialty Products</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your specialty nutrition and health products inventory
              </p>
            </div>
            
            {/* Mobile: Show only functional actions */}
            <div className="flex md:hidden gap-2">
              <Button variant="outline" className="gap-1.5 flex-1" size="sm" onClick={() => window.location.href = '/api/price-sheet'}>
                <FileSpreadsheet className="h-4 w-4" />
                Price Sheet
              </Button>
              <Button variant="outline" className="gap-1.5 flex-1" size="sm" onClick={() => window.location.href = '/api/export-csv?format=all'}>
                <DownloadCloud className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            {/* Desktop: Show functional actions */}
            <div className="hidden md:flex flex-wrap gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => window.location.href = '/api/export-csv?format=all'}>
                <DownloadCloud className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => window.location.href = '/api/price-sheet'}>
                <FileSpreadsheet className="h-4 w-4" />
                Price Sheet
              </Button>
            </div>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl blue-gradient-text">Specialty Product Inventory</CardTitle>
            <CardDescription>
              Manage your specialty nutrition and health products inventory
            </CardDescription>
            <div className="flex flex-col gap-4 mt-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by product name or SKU..."
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
                <Select defaultValue="all">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
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
                    No products found. Try adjusting your search or filters.
                  </div>
                ) : (
                  filteredProducts.map(renderMobileProductCard)
                )}
              </div>
            ) : (
              // Desktop view - Table layout with subcategory rows
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Product</th>
                      <th className="text-left py-3 px-4">Category</th>
                      <th className="text-center py-3 px-4">SKU</th>
                      <th className="text-center py-3 px-4">Strength</th>
                      <th className="text-center py-3 px-4">Type</th>
                      <th className="text-right py-3 px-4">Price</th>
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
                          <div className="text-sm text-muted-foreground">{product.subcategory}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{product.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-sm">{product.sku}</td>
                        <td className="py-3 px-4 text-center">{product.strength}</td>
                        <td className="py-3 px-4 text-center">
                          {product.type && (
                            <Badge className={getTypeBadgeClass(product.type)}>
                              {product.type}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{formatPrice(product.price)}</td>
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
              This will permanently delete this product from your inventory.
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

export default SpecialtyProductsPage;