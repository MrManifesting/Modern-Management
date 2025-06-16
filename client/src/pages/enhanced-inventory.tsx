import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Package, DollarSign, Weight } from 'lucide-react';

interface EnhancedItem {
  id: number;
  name: string;
  sku: string;
  handle: string;
  imageUrl: string;
  basePrice: string;
  costPrice: string;
  quantity: number;
  weight: string;
  brand: string;
  category: string;
  status: string;
  description: string;
  shopifyId: string | null;
  strainBannerText: string;
  thcaPercentage: string;
  coasLink: string;
}

export default function EnhancedInventory() {
  const { data: items = [], isLoading, error } = useQuery<EnhancedItem[]>({
    queryKey: ['/api/inventory/enhanced'],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Inventory</h2>
            <p className="text-gray-600">Unable to load enhanced inventory data from Google Sheets.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-600">Enhanced Inventory</h1>
          <p className="text-gray-600 mt-1">
            Showing {items.length} products with Google Sheets integration
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square relative bg-gray-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {item.quantity > 0 && (
                <Badge className="absolute top-2 right-2 bg-green-600">
                  {item.quantity} in stock
                </Badge>
              )}
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">
                {item.name}
              </CardTitle>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {item.sku}
                </span>
                {item.weight && (
                  <Badge variant="outline" className="text-xs">
                    <Weight className="w-3 h-3 mr-1" />
                    {item.weight}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-2">
                {item.basePrice !== '0' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-semibold text-green-600">
                      ${parseFloat(item.basePrice).toFixed(2)}
                    </span>
                  </div>
                )}

                {item.costPrice !== '0' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost:</span>
                    <span className="font-semibold text-gray-700">
                      ${parseFloat(item.costPrice).toFixed(2)}
                    </span>
                  </div>
                )}

                {item.thcaPercentage && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">THCa:</span>
                    <Badge variant="secondary">{item.thcaPercentage}</Badge>
                  </div>
                )}

                {item.strainBannerText && (
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {item.strainBannerText}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {item.coasLink && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={item.coasLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        COAs
                      </a>
                    </Button>
                  )}
                  
                  {item.shopifyId && (
                    <Button size="sm" variant="outline" asChild>
                      <a 
                        href={`https://mrlisterscurations.myshopify.com/admin/products/${item.shopifyId}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Shopify
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Products Found</h3>
          <p className="text-gray-500">
            No products available in the enhanced inventory at this time.
          </p>
        </div>
      )}
    </div>
  );
}