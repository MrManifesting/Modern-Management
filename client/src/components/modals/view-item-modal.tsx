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
import { Eye, Package, ExternalLink, FileSpreadsheet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ViewItemModalProps {
  item: any; // Accept any item type to handle both Item and EnhancedItem
  trigger?: React.ReactNode;
}

interface ItemImage {
  url: string;
  source: 'direct' | 'shopify' | 'telegram';
  type: string;
  alt?: string;
  filename?: string;
}

export default function ViewItemModal({ item, trigger }: ViewItemModalProps) {
  const [open, setOpen] = useState(false);

  // Fetch item images from multiple sources
  const { data: imageData } = useQuery({
    queryKey: ['/api/media/item-images', item.id],
    enabled: open && !!item.id,
  });

  const images: ItemImage[] = imageData?.images || [];

  const formatPrice = (price: string | number | null) => {
    if (!price || price === '0' || price === 0) return 'No Price';
    
    const priceStr = String(price).replace(/[$,\s]/g, '');
    const num = parseFloat(priceStr);
    
    if (isNaN(num) || num === 0) return 'No Price';
    return `$${num.toFixed(2)}`;
  };

  const getShopifyUrl = (item: any) => {
    if (item.shopifyId) {
      return `https://mrlisterscurations.myshopify.com/admin/products/${item.shopifyId}`;
    }
    return `https://mrlisterscurations.myshopify.com/admin/products?query=${encodeURIComponent(item.handle || item.name)}`;
  };

  const handleViewSheetsClick = async (itemId: number) => {
    try {
      const response = await fetch(`/api/items/${itemId}/sheets-view`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening Google Sheets:', error);
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
                  <p className="font-medium">{item.weight || 'Not specified'}</p>
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
              <h4 className="font-medium mb-3">Pricing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Base Price:</span>
                  <p className="font-semibold text-green-600">
                    {formatPrice(item.basePrice)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Sale Price:</span>
                  <p className="font-semibold text-blue-600">
                    {formatPrice(item.salePrice)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Cost Price:</span>
                  <p className="font-semibold text-gray-700">
                    {formatPrice(item.costPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Wholesale Price:</span>
                  <p className="font-semibold text-purple-600">
                    {formatPrice(item.wholesalePrice)}
                  </p>
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
            
            <Button
              variant="outline"
              onClick={() => handleViewSheetsClick(item.id)}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              View in Google Sheets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}