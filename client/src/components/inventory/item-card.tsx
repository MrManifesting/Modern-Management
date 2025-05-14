import { useState } from "react";
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
  Layers
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

type ItemCardProps = {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
};

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isDndBreakdownOpen, setIsDndBreakdownOpen] = useState(false);
  const [, navigate] = useLocation();

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
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('.dropdown-menu')) {
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

  return (
    <>
      <Card 
        className={`group overflow-hidden transition-all cursor-pointer ${
          item.quantity <= 0 ? 'border-red-200 bg-red-50/30' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleViewDetails}
      >
        <div className="relative h-48 bg-gray-200">
          {/* Item image carousel */}
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
            <span className={`rounded-full px-2 py-1 text-xs font-medium text-white
              ${Number(item.quantity || 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
              {Number(item.quantity || 0) > 0 ? `In Stock (${Number(item.quantity)})` : 'Out of Stock'}
            </span>
            
            {/* Marketplace badge */}
            {item.marketplace && Array.isArray(item.marketplace) && item.marketplace.length > 0 && (
              <span className={`rounded-full ${getMarketplaceBadgeClass(
                typeof item.marketplace[0] === 'string' 
                  ? item.marketplace[0] 
                  : (item.marketplace[0] as any)?.name || 'unknown'
              )} px-2 py-1 text-xs font-medium text-white`}>
                {typeof item.marketplace[0] === 'string' 
                  ? item.marketplace[0]
                  : (item.marketplace[0] as any)?.name || 'unknown'}
              </span>
            )}
            
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
                  {/* Show breakdown option if item has weight info */}
                  {item.weight && item.weight > 0 && (
                    <DropdownMenuItem onClick={() => setIsBreakdownModalOpen(true)}>
                      <PackageOpen className="mr-2 h-4 w-4" />
                      Quick Breakdown
                    </DropdownMenuItem>
                  )}
                  {/* Only show View in Store for items that have a SKU and are listed */}
                  {item.sku && item.status === 'listed' && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById(`shopify-preview-${item.id}`)?.click();
                      }}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      View in Shopify Store
                    </DropdownMenuItem>
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
          <BarcodePrint item={item} onClose={() => setIsPrintModalOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Quick Breakdown Dialog */}
      <QuickBreakdown 
        item={item} 
        isOpen={isBreakdownModalOpen} 
        onClose={() => setIsBreakdownModalOpen(false)} 
      />

      {/* Hidden trigger for shopify preview */}
      <span className="hidden" id={`shopify-preview-${item.id}`}>
        <ShopifyStorePreview item={item} />
      </span>
    </>
  );
}