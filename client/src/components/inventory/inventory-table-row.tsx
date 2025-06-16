import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  CircleDollarSign, 
  AlertCircle, 
  ImageIcon,
  FileText 
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  basePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  salePrice: number;
  costPrice: number;
  sku: string;
  barcode: string;
  quantity: number;
  weight: string;
  images: string[];
  mediaFiles: string[];
  status: string;
  description: string;
  imageUrl: string | null;
  marketplace: any[];
  shopifyId: string | null;
  shopifySyncStatus: string;
  unit: string;
}

interface InventoryTableRowProps {
  item: Product;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function InventoryTableRow({ 
  item, 
  isSelected, 
  selectionMode, 
  onSelect, 
  onView, 
  onEdit, 
  onDelete 
}: InventoryTableRowProps) {
  // Render product thumbnail with authentic image handling
  const renderThumbnail = () => {
    // Check for Shopify CDN images first (authentic product photos)
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const imageUrl = item.images[0];
      return (
        <div className="relative group">
          <img 
            src={imageUrl} 
            alt={item.name}
            className="w-16 h-16 object-cover rounded-lg border-2 border-amber-200 hover:border-amber-400 transition-all duration-200 cursor-pointer shadow-sm"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200" />
        </div>
      );
    }
    
    // Check for media files from uploads
    if (item.mediaFiles && item.mediaFiles.length > 0) {
      return (
        <div className="relative group">
          <img 
            src={`/uploads/${item.mediaFiles[0]}`} 
            alt={item.name}
            className="w-16 h-16 object-cover rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all duration-200 cursor-pointer shadow-sm"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200" />
        </div>
      );
    }
    
    // Show placeholder for items without images
    return (
      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
        <ImageIcon className="h-6 w-6 text-gray-500" />
      </div>
    );
  };

  // Render authentic Shopify pricing with color-coded tiers
  const renderPrice = () => {
    // Use authentic Shopify pricing data with proper fallback hierarchy
    const price = Number(item.price || item.basePrice || item.retailPrice || 0);
    
    if (price > 0) {
      // Color code based on authentic price ranges from MrListersCurations store
      let colorClass = "text-blue-600";
      let bgClass = "bg-blue-50";
      
      if (price >= 500) {
        colorClass = "text-purple-700"; // Premium tier ($500+)
        bgClass = "bg-purple-50";
      } else if (price >= 100) {
        colorClass = "text-green-700"; // High tier ($100-$499)
        bgClass = "bg-green-50";
      } else if (price >= 50) {
        colorClass = "text-blue-700"; // Mid tier ($50-$99)
        bgClass = "bg-blue-50";
      } else if (price >= 20) {
        colorClass = "text-orange-700"; // Low tier ($20-$49)
        bgClass = "bg-orange-50";
      } else {
        colorClass = "text-gray-700"; // Budget tier (<$20)
        bgClass = "bg-gray-50";
      }
      
      return (
        <div className={`inline-flex items-center px-2 py-1 rounded-md ${bgClass} font-semibold text-sm`}>
          <CircleDollarSign className="h-3 w-3 mr-1" />
          <span className={colorClass}>${price.toFixed(2)}</span>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-sm">
          <AlertCircle className="h-3 w-3 mr-1" />
          <span>No Price</span>
        </div>
      );
    }
  };

  // Render quantity with visual status indicators
  const renderQuantity = () => {
    const qty = Number(item.quantity || 0);
    const unit = item.unit || 'units';
    
    // Enhanced quantity display with visual indicators
    if (qty > 10) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-md bg-green-50">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <div>
            <span className="font-bold text-green-700 text-lg">{qty}</span>
            <div className="text-xs text-green-600">{unit}</div>
          </div>
        </div>
      );
    } else if (qty > 0) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-50">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
          <div>
            <span className="font-bold text-yellow-700 text-lg">{qty}</span>
            <div className="text-xs text-yellow-600">{unit}</div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-md bg-red-50">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <div>
            <span className="font-bold text-red-700 text-lg">0</span>
            <div className="text-xs text-red-600">Out of Stock</div>
          </div>
        </div>
      );
    }
  };

  return (
    <TableRow className={isSelected ? "bg-muted/50" : ""}>
      {selectionMode && (
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
        </TableCell>
      )}
      
      <TableCell>
        {renderThumbnail()}
      </TableCell>
      
      <TableCell className="font-medium max-w-xs">
        <div className="truncate">{item.name}</div>
      </TableCell>
      
      <TableCell className="font-mono text-sm">{item.sku || 'Not Set'}</TableCell>
      
      <TableCell>
        <Badge variant="secondary">{item.category || 'Uncategorized'}</Badge>
      </TableCell>
      
      <TableCell>{item.weight || 'Not Set'}</TableCell>
      
      <TableCell className="text-right">
        {renderPrice()}
      </TableCell>
      
      <TableCell className="text-right">
        {renderQuantity()}
      </TableCell>
      
      <TableCell>
        <Badge 
          variant={item.status === 'active' ? 'default' : 'secondary'}
          className={
            item.status === 'active' 
              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
              : item.status === 'draft'
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }
        >
          {item.status || 'draft'}
        </Badge>
      </TableCell>
      
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}