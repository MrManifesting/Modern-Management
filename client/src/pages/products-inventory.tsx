import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { BulkActionBar } from '@/components/inventory/bulk-action-bar';
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
  Tag,
  ClipboardList,
  Image as ImageIcon,
  Printer,
  ChevronDown,
  Store,
  PackageOpen,
  Barcode,
  QrCode
} from 'lucide-react';
import { LeafLoadingPattern } from '@/components/ui/leaf-loader';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import QuickBreakdown from '@/components/inventory/quick-breakdown';
import BarcodePrint from '@/components/inventory/barcode-print';
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
  weight?: number;
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
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Handlers for bulk actions
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedItems([]);
    }
  };

  const handleItemSelection = (itemId: number) => {
    const item = products.find(p => p.id === itemId);
    if (!item) return;

    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === itemId);
      if (isSelected) {
        return prev.filter(i => i.id !== itemId);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    const itemIds = selectedItems.map(item => item.id).filter(Boolean) as number[];
    
    try {
      await apiRequest('POST', '/api/items/bulk-delete', { itemIds });
      toast({
        title: "Items Deleted",
        description: `Successfully deleted ${itemIds.length} items.`,
      });
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete items. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleBulkPublish = async () => {
    if (selectedItems.length === 0) return;
    
    const itemIds = selectedItems.map(item => item.id).filter(Boolean) as number[];
    
    try {
      setSyncLoading(true);
      await apiRequest('POST', '/api/items/bulk-publish', { 
        itemIds, 
        marketplaceId: 1 // Assuming 1 is Shopify's marketplace ID
      });
      toast({
        title: "Items Published",
        description: `Successfully published ${itemIds.length} items to marketplace.`,
      });
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish items. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleBulkPrint = () => {
    if (selectedItems.length === 0) return;
    
    // Open print modal or redirect to print page with selected items
    toast({
      title: "Print Requested",
      description: `Preparing to print labels for ${selectedItems.length} items.`,
    });
  };

  const handleBulkExport = async () => {
    if (selectedItems.length === 0) return;
    
    const itemIds = selectedItems.map(item => item.id).filter(Boolean) as number[];
    
    try {
      const response = await apiRequest('POST', '/api/export-csv', { itemIds });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exported-items-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: `Successfully exported ${itemIds.length} items to CSV.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export items. Please try again.",
        variant: "destructive"
      });
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setSelectionMode(false);
  };
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
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
  const filteredProducts = products
    .filter((product: Product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku ? product.sku.toLowerCase().includes(searchTerm.toLowerCase()) : false);
      
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    // Sort in-stock items first, then by newest first (recent items first based on ID)
    .sort((a: Product, b: Product) => {
      // First prioritize in-stock items
      const aInStock = a.quantity && a.quantity > 0;
      const bInStock = b.quantity && b.quantity > 0;
      
      if (aInStock && !bInStock) return -1;
      if (!aInStock && bInStock) return 1;
      
      // Then sort by newest items (highest ID) first
      return (b.id || 0) - (a.id || 0);
    });

  // Get status badge color
  const getStatusBadgeClass = (status: string = "") => {
    if (status.includes("Stock")) return "bg-green-500 text-white";
    if (status.includes("Low")) return "bg-yellow-500 text-white";
    return "bg-gray-400 text-white";
  };

  // Handle viewing product details
  const handleViewClick = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined
    // Navigate to product details page
    navigate(`/inventory/${id}`);
  };

  // Handle editing product
  const handleEditClick = (product: Product) => {
    setAddItemModalOpen(true);
    // Pass the product to the item form component
    setSelectedItem(product);
  };

  // Handle product deletion
  const handleDeleteClick = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined
    setProductIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle quick breakdown
  const handleQuickBreakdownClick = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined
    const itemToBreakdown = products.find((item: Product) => item.id === id);
    if (itemToBreakdown && itemToBreakdown.id) { // Ensure id is defined
      setSelectedItem({
        ...itemToBreakdown,
        id: itemToBreakdown.id // Ensure id is passed
      });
      setIsBreakdownModalOpen(true);
    }
  };

  // Handle barcode printing
  const handlePrintBarcodeClick = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined
    const itemToPrint = products.find((item: Product) => item.id === id);
    if (itemToPrint && itemToPrint.id) { // Ensure id is defined
      setSelectedItem({
        ...itemToPrint,
        id: itemToPrint.id // Ensure id is passed
      });
      setIsPrintModalOpen(true);
    }
  };

  // Handle SKU generation
  const handleGenerateSKU = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined

    // Call API to generate SKU
    apiRequest('POST', `/api/items/${id}/generate-sku`)
      .then(() => {
        toast({
          title: "SKU Generated",
          description: "A new SKU has been generated for this item.",
        });
        // Refresh the items list
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to generate SKU. Please try again.",
          variant: "destructive"
        });
      });
  };

  // Handle QR code generation
  const handleGenerateQRCode = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined

    // Call API to generate QR code
    apiRequest('POST', `/api/items/${id}/generate-qrcode`)
      .then(() => {
        toast({
          title: "QR Code Generated",
          description: "A new QR code has been generated for this item.",
        });
        // Refresh the items list
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to generate QR code. Please try again.",
          variant: "destructive"
        });
      });
  };

  // Handle barcode generation
  const handleGenerateBarcode = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined

    // Call API to generate barcode
    apiRequest('POST', `/api/items/${id}/generate-barcode`)
      .then(() => {
        toast({
          title: "Barcode Generated",
          description: "A new barcode has been generated for this item.",
        });
        // Refresh the items list
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to generate barcode. Please try again.",
          variant: "destructive"
        });
      });
  };

  // Handle viewing in Shopify
  const handleViewShopifyClick = (id: number | undefined) => {
    if (!id) return; // Skip if id is undefined
    // Navigate to Shopify view page or open Shopify preview
    const itemToView = products.find((item: Product) => item.id === id);
    if (itemToView && itemToView.shopifyId) {
      window.open(`/api/items/${id}/shopify-store-view`, '_blank');
    } else {
      toast({
        title: "Not available",
        description: "This item is not yet available in Shopify.",
        variant: "destructive"
      });
    }
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
      
      // Handle non-200 response
      if (!testResponse.ok) {
        console.error('Shopify connection test failed:', testResponse.status, testResponse.statusText);
        throw new Error(`Shopify connection test failed: ${testResponse.statusText}`);
      }
      
      // Parse the JSON response safely
      let testResult;
      try {
        testResult = await testResponse.json();
      } catch (parseError) {
        console.error('Failed to parse Shopify test response:', parseError);
        throw new Error('Invalid response from Shopify connection test');
      }
      
      if (testResult.connected) {
        // Use the direct Shopify sync endpoint
        const syncResponse = await apiRequest('POST', '/api/shopify/sync-inventory');
        
        // Handle non-200 response
        if (!syncResponse.ok) {
          console.error('Shopify sync failed:', syncResponse.status, syncResponse.statusText);
          throw new Error(`Shopify sync failed: ${syncResponse.statusText}`);
        }
        
        // Parse the JSON response safely
        let syncResult;
        try {
          syncResult = await syncResponse.json();
        } catch (parseError) {
          console.error('Failed to parse Shopify sync response:', parseError);
          throw new Error('Invalid response from Shopify sync endpoint');
        }
        
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
        description: error instanceof Error ? error.message : "Failed to connect to Shopify. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Bulk selection handling
  const toggleBulkSelectMode = () => {
    setBulkSelectMode(prev => {
      const newMode = !prev;
      
      // Also update selection mode for cannabis cursor
      setSelectionMode(newMode);
      
      if (prev) {
        // If turning off, clear selections
        setSelectedItems([]);
        // Also close the bulk edit panel if it's open
        setBulkEditOpen(false);
      }
      return newMode;
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

  // This function is already implemented above, so we're removing the duplicate

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
  };
  
  // Handle bulk SKU generation
  const handleBulkGenerateSKUs = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to generate SKUs.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show loading toast
      toast({
        title: "Generating SKUs",
        description: `Generating SKUs for ${selectedItems.length} items...`
      });
      
      // Call API to bulk generate SKUs
      const response = await apiRequest('POST', '/api/items/generate-skus-bulk', {
        ids: selectedItems.map(item => item.id)
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: "SKUs Generated",
          description: `Successfully generated SKUs for ${selectedItems.length} items.`
        });
        // Refresh items to show new SKUs
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      } else {
        throw new Error(result.message || "Failed to generate SKUs");
      }
    } catch (error) {
      console.error("Bulk SKU generation error:", error);
      toast({
        title: "Error",
        description: "There was an error generating SKUs for the selected items.",
        variant: "destructive"
      });
    }
  };
  
  // Handle bulk QR code generation
  const handleBulkGenerateQRCodes = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to generate QR codes.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show loading toast
      toast({
        title: "Generating QR Codes",
        description: `Generating QR codes for ${selectedItems.length} items...`
      });
      
      // Call API to bulk generate QR codes
      const response = await apiRequest('POST', '/api/items/generate-qrcodes-bulk', {
        ids: selectedItems.map(item => item.id)
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: "QR Codes Generated",
          description: `Successfully generated QR codes for ${selectedItems.length} items.`
        });
        // Refresh items to show new QR codes
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      } else {
        throw new Error(result.message || "Failed to generate QR codes");
      }
    } catch (error) {
      console.error("Bulk QR code generation error:", error);
      toast({
        title: "Error",
        description: "There was an error generating QR codes for the selected items.",
        variant: "destructive"
      });
    }
  };
  
  // Handle bulk barcode generation
  const handleBulkGenerateBarcodes = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to generate barcodes.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show loading toast
      toast({
        title: "Generating Barcodes",
        description: `Generating barcodes for ${selectedItems.length} items...`
      });
      
      // Call API to bulk generate barcodes
      const response = await apiRequest('POST', '/api/items/generate-barcodes-bulk', {
        ids: selectedItems.map(item => item.id)
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Barcodes Generated",
          description: `Successfully generated barcodes for ${selectedItems.length} items.`
        });
        // Refresh items to show new barcodes
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      } else {
        throw new Error(result.message || "Failed to generate barcodes");
      }
    } catch (error) {
      console.error("Bulk barcode generation error:", error);
      toast({
        title: "Error",
        description: "There was an error generating barcodes for the selected items.",
        variant: "destructive"
      });
    }
  };
  
  // Handle bulk print function
  const handleBulkPrintBarcodes = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to print barcodes.",
        variant: "destructive"
      });
      return;
    }
    
    // Set selected items for printing and open print modal
    setSelectedItem(null); // Clear single item selection
    setIsPrintModalOpen(true);
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
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => handleViewClick(product.id || 0)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                Actions <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Manage Item</DropdownMenuLabel>
              <DropdownMenuItem 
                className="flex items-center cursor-pointer"
                onClick={() => handleEditClick(product)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Item
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center cursor-pointer"
                onClick={() => handlePrintBarcodeClick(product.id || 0)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Barcode/QR
              </DropdownMenuItem>
              {product.weight && (
                <DropdownMenuItem 
                  className="flex items-center cursor-pointer"
                  onClick={() => handleQuickBreakdownClick(product.id || 0)}
                >
                  <PackageOpen className="mr-2 h-4 w-4" />
                  Quick Breakdown
                </DropdownMenuItem>
              )}
              {product.shopifyId && (
                <DropdownMenuItem
                  className="flex items-center cursor-pointer"
                  onClick={() => handleViewShopifyClick(product.id || 0)}
                >
                  <Store className="mr-2 h-4 w-4" />
                  View in Shopify
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteClick(product.id || 0)}
                className="flex items-center cursor-pointer text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // If data is loading, show the leaf loading pattern
  if (isLoading) {
    return (
      <div className="container mx-auto h-screen flex flex-col items-center justify-center">
        <LeafLoadingPattern message="Loading inventory data..." />
      </div>
    );
  }

  return (
    <div className={`products-inventory-page ${selectionMode ? 'selection-mode' : ''}`}>
      {/* Loading overlays */}
      <LoadingOverlay 
        isLoading={syncLoading} 
        message="Syncing with Shopify..."
        animation="falling"
        variant="full"
      />
      
      <LoadingOverlay 
        isLoading={deleteAllLoading} 
        message="Removing all inventory items..."
        animation="ring"
        variant="full"
        blur={true}
      />
      
      <LoadingOverlay 
        isLoading={deleteMutation.isPending} 
        message="Removing item from inventory..."
        animation="pattern"
        variant="partial"
        blur={true}
      />
      
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
      
      {/* Quick Breakdown Dialog */}
      {selectedItem && selectedItem.id && (
        <Dialog open={isBreakdownModalOpen} onOpenChange={setIsBreakdownModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Quick Breakdown</DialogTitle>
              <DialogDescription>
                Break down this item into smaller units
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <QuickBreakdown 
                item={{
                  id: selectedItem.id,
                  name: selectedItem.name,
                  category: selectedItem.category,
                  price: selectedItem.price,
                  quantity: selectedItem.quantity,
                  weight: selectedItem.weight,
                  sku: selectedItem.sku
                }}
                onClose={() => setIsBreakdownModalOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Barcode Print Dialog */}
      {selectedItem && selectedItem.id && (
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Print Barcode/QR Code</DialogTitle>
              <DialogDescription>
                Print a barcode or QR code for this item
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <BarcodePrint 
                item={{
                  id: selectedItem.id,
                  name: selectedItem.name,
                  sku: selectedItem.sku,
                  barcode: selectedItem.barcode,
                  price: selectedItem.price,
                  quantity: selectedItem.quantity
                }}
                onClose={() => setIsPrintModalOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
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
              className="bg-destructive hover:bg-destructive/90 gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <svg
                    viewBox="0 0 100 100"
                    className="w-4 h-4 mr-1 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      className="fill-current"
                      d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
                    />
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
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
            <div className="flex md:hidden flex-wrap gap-2">
              <Button 
                className="gap-1.5 flex-1" 
                size="sm"
                onClick={() => setAddItemModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button 
                className={`gap-1.5 flex-1 ${bulkSelectMode ? "bg-green-600 hover:bg-green-700" : ""}`} 
                size="sm"
                onClick={bulkSelectMode && selectedItems.length > 0 ? openBulkEditPanel : toggleBulkSelectMode}
                variant={bulkSelectMode ? "default" : "outline"}
              >
                {bulkSelectMode ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    {selectedItems.length > 0 ? "Edit Items" : "Exit Selection"}
                  </>
                ) : (
                  <>
                    <ClipboardList className="h-4 w-4" />
                    Select Items
                  </>
                )}
              </Button>
              
              {/* Mobile bulk action buttons */}
              {bulkSelectMode && selectedItems.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="gap-1 flex-1"
                    size="sm"
                    onClick={handleBulkGenerateSKUs}
                  >
                    <Tags className="h-4 w-4" />
                    SKUs
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="gap-1 flex-1"
                    size="sm"
                    onClick={handleBulkGenerateQRCodes}
                  >
                    <QrCode className="h-4 w-4" />
                    QR
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="gap-1 flex-1"
                    size="sm"
                    onClick={handleBulkGenerateBarcodes}
                  >
                    <Barcode className="h-4 w-4" />
                    Barcodes
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="gap-1 flex-1"
                    size="sm"
                    onClick={handleBulkPrintBarcodes}
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline" 
                className="gap-1.5 flex-1" 
                size="sm"
                onClick={syncWithShopify}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <>
                    <svg
                      viewBox="0 0 100 100"
                      className="w-4 h-4 mr-1 animate-spin text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        className="fill-current"
                        d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
                      />
                    </svg>
                    Syncing
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
              
              {/* Show additional bulk action buttons when in bulk select mode and items are selected */}
              {bulkSelectMode && selectedItems.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleBulkGenerateSKUs}
                  >
                    <Tags className="h-4 w-4" />
                    Generate SKUs
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleBulkGenerateQRCodes}
                  >
                    <QrCode className="h-4 w-4" />
                    Generate QR Codes
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleBulkGenerateBarcodes}
                  >
                    <Barcode className="h-4 w-4" />
                    Generate Barcodes
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleBulkPrintBarcodes}
                  >
                    <Printer className="h-4 w-4" />
                    Print Barcodes
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={syncWithShopify}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <>
                    <svg
                      viewBox="0 0 100 100"
                      className="w-5 h-5 mr-1 animate-spin text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        className="fill-current"
                        d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
                      />
                    </svg>
                    Syncing with Shopify...
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full flex flex-col gap-1">
                  <Label htmlFor="category-filter" className="text-sm font-medium">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger id="category-filter" className="w-full">
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full flex flex-col gap-1">
                  <Label htmlFor="stock-status-filter" className="text-sm font-medium">Stock Status</Label>
                  <Select defaultValue="all">
                    <SelectTrigger id="stock-status-filter" className="w-full">
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

                                {/* Action Dropdown Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      Actions <ChevronDown className="ml-1 h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Manage Item</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => handleEditClick(product)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Item
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => handlePrintBarcodeClick(product.id)}
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      Print Barcode/QR
                                    </DropdownMenuItem>
                                    {product.weight && (
                                      <DropdownMenuItem 
                                        className="flex items-center cursor-pointer"
                                        onClick={() => handleQuickBreakdownClick(product.id)}
                                      >
                                        <PackageOpen className="mr-2 h-4 w-4" />
                                        Quick Breakdown
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => handleGenerateSKU(product.id)}
                                    >
                                      <Tag className="mr-2 h-4 w-4" />
                                      Generate SKU
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => handleGenerateBarcode(product.id)}
                                    >
                                      <Barcode className="mr-2 h-4 w-4" />
                                      Generate Barcode
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => handleGenerateQRCode(product.id)}
                                    >
                                      <QrCode className="mr-2 h-4 w-4" />
                                      Generate QR Code
                                    </DropdownMenuItem>
                                    
                                    {product.shopifyId && (
                                      <DropdownMenuItem
                                        className="flex items-center cursor-pointer"
                                        onClick={() => handleViewShopifyClick(product.id)}
                                      >
                                        <Store className="mr-2 h-4 w-4" />
                                        View in Shopify
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="flex items-center cursor-pointer text-destructive"
                                      onClick={() => handleDeleteClick(product.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Item
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      if (product.id !== undefined) {
                                        handleViewClick(product.id);
                                      }
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        Actions <ChevronDown className="ml-1 h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuLabel>Manage Item</DropdownMenuLabel>
                                      <DropdownMenuItem 
                                        className="flex items-center cursor-pointer"
                                        onClick={() => handleEditClick(product)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Item
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="flex items-center cursor-pointer"
                                        onClick={() => {
                                          if (product.id !== undefined) {
                                            handlePrintBarcodeClick(product.id);
                                          }
                                        }}
                                      >
                                        <Printer className="mr-2 h-4 w-4" />
                                        Print Barcode/QR
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem 
                                        className="flex items-center cursor-pointer"
                                        onClick={() => {
                                          if (product.id !== undefined) {
                                            handleQuickBreakdownClick(product.id);
                                          }
                                        }}
                                      >
                                        <PackageOpen className="mr-2 h-4 w-4" />
                                        Quick Breakdown
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem
                                        className="flex items-center cursor-pointer"
                                        onClick={() => {
                                          if (product.id !== undefined) {
                                            handleGenerateSKU(product.id);
                                          }
                                        }}
                                      >
                                        <Tags className="mr-2 h-4 w-4" />
                                        Generate SKU
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem
                                        className="flex items-center cursor-pointer"
                                        onClick={() => {
                                          if (product.id !== undefined) {
                                            handleGenerateQRCode(product.id);
                                          }
                                        }}
                                      >
                                        <QrCode className="mr-2 h-4 w-4" />
                                        Generate QR Code
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem
                                        className="flex items-center cursor-pointer"
                                        onClick={() => {
                                          if (product.id !== undefined) {
                                            handleGenerateBarcode(product.id);
                                          }
                                        }}
                                      >
                                        <Barcode className="mr-2 h-4 w-4" />
                                        Generate Barcode
                                      </DropdownMenuItem>
                                      
                                      {product.shopifyId && product.id !== undefined && (
                                        <DropdownMenuItem
                                          className="flex items-center cursor-pointer"
                                          onClick={() => {
                                            if (product.id !== undefined) {
                                              handleViewShopifyClick(product.id);
                                            }
                                          }}
                                        >
                                          <Store className="mr-2 h-4 w-4" />
                                          View in Shopify
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          if (product.id !== undefined) {
                                            handleDeleteClick(product.id);
                                          }
                                        }}
                                        className="flex items-center cursor-pointer text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                  <svg
                    viewBox="0 0 100 100"
                    className="w-4 h-4 mr-1 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      className="fill-current"
                      d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
                    />
                  </svg>
                  Deleting Inventory...
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
      
      {/* Bulk Action Bar component */}
      {selectionMode && (
        <BulkActionBar
          selectedItems={selectedItems}
          onBulkPublish={handleBulkPublish}
          onBulkDelete={handleBulkDelete}
          onBulkPrint={handleBulkPrint}
          onBulkExport={handleBulkExport}
          onBulkCopy={() => {
            toast({
              title: "Copying items",
              description: `Creating copies of ${selectedItems.length} items.`
            });
            // Implement copy functionality here
          }}
          onClearSelection={clearSelection}
        />
      )}
    </div>
  );
};

export default ProductsInventoryPage;