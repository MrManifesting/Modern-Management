import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Package, DollarSign, Eye, FileText, Download } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  status: string;
  quantity: number;
  weight?: string;
  pricing: {
    displayPrice: number;
    currency: string;
    priceRange: string;
    hasDiscount: boolean;
  };
  media: {
    thumbnailUrl?: string;
    hasImages: boolean;
    imageCount: number;
  };
  links: {
    shopifyStore: string;
    shopifyAdmin: string;
    coaCertificate?: string;
    mediaDownload?: string;
    directPurchase: string;
  };
  availability: {
    inStock: boolean;
    stockLevel: string;
  };
  shopifyData?: {
    productId?: string;
    handle?: string;
    syncStatus: string;
  };
}

interface ShopifyInventoryItem {
  id: string;
  title: string;
  handle: string;
  status: string;
  pricing: {
    minPrice: number;
    maxPrice: number;
    currency: string;
  };
  inventory: {
    totalQuantity: number;
    availableQuantity: number;
  };
  images: Array<{
    src: string;
    altText?: string;
  }>;
  links: {
    storefront: string;
    admin: string;
  };
  variants: Array<{
    sku?: string;
    price: number;
    inventoryQuantity: number;
  }>;
}

const GraphQLInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shopifyInventory, setShopifyInventory] = useState<ShopifyInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeGraphQLQuery = async (query: string) => {
    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'GraphQL request failed');
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query GetInventory {
          inventory {
            id
            name
            sku
            status
            quantity
            weight
            pricing {
              displayPrice
              currency
              priceRange
              hasDiscount
            }
            media {
              thumbnailUrl
              hasImages
              imageCount
            }
            links {
              shopifyStore
              shopifyAdmin
              coaCertificate
              mediaDownload
              directPurchase
            }
            availability {
              inStock
              stockLevel
            }
            shopifyData {
              productId
              handle
              syncStatus
            }
          }
        }
      `;

      const data = await executeGraphQLQuery(query);
      setInventory(data.inventory || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopifyInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query GetShopifyInventory {
          shopifyInventory {
            id
            title
            handle
            status
            pricing {
              minPrice
              maxPrice
              currency
            }
            inventory {
              totalQuantity
              availableQuantity
            }
            images {
              src
              altText
            }
            links {
              storefront
              admin
            }
            variants {
              sku
              price
              inventoryQuantity
            }
          }
        }
      `;

      const data = await executeGraphQLQuery(query);
      setShopifyInventory(data.shopifyInventory || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Shopify inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query GetAvailableInventory {
          availableInventory {
            id
            name
            sku
            quantity
            pricing {
              displayPrice
              currency
              hasDiscount
            }
            media {
              thumbnailUrl
              hasImages
            }
            links {
              directPurchase
              shopifyStore
              coaCertificate
            }
            availability {
              inStock
              stockLevel
            }
          }
        }
      `;

      const data = await executeGraphQLQuery(query);
      setInventory(data.availableInventory || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const InventoryCard = ({ item }: { item: InventoryItem }) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{item.name}</CardTitle>
            {item.sku && (
              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
            )}
          </div>
          {item.media.thumbnailUrl && (
            <img 
              src={item.media.thumbnailUrl} 
              alt={item.name}
              className="w-16 h-16 object-cover rounded-md ml-3"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={item.availability.inStock ? "default" : "secondary"}>
            {item.availability.stockLevel}
          </Badge>
          <Badge variant="outline">
            {item.quantity} units
          </Badge>
          {item.shopifyData?.syncStatus === 'synced' && (
            <Badge variant="success" className="bg-green-100 text-green-800">
              Shopify Synced
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-green-600">
            {item.pricing.priceRange}
          </span>
          {item.pricing.hasDiscount && (
            <Badge variant="destructive">Sale!</Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => window.open(item.links.directPurchase, '_blank')}
          >
            <Package className="w-4 h-4 mr-1" />
            Order Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(item.links.shopifyAdmin, '_blank')}
          >
            <Eye className="w-4 h-4 mr-1" />
            Admin
          </Button>
          {item.links.coaCertificate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(item.links.coaCertificate, '_blank')}
            >
              <FileText className="w-4 h-4 mr-1" />
              COA
            </Button>
          )}
          {item.links.mediaDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(item.links.mediaDownload, '_blank')}
            >
              <Download className="w-4 h-4 mr-1" />
              Media
            </Button>
          )}
        </div>

        {item.weight && (
          <p className="text-sm text-muted-foreground">
            Weight: {item.weight}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const ShopifyCard = ({ item }: { item: ShopifyInventoryItem }) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Handle: {item.handle}</p>
          </div>
          {item.images[0]?.src && (
            <img 
              src={item.images[0].src} 
              alt={item.images[0].altText || item.title}
              className="w-16 h-16 object-cover rounded-md ml-3"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={item.inventory.availableQuantity > 0 ? "default" : "secondary"}>
            {item.inventory.availableQuantity > 0 ? "In Stock" : "Out of Stock"}
          </Badge>
          <Badge variant="outline">
            {item.inventory.availableQuantity} available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-green-600">
            ${item.pricing.minPrice.toFixed(2)}
            {item.pricing.minPrice !== item.pricing.maxPrice && (
              ` - $${item.pricing.maxPrice.toFixed(2)}`
            )}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => window.open(item.links.storefront, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Store
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(item.links.admin, '_blank')}
          >
            <Eye className="w-4 h-4 mr-1" />
            Admin
          </Button>
        </div>

        {item.variants.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>{item.variants.length} variant(s)</p>
            {item.variants[0].sku && (
              <p>SKU: {item.variants[0].sku}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          GraphQL Inventory API
        </h1>
        <p className="text-gray-600">
          Live Shopify inventory data with purchase links, media thumbnails, and COA certificates
        </p>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Complete Inventory</TabsTrigger>
          <TabsTrigger value="available">Available Only</TabsTrigger>
          <TabsTrigger value="shopify">Live Shopify Data</TabsTrigger>
        </TabsList>

        <div className="mt-6 mb-4 flex gap-2">
          <Button onClick={fetchInventory} disabled={loading}>
            Refresh Complete Inventory
          </Button>
          <Button onClick={fetchAvailableInventory} disabled={loading}>
            Refresh Available
          </Button>
          <Button onClick={fetchShopifyInventory} disabled={loading}>
            Refresh Shopify Data
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        <TabsContent value="inventory" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <p>Loading inventory data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.slice(0, 12).map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {inventory.length > 12 && (
            <p className="text-center text-gray-600">
              Showing first 12 of {inventory.length} items
            </p>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <p>Loading available inventory...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.filter(item => item.availability.inStock).map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shopify" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <p>Loading Shopify data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shopifyInventory.slice(0, 12).map((item) => (
                <ShopifyCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {shopifyInventory.length > 12 && (
            <p className="text-center text-gray-600">
              Showing first 12 of {shopifyInventory.length} Shopify products
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GraphQLInventory;