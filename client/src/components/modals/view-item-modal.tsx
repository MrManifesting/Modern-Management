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
import { Eye, ExternalLink, Package, Weight, DollarSign } from "lucide-react";

interface ViewItemModalProps {
  item: any;
  trigger?: React.ReactNode;
}

export default function ViewItemModal({ item, trigger }: ViewItemModalProps) {
  const [open, setOpen] = useState(false);

  const formatPrice = (price: string | null) => {
    if (!price || price === '0' || price === '0.00') return 'Not Set';
    return `$${parseFloat(price).toFixed(2)}`;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item Details</DialogTitle>
          <DialogDescription>
            Complete information for {item.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM5Ljc5IDEzLjc5IDcuNzkgMTMuNzkgNy43OSAxNkM3Ljc5IDE4LjIxIDkuNzkgMTguMjEgMTIgMTZaIiBmaWxsPSIjOUNBM0FGIi8+CjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            
            {item.coasLink && (
              <Button asChild variant="outline" className="w-full">
                <a 
                  href={item.coasLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View COAs
                </a>
              </Button>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{item.name}</h3>
              {item.sku && (
                <p className="text-sm text-gray-600">SKU: {item.sku}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Brand:</span>
                <span className="text-sm">{item.brand || 'Not specified'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Category:</span>
                <Badge variant="secondary">{item.category}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                  {item.status || 'draft'}
                </Badge>
              </div>

              {item.weight && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Weight:</span>
                  <div className="flex items-center">
                    <Weight className="w-4 h-4 mr-1" />
                    <span className="text-sm">{item.weight}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quantity:</span>
                <span className="text-sm font-semibold">{item.quantity || 0}</span>
              </div>

              {item.thcaPercentage && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">THCa:</span>
                  <Badge variant="outline">{item.thcaPercentage}</Badge>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Pricing</h4>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Base Price:</span>
                <span className={`text-sm font-semibold ${item.basePrice !== '0' ? 'text-green-600' : 'text-gray-400'}`}>
                  {formatPrice(item.basePrice)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Cost Price:</span>
                <span className={`text-sm font-semibold ${item.costPrice !== '0' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {formatPrice(item.costPrice)}
                </span>
              </div>
            </div>

            {item.description && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            )}

            {item.strainBannerText && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Strain Details</h4>
                <p className="text-sm text-gray-600">{item.strainBannerText}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}