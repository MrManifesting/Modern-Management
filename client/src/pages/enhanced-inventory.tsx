import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Package, DollarSign, Weight, Grid, List } from 'lucide-react';
import { useState } from 'react';

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const { data: items = [], isLoading, error } = useQuery<EnhancedItem[]>({
    queryKey: ['/api/inventory/enhanced'],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
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

  const formatPrice = (price: string | number) => {
    if (!price) return 'No Price';
    const priceStr = String(price).replace(/[$,\s]/g, '');
    const num = parseFloat(priceStr);
    return isNaN(num) || num === 0 ? 'No Price' : `$${num.toFixed(2)}`;
  };

  const getShopifyUrl = (item: EnhancedItem) => {
    if (item.shopifyId) {
      return `https://mrlisterscurations.myshopify.com/admin/products/${item.shopifyId}`;
    }
    // Fallback to search if no shopifyId
    return `https://mrlisterscurations.myshopify.com/admin/products?query=${encodeURIComponent(item.handle || item.name)}`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-600">Enhanced Inventory</h1>
          <p className="text-gray-600 mt-1">
            Showing {items.length} products with authentic Google Sheets data
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <List className="w-4 h-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="w-4 h-4 mr-1" />
              Grid
            </Button>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Data
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>THCa %</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Package className="w-6 h-6 text-gray-400 hidden" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-sm">
                      <div className="font-medium text-sm line-clamp-2">{item.name}</div>
                      {item.strainBannerText && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {item.strainBannerText}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {item.sku}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.weight ? (
                      <Badge variant="outline" className="text-xs">
                        <Weight className="w-3 h-3 mr-1" />
                        {item.weight}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${item.basePrice !== '0' ? 'text-green-600' : 'text-gray-400'}`}>
                      {formatPrice(item.basePrice)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${item.costPrice !== '0' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {formatPrice(item.costPrice)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.quantity > 0 ? (
                      <Badge className="bg-green-100 text-green-800">
                        {item.quantity}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                        0
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.thcaPercentage ? (
                      <Badge variant="secondary" className="text-xs">
                        {item.thcaPercentage}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={getShopifyUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on Shopify"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                      {item.coasLink && (
                        <Button size="sm" variant="outline" asChild>
                          <a 
                            href={item.coasLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="View COAs"
                          >
                            <Package className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className={`font-semibold ${item.basePrice !== '0' ? 'text-green-600' : 'text-gray-400'}`}>
                      {formatPrice(item.basePrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost:</span>
                    <span className={`font-semibold ${item.costPrice !== '0' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {formatPrice(item.costPrice)}
                    </span>
                  </div>

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
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <a
                        href={getShopifyUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Shopify
                      </a>
                    </Button>
                    
                    {item.coasLink && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.coasLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          COAs
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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