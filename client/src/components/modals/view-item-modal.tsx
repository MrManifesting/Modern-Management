import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Package, ExternalLink, Trash2, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ViewItemModalProps {
  item: any; // Accept any item type to handle both Item and EnhancedItem
  trigger?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface ItemImage {
  url: string;
  source: 'direct' | 'shopify' | 'telegram';
  type: string;
  alt?: string;
  filename?: string;
}

export default function ViewItemModal({ item, trigger, onEdit, onDelete }: ViewItemModalProps) {
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch item images from multiple sources
  const { data: imageData } = useQuery({
    queryKey: ['/api/media/item-images', item.id],
    enabled: open && !!item.id,
  });

  const images: any[] = (imageData as any)?.images || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/enhanced'] });
      toast({
        title: "Item Deleted",
        description: "The item has been successfully removed from your inventory."
      });
      setDeleteConfirmOpen(false);
      setOpen(false);
      onDelete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the item. Please try again.",
        variant: "destructive"
      });
    }
  });

  const formatPrice = (price: string | number | null) => {
    if (!price || price === '0' || price === 0 || price === 'null') return 'No Price';
    
    const priceStr = String(price).replace(/[$,\s]/g, '');
    const num = parseFloat(priceStr);
    
    if (isNaN(num) || num <= 0) return 'No Price';
    return `$${num.toFixed(2)}`;
  };

  const getShopifyUrl = (item: any) => {
    if (item.shopifyId) {
      return `https://mrlisterscurations.myshopify.com/admin/products/${item.shopifyId}`;
    }
    return `https://mrlisterscurations.myshopify.com/admin/products?query=${encodeURIComponent(item.handle || item.name)}`;
  };

  // Parse weight from item name if weight field is null or invalid
  const getDisplayWeight = (item: any) => {
    // If we have a valid weight field, use it
    if (item.weight && item.weight !== 'null' && item.weight.trim() !== '') {
      let cleanWeight = item.weight.trim();
      
      // Intelligent weight cleaning to remove trailing "g" from pound/ounce values
      // but preserve legitimate gram measurements
      if (cleanWeight.endsWith('g')) {
        // Keep legitimate gram values
        if (cleanWeight.endsWith('3.5g') || cleanWeight.endsWith('1g') || cleanWeight.endsWith('7g') || cleanWeight.endsWith('14g') || cleanWeight.endsWith('28g')) {
          return cleanWeight;
        }
        // Remove trailing "g" from pound/ounce values
        if (cleanWeight.includes('pound') || cleanWeight.includes('ounce')) {
          cleanWeight = cleanWeight.slice(0, -1).trim();
        }
      }
      
      return cleanWeight;
    }

    // Parse weight from item name for pound variants
    const name = item.name || '';
    const nameLower = name.toLowerCase();

    // Check for pound variants in parentheses: "(1 pound)", "(half pound)", etc.
    const poundMatch = name.match(/\(([^)]*pound[^)]*)\)/i);
    if (poundMatch) {
      const weightText = poundMatch[1].trim();
      if (weightText.includes('1 pound') || weightText === 'pound') {
        return '1 pound';
      } else if (weightText.includes('half pound')) {
        return 'half pound';  
      } else if (weightText.includes('quarter pound')) {
        return 'quarter pound';
      }
      return weightText; // Return the parsed weight text
    }

    // Check for other weight indicators in the name
    if (nameLower.includes('1 pound') || nameLower.includes('one pound')) {
      return '1 pound';
    } else if (nameLower.includes('half pound') || nameLower.includes('0.5 pound')) {
      return 'half pound';
    } else if (nameLower.includes('quarter pound') || nameLower.includes('0.25 pound')) {
      return 'quarter pound';
    } else if (nameLower.includes('ounce')) {
      return '1 ounce';
    } else if (nameLower.includes('3.5g') || nameLower.includes('eighth')) {
      return '3.5g (eighth)';
    } else if (nameLower.includes('1g') || nameLower.includes('gram')) {
      return '1g';
    }

    // Fallback to "Not specified" if we can't determine weight
    return 'Not specified';
  };

  const handleDelete = () => {
    console.log('ViewItemModal handleDelete called for item:', item.id, item.name);
    if (item.id) {
      deleteMutation.mutate(item.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            Complete details for this inventory item
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Item Images */}
          {images.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Images ({images.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.alt || `${item.name} image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLDivElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400" style={{ display: 'none' }}>
                        <Package className="w-8 h-8" />
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="absolute bottom-1 right-1 text-xs"
                    >
                      {image.source}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">SKU:</span>
                  <p className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {item.sku || 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Brand:</span>
                  <p className="font-medium">{item.brand || 'No brand'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Category:</span>
                  <p className="font-medium">{item.category || 'No category'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Weight:</span>
                  <p className="font-medium">{getDisplayWeight(item)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                    {item.status || 'draft'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <p className="font-medium">
                    {item.quantity !== null && item.quantity !== undefined ? item.quantity : 0} in stock
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Pricing Tiers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Cost:</span>
                  <p className="font-semibold text-red-600">
                    {formatPrice(item.costPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Bulk Price:</span>
                  <p className="font-semibold text-green-600">
                    {formatPrice(item.bulkPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Distro 25lbs+:</span>
                  <p className="font-semibold text-blue-600">
                    {formatPrice(item.distroPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Master 50lbs+:</span>
                  <p className="font-semibold text-purple-600">
                    {formatPrice(item.masterPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Master 100lbs+:</span>
                  <p className="font-semibold text-indigo-600">
                    {formatPrice(item.master100Price)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Sale Price:</span>
                  <p className="font-semibold text-orange-600">
                    {formatPrice(item.salePrice)}
                  </p>
                </div>
              </div>
              
              {/* Legacy pricing for compatibility */}
              <div className="border-t pt-4">
                <h5 className="text-sm font-medium text-gray-500 mb-2">Legacy Pricing</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Base Price:</span>
                    <p className="font-semibold text-gray-700">
                      {formatPrice(item.basePrice)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Wholesale Price:</span>
                    <p className="font-semibold text-gray-700">
                      {formatPrice(item.wholesalePrice)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cannabis Details */}
          {(item.thcaPercentage || item.strainType || item.tier) && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Cannabis Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {item.thcaPercentage && (
                    <div>
                      <span className="text-sm text-gray-600">THCa %:</span>
                      <Badge variant="secondary">{item.thcaPercentage}</Badge>
                    </div>
                  )}
                  {item.strainType && (
                    <div>
                      <span className="text-sm text-gray-600">Strain Type:</span>
                      <p className="font-medium">{item.strainType}</p>
                    </div>
                  )}
                  {item.tier && (
                    <div>
                      <span className="text-sm text-gray-600">Quality Tier:</span>
                      <p className="font-medium">{item.tier}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {item.description && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          {(item.strainBannerText || item.coasLink) && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Additional Details</h4>
                <div className="space-y-3">
                  {item.strainBannerText && (
                    <div>
                      <span className="text-sm text-gray-600">Strain Info:</span>
                      <p className="text-sm text-gray-700">{item.strainBannerText}</p>
                    </div>
                  )}
                  {item.coasLink && (
                    <div>
                      <span className="text-sm text-gray-600">COAs:</span>
                      <a 
                        href={item.coasLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Certificate of Analysis
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => window.open(getShopifyUrl(item), '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View on Shopify
            </Button>
            
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Item
              </Button>
            )}
            
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Item
            </Button>
          </div>

          {/* Delete Confirmation Dialog */}
          {deleteConfirmOpen && (
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{item.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}