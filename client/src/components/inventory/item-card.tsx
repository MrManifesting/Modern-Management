import { useState } from "react";
import { 
  Edit,
  FileText,
  MoreHorizontal,
  Trash2
} from "lucide-react";
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
import { Item } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

type ItemCardProps = {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
};

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Format date for display
  const formattedDate = formatDistanceToNow(new Date(item.createdAt), { 
    addSuffix: true 
  });

  // Get marketplace badge class
  const getMarketplaceBadgeClass = (marketplace: string) => {
    const classes = {
      ebay: "marketplace-badge-ebay",
      etsy: "marketplace-badge-etsy",
      amazon: "marketplace-badge-amazon",
      shopify: "marketplace-badge-shopify",
      default: "bg-gray-500"
    };
    
    return classes[marketplace as keyof typeof classes] || classes.default;
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
    <Card 
      className="group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-48 bg-gray-200">
        {/* Item image */}
        {(item.images as string[])[0] ? (
          <img
            src={(item.images as string[])[0]}
            alt={item.name}
            className="h-full w-full object-cover hover-card-image"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {/* Marketplace & status badges */}
        <div className="absolute top-2 right-2 flex space-x-1">
          {(item.marketplace as string[])[0] && (
            <span className={`rounded-full ${getMarketplaceBadgeClass((item.marketplace as string[])[0])} px-2 py-1 text-xs font-medium text-white`}>
              {(item.marketplace as string[])[0]}
            </span>
          )}
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
                  Edit Item
                </DropdownMenuItem>
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
            ${item.price.toFixed(2)}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600 line-clamp-1">
          {item.category}
          {(item.tags as string[]).length > 0 && `, ${(item.tags as string[])[0]}`}
        </p>
        <div className="mt-3 flex items-center">
          {item.aiEnhanced && (
            <div className="ai-badge mr-2">
              <span>AI Enhanced</span>
            </div>
          )}
          <span className="text-xs text-gray-500">Added {formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  );
}
