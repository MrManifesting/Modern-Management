import React from 'react';
import { Link } from 'wouter';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  ShoppingBag, 
  Store, 
  ExternalLink, 
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  ChevronRight
} from 'lucide-react';
import { SiShopify, SiEtsy, SiWoocommerce, SiAmazon, SiEbay } from 'react-icons/si';

// Marketplace icons by type
const MARKETPLACE_ICONS = {
  shopify: { icon: SiShopify, color: '#96bf48' },
  etsy: { icon: SiEtsy, color: '#f45800' },
  woocommerce: { icon: SiWoocommerce, color: '#7f54b3' },
  amazon: { icon: SiAmazon, color: '#ff9900' },
  ebay: { icon: SiEbay, color: '#e53238' }
};

export default function MarketplacePage() {
  // Fetch connected marketplaces
  const { data: marketplaces, isLoading } = useQuery({
    queryKey: ['/api/marketplaces'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplaces');
      return await response.json();
    },
  });

  const connectedMarketplaces = marketplaces?.filter(m => m.isConnected) || [];
  const hasConnectedMarketplaces = connectedMarketplaces.length > 0;

  return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground">
              Connect and manage your online sales channels
            </p>
          </div>
          <Link href="/marketplace-management">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Marketplace
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-gray-800/50"></CardHeader>
                <CardContent className="py-6">
                  <div className="h-4 bg-gray-800/50 w-3/4 mb-3 rounded"></div>
                  <div className="h-4 bg-gray-800/50 w-1/2 mb-6 rounded"></div>
                  <div className="h-10 bg-gray-800/50 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !hasConnectedMarketplaces ? (
          <div className="space-y-6">
            <Alert variant="default" className="bg-blue-900/30 border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle>Connect your first marketplace</AlertTitle>
              <AlertDescription>
                Start by connecting your online store to sync inventory, track orders, and manage your products.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(MARKETPLACE_ICONS).map(([type, { icon: Icon, color }]) => (
                <Card key={type} className="overflow-hidden border-gray-800 hover:border-gray-700 transition-all">
                  <CardHeader className="bg-gradient-to-br from-gray-900 to-gray-800 border-b border-gray-800 pb-4">
                    <div className="flex items-center">
                      <Icon className="h-8 w-8 mr-3" style={{ color }} />
                      <div>
                        <CardTitle className="capitalize">{type}</CardTitle>
                        <CardDescription>Connect your {type} store</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-400 mb-4">
                      Sync products, inventory, and orders with your {type} marketplace.
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="bg-gray-800/50 text-gray-400">
                        Not Connected
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-gray-800 pt-4">
                    <Link href="/marketplace-management">
                      <Button variant="outline" className="w-full">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connectedMarketplaces.map((marketplace) => {
                const { icon: Icon, color } = 
                  MARKETPLACE_ICONS[marketplace.type as keyof typeof MARKETPLACE_ICONS] || 
                  { icon: Store, color: '#888888' };
                
                return (
                  <Card key={marketplace.id} className="overflow-hidden border-gray-800 hover:border-blue-900/40 transition-all">
                    <CardHeader className="bg-gradient-to-br from-gray-900 to-gray-800 border-b border-gray-800 pb-4">
                      <div className="flex items-center">
                        <Icon className="h-8 w-8 mr-3" style={{ color }} />
                        <div>
                          <CardTitle>{marketplace.name}</CardTitle>
                          <CardDescription className="capitalize">{marketplace.type}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Status</span>
                          <Badge 
                            className={marketplace.isConnected 
                              ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                              : "bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50"
                            }
                          >
                            {marketplace.isConnected ? "Connected" : "Configured"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Sync</span>
                          <Badge variant="outline" className={marketplace.syncEnabled 
                            ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" 
                            : "bg-gray-800/50 text-gray-400"
                          }>
                            {marketplace.syncEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Last Synced</span>
                          <span className="text-sm text-gray-300">
                            {marketplace.lastSyncDate 
                              ? new Date(marketplace.lastSyncDate).toLocaleDateString() 
                              : 'Never'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-gray-800 pt-4 flex justify-between">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/marketplace-management?id=${marketplace.id}`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-400">
                        <span className="mr-1">View Details</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}

              {/* Add marketplace card */}
              <Card className="overflow-hidden border-dashed border-gray-700 hover:border-blue-700 transition-all bg-transparent">
                <CardContent className="flex flex-col items-center justify-center h-[300px]">
                  <PlusCircle className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Add Marketplace</h3>
                  <p className="text-sm text-center text-muted-foreground mb-4">
                    Connect a new sales channel to expand your reach
                  </p>
                  <Link href="/marketplace-management">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Connect New
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {hasConnectedMarketplaces && (
          <div className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                  Recent Synchronization Activity
                </CardTitle>
                <CardDescription>
                  View recent product and inventory synchronization activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    Activity log will be available after syncing with a marketplace.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}