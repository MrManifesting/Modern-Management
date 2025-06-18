import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ItemForm, Item } from "@shared/schema";
import ItemFormComponent from "@/components/inventory/item-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Check, AlertTriangle } from "lucide-react";

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
    mutationFn: async (data: ItemForm) => {
      // Create FormData for sending files
      const formData = new FormData();
      
      // Add all form fields to formData
      Object.entries(data).forEach(([key, value]) => {
        // Handle arrays and objects by stringifying them
        if (key === "files") {
          // Add each file separately
          if (data.files) {
            data.files.forEach((file: File) => {
              formData.append("files", file);
            });
          }
        } else if (Array.isArray(value) || typeof value === "object") {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: isEditing ? "Item updated" : "Item created",
        description: isEditing
          ? "The item has been successfully updated."
          : "The item has been successfully added to your inventory.",
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
      return {
        ...editItem,
        // Ensure these fields are properly converted from JSON if stored as strings
        tags: Array.isArray(editItem.tags) ? editItem.tags : [],
        marketplace: Array.isArray(editItem.marketplace) ? editItem.marketplace : [],
        aiTags: Array.isArray(editItem.aiTags) ? editItem.aiTags : [],
      };
    } else if (initialName) {
      // For voice commands with item name
      return {
        name: initialName,
        description: "",
        basePrice: 0,
        category: "Electronics",
        condition: "New",
        sku: "",
        itemType: "regular",
        quantity: 1,
        tags: [],
        marketplace: [],
        aiTags: []
      };
    }
    return undefined;
  };

  const [shopifySyncStatus, setShopifySyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [shopifySyncMessage, setShopifySyncMessage] = useState<string>('');
  
  const handleSubmit = (data: ItemForm) => {
    // Add the marketplace field if not present
    if (!data.marketplace || !Array.isArray(data.marketplace)) {
      data.marketplace = [];
    }
    
    // Add shopify to marketplace list if not already there
    if (!data.marketplace.includes('shopify')) {
      data.marketplace.push('shopify');
    }
    
    setShopifySyncStatus('syncing');
    createMutation.mutate(data, {
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
          <ItemFormComponent
            defaultValues={getDefaultValues()}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || shopifySyncStatus === 'syncing'}
            isEditing={isEditing}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
