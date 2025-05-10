import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Badge
} from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  ShoppingCart, 
  ArrowUpDown, 
  Filter, 
  Loader2, 
  Edit, 
  Info, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  AlertCircle,
  Truck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define types for our data structures
interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  sku: string;
  variantId?: string;
  price: number;
  quantity: number;
  weight?: string | number;
  option1?: string;
  option2?: string;
  option3?: string;
  hasImage: boolean;
  inShopify: boolean;
}

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;
  strain?: string;
  tier?: string;
  packageSize?: string;
  weight?: string | number;
  hasImage: boolean;
  inInventory: boolean;
}

interface SyncItem {
  shopifyProduct: ShopifyProduct | null;
  inventoryItem: InventoryItem | null;
  syncStatus: 'matched' | 'unmatched' | 'new_to_shopify' | 'not_in_inventory';
  selected: boolean;
  generatedSku?: string;
  updateStock: boolean;
  updatePrice: boolean;
  updateImages: boolean;
  createNew: boolean;
}

// This is the main preview component
const ShopifySyncPreview: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Default to 25 items per page
  const [filter, setFilter] = useState('all');
  const [selectedCount, setSelectedCount] = useState(0);
  const [showSkuGenerator, setShowSkuGenerator] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SyncItem | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [syncResults, setSyncResults] = useState<{
    updated: number;
    created: number;
    skipped: number;
    failed: number;
    details: string[];
  }>({
    updated: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    details: []
  });
  
  // Rules for SKU generation
  const brandOptions = [
    { value: 'GS', label: 'Gold Standard' },
    { value: 'TM', label: 'Tree Mason' }
  ];
  
  const tierOptions = [
    { value: 'TS', label: 'Top Shelf' },
    { value: 'CR', label: 'Classic Reserve' },
    { value: 'EX', label: 'Exotic' },
    { value: 'AA', label: 'AA Indoor' },
    { value: 'SM', label: 'Smalls' },
  ];
  
  const weightOptions = [
    { value: '35G', label: '3.5 Grams' },
    { value: '7G', label: '7 Grams' },
    { value: '14G', label: '14 Grams' },
    { value: '28G', label: '28 Grams / 1 Ounce' },
    { value: '14P', label: '1/4 Pound' },
    { value: '12P', label: '1/2 Pound' },
    { value: '1P', label: '1 Pound' },
  ];
  
  // Form schema for SKU generator
  const skuFormSchema = z.object({
    brand: z.string({required_error: "Brand is required"}),
    strain: z.string({required_error: "Strain code is required"})
      .min(2, "Strain code must be at least 2 characters")
      .max(6, "Strain code must be 6 characters or less"),
    tier: z.string({required_error: "Tier is required"}),
    weight: z.string({required_error: "Weight is required"}),
  });
  
  // Form for generating SKUs
  const skuForm = useForm<z.infer<typeof skuFormSchema>>({
    resolver: zodResolver(skuFormSchema),
    defaultValues: {
      brand: 'GS',
      strain: '',
      tier: 'CR',
      weight: '1P',
    },
  });
  
  // Function to fetch sync preview data
  const fetchSyncPreview = async () => {
    setIsLoadingPreview(true);
    try {
      // First check Shopify connection
      const connectionResponse = await fetch('/api/shopify/test-connection');
      const connectionStatus = await connectionResponse.json();
      
      if (!connectionStatus.connected) {
        throw new Error(connectionStatus.message || 'Unable to connect to Shopify. Please check your API credentials.');
      }
      
      // Set a timeout to abort the fetch if it takes too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Fetch Shopify products with timeout
      const shopifyDataResponse = await fetch('/api/shopify/products', {
        signal: controller.signal
      }).catch(error => {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out when connecting to Shopify. Please try again later.');
        }
        throw error;
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!shopifyDataResponse.ok) {
        const errorData = await shopifyDataResponse.json().catch(() => ({ message: 'Error connecting to Shopify' }));
        throw new Error(errorData.message || `Shopify API returned status ${shopifyDataResponse.status}`);
      }
      
      const shopifyData = await shopifyDataResponse.json();
      
      // Fetch inventory items
      const inventoryDataResponse = await fetch('/api/items');
      
      if (!inventoryDataResponse.ok) {
        throw new Error('Failed to fetch inventory items');
      }
      
      const inventoryData = await inventoryDataResponse.json();
      
      // Process and match the data
      const syncData: SyncItem[] = [];
      
      // First, process items that exist in both systems
      for (const shopifyProduct of shopifyData) {
        // Try to find a matching inventory item by SKU
        const matchingInventoryItem = inventoryData.find(
          (item: InventoryItem) => 
            item.sku && 
            shopifyProduct.sku && 
            item.sku.trim().toLowerCase() === shopifyProduct.sku.trim().toLowerCase()
        );
        
        if (matchingInventoryItem) {
          // We have a match!
          syncData.push({
            shopifyProduct,
            inventoryItem: matchingInventoryItem,
            syncStatus: 'matched',
            selected: true,
            updateStock: true,
            updatePrice: true,
            updateImages: true,
            createNew: false
          });
        } else {
          // Shopify product exists but no matching inventory item
          syncData.push({
            shopifyProduct,
            inventoryItem: null,
            syncStatus: 'not_in_inventory',
            selected: false,
            updateStock: false,
            updatePrice: false,
            updateImages: false,
            createNew: false
          });
        }
      }
      
      // Now add inventory items that don't exist in Shopify
      for (const inventoryItem of inventoryData) {
        // Skip if this inventory item is already matched
        const existingMatch = syncData.some(
          item => 
            item.inventoryItem && 
            item.inventoryItem.id === inventoryItem.id
        );
        
        if (!existingMatch) {
          // This inventory item doesn't have a match in Shopify
          syncData.push({
            shopifyProduct: null,
            inventoryItem,
            syncStatus: 'new_to_shopify',
            selected: false,
            updateStock: true,
            updatePrice: true,
            updateImages: true,
            createNew: true
          });
        }
      }
      
      setSyncItems(syncData);
      setSelectedCount(syncData.filter(item => item.selected).length);
    } catch (error) {
      console.error('Error fetching sync preview:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'There was a problem loading the sync preview.';
      
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage = 'Connection to Shopify timed out. Please try again later or check if the store is accessible.';
        } else if (error.message.includes('API credentials') || error.message.includes('access token')) {
          errorMessage = 'Invalid Shopify API credentials. Please check your store URL and access token.';
        } else if (error.message.includes('connect')) {
          errorMessage = 'Could not connect to Shopify. Please check your internet connection and try again.';
        } else {
          // Use the actual error message if it exists
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({
        title: 'Shopify Connection Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 7000, // Show longer for error messages
      });
      
      // Set empty sync items to prevent UI issues
      setSyncItems([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  // Run the initial fetch
  useEffect(() => {
    fetchSyncPreview();
  }, []);
  
  // Count the selected items
  useEffect(() => {
    setSelectedCount(syncItems.filter(item => item.selected).length);
  }, [syncItems]);
  
  // Filter the items for display
  const getFilteredItems = () => {
    let filtered = [...syncItems];
    
    switch (filter) {
      case 'matched':
        filtered = filtered.filter(item => item.syncStatus === 'matched');
        break;
      case 'unmatched':
        filtered = filtered.filter(item => item.syncStatus === 'unmatched');
        break;
      case 'new_to_shopify':
        filtered = filtered.filter(item => item.syncStatus === 'new_to_shopify');
        break;
      case 'not_in_inventory':
        filtered = filtered.filter(item => item.syncStatus === 'not_in_inventory');
        break;
      case 'selected':
        filtered = filtered.filter(item => item.selected);
        break;
      default:
        // 'all' - no filtering needed
        break;
    }
    
    return filtered;
  };
  
  // Pagination
  const filteredItems = getFilteredItems();
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);
  
  // Handle pagination navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Generate a SKU based on the form inputs
  const generateSku = (data: z.infer<typeof skuFormSchema>) => {
    return `${data.brand}-${data.strain.toUpperCase()}-${data.tier}-${data.weight}`;
  };
  
  // Handle SKU generator form submission
  const onSkuFormSubmit = (data: z.infer<typeof skuFormSchema>) => {
    if (!selectedItem) return;
    
    const generatedSku = generateSku(data);
    
    // Update the selected item
    setSyncItems(prev => 
      prev.map(item => 
        item === selectedItem 
          ? { ...item, generatedSku, selected: true, createNew: true } 
          : item
      )
    );
    
    // Close the dialog
    setShowSkuGenerator(false);
    
    toast({
      title: 'SKU Generated',
      description: `Generated SKU: ${generatedSku}`,
    });
  };
  
  // Extract strain code from a product name
  const extractStrainCode = (name: string) => {
    const words = name.split(' ');
    if (!words.length) return '';
    
    // Try to create a code from the first 2-3 letters of each word in the strain name
    const codeWords = words
      .filter(word => 
        // Filter out common words and category indicators
        !['thca', 'thc', 'the', 'and', 'or', 'top', 'shelf', 'classic', 'reserve', 'indoor', 'exotic', 'smalls'].includes(word.toLowerCase())
      )
      .slice(0, 2); // Use at most 2 words
    
    if (!codeWords.length) return '';
    
    // Return first 3 chars of first word + first 3 chars of second word (if it exists)
    let code = codeWords[0].slice(0, 3).toUpperCase();
    if (codeWords.length > 1) {
      code += codeWords[1].slice(0, 3).toUpperCase();
    }
    
    return code;
  };
  
  // Open the SKU generator for a specific item
  const openSkuGenerator = (item: SyncItem) => {
    setSelectedItem(item);
    
    // Pre-fill the form based on the item
    let strainName = '';
    let tierCode = 'CR';
    let weightCode = '1P';
    
    if (item.shopifyProduct) {
      strainName = item.shopifyProduct.title;
      
      // Try to determine the weight
      if (item.shopifyProduct.option1 && typeof item.shopifyProduct.option1 === 'string') {
        const weightValue = item.shopifyProduct.option1.toLowerCase();
        if (weightValue.includes('3.5') || weightValue.includes('3.5g')) weightCode = '35G';
        else if (weightValue.includes('7g')) weightCode = '7G';
        else if (weightValue.includes('14g')) weightCode = '14G';
        else if (weightValue.includes('28g') || weightValue.includes('ounce') || weightValue.includes('oz')) weightCode = '28G';
        else if (weightValue.includes('1/4 pound')) weightCode = '14P';
        else if (weightValue.includes('1/2 pound')) weightCode = '12P';
        else if (weightValue.includes('pound') || weightValue.includes('lb')) weightCode = '1P';
      }
      
      // Try to determine the tier
      if (strainName.toLowerCase().includes('top shelf')) tierCode = 'TS';
      else if (strainName.toLowerCase().includes('exotic')) tierCode = 'EX';
      else if (strainName.toLowerCase().includes('classic reserve')) tierCode = 'CR';
      else if (strainName.toLowerCase().includes('aa indoor')) tierCode = 'AA';
      
      if (strainName.toLowerCase().includes('smalls')) tierCode += 'SM';
    }
    else if (item.inventoryItem) {
      strainName = item.inventoryItem.name;
      
      // Try to determine tier from category
      if (item.inventoryItem.tier) {
        const tierValue = item.inventoryItem.tier.toLowerCase();
        if (tierValue.includes('top shelf')) tierCode = 'TS';
        else if (tierValue.includes('exotic')) tierCode = 'EX';
        else if (tierValue.includes('classic reserve')) tierCode = 'CR';
        else if (tierValue.includes('aa indoor')) tierCode = 'AA';
        
        if (tierValue.includes('smalls')) tierCode += 'SM';
      }
      
      // Try to determine weight from packageSize
      if (item.inventoryItem.packageSize) {
        const sizeValue = item.inventoryItem.packageSize.toLowerCase();
        if (sizeValue.includes('3.5g')) weightCode = '35G';
        else if (sizeValue.includes('7g')) weightCode = '7G';
        else if (sizeValue.includes('14g')) weightCode = '14G';
        else if (sizeValue.includes('28g') || sizeValue.includes('ounce') || sizeValue.includes('oz')) weightCode = '28G';
        else if (sizeValue.includes('1/4 pound')) weightCode = '14P';
        else if (sizeValue.includes('1/2 pound')) weightCode = '12P';
        else if (sizeValue.includes('pound') || sizeValue.includes('lb')) weightCode = '1P';
      }
    }
    
    // Extract a strain code from the name
    const strainCode = extractStrainCode(strainName);
    
    // Reset the form with these values
    skuForm.reset({
      brand: 'GS', // Default to Gold Standard
      strain: strainCode,
      tier: tierCode,
      weight: weightCode
    });
    
    setShowSkuGenerator(true);
  };
  
  // Function to toggle selection of an item
  const toggleItemSelection = (index: number) => {
    setSyncItems(prev => {
      const newItems = [...prev];
      const itemIndex = filteredItems.indexOf(prev[index]);
      if (itemIndex !== -1) {
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          selected: !newItems[itemIndex].selected
        };
      }
      return newItems;
    });
  };
  
  // Function to toggle all items
  const toggleAllItems = (selected: boolean) => {
    setSyncItems(prev => 
      prev.map(item => {
        // If selecting all, select everything regardless of status
        // When deselecting, deselect everything
        return {
          ...item,
          selected: selected
        };
      })
    );
    
    // Show feedback to user
    if (selected) {
      toast({
        title: "Selected All Items",
        description: "All items have been selected for sync",
      });
    }
  };
  
  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (itemsToSync: SyncItem[]) => {
      // Reset sync results
      setSyncResults({
        updated: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        details: []
      });
      
      setIsSyncing(true);
      setProgressValue(0);
      
      const results = {
        updated: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        details: [] as string[]
      };
      
      // Process each item
      for (let i = 0; i < itemsToSync.length; i++) {
        const item = itemsToSync[i];
        const progressPercent = Math.round((i / itemsToSync.length) * 100);
        setProgressValue(progressPercent);
        
        try {
          if (item.syncStatus === 'matched') {
            // Update existing product
            const response = await fetch('/api/shopify/update-product', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                shopifyId: item.shopifyProduct?.id,
                inventoryId: item.inventoryItem?.id,
                updateStock: item.updateStock,
                updatePrice: item.updatePrice,
                updateImages: item.updateImages
              }),
            });
            const updateResult = await response.json();
            
            results.updated++;
            results.details.push(`✓ Updated: ${item.shopifyProduct?.title || 'Unknown product'}`);
          } 
          else if (item.syncStatus === 'new_to_shopify' && item.createNew && item.inventoryItem) {
            // Create new product in Shopify
            const response = await fetch('/api/shopify/create-product', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inventoryId: item.inventoryItem.id,
                sku: item.generatedSku || item.inventoryItem.sku
              }),
            });
            const createResult = await response.json();
            
            results.created++;
            results.details.push(`✓ Created: ${item.inventoryItem.name}`);
          } 
          else {
            // Skip this item
            results.skipped++;
            results.details.push(`- Skipped: ${item.shopifyProduct?.title || item.inventoryItem?.name || 'Unknown'}`);
          }
        } catch (error) {
          console.error('Error syncing item:', error);
          results.failed++;
          results.details.push(`✗ Failed: ${item.shopifyProduct?.title || item.inventoryItem?.name || 'Unknown'} - ${error}`);
        }
        
        // Update progress in state
        setSyncResults({
          updated: results.updated,
          created: results.created,
          skipped: results.skipped,
          failed: results.failed,
          details: [...results.details]
        });
      }
      
      setProgressValue(100);
      
      // Complete the sync
      return results;
    },
    onSuccess: (data) => {
      toast({
        title: 'Sync Complete',
        description: `Updated: ${data.updated}, Created: ${data.created}, Skipped: ${data.skipped}, Failed: ${data.failed}`,
      });
      
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/shopify/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      
      // Reset UI after a delay
      setTimeout(() => {
        setIsSyncing(false);
        fetchSyncPreview();
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: `Error: ${error}`,
        variant: 'destructive',
      });
      setIsSyncing(false);
    }
  });
  
  // Start the sync process
  const startSync = () => {
    const itemsToSync = syncItems.filter(item => item.selected);
    if (itemsToSync.length === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select at least one item to sync',
        variant: 'destructive',
      });
      return;
    }
    
    // Directly start the sync without showing the modal dialog
    // This bypasses the dialog-related issue
    syncMutation.mutate(itemsToSync);
  };
  
  // Confirm and execute the sync - no longer needed but kept for reference
  const confirmSync = () => {
    const itemsToSync = syncItems.filter(item => item.selected);
    syncMutation.mutate(itemsToSync);
  };
  
  // Generate SKUs for all new-to-shopify items that don't have one
  const generateMissingSkus = () => {
    // Keep track of how many SKUs were generated
    let generatedCount = 0;
    let noInventoryItems = true;
    
    setSyncItems(prev => {
      const newItems = prev.map(item => {
        // Generate SKUs for any inventory item that has no existing SKU or is new to Shopify
        if (item.inventoryItem) {
          noInventoryItems = false;
          
          // Extract a basic strain code
          const strainName = item.inventoryItem.name || '';
          const strainCode = extractStrainCode(strainName);
          
          // Determine tier
          let tierCode = 'CR'; // Default to Classic Reserve
          if (item.inventoryItem.tier) {
            const tierValue = item.inventoryItem.tier.toLowerCase();
            if (tierValue.includes('top shelf')) tierCode = 'TS';
            else if (tierValue.includes('exotic')) tierCode = 'EX';
            else if (tierValue.includes('aa indoor')) tierCode = 'AA';
            
            if (tierValue.includes('smalls')) tierCode += 'SM';
          }
          
          // Determine weight
          let weightCode = '1P'; // Default to 1 Pound
          if (item.inventoryItem.packageSize) {
            const sizeValue = item.inventoryItem.packageSize.toLowerCase();
            if (sizeValue.includes('3.5g')) weightCode = '35G';
            else if (sizeValue.includes('7g')) weightCode = '7G';
            else if (sizeValue.includes('14g')) weightCode = '14G';
            else if (sizeValue.includes('28g') || sizeValue.includes('ounce') || sizeValue.includes('oz')) weightCode = '28G';
            else if (sizeValue.includes('1/4 pound')) weightCode = '14P';
            else if (sizeValue.includes('1/2 pound')) weightCode = '12P';
            else if (sizeValue.includes('pound') || sizeValue.includes('lb')) weightCode = '1P';
          }
          
          // Generate SKU
          const generatedSku = `GS-${strainCode}-${tierCode}-${weightCode}`;
          
          // Only count this as a new generation if it didn't have one before
          if (!item.generatedSku) {
            generatedCount++;
          }
          
          return {
            ...item,
            generatedSku,
            selected: true,
            createNew: true
          };
        }
        
        // For Shopify products without inventory items, we should set them as selected
        if (item.shopifyProduct) {
          return {
            ...item,
            selected: true
          };
        }
        
        return item;
      });
      
      return newItems;
    });
    
    // Show appropriate feedback
    setTimeout(() => {
      if (noInventoryItems) {
        toast({
          title: 'No Inventory Items',
          description: "You need to add inventory items first before generating SKUs. Please import items from a CSV or add them manually.",
          variant: "destructive"
        });
      } else if (generatedCount === 0) {
        toast({
          title: 'No Missing SKUs',
          description: "All inventory items already have SKUs assigned or there are no new items to generate SKUs for.",
          variant: "default"
        });
      } else {
        toast({
          title: 'SKUs Generated',
          description: `Generated ${generatedCount} new SKUs for products`,
          variant: "default"
        });
      }
    }, 100);
  };
  
  // Get status badge based on sync status
  const getSyncStatusBadge = (status: SyncItem['syncStatus']) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-500">Matched</Badge>;
      case 'unmatched':
        return <Badge className="bg-amber-500">Unmatched</Badge>;
      case 'new_to_shopify':
        return <Badge className="bg-blue-500">New to Shopify</Badge>;
      case 'not_in_inventory':
        return <Badge className="bg-gray-500">Not in Inventory</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl gold-gradient-text">Shopify Sync Preview</CardTitle>
              <CardDescription>
                Review and select items to sync with your Shopify store
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {syncItems.length === 0 && !isLoadingPreview ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-500 border-amber-500 hover:bg-amber-500/10"
                  onClick={() => {
                    toast({
                      title: "Retrying connection",
                      description: "Attempting to reconnect to Shopify...",
                    });
                    fetchSyncPreview();
                  }}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Retry Shopify Connection
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={fetchSyncPreview}
                  disabled={isLoadingPreview || isSyncing}
                >
                  {isLoadingPreview ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh Preview
                </Button>
              )}
              <Button 
                variant={selectedCount > 0 ? "default" : "outline"} 
                onClick={startSync}
                disabled={selectedCount === 0 || isSyncing}
                className={cn(
                  selectedCount > 0 ? "bg-gold hover:bg-gold/90 text-black" : ""
                )}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Sync Selected ({selectedCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading product data...</p>
            </div>
          ) : (
            <>
              {/* Connection error alert */}
              {syncItems.length === 0 && (
                <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <AlertTitle className="text-amber-800 dark:text-amber-500">Shopify Connection Issue</AlertTitle>
                  <AlertDescription className="text-amber-800/90 dark:text-amber-500/90">
                    <p>Unable to load products from Shopify. This could be due to:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Connection timeout (Shopify API might be slow to respond)</li>
                      <li>API credentials need to be refreshed</li>
                      <li>Shopify store may be under maintenance</li>
                    </ul>
                    <p className="mt-2">Please click the "Retry Shopify Connection" button to try again.</p>
                  </AlertDescription>
                </Alert>
              )}
              {/* Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select
                    value={filter}
                    onValueChange={setFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="matched">Matched</SelectItem>
                      <SelectItem value="unmatched">Unmatched</SelectItem>
                      <SelectItem value="new_to_shopify">New to Shopify</SelectItem>
                      <SelectItem value="not_in_inventory">Not in Inventory</SelectItem>
                      <SelectItem value="selected">Selected Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    className="whitespace-nowrap"
                    onClick={generateMissingSkus}
                    disabled={isSyncing}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Missing SKUs
                  </Button>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleAllItems(true)}
                    disabled={isSyncing}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleAllItems(false)}
                    disabled={isSyncing}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              {/* Progress bar during sync */}
              {isSyncing && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Syncing items...</span>
                    <span>{progressValue}%</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
              )}
              
              {/* Results summary */}
              {isSyncing && syncResults.details.length > 0 && (
                <div className="mb-6 bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-semibold">Sync Progress</h3>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Updated: {syncResults.updated}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="h-4 w-4 text-blue-500" />
                        Created: {syncResults.created}
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Skipped: {syncResults.skipped}
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Failed: {syncResults.failed}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {syncResults.details.map((detail, index) => (
                      <div key={index}>{detail}</div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Table of items */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No items found matching the current filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((item, index) => (
                        <TableRow 
                          key={index}
                          className={cn(
                            item.selected ? "bg-gold/5" : "",
                          )}
                        >
                          <TableCell>
                            <Checkbox 
                              checked={item.selected}
                              onCheckedChange={() => toggleItemSelection(index)}
                              disabled={isSyncing}
                            />
                          </TableCell>
                          <TableCell>
                            {getSyncStatusBadge(item.syncStatus)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {item.shopifyProduct ? item.shopifyProduct.title : (
                                item.inventoryItem ? item.inventoryItem.name : 'Unknown'
                              )}
                            </div>
                            {item.shopifyProduct?.option1 && (
                              <div className="text-xs text-muted-foreground">
                                {item.shopifyProduct.option1}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.generatedSku ? (
                              <div className="flex items-center">
                                <Badge variant="outline" className="font-mono">
                                  {item.generatedSku}
                                </Badge>
                                <Badge className="ml-2 bg-blue-500">New</Badge>
                              </div>
                            ) : (
                              <div className="font-mono">
                                {item.shopifyProduct?.sku || item.inventoryItem?.sku || '-'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.shopifyProduct ? (
                              <div>
                                ${item.shopifyProduct.price}
                                {item.inventoryItem && item.inventoryItem.price !== item.shopifyProduct.price && (
                                  <div className="text-xs text-amber-500">
                                    Will update to ${item.inventoryItem.price}
                                  </div>
                                )}
                              </div>
                            ) : (
                              item.inventoryItem ? `$${item.inventoryItem.price}` : '-'
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.shopifyProduct ? (
                              <div>
                                {item.shopifyProduct.quantity}
                                {item.inventoryItem && item.inventoryItem.quantity !== item.shopifyProduct.quantity && (
                                  <div className="text-xs text-amber-500">
                                    Will update to {item.inventoryItem.quantity}
                                  </div>
                                )}
                              </div>
                            ) : (
                              item.inventoryItem ? item.inventoryItem.quantity : '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-2">
                              {item.syncStatus === 'new_to_shopify' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openSkuGenerator(item)}
                                  disabled={isSyncing}
                                  title="Generate SKU"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              {item.syncStatus === 'matched' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      disabled={isSyncing}
                                      title="Sync Options"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Sync Options</DialogTitle>
                                      <DialogDescription>
                                        Select which data to sync for this product
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <div className="flex items-center justify-between py-2">
                                        <div className="flex flex-col">
                                          <label className="text-sm font-medium leading-none">
                                            Update Price
                                          </label>
                                          <p className="text-sm text-muted-foreground">
                                            Sync price from inventory to Shopify
                                          </p>
                                        </div>
                                        <Checkbox 
                                          checked={item.updatePrice}
                                          onCheckedChange={(checked) => {
                                            setSyncItems(prev => 
                                              prev.map(i => 
                                                i === item 
                                                  ? { ...i, updatePrice: checked === true } 
                                                  : i
                                              )
                                            );
                                          }}
                                        />
                                      </div>
                                      <div className="flex items-center justify-between py-2">
                                        <div className="flex flex-col">
                                          <label className="text-sm font-medium leading-none">
                                            Update Stock
                                          </label>
                                          <p className="text-sm text-muted-foreground">
                                            Sync inventory quantity to Shopify
                                          </p>
                                        </div>
                                        <Checkbox 
                                          checked={item.updateStock}
                                          onCheckedChange={(checked) => {
                                            setSyncItems(prev => 
                                              prev.map(i => 
                                                i === item 
                                                  ? { ...i, updateStock: checked === true } 
                                                  : i
                                              )
                                            );
                                          }}
                                        />
                                      </div>
                                      <div className="flex items-center justify-between py-2">
                                        <div className="flex flex-col">
                                          <label className="text-sm font-medium leading-none">
                                            Update Images
                                          </label>
                                          <p className="text-sm text-muted-foreground">
                                            Sync product images to Shopify
                                          </p>
                                        </div>
                                        <Checkbox 
                                          checked={item.updateImages}
                                          onCheckedChange={(checked) => {
                                            setSyncItems(prev => 
                                              prev.map(i => 
                                                i === item 
                                                  ? { ...i, updateImages: checked === true } 
                                                  : i
                                              )
                                            );
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSyncItems(prev => 
                                    prev.map(i => 
                                      i === item 
                                        ? { ...i, selected: !i.selected } 
                                        : i
                                    )
                                  );
                                }}
                                disabled={isSyncing}
                                title={item.selected ? "Deselect" : "Select"}
                              >
                                {item.selected ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination and Items Per Page */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                    >
                      <SelectTrigger className="w-[80px] h-8">
                        <SelectValue placeholder="25" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || isSyncing}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show pagination numbers around current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={i}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="icon"
                          onClick={() => goToPage(pageNum)}
                          disabled={isSyncing}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages || isSyncing}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* SKU Generator Dialog */}
      <Dialog open={showSkuGenerator} onOpenChange={setShowSkuGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate SKU</DialogTitle>
            <DialogDescription>
              Create a standardized SKU for this product using the format [Brand]-[Strain]-[Tier]-[Weight]
            </DialogDescription>
          </DialogHeader>
          
          <Form {...skuForm}>
            <form onSubmit={skuForm.handleSubmit(onSkuFormSubmit)} className="space-y-6">
              <FormField
                control={skuForm.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brandOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the brand for this product
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={skuForm.control}
                name="strain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strain Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="BBMUF" 
                        {...field} 
                        maxLength={6}
                        className="uppercase"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a short code for the strain (2-6 letters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={skuForm.control}
                  name="tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tierOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={skuForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select weight" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {weightOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-2">
                <div className="bg-muted rounded p-2 text-center mb-4">
                  <span className="font-mono text-lg">
                    {skuForm.watch('brand')}-{skuForm.watch('strain')?.toUpperCase() || '___'}-{skuForm.watch('tier')}-{skuForm.watch('weight')}
                  </span>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowSkuGenerator(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Generate SKU</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Removed the broken confirm dialog as we're bypassing it now */}
    </div>
  );
};

export default ShopifySyncPreview;