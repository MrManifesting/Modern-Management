import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InsertItem, Item } from "@shared/schema";
import SimpleItemForm from "@/components/inventory/simple-item-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Check, AlertTriangle } from "lucide-react";
import { createPrintLabels } from "@/components/inventory/auto-print-labels";

// Define ItemForm type for form handling
type ItemForm = {
  name: string;
  description: string;
  brand: string;
  sku: string;
  costPrice: string;
  basePrice: string;
  salePrice: string;
  wholesalePrice: string;
  category: string;
  weight: string;
  quantity: string;
  status: string;
  imageUrl: string;
  barcode: string;
  qrCode: string;
  dimensions: string;
  condition: string;
  tags: string[];
  thcaPercentage: string;
  strainType: string;
  itemType: string;
  visibility: string;
  marketplace: any[];
};

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: Item | null;
  initialName?: string | null;
}

export default function AddItemModal({
  isOpen,
  onClose,
  editItem = null,
  initialName = null,
}: AddItemModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editItem;

  const createMutation = useMutation({
    mutationFn: async (data: InsertItem) => {
      // Create FormData for sending files
      const formData = new FormData();
      
      // Add all form fields to formData
      Object.entries(data).forEach(([key, value]) => {
        // Handle arrays and objects by stringifying them
        if (Array.isArray(value) || typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
      
      if (isEditing && editItem) {
        const res = await apiRequest("PATCH", `/api/items/${editItem.id}`, formData, true);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/items", formData, true);
        return res.json();
      }
    },
    onSuccess: async (newItem: Item, variables: InsertItem) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      
      // Item created successfully
      if (!isEditing && newItem) {
        toast({
          title: "Item Created",
          description: `${newItem.name} has been added to inventory`,
        });
      }
      
      // Auto-print labels for new items only
      if (!isEditing && newItem && variables.quantity && variables.quantity > 0) {
        // Delay to allow modal to close first
        setTimeout(() => {
          const printLabels = createPrintLabels(newItem, variables.quantity || 1);
          const success = printLabels.openPrintPreview(variables.quantity || 1);
          
          if (!success) {
            toast({
              title: "Print Blocked",
              description: "Please allow popups to auto-print labels",
              variant: "destructive"
            });
          }
        }, 500);
      }
      
      toast({
        title: isEditing ? "Item updated" : "Item created",
        description: isEditing
          ? "The item has been successfully updated."
          : `Item added to inventory. ${!isEditing && variables.quantity ? `Printing ${variables.quantity} label${variables.quantity > 1 ? 's' : ''}...` : ''}`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEditing
          ? "Failed to update the item. Please try again."
          : "Failed to create the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Prepare default values for the form
  const getDefaultValues = () => {
    if (isEditing && editItem) {
      // Convert database item to form format
      return {
        name: editItem.name || "",
        description: editItem.description || "",
        sku: editItem.sku || "",
        brand: editItem.brand || "Gold Standard",
        costPrice: editItem.costPrice?.toString() || "0",
        basePrice: editItem.basePrice?.toString() || "0",
        salePrice: editItem.salePrice?.toString() || "",
        wholesalePrice: editItem.wholesalePrice?.toString() || "",
        category: editItem.category || "Bulk Flower",
        quantity: editItem.quantity || 1,
        status: editItem.status || "draft",
        weight: editItem.weight || "",
        barcode: editItem.barcode || "",
        qrCode: editItem.qrCode || "",
        dimensions: editItem.dimensions || "",
        condition: editItem.condition || "New",
        tags: Array.isArray(editItem.tags) ? editItem.tags : [],
        thcaPercentage: "",
        strainType: editItem.strainType || "",
        itemType: editItem.itemType || "standard",
        visibility: editItem.visibility || "visible"
      };
    } else if (initialName) {
      // For voice commands with item name
      return {
        name: initialName,
        description: "",
        basePrice: "0",
        costPrice: "0",
        category: "Bulk Flower",
        brand: "Gold Standard",
        condition: "New",
        sku: "",
        itemType: "standard",
        quantity: 1,
        status: "draft",
        tags: [],
        visibility: "visible"
      };
    } else {
      // Default values for new items
      return {
        name: "",
        description: "",
        basePrice: "0",
        costPrice: "0",
        category: "Bulk Flower",
        brand: "Gold Standard",
        condition: "New",
        sku: "",
        itemType: "standard",
        quantity: 1,
        status: "draft",
        tags: [],
        visibility: "visible"
      };
    }
    return undefined;
  };

  const [shopifySyncStatus, setShopifySyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [shopifySyncMessage, setShopifySyncMessage] = useState<string>('');
  
  const handleSubmit = async (data: ItemForm) => {
    // Add the marketplace field if not present
    if (!data.marketplace || !Array.isArray(data.marketplace)) {
      data.marketplace = [];
    }
    
    // Add shopify to marketplace list if not already there
    if (!data.marketplace.includes('shopify')) {
      data.marketplace.push('shopify');
    }
    
    setShopifySyncStatus('syncing');
    createMutation.mutate({
      ...data,
      quantity: typeof data.quantity === 'string' ? parseInt(data.quantity) || 0 : data.quantity || 0
    }, {
      onSuccess: async (newItem) => {
        // After item is created/updated, attempt to sync with Shopify
        try {
          if (newItem && newItem.id) {
            setShopifySyncStatus('syncing');
            setShopifySyncMessage('Syncing with Shopify...');
            
            // Find the marketplace ID for Shopify
            const marketplacesResponse = await apiRequest('GET', '/api/marketplaces');
            const marketplaces = await marketplacesResponse.json();
            const shopifyMarketplace = marketplaces.find((m: any) => 
              m.type.toLowerCase() === 'shopify' && m.isConnected);
            
            if (shopifyMarketplace) {
              // Push the item to Shopify
              const pushResponse = await apiRequest('POST', 
                `/api/items/${newItem.id}/push-to-marketplace/${shopifyMarketplace.id}`,
                { pushEnabled: true }
              );
              const pushResult = await pushResponse.json();
              
              if (pushResult.success) {
                setShopifySyncStatus('success');
                setShopifySyncMessage('Successfully synced with Shopify');
                toast({
                  title: "Shopify Sync Successful",
                  description: "Item has been pushed to Shopify",
                  variant: "default"
                });
              } else {
                setShopifySyncStatus('error');
                setShopifySyncMessage(pushResult.message || 'Error syncing with Shopify');
                toast({
                  title: "Shopify Sync Warning",
                  description: pushResult.message || "Item saved but not synced to Shopify",
                  variant: "destructive"
                });
              }
            } else {
              setShopifySyncStatus('error');
              setShopifySyncMessage('No connected Shopify marketplace found');
            }

            // Automatic photo tagging for new items
            try {
              const tagResponse = await fetch('/api/media/tag-photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  itemId: newItem.id,
                  itemName: newItem.name,
                  itemSku: newItem.sku,
                  photoCount: 5
                })
              });
              
              const tagResult = await tagResponse.json();
              if (tagResult.success && tagResult.taggedCount > 0) {
                toast({
                  title: "Photos Tagged",
                  description: `${tagResult.taggedCount} photos automatically tagged with item details`,
                  variant: "default"
                });
              }
            } catch (error) {
              console.warn('Photo tagging failed:', error);
            }
          }
        } catch (error) {
          setShopifySyncStatus('error');
          setShopifySyncMessage('Error connecting to Shopify');
          console.error('Shopify sync error:', error);
        }
      }
    });
  };

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      createMutation.reset();
    }
  }, [isOpen, createMutation]);

  // Reset Shopify sync status when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setShopifySyncStatus('idle');
      setShopifySyncMessage('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the item details below" : "Enter the details for your new inventory item"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Shopify sync status indicator */}
        {shopifySyncStatus !== 'idle' && (
          <div className={`p-3 mb-3 rounded-md flex items-center gap-2 ${
            shopifySyncStatus === 'syncing' ? 'bg-blue-50 text-blue-700' :
            shopifySyncStatus === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {shopifySyncStatus === 'syncing' && (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
            )}
            {shopifySyncStatus === 'success' && <Check className="w-4 h-4" />}
            {shopifySyncStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm">{shopifySyncMessage || `Shopify sync ${shopifySyncStatus}`}</span>
            {shopifySyncStatus === 'success' && (
              <ShoppingCart className="w-4 h-4 ml-auto" />
            )}
          </div>
        )}
        
        <div className="mt-4">
          <SimpleItemForm
            defaultValues={getDefaultValues()}
            onSubmit={(data) => handleSubmit({
              ...data,
              description: data.description || '',
              brand: data.brand || '',
              sku: data.sku || '',
              costPrice: data.costPrice || '',
              basePrice: data.basePrice || '',
              salePrice: data.salePrice || '',
              wholesalePrice: data.wholesalePrice || '',
              weight: data.weight || '',
              quantity: data.quantity || "1",
              strainType: data.strainType || '',
              imageUrl: data.imageUrl || '',
              barcode: data.barcode || '',
              qrCode: data.qrCode || '',
              dimensions: data.dimensions || '',
              condition: data.condition || '',
              tags: data.tags || [],
              thcaPercentage: data.thcaPercentage || '',
              itemType: data.itemType || '',
              visibility: data.visibility || '',
              marketplace: data.marketplace || []
            })}
            isLoading={createMutation.isPending || shopifySyncStatus === 'syncing'}
            isEditing={isEditing}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
