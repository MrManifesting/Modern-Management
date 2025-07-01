import React, { useState } from 'react';
import { 
  Plus, 
  Filter,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  Tags,
  Download,
  QrCode,
  LayoutGrid,
  ChevronDown,
  BarChart4,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DemoLayout from '@/components/layout/demo-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Define the Product interface
interface Product {
  id: number;
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
  weight?: string;
}

// Demo products with CBD-related items
const demoProducts: Product[] = [
  {
    id: 1,
    name: "CBD Oil Tincture",
    category: "Tinctures",
    subcategory: "Full Spectrum",
    price: 59.99,
    retailPrice: 59.99,
    wholesalePrice: 29.99,
    sku: "CBD-TNC-1000",
    quantity: 25,
    size: "30ml",
    weight: "1oz",
    volume: "1 bottle",
    status: "In Stock",
    barcode: "890123456789",
    description: "Full spectrum CBD oil tincture, 1000mg",
    imageUrl: "https://images.unsplash.com/photo-1579703503654-0aa7f71e0347?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 2,
    name: "CBD Gummies",
    category: "Edibles",
    subcategory: "Gummies",
    price: 39.99,
    retailPrice: 39.99,
    wholesalePrice: 19.99,
    sku: "CBD-EDI-GUM",
    quantity: 42,
    size: "30 count",
    weight: "300mg",
    volume: "1 jar",
    status: "In Stock",
    barcode: "890123456790",
    description: "CBD infused gummies, 10mg per piece",
    imageUrl: "https://images.unsplash.com/photo-1615485925836-8edc13abe5f2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 3,
    name: "CBD Massage Cream",
    category: "Topicals",
    subcategory: "Creams",
    price: 49.99,
    retailPrice: 49.99,
    wholesalePrice: 24.99,
    sku: "CBD-TOP-MAS",
    quantity: 18,
    size: "4oz",
    weight: "4oz",
    volume: "1 jar",
    status: "Low Stock",
    barcode: "890123456791",
    description: "Soothing CBD massage cream for muscle relief, 500mg CBD",
    imageUrl: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 4,
    name: "CBD Pet Treats",
    category: "Pet",
    subcategory: "Treats",
    price: 29.99,
    retailPrice: 29.99,
    wholesalePrice: 14.99,
    sku: "CBD-PET-TRT",
    quantity: 36,
    size: "15 count",
    weight: "5oz",
    volume: "1 bag",
    status: "In Stock",
    barcode: "890123456792",
    description: "CBD treats for pets, 2mg per treat",
    imageUrl: "https://images.unsplash.com/photo-1584059535005-0c23ebe08783?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 5,
    name: "CBD Bath Bombs",
    category: "Bath",
    subcategory: "Bath Bombs",
    price: 14.99,
    retailPrice: 14.99,
    wholesalePrice: 7.49,
    sku: "CBD-BTH-BMB",
    quantity: 22,
    size: "4oz",
    weight: "4oz",
    volume: "1 bomb",
    status: "In Stock",
    barcode: "890123456793",
    description: "Relaxing CBD bath bombs, 50mg CBD per bomb",
    imageUrl: "https://images.unsplash.com/photo-1581269337749-3c722e1c395f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 6,
    name: "CBD Vape Cartridge",
    category: "Vapes",
    subcategory: "Cartridges",
    price: 34.99,
    retailPrice: 34.99,
    wholesalePrice: 17.50,
    sku: "CBD-VPE-CRT",
    quantity: 15,
    size: "0.5g",
    weight: "0.5g",
    volume: "1 cartridge",
    status: "Low Stock",
    barcode: "890123456794",
    description: "CBD vape cartridge, 0.5g",
    imageUrl: "https://images.unsplash.com/photo-1515179984199-33c5607419b8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  }
];

// Product categories
const categories = [
  "All",
  "Tinctures",
  "Edibles",
  "Topicals",
  "Pet",
  "Bath",
  "Vapes"
];

const DemoInventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const { toast } = useToast();

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Filter products based on search term and category
  const filteredProducts = demoProducts.filter((product) => {
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

  // Simulate a quick breakdown
  const handleQuickBreakdown = (productId: number) => {
    toast({
      title: "Quick Breakdown Feature",
      description: "You can break down bulk items into smaller quantities directly from the inventory view.",
    });
  };

  // Simulate printing a barcode
  const handlePrintBarcode = (productId: number) => {
    toast({
      title: "Barcode Printing",
      description: "In the full version, this would print a barcode label for the selected product.",
    });
  };

  // Render product card for grid view
  const renderProductCard = (product: Product) => (
    <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square w-full overflow-hidden bg-gray-900">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Tags className="h-12 w-12 text-gray-500" />
          </div>
        )}
      </div>
      <CardHeader className="p-3 pb-0">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-medium line-clamp-1">{product.name}</CardTitle>
          <Badge className={getStatusBadgeClass(product.status)}>
            {product.status}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">{product.category} / {product.subcategory}</p>
      </CardHeader>
      <CardContent className="p-3 pt-2 pb-0">
        <div className="flex justify-between items-center mb-1">
          <div className="text-base font-semibold">{formatPrice(product.price)}</div>
          <div className="text-sm">SKU: {product.sku}</div>
        </div>
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm">Quantity: <span className="font-medium">{product.quantity}</span></div>
          <div className="text-sm">Weight: <span className="font-medium">{product.weight}</span></div>
        </div>
      </CardContent>
      <CardFooter className="p-3 flex justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Manage Item</DropdownMenuLabel>
            <DropdownMenuItem 
              className="flex items-center cursor-pointer"
              onClick={() => handleQuickBreakdown(product.id)}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Quick Breakdown
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center cursor-pointer"
              onClick={() => handlePrintBarcode(product.id)}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Print Barcode
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center cursor-pointer">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center cursor-pointer text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );

  // Render product row for table view
  const renderProductRow = (product: Product) => (
    <tr key={product.id} className="border-b border-gray-800 hover:bg-gray-900/60">
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="w-10 h-10 rounded-md overflow-hidden">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Tags className="h-5 w-5 text-gray-500" />
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium">{product.name}</div>
        <div className="text-xs text-gray-500">{product.category}</div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">{product.sku}</td>
      <td className="px-4 py-3">{formatPrice(product.price)}</td>
      <td className="px-4 py-3">{product.quantity}</td>
      <td className="px-4 py-3 hidden md:table-cell">{product.weight}</td>
      <td className="px-4 py-3">
        <Badge className={getStatusBadgeClass(product.status)}>
          {product.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              className="flex items-center cursor-pointer"
              onClick={() => handleQuickBreakdown(product.id)}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Quick Breakdown
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center cursor-pointer"
              onClick={() => handlePrintBarcode(product.id)}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Print Barcode
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center cursor-pointer">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center cursor-pointer text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
  
  return (
    <DemoLayout>
      <div className="container max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
            <div className="flex-1 w-full md:w-auto">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <BarChart4 className="h-6 w-6 text-yellow-400" />
                Inventory Dashboard Demo
              </h1>
              <p className="text-gray-400 mt-1">
                This demo showcases the enhanced inventory features
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Demo Mode", description: "This feature is available in the full version." })}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button className="bg-yellow-600 hover:bg-yellow-700" size="sm" onClick={() => toast({ title: "Demo Mode", description: "In the full version, you can add new items with quantity options." })}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs defaultValue="grid" value={viewMode} onValueChange={setViewMode} className="w-auto">
                <TabsList className="grid grid-cols-2 h-[38px]">
                  <TabsTrigger value="grid" className="px-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="px-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          <div className="mt-4">
            <Tabs defaultValue="grid" value={viewMode} className="w-full">
              <TabsContent value="grid">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(product => renderProductCard(product))}
                </div>
                {filteredProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-medium">No products found</h3>
                    <p className="text-gray-500 text-center mt-2">Try changing your search or filter criteria</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="table">
                <div className="overflow-x-auto rounded-md border border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-2 text-left hidden md:table-cell">Image</th>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-left hidden md:table-cell">SKU</th>
                        <th className="px-4 py-2 text-left">Price</th>
                        <th className="px-4 py-2 text-left">Qty</th>
                        <th className="px-4 py-2 text-left hidden md:table-cell">Weight</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-center w-12">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => renderProductRow(product))}
                    </tbody>
                  </table>
                  
                  {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                      <h3 className="text-lg font-medium">No products found</h3>
                      <p className="text-gray-500 text-center mt-2">Try changing your search or filter criteria</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
};

export default DemoInventoryPage;