import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Plus, 
  UploadCloud, 
  DownloadCloud, 
  FileSpreadsheet, 
  Filter,
  Eye,
  Edit,
  Trash2,
  ShoppingCart, 
  AlertTriangle,
  AlertCircle,
  Check,
  RefreshCw,
  ShoppingBag,
  CheckSquare,
  XSquare,
  ListFilter,
  CircleDollarSign,
  Percent,
  Tags,
  ClipboardList,
  Image as ImageIcon
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import ItemFormComponent from '@/components/inventory/item-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import AddItemModal from '@/components/modals/add-item-modal';
import BulkEditPanel from '@/components/inventory/bulk-edit-panel';

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
  marketplace?: any[];
  shopifyId?: string | null;
  shopifySyncStatus?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<number | null>(null);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Product[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Import our leaf loader components
  const { LeafLoadingPattern, DashboardLoadingSkeleton } = React.lazy(() => import('@/components/ui/skeleton-loader'));
  const { LoadingOverlay } = React.lazy(() => import('@/components/ui/loading-overlay'));
  
  // Fetch items from API
  const { data: products = [], isLoading, refetch: refetchItems } = useQuery({
    queryKey: ['/api/items'],
    queryFn: async () => {
      console.log("Fetching items from API...");
      const res = await apiRequest('GET', '/api/items');
      const data = await res.json();
      console.log("Fetched items:", data.length);
      
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || "Uncategorized",
        subcategory: item.subcategory || "General",
        price: item.basePrice || 0,
        retailPrice: item.retailPrice || item.basePrice || 0,
        wholesalePrice: item.wholesalePrice || (item.basePrice ? item.basePrice * 0.5 : 0),
        sku: item.sku || "NO-SKU",
        barcode: item.barcode || "",
        quantity: item.quantity || 0,
        status: item.status || "draft",
        size: item.size || "",
        volume: item.volume || "",
        description: item.description || "",
        imageUrl: item.imageUrl || item.images?.[0] || "",
        marketplace: item.marketplace || [],
        shopifyId: item.shopifyId || null,
        shopifySyncStatus: item.shopifySyncStatus || "not_synced"
      }));
    },
    refetchOnWindowFocus: true,
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/items/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Item deleted",
        description: "The item has been successfully removed from your inventory."
      });
      setDeleteDialogOpen(false);
      setProductIdToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the item. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Delete All Inventory Mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/items/delete-all', {
        confirmation: "DELETE_ALL_INVENTORY"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      setDeleteAllDialogOpen(false);
      setDeleteAllConfirmation('');
      
      toast({
        title: "Inventory Cleared",
        description: `Successfully deleted ${data.results ? data.results.deleted : 'all'} items from your inventory.`,
      });
    },
    onError: (error) => {
      console.error("Failed to delete all inventory:", error);
      toast({
        title: "Error",
        description: "Failed to delete all inventory items. Please try again later.",
        variant: "destructive"
      });
      setDeleteAllLoading(false);
    },
    onSettled: () => {
      setDeleteAllLoading(false);
    }
  });

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Filter products based on search term and category
  const filteredProducts = products.filter((product: Product) => {
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
      deleteMutation.mutate(productIdToDelete);
    }
  };
  
  // Function to handle deleting all inventory
  const handleDeleteAllInventory = () => {
    if (deleteAllConfirmation !== "DELETE_ALL_INVENTORY") {
      toast({
        title: "Confirmation required",
        description: "Please type 'DELETE_ALL_INVENTORY' to confirm this destructive action.",
        variant: "destructive"
      });
      return;
    }
    
    setDeleteAllLoading(true);
    deleteAllMutation.mutate();
  };
  
  // Function to sync with Shopify
  const syncWithShopify = async () => {
    try {
      setSyncLoading(true);
      
      // First check Shopify connection
      const testResponse = await apiRequest('GET', '/api/shopify/test-connection');
      const testResult = await testResponse.json();
      
      if (testResult.connected) {
        // Use the direct Shopify sync endpoint
        const syncResponse = await apiRequest('POST', '/api/shopify/sync-inventory');
        const syncResult = await syncResponse.json();
        
        if (syncResult.success) {
          toast({
            title: "Shopify Sync Successful",
            description: `${syncResult.imported || 0} items imported from Shopify`,
            variant: "default"
          });
          
          // Refresh products after sync with a short delay
          setTimeout(() => {
            console.log("Refreshing items after sync...");
            refetchItems();
          }, 1000);
        } else {
          toast({
            title: "Shopify Sync Warning",
            description: syncResult.message || "Error syncing with Shopify",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Shopify Connection Error",
          description: testResult.message || "Not connected to Shopify",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Shopify sync error:', error);
      toast({
        title: "Shopify Sync Error",
        description: "Failed to connect to Shopify. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Bulk selection handling
  const toggleBulkSelectMode = () => {
    setBulkSelectMode(prev => {
      if (prev) {
        // If turning off, clear selections
        setSelectedItems([]);
        // Also close the bulk edit panel if it's open
        setBulkEditOpen(false);
      }
      return !prev;
    });
  };
  
  // Function to handle opening the bulk edit panel
  const openBulkEditPanel = () => {
    if (selectedItems.length > 0) {
      console.log("Opening bulk edit panel with", selectedItems.length, "items");
      setBulkEditOpen(true);
      
      // Add debug toast to confirm panel should be opening
      toast({
        title: "Opening bulk edit panel",
        description: `${selectedItems.length} items selected for bulk editing.`
      });
    } else {
      toast({
        title: "No items selected",
        description: "Please select at least one item to perform bulk edit operations.",
        variant: "destructive"
      });
    }
  };

  const handleItemSelection = (product: Product, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems(prev => [...prev, product]);
    } else {
      setSelectedItems(prev => prev.filter(item => item.id !== product.id));
    }
  };

  const handleBulkSelectAll = (select: boolean) => {
    if (select) {
      setSelectedItems([...filteredProducts]);
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkEditComplete = () => {
    console.log("handleBulkEditComplete called, closing panel");
    
    // Close the panel
    setBulkEditOpen(false);
    
    // Reset selection state for new selections
    setSelectedItems([]);
    setBulkSelectMode(false);
    
    // Refresh the product list
    queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    
    // Show success toast
    toast({
      title: "Bulk update complete",
      description: "Selected items have been updated successfully."
    });
  };

  // Render mobile product card
  const renderMobileProductCard = (product: Product) => (
    <Card key={product.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-md border border-border overflow-hidden flex-shrink-0">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    const parentContainer = imgElement.parentElement;
                    // Hide the image
                    imgElement.style.display = 'none';
                    // Show icon instead
                    if (parentContainer) {
                      const iconDiv = document.createElement('div');
                      iconDiv.className = 'flex items-center justify-center w-full h-full bg-muted text-muted-foreground';
                      iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                      parentContainer.appendChild(iconDiv);
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
                  <ImageIcon className="h-6 w-6 opacity-50" />
                </div>
              )}
            </div>
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
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{product.name}</DialogTitle>
                <DialogDescription>
                  Product details
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <p>{product.category}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Subcategory</h4>
                  <p>{product.subcategory}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">SKU</h4>
                  <p className="font-mono">{product.sku}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Size</h4>
                  <p>{product.size || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Price</h4>
                  <p>{formatPrice(product.price)}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Quantity</h4>
                  <p>{product.quantity}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p>{product.description || "No description available"}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>
                  Make changes to the product information
                </DialogDescription>
              </DialogHeader>
              <ItemFormComponent 
                isEditing={true}
                defaultValues={{
                  name: product.name,
                  description: product.description || "",
                  basePrice: product.price,
                  category: product.category,
                  condition: "Used",
                  status: product.status || "draft",
                  images: product.imageUrl ? [product.imageUrl] : [],
                  tags: [],
                  marketplace: [],
                }}
                onSubmit={(data) => {
                  console.log('Form data:', data);
                  // TODO: Implement actual product update with API
                  toast({
                    title: "Product updated",
                    description: "The product has been updated successfully."
                  });
                }}
              />
            </DialogContent>
          </Dialog>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDeleteClick(product.id || 0)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      {/* Add Item Modal */}
      <AddItemModal 
        isOpen={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        editItem={null}
      />
      
      {/* Use the BulkEditPanel component with all the functionality */}
      {bulkEditOpen && selectedItems.length > 0 && (
        <BulkEditPanel 
          selectedItems={selectedItems} 
          onBulkEditComplete={handleBulkEditComplete} 
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this item from your inventory.
              {deleteMutation.isPending && (
                <div className="mt-2 flex items-center text-amber-600">
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  Deleting...
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
              <Button 
                className="gap-1.5 flex-1" 
                size="sm"
                onClick={() => setAddItemModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button 
                className="gap-1.5 flex-1" 
                size="sm"
                onClick={bulkSelectMode && selectedItems.length > 0 ? openBulkEditPanel : toggleBulkSelectMode}
                variant={bulkSelectMode ? "secondary" : "outline"}
              >
                <ClipboardList className="h-4 w-4" />
                {bulkSelectMode ? (selectedItems.length > 0 ? "Edit Items" : "Exit") : "Bulk Edit"}
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5 flex-1" 
                size="sm"
                onClick={syncWithShopify}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <>
                    <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1"></div>
                    Sync
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync
                  </>
                )}
              </Button>
            </div>
            
            {/* Desktop: Show all actions */}
            <div className="hidden md:flex flex-wrap gap-2">
              <Button 
                className="gap-1.5"
                onClick={() => setAddItemModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
              
              <Button
                variant={bulkSelectMode ? "secondary" : "outline"}
                className="gap-1.5"
                onClick={bulkSelectMode && selectedItems.length > 0 ? openBulkEditPanel : toggleBulkSelectMode}
              >
                {bulkSelectMode ? (
                  selectedItems.length > 0 ? (
                    <>
                      <Edit className="h-4 w-4" />
                      Edit Selected ({selectedItems.length})
                    </>
                  ) : (
                    <>
                      <XSquare className="h-4 w-4" />
                      Cancel Selection
                    </>
                  )
                ) : (
                  <>
                    <ClipboardList className="h-4 w-4" />
                    Bulk Edit
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={syncWithShopify}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-1"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync with Shopify
                  </>
                )}
              </Button>
              
              <Button
                variant="destructive"
                className="gap-1.5"
                onClick={() => setDeleteAllDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete All Inventory
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-1.5">
                    <UploadCloud className="h-4 w-4" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Products from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file to import multiple products at once
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="standard" className="w-full">
                    <TabsList className="grid grid-cols-2 mb-4">
                      <TabsTrigger value="standard">Standard Import</TabsTrigger>
                      <TabsTrigger value="shopify">Shopify Import</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="standard" className="mt-0">
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target as HTMLFormElement);
                          const fileInput = document.getElementById('standard-csv-file') as HTMLInputElement;
                          
                          if (fileInput?.files?.length === 0) {
                            toast({
                              title: "No file selected",
                              description: "Please select a CSV file to import",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          formData.append('file', fileInput.files![0]);
                          
                          apiRequest('POST', '/api/items/import', formData, true)
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) {
                                toast({
                                  title: "Import successful",
                                  description: `Imported ${data.imported || 0} items from CSV.`
                                });
                                refetchItems();
                              } else {
                                toast({
                                  title: "Import failed",
                                  description: data.message || "Failed to import CSV",
                                  variant: "destructive"
                                });
                              }
                            })
                            .catch(err => {
                              console.error("CSV import error:", err);
                              toast({
                                title: "Import error",
                                description: "There was an error importing the CSV file",
                                variant: "destructive"
                              });
                            });
                        }}
                      >
                        <div className="py-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium mb-2">Standard CSV Format</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                Your CSV should have these columns: Name, SKU, Category, Price, Quantity, Size (optional)
                              </p>
                              <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                      <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">CSV Files (MAX. 10MB)</p>
                                  </div>
                                  <input 
                                    id="standard-csv-file" 
                                    name="file" 
                                    type="file" 
                                    className="hidden" 
                                    accept=".csv" 
                                  />
                                </label>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox id="sync-with-shopify" name="syncWithShopify" />
                              <label
                                htmlFor="sync-with-shopify"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Sync imported items with Shopify
                              </label>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Import Products</Button>
                        </DialogFooter>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="shopify" className="mt-0">
                      <div className="py-4">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium mb-2">Shopify Import</h3>
                            <div className="text-sm text-muted-foreground space-y-1 mb-4">
                              <p>For importing Shopify inventory, please use our dedicated Shopify Import tool.</p>
                              <p>This specialized tool ensures proper data handling and synchronization with your Shopify store.</p>
                            </div>
                            <div className="flex items-center justify-center w-full mt-6">
                              <Link href="/shopify-import" className="w-full">
                                <Button className="w-full gap-2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-600 hover:to-purple-600">
                                  <ShoppingBag className="h-4 w-4" /> Go to Shopify Import
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={() => {
                  // Create CSV content
                  if (filteredProducts.length === 0) {
                    toast({
                      title: "No products to export",
                      description: "There are no products matching your current filters to export.",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  // Prepare CSV headers and rows
                  const headers = [
                    "ID", "Name", "Category", "SKU", "Size", "Price", "Quantity", "Status"
                  ];
                  
                  const rows = filteredProducts.map((product: Product) => [
                    product.id,
                    product.name,
                    product.category,
                    product.sku,
                    product.size || "",
                    product.price,
                    product.quantity,
                    product.status
                  ]);
                  
                  // Combine headers and rows
                  const csvContent = [
                    headers.join(","),
                    ...rows.map((row: any[]) => row.join(","))
                  ].join("\n");
                  
                  // Create a blob and download link
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', 'inventory-export.csv');
                  document.body.appendChild(link);
                  link.click();
                  
                  // Clean up
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  
                  toast({
                    title: "Export successful",
                    description: `Exported ${filteredProducts.length} products to CSV.`
                  });
                }}
              >
                <DownloadCloud className="h-4 w-4" />
                Export
              </Button>
              
              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={() => {
                  // Navigate to a printable catalog view
                  toast({
                    title: "Catalog feature",
                    description: "This feature to generate a printable product catalog will be available soon."
                  });
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Catalog
              </Button>
            </div>
          </div>
          
          {/* Removed duplicate Mobile Export/Catalog buttons - Using only desktop buttons */}
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
                          {bulkSelectMode && (
                            <th className="py-3 px-2 w-10">
                              <Checkbox 
                                checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0}
                                onCheckedChange={(checked) => handleBulkSelectAll(!!checked)}
                              />
                            </th>
                          )}
                          <th className="text-center py-3 px-2 w-16">Image</th>
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
                        {filteredProducts.map((product: Product) => (
                          <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                            {bulkSelectMode && (
                              <td className="py-3 px-2">
                                <Checkbox 
                                  checked={selectedItems.some(item => item.id === product.id)}
                                  onCheckedChange={(checked) => handleItemSelection(product, !!checked)}
                                />
                              </td>
                            )}
                            <td className="py-3 px-2 text-center">
                              <div className="group relative">
                                <div className="relative w-12 h-12 mx-auto overflow-hidden rounded-md border border-border transition-all duration-200 cursor-pointer hover:shadow-md">
                                  {product.imageUrl ? (
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.name}
                                      className="object-cover w-full h-full"
                                      onError={(e) => {
                                        const imgElement = e.target as HTMLImageElement;
                                        const parentContainer = imgElement.parentElement;
                                        // Hide the image
                                        imgElement.style.display = 'none';
                                        // Show icon instead
                                        if (parentContainer) {
                                          const iconDiv = document.createElement('div');
                                          iconDiv.className = 'flex items-center justify-center w-full h-full bg-muted text-muted-foreground';
                                          iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                          parentContainer.appendChild(iconDiv);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
                                      <ImageIcon className="h-6 w-6 opacity-50" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Larger preview on hover */}
                                {product.imageUrl && (
                                  <div className="absolute transform -translate-x-1/2 -translate-y-full top-0 left-1/2 mt-[-10px] z-50 hidden group-hover:block rounded-md shadow-lg border border-border bg-white p-1 transition-all duration-200 animate-in fade-in zoom-in-95">
                                    <div className="relative w-48 h-48 overflow-hidden rounded">
                                      <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="object-contain w-full h-full"
                                        onError={(e) => {
                                          const imgElement = e.target as HTMLImageElement;
                                          const parentContainer = imgElement.parentElement;
                                          // Hide the image
                                          imgElement.style.display = 'none';
                                          // Show icon instead
                                          if (parentContainer) {
                                            const iconDiv = document.createElement('div');
                                            iconDiv.className = 'flex items-center justify-center w-full h-full bg-muted text-muted-foreground';
                                            iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                            parentContainer.appendChild(iconDiv);
                                          }
                                        }}
                                      />
                                    </div>
                                    <div className="mt-1 px-1 text-xs font-medium text-center text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                                      {product.name}
                                    </div>
                                    {/* Triangle pointer */}
                                    <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-border"></div>
                                  </div>
                                )}
                              </div>
                            </td>
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
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>{product.name}</DialogTitle>
                                      <DialogDescription>
                                        Product details
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-2 gap-4 py-4">
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                                        <p>{product.category}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Subcategory</h4>
                                        <p>{product.subcategory}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">SKU</h4>
                                        <p className="font-mono">{product.sku}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Size</h4>
                                        <p>{product.size || "N/A"}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Price</h4>
                                        <p>{formatPrice(product.price)}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Retail Price</h4>
                                        <p>{formatPrice(product.retailPrice)}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Wholesale Price</h4>
                                        <p>{formatPrice(product.wholesalePrice)}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Quantity</h4>
                                        <p>{product.quantity}</p>
                                      </div>
                                      <div className="space-y-1 col-span-2">
                                        <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                                        <p>{product.description || "No description available"}</p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle>Edit Product</DialogTitle>
                                      <DialogDescription>
                                        Make changes to the product information
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ItemFormComponent 
                                      isEditing={true}
                                      defaultValues={{
                                        name: product.name,
                                        description: product.description || "",
                                        basePrice: product.price,
                                        category: product.category,
                                        condition: "Used",
                                        status: product.status || "draft",
                                        images: product.imageUrl ? [product.imageUrl] : [],
                                        tags: [],
                                        marketplace: [],
                                      }}
                                      onSubmit={(data) => {
                                        console.log('Form data:', data);
                                        // TODO: Implement actual product update with API
                                        toast({
                                          title: "Product updated",
                                          description: "The product has been updated successfully."
                                        });
                                      }}
                                    />
                                  </DialogContent>
                                </Dialog>
                                
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteClick(product.id || 0)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
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
                          .filter((product: Product) => product.category === "Electronics")
                          .map((product: Product) => (
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
      
      {/* Delete All Inventory Confirmation Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Entire Inventory</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning: Irreversible Action</AlertTitle>
                  <AlertDescription>
                    This will permanently delete ALL items in your inventory. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmationText">Type <span className="font-mono bg-muted px-1 rounded">DELETE_ALL_INVENTORY</span> to confirm</Label>
                  <Input 
                    id="confirmationText"
                    placeholder="DELETE_ALL_INVENTORY"
                    value={deleteAllConfirmation}
                    onChange={(e) => setDeleteAllConfirmation(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAllLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAllInventory}
              disabled={deleteAllLoading || deleteAllConfirmation !== "DELETE_ALL_INVENTORY"}
              className="bg-destructive hover:bg-destructive/90 gap-2"
            >
              {deleteAllLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete All Inventory
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductsInventoryPage;