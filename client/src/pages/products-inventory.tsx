import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { BulkActionBar } from '@/components/inventory/bulk-action-bar';
import { WorkingBarcode } from '@/components/inventory/working-barcode';
import { NumberedLabelsDialog } from '@/components/inventory/numbered-labels-dialog';
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
  Hash,
  Store,
  PackageOpen,
  Barcode,
  QrCode
} from 'lucide-react';
import { LeafLoadingPattern } from '@/components/ui/leaf-loader';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { LiveInventoryView } from '@/components/LiveInventoryView';
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
import EditItemModal from '@/components/modals/edit-item-modal';
import BulkEditPanel from '@/components/inventory/bulk-edit-panel';
import { BulkQuantityEdit } from '@/components/inventory/bulk-quantity-edit';
import { GenerateUnitsDialog } from '@/components/inventory/generate-units-dialog';

// Define the Product interface
interface Product {
  id?: number;
  name: string;
  category: string;
  subcategory?: string;
  price: number | string;
  displayPrice?: string;
  priceSource?: string;
  basePrice?: number;
  retailPrice: number;
  wholesalePrice: number;
  sku: string;
  barcode?: string;
  quantity: number;
  status?: string;
  size?: string;
  volume?: string;
  weight?: string;
  weightUnit?: string;
  weightValue?: number;
  description?: string;
  imageUrl?: string;
  images?: string[];
  mediaFiles?: string[];
  marketplace?: any[];
  shopifyId?: string | null;
  shopifyUrl?: string | null;
  shopifySyncStatus?: string;
  sheetsData?: any;
}

// Products are now loaded from real API data - no mock data used

// Product categories
const categories = [
  "All",
  "flower",
  "bulk flower",
  "bulk",
  "concentrates",
  "edibles",
  "vapes",
  "Other"
];

const ProductsInventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<number | null>(null);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEditItem, setSelectedEditItem] = useState<Product | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Product[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkQuantityEditOpen, setBulkQuantityEditOpen] = useState(false);
  
  // Handlers for bulk actions
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedItems([]);
    }
  };

  // Missing handler functions
  const handleBulkApplyChanges = (changes: any) => {
    // Implementation for bulk changes
    console.log('Bulk changes applied:', changes);
  };

  const handleItemAdded = (item: any) => {
    // Implementation for item added
    console.log('Item added:', item);
  };

  const handleItemUpdated = (item: any) => {
    // Implementation for item updated
    console.log('Item updated:', item);
  };

  const handleItemSelection = (itemId: number) => {
    if (!Array.isArray(products)) return;
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

  const handleBulkQuantityEdit = () => {
    if (selectedItems.length === 0) return;
    setBulkQuantityEditOpen(true);
  };

  const handleBulkQuantityEditComplete = () => {
    setBulkQuantityEditOpen(false);
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
  const [isStreamlinedBreakdownOpen, setIsStreamlinedBreakdownOpen] = useState(false);
  const [generateUnitsDialogOpen, setGenerateUnitsDialogOpen] = useState(false);
  const [itemForUnitsGeneration, setItemForUnitsGeneration] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Fetch inventory items using the standard endpoint
  const { data: products = [], isLoading, refetch: refetchItems } = useQuery({
    queryKey: ['/api/items'],
    queryFn: async () => {
      console.log("Fetching items from API...");
      const response = await apiRequest('GET', '/api/items');
      const items = await response.json();
      console.log("Fetched items:", items?.length || 0);
      
      return items.map((item: any) => {
        // Parse weight to extract exact standard values - no decimal weights
        const parseWeight = (weightStr: string) => {
          if (!weightStr) return { value: 1, unit: 'pound', display: '1 pound' };
          
          const weightLower = weightStr.toLowerCase().trim();
          
          // Exact standard weight mappings - no decimals
          if (weightLower.includes('1 pound') || weightLower === 'pound' || weightLower === '1lb') {
            return { value: 1, unit: 'pound', display: '1 pound' };
          } else if (weightLower.includes('half pound') || weightLower.includes('0.5 pound')) {
            return { value: 0.5, unit: 'pound', display: 'half pound' };
          } else if (weightLower.includes('quarter pound') || weightLower.includes('0.25 pound')) {
            return { value: 0.25, unit: 'pound', display: 'quarter pound' };
          } else if (weightLower.includes('1 ounce') || weightLower === 'ounce' || weightLower === '1oz') {
            return { value: 1, unit: 'ounce', display: '1 ounce' };
          } else if (weightLower.includes('half ounce') || weightLower.includes('0.5 ounce')) {
            return { value: 0.5, unit: 'ounce', display: 'half ounce' };
          } else if (weightLower.includes('quarter ounce') || weightLower.includes('0.25 ounce')) {
            return { value: 0.25, unit: 'ounce', display: 'quarter ounce' };
          } else if (weightLower.includes('3.5') && weightLower.includes('g')) {
            return { value: 3.5, unit: 'gram', display: '3.5g' };
          } else if (weightLower.includes('1') && weightLower.includes('g')) {
            return { value: 1, unit: 'gram', display: '1g' };
          } else {
            // Default to 1 pound for any unrecognized weight
            return { value: 1, unit: 'pound', display: '1 pound' };
          }
        };

        // Enhanced price display function
        const formatPriceDisplay = (product: any) => {
          if (product.displayPrice && product.displayPrice !== "No Price") {
            return product.displayPrice;
          }
          if (product.basePrice && product.basePrice > 0) {
            return `$${product.basePrice}`;
          }
          return "No Price";
        };

        const weightData = parseWeight(item.weight || '1 pound');

        return {
          id: item.id,
          name: item.name,
          category: item.category || "Uncategorized",
          price: formatPriceDisplay(item),
          displayPrice: item.displayPrice || "No Price",
          priceSource: item.priceSource || "none",
          basePrice: item.displayPrice || item.basePrice || 0,
          retailPrice: item.retailPrice || item.basePrice || 0,
          wholesalePrice: item.wholesalePrice || (item.basePrice ? item.basePrice * 0.5 : 0),
          sku: item.sku || "NO-SKU",
          barcode: item.barcode || "",
          quantity: item.quantity || 0,
          images: item.images || [],
          mediaFiles: item.mediaFiles || [],
          status: item.status || "draft",
          size: item.size || "",
          volume: item.volume || "",
          weight: weightData.display,
          weightValue: weightData.value,
          weightUnit: weightData.unit,
          description: item.description || "",
          imageUrl: item.imageUrl || (item.images && item.images.length > 0 ? item.images[0] : null),
          marketplace: item.marketplace || [],
          shopifyId: item.shopifyId || null,
          shopifyUrl: item.shopifyUrl || null,
          shopifySyncStatus: item.shopifySyncStatus || "not_synced",
          sheetsData: item.sheetsData || null
        };
      });
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
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/enhanced'] });
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

  // Enhanced price display for tables
  const renderPriceCell = (product: Product) => (
    <div className="flex flex-col items-end">
      <span className="font-medium">{product.displayPrice || "No Price"}</span>
      {product.priceSource === 'shopify' && (
        <Badge variant="outline" className="text-xs mt-1">Shopify</Badge>
      )}
    </div>
  );

  // Enhanced quantity display
  const renderQuantityCell = (product: Product) => (
    <Badge variant={product.quantity > 10 ? "default" : product.quantity > 0 ? "secondary" : "destructive"}>
      {product.quantity || 0}
    </Badge>
  );

  // Filter products based on search term and category
  const filteredProducts = (Array.isArray(products) ? products : [])
    .filter((product: Product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku ? product.sku.toLowerCase().includes(searchTerm.toLowerCase()) : false);
      
      let matchesCategory = false;
      if (selectedCategory === "All") {
        matchesCategory = true;
      } else {
        const productName = product.name.toLowerCase();
        const productCategory = (product.category || '').toLowerCase();
        const selectedCat = selectedCategory.toLowerCase();
        
        // Check if category matches exactly
        if (productCategory === selectedCat) {
          matchesCategory = true;
        }
        // Check if product name contains the category keyword
        else if (selectedCat === 'flower' && (productName.includes('flower') || productName.includes('thca'))) {
          matchesCategory = true;
        }
        else if (selectedCat === 'bulk' && productName.includes('bulk')) {
          matchesCategory = true;
        }
        else if (selectedCat === 'concentrates' && (productName.includes('concentrate') || productName.includes('crumble') || productName.includes('wax') || productName.includes('shatter'))) {
          matchesCategory = true;
        }
        else if (selectedCat === 'edibles' && (productName.includes('edible') || productName.includes('gummy') || productName.includes('chocolate'))) {
          matchesCategory = true;
        }
        else if (selectedCat === 'vapes' && (productName.includes('vape') || productName.includes('cartridge') || productName.includes('cart'))) {
          matchesCategory = true;
        }
      }
      
      return matchesSearch && matchesCategory;
    })
    // Sort items - recently added with available quantities first, then other available items, then out of stock
    .sort((a: Product, b: Product) => {
      const aQuantity = a.quantity ?? 0;
      const bQuantity = b.quantity ?? 0;
      const aId = a.id || 0;
      const bId = b.id || 0;
      
      // Define "recently added" as items with higher IDs (more recently created)
      const totalItems = products.length;
      const recentThreshold = Math.max(1, Math.floor(totalItems * 0.2)); // Top 20% of items by ID
      const maxId = Math.max(...products.map(item => item.id || 0));
      const recentIdThreshold = maxId - recentThreshold;
      
      const aIsRecent = aId > recentIdThreshold;
      const bIsRecent = bId > recentIdThreshold;
      
      // Priority 1: Recently added items with available quantities (newest first)
      if (aIsRecent && aQuantity > 0 && !(bIsRecent && bQuantity > 0)) return -1;
      if (bIsRecent && bQuantity > 0 && !(aIsRecent && aQuantity > 0)) return 1;
      
      // Both are recent with available quantities - sort by newest first (higher ID)
      if (aIsRecent && aQuantity > 0 && bIsRecent && bQuantity > 0) {
        return bId - aId;
      }
      
      // Priority 2: Other items with available quantities (newest first)
      if (aQuantity > 0 && bQuantity <= 0) return -1;
      if (bQuantity > 0 && aQuantity <= 0) return 1;
      
      // Both have available quantities - sort by newest first (higher ID)
      if (aQuantity > 0 && bQuantity > 0) {
        return bId - aId;
      }
      
      // Priority 3: Out of stock items (newest first)
      if (bId !== aId) {
        return bId - aId;
      }
      
      // Final fallback: alphabetical
      return (a.name || '').localeCompare(b.name || '');
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

  // Streamlined breakdown removed - use improved two-step workflow instead

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
    
    // Call the API to get the Shopify URL
    fetch(`/api/items/${id}/shopify-store-view`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.url) {
          window.open(data.url, '_blank');
        } else {
          toast({
            title: "Error",
            description: "Unable to open Shopify view for this item.",
            variant: "destructive"
          });
        }
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to open Shopify view. Please try again.",
          variant: "destructive"
        });
      });
  };

  // Google Sheets view disabled - system syncs from Shopify only
  const handleViewSheetsClick = (id: number | undefined) => {
    toast({
      title: "Google Sheets Sync Disabled",
      description: "System now syncs from Shopify only. Use 'View in Shopify' instead.",
      variant: "destructive"
    });
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
  
  // Function to import all products from Shopify
  const importAllProductsFromShopify = async () => {
    try {
      setSyncLoading(true);
      
      const response = await apiRequest('POST', '/api/shopify/sync-inventory');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Shopify Import Complete",
          description: `${result.imported} new items imported, ${result.updated} items updated`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/items/with-media'] });
      } else {
        throw new Error(result.error || "Import failed");
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import products from Shopify. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Function to update pricing from Shopify
  const updatePricingFromShopify = async () => {
    try {
      setSyncLoading(true);
      
      const response = await apiRequest('POST', '/api/shopify/update-pricing');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Pricing Updated",
          description: `Updated pricing for ${result.updated} items from Shopify`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/items/with-media'] });
      } else {
        throw new Error(result.error || "Pricing update failed");
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update pricing from Shopify. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Function to update images from Shopify
  const updateImagesFromShopify = async () => {
    try {
      setSyncLoading(true);
      
      const response = await apiRequest('POST', '/api/shopify/update-images');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Images Updated",
          description: `Updated images for ${result.updated} items from Shopify`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/items/with-media'] });
      } else {
        throw new Error(result.error || "Image update failed");
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update images from Shopify. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
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

  const handleBulkSelectAll = (select: boolean, category?: string) => {
    if (select) {
      if (category) {
        // Select only items from the specific category
        const categoryProducts = filteredProducts.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        setSelectedItems([...selectedItems.filter(item => !categoryProducts.some(cp => cp.id === item.id)), ...categoryProducts]);
      } else {
        // Select all filtered products
        setSelectedItems([...filteredProducts]);
      }
    } else {
      if (category) {
        // Deselect only items from the specific category
        const categoryProducts = filteredProducts.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        setSelectedItems(selectedItems.filter(item => !categoryProducts.some(cp => cp.id === item.id)));
      } else {
        // Deselect all items
        setSelectedItems([]);
      }
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
    queryClient.invalidateQueries({ queryKey: ['/api/items/with-media'] });
    
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
        queryClient.invalidateQueries({ queryKey: ['/api/items/with-media'] });
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

  // Handle Generate Units
  const handleGenerateUnits = (item: Product) => {
    setItemForUnitsGeneration(item);
    setGenerateUnitsDialogOpen(true);
  };

  const handleUnitsGenerated = () => {
    // Refresh the items list after units are generated
    refetchItems();
    queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    setGenerateUnitsDialogOpen(false);
    setItemForUnitsGeneration(null);
  };









  // Render mobile product card with selection checkbox
  const renderMobileProductCard = (product: Product) => (
    <Card key={product.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex gap-3 flex-1">
            {/* Selection checkbox for mobile */}
            <div className="flex items-start pt-1">
              <Checkbox
                checked={selectedItems.some(item => item.id === product.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedItems(prev => [...prev, product]);
                  } else {
                    setSelectedItems(prev => prev.filter(item => item.id !== product.id));
                  }
                }}
                className="mt-1"
              />
            </div>
            
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
            <div className="flex-1">
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
              <DropdownMenuItem
                className="flex items-center cursor-pointer"
                onClick={() => handleViewShopifyClick(product.id || 0)}
              >
                <Store className="mr-2 h-4 w-4" />
                {product.shopifyId ? "View in Shopify" : "View Live on Shopify"}
              </DropdownMenuItem>
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
                  quantity: selectedItem.quantity,
                  imageUrl: selectedItem.imageUrl,
                  images: selectedItem.images
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
              
              {/* Enhanced Shopify Import Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="gap-1.5"
                    disabled={syncLoading}
                  >
                    {syncLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Store className="h-4 w-4" />
                        Shopify Import
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Import Options</DropdownMenuLabel>
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={importAllProductsFromShopify}
                    disabled={syncLoading}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    Import All Products
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={updatePricingFromShopify}
                    disabled={syncLoading}
                  >
                    <CircleDollarSign className="mr-2 h-4 w-4" />
                    Update Pricing Only
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={updateImagesFromShopify}
                    disabled={syncLoading}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Update Images Only
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer text-blue-600"
                    onClick={syncWithShopify}
                    disabled={syncLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Full Sync
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={updatePricingFromShopify}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CircleDollarSign className="h-4 w-4" />
                    Update Pricing
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={updateImagesFromShopify}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    Update Images
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
              // Desktop view - Simplified inventory view without tabs
              <div className="w-full">
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
                        <th className="text-center py-3 px-4">Barcode/QR</th>
                        <th className="text-center py-3 px-4">Weight</th>
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
                                  {(() => {
                                    // Check for images in multiple sources
                                    let imageUrl = null;
                                    
                                    // 1. Check product.imageUrl (direct field)
                                    if (product.imageUrl) {
                                      imageUrl = product.imageUrl;
                                    }
                                    // 2. Check product.images array (JSON field)
                                    else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                                      imageUrl = product.images[0];
                                    }
                                    // 3. Check for media files by item ID
                                    else if (product.id) {
                                      // Try to construct media URL from common patterns
                                      const mediaPatterns = [
                                        `/media/${product.sku}.jpg`,
                                        `/media/${product.sku}.png`,
                                        `/media/${product.name.toLowerCase().replace(/\s+/g, '_')}.jpg`,
                                        `/media/item_${product.id}.jpg`,
                                        `/media/item_${product.id}.png`
                                      ];
                                      imageUrl = mediaPatterns[0]; // Try the first pattern
                                    }
                                    
                                    if (imageUrl) {
                                      return (
                                        <img 
                                          src={imageUrl} 
                                          alt={product.name}
                                          className="object-cover w-full h-full"
                                          onError={(e) => {
                                            const imgElement = e.target as HTMLImageElement;
                                            const parentContainer = imgElement.parentElement;
                                            if (parentContainer) {
                                              imgElement.style.display = 'none';
                                              const iconDiv = document.createElement('div');
                                              iconDiv.className = 'flex items-center justify-center w-full h-full bg-muted text-muted-foreground';
                                              iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                              parentContainer.appendChild(iconDiv);
                                            }
                                          }}
                                        />
                                      );
                                    } else {
                                      return (
                                        <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
                                          <ImageIcon className="h-6 w-6 opacity-50" />
                                        </div>
                                      );
                                    }
                                  })()}
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
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {product.sku && (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <Barcode className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs">Barcode</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <QrCode className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs">QR</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">{product.weight || "Weight not specified"}</td>
                            <td className="py-3 px-4 text-right">{formatPrice(product.basePrice || 0)}</td>
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
                                    <Button size="sm" variant="ghost" className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
                                      <DialogDescription>
                                        Complete product information and management
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                                      {/* Left Column - Product Details */}
                                      <div className="lg:col-span-2 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                                            <p className="text-sm">{product.description || "Description"}</p>
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                                            <p className="text-sm">{product.category}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4">
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Weight</h4>
                                            <p className="text-sm">{product.weight || "0g"}</p>
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Dimensions</h4>
                                            <p className="text-sm">Not specified</p>
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Brand</h4>
                                            <p className="text-sm">{product.vendor || "Gold Standard"}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Supplier</h4>
                                            <p className="text-sm">No supplier</p>
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
                                            <p className="text-sm">{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : "Jun 13, 2025"}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Updated</h4>
                                            <p className="text-sm">{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : "Jun 13, 2025"}</p>
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                              <span className="text-sm">Available</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-medium text-muted-foreground">Inventory Status</h4>
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-sm">In Stock</span>
                                            <span className="text-sm font-medium">{product.quantity}</span>
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            SKU: {product.sku || "Not assigned"}
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-medium text-muted-foreground">Images</h4>
                                          <div className="text-sm text-muted-foreground">
                                            {product.imageUrl ? "Image available" : "No images available"}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Right Column - Barcode and Category */}
                                      <div className="space-y-6">
                                        <div className="space-y-2">
                                          <WorkingBarcode item={product} />
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-medium text-muted-foreground">Category Color Legend</h4>
                                          <div className="space-y-2">
                                            <div className="text-xs font-medium">Main Categories</div>
                                            <div className="grid grid-cols-1 gap-1 text-xs">
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                                                <span>Flower</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                                                <span>Concentrates</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-pink-500 rounded"></div>
                                                <span>Edibles</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                                <span>Vapes</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-green-500 rounded"></div>
                                                <span>Tinctures</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                                                <span>Topicals</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                                                <span>Accessories</span>
                                              </div>
                                            </div>
                                            <div className="text-xs font-medium mt-3">Other</div>
                                            <div className="flex items-center gap-2 text-xs">
                                              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                                              <span>Bulk</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                {/* Action Dropdown Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md">
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
                                    <NumberedLabelsDialog item={product}>
                                      <DropdownMenuItem className="flex items-center cursor-pointer">
                                        <Hash className="mr-2 h-4 w-4" />
                                        Print Numbered Labels
                                      </DropdownMenuItem>
                                    </NumberedLabelsDialog>
                                    {product.weight && (
                                      <>
                                        <DropdownMenuItem 
                                          className="flex items-center cursor-pointer"
                                          onClick={() => handleQuickBreakdownClick(product.id)}
                                        >
                                          <PackageOpen className="mr-2 h-4 w-4" />
                                          Quick Breakdown
                                        </DropdownMenuItem>

                                      </>
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
                                    
                                    <DropdownMenuItem
                                      className="flex items-center cursor-pointer"
                                      onClick={() => handleViewShopifyClick(product.id)}
                                    >
                                      <Store className="mr-2 h-4 w-4" />
                                      View on Shopify
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem
                                      className="flex items-center cursor-pointer"
                                      onClick={() => handleViewSheetsClick(product.id)}
                                    >
                                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                                      View in Google Sheets
                                    </DropdownMenuItem>
                                    
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
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Bulk Edit Panel */}
      {bulkSelectMode && (
        <BulkEditPanel
          selectedItems={selectedItems}
          onClose={() => {
            setBulkSelectMode(false);
            setSelectedItems([]);
          }}
          onApplyChanges={handleBulkApplyChanges}
        />
      )}
      
      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onItemAdded={handleItemAdded}
      />
      
      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onItemUpdated={handleItemUpdated}
        item={selectedEditItem}
      />
    </div>
  );
};

export default ProductsInventoryPage;
