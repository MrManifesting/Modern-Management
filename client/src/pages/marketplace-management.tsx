import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import MainLayout from '@/components/layout/main-layout';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft,
  Info,
  ChevronRight,
  Download,
  UploadCloud,
  Trash2,
  Layers,
  Settings,
  PlusCircle,
  Store,
  AlertCircle
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CircularProgress } from '@/components/ui/circular-progress';
import MarketplaceList from '@/components/marketplace/marketplace-list';
import MarketplaceCredentialsForm from '@/components/marketplace/marketplace-credentials-form';
import { SiShopify, SiEtsy, SiWoocommerce, SiAmazon, SiEbay } from 'react-icons/si';

// Marketplace icons by type
const MARKETPLACE_ICONS = {
  shopify: { icon: SiShopify, color: '#96bf48', name: 'Shopify' },
  etsy: { icon: SiEtsy, color: '#f45800', name: 'Etsy' },
  woocommerce: { icon: SiWoocommerce, color: '#7f54b3', name: 'WooCommerce' },
  amazon: { icon: SiAmazon, color: '#ff9900', name: 'Amazon' },
  ebay: { icon: SiEbay, color: '#e53238', name: 'eBay' }
};

export default function MarketplaceManagement() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('marketplace-list');
  const [selectedMarketplace, setSelectedMarketplace] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Parse marketplace ID from URL if present
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const marketplaceIdFromUrl = urlParams.get('id');
  
  // Fetch marketplace if ID is provided in URL
  const { data: marketplaceData, isLoading } = useQuery({
    queryKey: ['/api/marketplaces', marketplaceIdFromUrl],
    queryFn: async () => {
      if (!marketplaceIdFromUrl) return null;
      return apiRequest('GET', `/api/marketplaces/${marketplaceIdFromUrl}`);
    },
    enabled: !!marketplaceIdFromUrl
  });
  
  // Sync with URL parameter
  useEffect(() => {
    if (marketplaceIdFromUrl && marketplaceData) {
      setSelectedMarketplace(marketplaceData);
      setActiveTab('marketplace-edit');
    }
  }, [marketplaceIdFromUrl, marketplaceData]);
  
  // Delete marketplace mutation
  const deleteMarketplaceMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/marketplaces/${id}`),
    onSuccess: () => {
      toast({
        title: "Marketplace deleted",
        description: "The marketplace has been removed successfully."
      });
      setIsDeleteConfirmOpen(false);
      setSelectedMarketplace(null);
      setActiveTab('marketplace-list');
      setLocation('/marketplace-management');
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete marketplace",
        description: "An error occurred while trying to delete the marketplace.",
        variant: "destructive"
      });
    }
  });
  
  const handleDelete = () => {
    if (selectedMarketplace?.id) {
      deleteMarketplaceMutation.mutate(selectedMarketplace.id);
    }
  };
  
  const handleEditSuccess = () => {
    toast({
      title: "Marketplace updated",
      description: "The marketplace has been updated successfully."
    });
    setActiveTab('marketplace-list');
    setLocation('/marketplace-management');
    queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
  };
  
  const selectMarketplace = (marketplace: any) => {
    setSelectedMarketplace(marketplace);
    setActiveTab('marketplace-edit');
    setLocation(`/marketplace-management?id=${marketplace.id}`);
  };
  
  return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Marketplace Management</h1>
          </div>
          
          {activeTab === 'marketplace-list' && (
            <Button 
              onClick={() => {
                setSelectedMarketplace(null);
                setActiveTab('marketplace-add');
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Marketplace
            </Button>
          )}
        </div>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-background border border-gray-800">
            <TabsTrigger value="marketplace-list" onClick={() => {
              setLocation('/marketplace-management');
              setSelectedMarketplace(null);
            }}>
              Marketplaces
            </TabsTrigger>
            <TabsTrigger value="marketplace-add" disabled={activeTab === 'marketplace-edit'}>
              {activeTab === 'marketplace-add' ? 'Add Marketplace' : 'Add New'}
            </TabsTrigger>
            <TabsTrigger value="marketplace-edit" disabled={!selectedMarketplace}>
              {selectedMarketplace ? `Edit: ${selectedMarketplace.name}` : 'Edit'}
            </TabsTrigger>
            <TabsTrigger value="getting-started">
              Getting Started
            </TabsTrigger>
          </TabsList>
          
          {/* Marketplace List */}
          <TabsContent value="marketplace-list" className="space-y-4">
            <MarketplaceList />
          </TabsContent>
          
          {/* Add Marketplace */}
          <TabsContent value="marketplace-add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Marketplace</CardTitle>
                <CardDescription>
                  Connect a new marketplace to sync your inventory and orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MarketplaceCredentialsForm 
                  onSuccess={() => {
                    toast({
                      title: "Marketplace added",
                      description: "The marketplace has been added successfully."
                    });
                    setActiveTab('marketplace-list');
                    queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
                  }}
                  onCancel={() => setActiveTab('marketplace-list')}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Edit Marketplace */}
          <TabsContent value="marketplace-edit" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <CircularProgress size={40} />
                <span className="ml-3">Loading marketplace details...</span>
              </div>
            ) : selectedMarketplace ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center gap-4">
                    {selectedMarketplace.type && MARKETPLACE_ICONS[selectedMarketplace.type as keyof typeof MARKETPLACE_ICONS] ? (
                      <div className="flex items-center gap-3">
                        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-gray-800">
                          {React.createElement(
                            MARKETPLACE_ICONS[selectedMarketplace.type as keyof typeof MARKETPLACE_ICONS].icon, 
                            { 
                              className: "h-6 w-6",
                              style: { color: MARKETPLACE_ICONS[selectedMarketplace.type as keyof typeof MARKETPLACE_ICONS].color }
                            }
                          )}
                        </div>
                        <div>
                          <CardTitle>{selectedMarketplace.name}</CardTitle>
                          <CardDescription className="capitalize">{selectedMarketplace.type}</CardDescription>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-gray-800">
                          <Store className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <CardTitle>{selectedMarketplace.name}</CardTitle>
                          <CardDescription>{selectedMarketplace.type || 'Unknown'}</CardDescription>
                        </div>
                      </div>
                    )}
                    
                    <div className="ml-auto flex items-center gap-2">
                      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="bg-red-900/40 text-red-400 hover:bg-red-900/60">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Marketplace</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this marketplace connection? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              {deleteMarketplaceMutation.isPending && (
                                <CircularProgress size={16} className="mr-2" />
                              )}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Alert className="bg-blue-900/30 border-blue-800 mb-4">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertTitle>Marketplace Connection Details</AlertTitle>
                      <AlertDescription>
                        Update the credentials and settings for this marketplace connection.
                      </AlertDescription>
                    </Alert>
                    
                    <MarketplaceCredentialsForm 
                      marketplace={selectedMarketplace} 
                      onSuccess={handleEditSuccess}
                      onCancel={() => {
                        setActiveTab('marketplace-list');
                        setLocation('/marketplace-management');
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No marketplace selected</AlertTitle>
                <AlertDescription>
                  Please select a marketplace to edit or go back to the list.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          {/* Getting Started Guide */}
          <TabsContent value="getting-started" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Getting Started with Marketplaces
                </CardTitle>
                <CardDescription>
                  Learn how to connect and manage your online sales channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-blue-500" />
                      Step 1: Add a Marketplace
                    </h3>
                    <p className="text-sm text-gray-400">
                      Start by adding a marketplace using the "Add Marketplace" button. You'll need to select the marketplace type (Shopify, Etsy, etc.) 
                      and provide the necessary API credentials.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('marketplace-add')}
                      className="mt-2"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Marketplace
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Settings className="h-5 w-5 text-blue-500" />
                      Step 2: Connect Your Store
                    </h3>
                    <p className="text-sm text-gray-400">
                      Once you've added your marketplace credentials, you can connect to it from the Marketplaces tab.
                      Test the connection to verify your credentials are working correctly.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <UploadCloud className="h-5 w-5 text-blue-500" />
                      Step 3: Sync Your Products
                    </h3>
                    <p className="text-sm text-gray-400">
                      Sync your inventory with the marketplace to keep everything up to date. 
                      You can either do this manually or enable automatic syncing.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-500" />
                      Step 4: Manage Your Marketplace
                    </h3>
                    <p className="text-sm text-gray-400">
                      Use the marketplace management features to monitor your online sales channels, 
                      update product information, and track orders.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="mt-2"
                    >
                      <Link href="/marketplace">
                        Go to Marketplace Dashboard
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-500" />
                  How to Get API Credentials
                </CardTitle>
                <CardDescription>
                  Instructions for obtaining API credentials from different marketplaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(MARKETPLACE_ICONS).map(([type, { icon: Icon, color, name }]) => (
                    <div key={type} className="space-y-3">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Icon className="h-5 w-5" style={{ color }} />
                        {name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {name === 'Shopify' && (
                          <>
                            Log in to your Shopify admin, go to Apps → App and Sales Channel → Develop Apps → Create an App.
                            Configure Admin API access scopes (required: read/write for products, inventory, and orders).
                            Install the app and copy the API credentials.
                          </>
                        )}
                        {name === 'Etsy' && (
                          <>
                            Visit the Etsy Developer Portal, create a new app, and set the OAuth redirect URI.
                            After approval, you'll receive API keys for your application.
                          </>
                        )}
                        {name === 'WooCommerce' && (
                          <>
                            In your WordPress admin, go to WooCommerce → Settings → Advanced → REST API.
                            Create a new key with read/write permissions and save the credentials.
                          </>
                        )}
                        {name === 'Amazon' && (
                          <>
                            Register for Amazon Marketplace Web Service (MWS) in Seller Central.
                            Navigate to the MWS Access Keys section to generate your keys.
                          </>
                        )}
                        {name === 'eBay' && (
                          <>
                            Create an account on the eBay Developers Program website.
                            Register a new application to receive your Application ID, Cert ID, and Dev ID.
                          </>
                        )}
                      </p>
                      <Button variant="link" size="sm" className="px-0 text-blue-500 hover:text-blue-400">
                        View Detailed Guide
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}