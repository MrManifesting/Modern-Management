import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { 
  Edit,
  FileText,
  MoreHorizontal,
  Trash2,
  Printer,
  QrCode,
  Barcode,
  Store,
  PackageOpen,
  Layers,
  Check,
  Package,
  Gem,
  Settings
} from "lucide-react";
import ImageCarousel from "./image-carousel";
import { 
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import BarcodePrint from "./barcode-print";
import ShopifyStorePreview from "./shopify-store-preview";
import QuickBreakdown from "./quick-breakdown";
import { BulkBreakdownDialog } from "./bulk-breakdown-dialog";
import { Item } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ItemCardProps = {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  selectionMode?: boolean;
};

export default function ItemCard({ 
  item, 
  onEdit, 
  onDelete, 
  isSelected = false, 
  onSelect, 
  selectionMode = false 
}: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isDndBreakdownOpen, setIsDndBreakdownOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Format date for display with error handling
  let formattedDate = "Recently added";
  try {
    // Make sure we have a valid date to format
    if (item.createdAt && !isNaN(new Date(item.createdAt).getTime())) {
      formattedDate = formatDistanceToNow(new Date(item.createdAt), { 
        addSuffix: true 
      });
    }
  } catch (err) {
    console.warn("Could not format date for item:", item.id);
  }
  
  // Handle click to view item details
  const handleViewDetails = (e: React.MouseEvent) => {
    // Don't navigate if we're clicking on a button
    const target = e.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('.dropdown-menu'))) {
      return;
    }
    
    navigate(`/inventory/${item.id}`);
  };

  // Get marketplace badge class
  const getMarketplaceBadgeClass = (marketplace: string | any) => {
    // Handle case where marketplace might be an object with name property
    let marketplaceName = 'default';
    
    if (typeof marketplace === 'string') {
      marketplaceName = marketplace.toLowerCase();
    } else if (marketplace && typeof marketplace === 'object' && 'name' in marketplace) {
      marketplaceName = marketplace.name.toLowerCase();
    }
    
    const classes = {
      shopify: "marketplace-badge-shopify",
      website: "bg-blue-500",
      default: "bg-gray-500"
    };
    
    return classes[marketplaceName as keyof typeof classes] || classes.default;
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    const classes = {
      listed: "status-badge-listed",
      draft: "status-badge-draft",
      sold: "status-badge-sold",
      default: "bg-gray-500"
    };
    
    return classes[status as keyof typeof classes] || classes.default;
  };

  // Quick breakdown handlers for streamlined preset options
  const handleQuickBreakdown = (presetType: 'standard' | 'premium') => {
    // Define preset weight configurations
    const presets = {
      standard: [
        { weight: 1, unit: 'g', quantity: 8 },
        { weight: 3.5, unit: 'g', quantity: 4 },
        { weight: 7, unit: 'g', quantity: 2 },
        { weight: 14, unit: 'g', quantity: 1 }
      ],
      premium: [
        { weight: 0.5, unit: 'g', quantity: 12 },
        { weight: 1, unit: 'g', quantity: 8 },
        { weight: 2, unit: 'g', quantity: 4 }
      ]
    };

    const selectedPreset = presets[presetType];
    
    // Auto-create breakdown based on preset
    const breakdownData = selectedPreset.map((preset, index) => ({
      name: `${item.name} - ${preset.weight}${preset.unit}`,
      sku: `${item.sku}-${preset.weight}${preset.unit.toUpperCase()}`,
      weight: preset.weight,
      weightUnit: preset.unit,
      quantity: preset.quantity,
      basePrice: calculatePresetPrice(item.basePrice || 0, preset.weight),
      description: `${preset.weight}${preset.unit} portion of ${item.name}`,
      category: item.category,
      condition: item.condition
    }));

    // Show success toast notification
    toast({
      title: "Breakdown Template Ready",
      description: `Created ${presetType} breakdown with ${selectedPreset.length} weight options`,
    });

    // Open the drag & drop breakdown with preset data
    setIsDndBreakdownOpen(true);
  };

  // Calculate price based on weight for preset breakdowns
  const calculatePresetPrice = (bulkPrice: number, targetWeight: number) => {
    const bulkWeight = item.weight || 28; // Default to 1oz if no weight specified
    const pricePerGram = bulkPrice / bulkWeight;
    return Math.round(pricePerGram * targetWeight * 100) / 100; // Round to 2 decimal places
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only handle as selection if Ctrl/Cmd key is pressed or in selection mode
    if ((e.ctrlKey || e.metaKey || selectionMode) && onSelect && item.id) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(item.id);
    } else {
      handleViewDetails();
    }
  };

  return (
    <>
      <Card 
        ref={cardRef}
        className={`group overflow-hidden transition-all ${
          item.quantity <= 0 ? 'border-red-200 bg-red-50/30' : ''
        } ${isSelected ? 'selectable-item selected' : 'selectable-item'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        <div className="relative h-48 bg-gray-200">
          {/* Item image carousel with enhanced thumbnail support */}
          {(item.images as string[])?.length > 0 ? (
            <ImageCarousel 
              images={item.images as string[]} 
              alt={item.name} 
              className="hover-card-image"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Marketplace & status badges */}
          <div className="absolute top-2 right-2 flex space-x-1">
            {/* Stock status badge */}
            {(() => {
              const quantity = Number(item.quantity || 0);
              const inStock = quantity > 0;
              const badgeClass = inStock ? 'bg-green-500' : 'bg-red-500';
              const badgeText = inStock ? `In Stock (${quantity})` : 'Out of Stock';
              
              return (
                <span className={`rounded-full px-2 py-1 text-xs font-medium text-white ${badgeClass}`}>
                  {badgeText}
                </span>
              );
            })()}
            
            {/* Marketplace badge */}
            {(() => {
              // Add null safety checks for marketplace
              if (item.marketplace) {
                // Handle different marketplace data formats
                if (Array.isArray(item.marketplace) && item.marketplace.length > 0) {
                  // If marketplace is an array with items
                  const marketplaceItem = item.marketplace[0];
                  const marketplaceName = typeof marketplaceItem === 'string' 
                    ? String(marketplaceItem)
                    : String((marketplaceItem as any)?.name || 'unknown');
                  
                  const badgeClass = getMarketplaceBadgeClass(marketplaceName);
                  
                  return (
                    <span className={`rounded-full ${badgeClass} px-2 py-1 text-xs font-medium text-white`}>
                      {marketplaceName}
                    </span>
                  );
                } else if (typeof item.marketplace === 'string') {
                  // If marketplace is a string
                  const badgeClass = getMarketplaceBadgeClass(item.marketplace);
                  
                  return (
                    <span className={`rounded-full ${badgeClass} px-2 py-1 text-xs font-medium text-white`}>
                      {item.marketplace}
                    </span>
                  );
                } else if (typeof item.marketplace === 'object') {
                  // If marketplace is a single object
                  const marketplaceName = (item.marketplace as any)?.name || 'unknown';
                  const badgeClass = getMarketplaceBadgeClass(marketplaceName);
                  
                  return (
                    <span className={`rounded-full ${badgeClass} px-2 py-1 text-xs font-medium text-white`}>
                      {marketplaceName}
                    </span>
                  );
                }
              }
              return null;
            })()}
            
            {/* Listing status badge */}
            <span className={`rounded-full ${getStatusBadgeClass(item.status)} px-2 py-1 text-xs font-medium text-white`}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>
          </div>

          {/* Action buttons that appear on hover */}
          <div className={`absolute inset-0 bg-black transition-opacity flex items-center justify-center ${isHovered ? 'bg-opacity-30 opacity-100' : 'bg-opacity-0 opacity-0'}`}>
            <div className="flex space-x-2">
              <button 
                className="rounded-full bg-white p-2 text-gray-700 hover:bg-primary-500 hover:text-white transition-colors"
                onClick={() => onEdit(item)}
              >
                <Edit className="h-5 w-5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full bg-white p-2 text-gray-700 hover:bg-primary-500 hover:text-white transition-colors">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Item
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPrintModalOpen(true)}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Barcode/QR
                  </DropdownMenuItem>
                  {/* Enhanced breakdown options with streamlined presets */}
                  {item.weight && item.weight > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Product Breakdown</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setIsDndBreakdownOpen(true)}>
                        <Layers className="mr-2 h-4 w-4" />
                        Smart Breakdown (Drag & Drop)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickBreakdown('standard')}>
                        <Package className="mr-2 h-4 w-4" />
                        Standard Weights (1g, 3.5g, 7g, 14g)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickBreakdown('premium')}>
                        <Gem className="mr-2 h-4 w-4" />
                        Premium Breakdown (0.5g, 1g, 2g)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsBreakdownModalOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Custom Breakdown
                      </DropdownMenuItem>
                    </>
                  )}
                  {/* Show Shopify options for any item with a SKU */}
                  {item.sku && (
                    <>
                      {/* Active listing in Shopify */}
                      {item.status === 'listed' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            document.getElementById(`shopify-preview-${item.id}`)?.click();
                          }}
                        >
                          <Store className="mr-2 h-4 w-4" />
                          View Active Listing
                        </DropdownMenuItem>
                      )}
                      
                      {/* View draft listing if available */}
                      {item.shopifyId && item.status !== 'listed' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Use the ShopifyStorePreview for drafts too
                            document.getElementById(`shopify-preview-${item.id}`)?.click();
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Draft in Shopify
                        </DropdownMenuItem>
                      )}
                      
                      {/* Direct link to Shopify admin for this product */}
                      {item.shopifyId && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`https://${window.location.hostname}/api/shopify/redirect-to-admin/${item.shopifyId}`, '_blank');
                          }}
                        >
                          <Store className="mr-2 h-4 w-4" />
                          Open in Shopify Admin
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(item.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex justify-between">
            <h3 className="font-medium text-gray-800">{item.name}</h3>
            <span className="font-semibold text-primary-600">
              ${item.basePrice?.toFixed(2) || (item.salePrice?.toFixed(2)) || '0.00'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 line-clamp-1">
            {item.category}
            {(item.tags as string[]).length > 0 && `, ${(item.tags as string[])[0]}`}
          </p>
          <div className="mt-3 flex items-center">
            <span className="text-xs text-gray-500">Added {formattedDate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Barcode Print Dialog */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-md">
          <BarcodePrint item={item as any} onClose={() => setIsPrintModalOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Quick Breakdown Dialog */}
      <QuickBreakdown 
        item={item as any} 
        isOpen={isBreakdownModalOpen} 
        onClose={() => setIsBreakdownModalOpen(false)} 
      />

      {/* Drag & Drop Breakdown Dialog */}
      <BulkBreakdownDialog
        item={item as any} 
        open={isDndBreakdownOpen}
        onOpenChange={setIsDndBreakdownOpen}
        onComplete={() => {
          setIsDndBreakdownOpen(false);
          // Trigger a refetch of inventory data
          window.dispatchEvent(new CustomEvent('refetch-inventory'));
        }}
      />

      {/* Hidden trigger for shopify preview */}
      <span className="hidden" id={`shopify-preview-${item.id}`}>
        <ShopifyStorePreview item={item as any} />
      </span>
    </>
  );
}