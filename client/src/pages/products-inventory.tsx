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

// Define the Product interface
interface Product {
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
  size?: string;
  volume?: string;
  description?: string;
  imageUrl?: string;
}

// Mock data for demonstration
const mockProducts: Product[] = [
  {
    id: 1,
    name: "Premium Headphones",
    category: "Electronics",
    subcategory: "Audio",
    price: 59.99,
    retailPrice: 59.99,
    wholesalePrice: 29.99,
    sku: "ELEC-HP-1000",
    quantity: 25,
    size: "Over-ear",
    volume: "1 unit",
    status: "In Stock",
    description: "Premium wireless headphones with noise cancellation"
  },
  {
    id: 2,
    name: "Organic Cotton T-Shirt",
    category: "Apparel",
    subcategory: "Shirts",
    price: 39.99,
    retailPrice: 39.99,
    wholesalePrice: 19.99,
    sku: "APP-TS-500",
    quantity: 42,
    size: "Large",
    volume: "1 unit",
    status: "In Stock",
    description: "100% organic cotton t-shirt, eco-friendly dye"
  },
  {
    id: 3,
    name: "Massage Therapy Cream",
    category: "Health",
    subcategory: "Topicals",
    price: 49.99,
    retailPrice: 49.99,
    wholesalePrice: 24.99,
    sku: "HLT-TOP-MTC",
    quantity: 18,
    size: "4oz",
    volume: "1 unit",
    status: "Low Stock",
    description: "Soothing cream for muscle relief"
  },
  {
    id: 4,
    name: "Natural Pet Treats",
    category: "Pet",
    subcategory: "Treats",
    price: 29.99,
    retailPrice: 29.99,
    wholesalePrice: 14.99,
    sku: "PET-TRT-001",
    quantity: 36,
    size: "8oz",
    volume: "1 bag",
    status: "In Stock",
    description: "Natural treats for pets"
  },
  {
    id: 5,
    name: "Daily Multivitamin",
    category: "Supplements",
    subcategory: "Vitamins",
    price: 54.99,
    retailPrice: 54.99,
    wholesalePrice: 27.49,
    sku: "SUP-VIT-001",
    quantity: 22,
    size: "90 count",
    volume: "1 bottle",
    status: "In Stock",
    description: "Daily essential vitamins and minerals"
  }
];

// Product categories
const categories = [
  "All",
  "Electronics",
  "Apparel",
  "Health",
  "Pet",
  "Supplements",
  "Bundles"
];

const ProductsInventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
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
  const renderMobileProductCard = (product: Product) => (
    <Card key={product.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline">{product.category}</Badge>
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
            <span className="text-muted-foreground">Size:</span> {product.size}
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
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Inventory Management</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your products and inventory levels
              </p>
            </div>
            
            {/* Mobile: Show only primary actions */}
            <div className="flex md:hidden gap-2">
              <Button className="gap-1.5 flex-1" size="sm">
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button variant="outline" className="gap-1.5 flex-1" size="sm">
                <UploadCloud className="h-4 w-4" />
                Import
              </Button>
            </div>
            
            {/* Desktop: Show all actions */}
            <div className="hidden md:flex flex-wrap gap-2">
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
              <Button variant="outline" className="gap-1.5">
                <UploadCloud className="h-4 w-4" />
                Import CSV
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
            <CardTitle className="text-xl text-primary">Product Inventory</CardTitle>
            <CardDescription>
              Manage your product catalog
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
              // Desktop view - Tabs with different product categories
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid grid-cols-7 mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="electronics">Electronics</TabsTrigger>
                  <TabsTrigger value="apparel">Apparel</TabsTrigger>
                  <TabsTrigger value="health">Health</TabsTrigger>
                  <TabsTrigger value="pet">Pet</TabsTrigger>
                  <TabsTrigger value="supplements">Supplements</TabsTrigger>
                  <TabsTrigger value="bundles">Bundles</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Product</th>
                          <th className="text-left py-3 px-4">Category</th>
                          <th className="text-center py-3 px-4">SKU</th>
                          <th className="text-center py-3 px-4">Size</th>
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
                            <td className="py-3 px-4 text-center">{product.size}</td>
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
                </TabsContent>
                
                {/* Similar tabs for other categories */}
                <TabsContent value="electronics" className="mt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      {/* Table headers */}
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Product</th>
                          <th className="text-left py-3 px-4">Category</th>
                          <th className="text-center py-3 px-4">SKU</th>
                          <th className="text-center py-3 px-4">Size</th>
                          <th className="text-right py-3 px-4">Price</th>
                          <th className="text-center py-3 px-4">Qty</th>
                          <th className="text-center py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      {/* Table body */}
                      <tbody>
                        {filteredProducts
                          .filter(product => product.category === "Electronics")
                          .map((product) => (
                            <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                              <td className="py-3 px-4">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">{product.subcategory}</div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline">{product.category}</Badge>
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-sm">{product.sku}</td>
                              <td className="py-3 px-4 text-center">{product.size}</td>
                              <td className="py-3 px-4 text-right">{formatPrice(product.price)}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant={product.quantity > 10 ? "default" : "destructive"}>
                                  {product.quantity}
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
                </TabsContent>
                
                {/* Similar tabs for other categories */}
              </Tabs>
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

export default ProductsInventoryPage;