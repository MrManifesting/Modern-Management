import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  Trash2, 
  RefreshCw, 
  Store,
  Settings,
  Power,
  AlertTriangle 
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MarketplaceCredentialsForm from './marketplace-credentials-form';
import { CircularProgress } from '../ui/circular-progress';
import { useToast } from '@/hooks/use-toast';
import { SiShopify, SiEtsy, SiWoocommerce, SiAmazon, SiEbay } from 'react-icons/si';

// Marketplace icons by type
const MARKETPLACE_ICONS = {
  shopify: { icon: SiShopify, color: '#96bf48', name: 'Shopify' },
  etsy: { icon: SiEtsy, color: '#f45800', name: 'Etsy' },
  woocommerce: { icon: SiWoocommerce, color: '#7f54b3', name: 'WooCommerce' },
  amazon: { icon: SiAmazon, color: '#ff9900', name: 'Amazon' },
  ebay: { icon: SiEbay, color: '#e53238', name: 'eBay' }
};

export default function MarketplaceList() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editMarketplace, setEditMarketplace] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMarketplace, setDeleteMarketplace] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch marketplaces
  const { data: marketplaces, isLoading, error } = useQuery({
    queryKey: ['/api/marketplaces'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplaces');
      return response.json();
    }
  });

  // Delete marketplace mutation
  const deleteMarketplaceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/marketplaces/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Marketplace deleted",
        description: "The marketplace has been removed successfully.",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete marketplace",
        description: "An error occurred while trying to delete the marketplace.",
        variant: "destructive",
      });
    }
  });

  // Test connection
  const testConnection = async (marketplace: any) => {
    setIsTestingConnection(true);
    try {
      const response = await apiRequest('POST', `/api/marketplaces/${marketplace.id}/test`);
      const data = await response.json();
      
      toast({
        title: data.success 
          ? "Connection successful" 
          : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Connection test failed",
        description: "Could not test connection to the marketplace.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Toggle connection
  const toggleConnection = async (marketplace: any) => {
    try {
      const response = await apiRequest('POST', `/api/marketplaces/${marketplace.id}/connect`, 
        { connect: !marketplace.isConnected }
      );
      const data = await response.json();
      
      toast({
        title: marketplace.isConnected 
          ? "Marketplace disconnected" 
          : "Marketplace connected",
        description: data.message || "Connection status updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    } catch (error) {
      toast({
        title: "Failed to update connection",
        description: "An error occurred while updating the connection status.",
        variant: "destructive",
      });
    }
  };

  // Toggle sync enabled
  const toggleSyncEnabled = async (marketplace: any) => {
    try {
      const response = await apiRequest('POST', `/api/marketplaces/${marketplace.id}/sync-toggle`);
      const data = await response.json();
      
      // Use the new state from the response, not the old marketplace state
      const newSyncState = data.marketplace?.syncEnabled;
      
      toast({
        title: newSyncState 
          ? "Auto sync enabled" 
          : "Auto sync disabled",
        description: data.message || "Sync settings updated successfully.",
      });
      
      // Invalidate and refetch to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      await queryClient.refetchQueries({ queryKey: ['/api/marketplaces'] });
    } catch (error) {
      toast({
        title: "Failed to update sync settings",
        description: "An error occurred while updating the sync settings.",
        variant: "destructive",
      });
    }
  };

  // Sync products
  const syncProducts = async (marketplace: any) => {
    setIsSyncing(true);
    try {
      const response = await apiRequest('POST', `/api/marketplaces/${marketplace.id}/sync`);
      const data = await response.json();
      
      toast({
        title: "Sync completed",
        description: data.message || "Products have been synchronized successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "An error occurred while synchronizing products.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = () => {
    if (deleteMarketplace) {
      deleteMarketplaceMutation.mutate(deleteMarketplace.id);
    }
  };

  const openEditDialog = (marketplace: any) => {
    setEditMarketplace(marketplace);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setTimeout(() => {
      setEditMarketplace(null);
    }, 300);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress size={40} />
        <span className="ml-3">Loading marketplaces...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading marketplaces</AlertTitle>
        <AlertDescription>
          There was an error loading your marketplaces. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Connected Marketplaces</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editMarketplace ? 'Edit Marketplace' : 'Add New Marketplace'}
              </DialogTitle>
              <DialogDescription>
                {editMarketplace 
                  ? 'Update your marketplace connection details' 
                  : 'Connect a new marketplace to sync with your inventory'}
              </DialogDescription>
            </DialogHeader>
            <MarketplaceCredentialsForm 
              marketplace={editMarketplace} 
              onSuccess={handleCloseDialog}
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {marketplaces && marketplaces.length === 0 ? (
        <div className="space-y-4">
          <Alert variant="default" className="bg-blue-900/30 border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle>No marketplaces connected</AlertTitle>
            <AlertDescription>
              Start by adding a marketplace to integrate with your inventory system.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(MARKETPLACE_ICONS).map(([type, { icon: Icon, color, name }]) => (
              <Card key={type} className="overflow-hidden border-gray-800 hover:border-gray-700 transition-all bg-gray-900/30">
                <CardHeader className="bg-gradient-to-br from-gray-900 to-gray-800/80 border-b border-gray-800 pb-4">
                  <div className="flex items-center">
                    <Icon className="h-8 w-8 mr-3" style={{ color }} />
                    <div>
                      <CardTitle>{name}</CardTitle>
                      <CardDescription>Connect to {name}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-400 mb-4">
                    Integrate with {name} to sync products, inventory and orders.
                  </p>
                </CardContent>
                <CardFooter className="border-t border-gray-800 pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      setEditMarketplace({ type });
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {marketplaces && marketplaces.map((marketplace: any) => {
              const { icon: Icon, color, name } = 
                MARKETPLACE_ICONS[marketplace.type as keyof typeof MARKETPLACE_ICONS] || 
                { icon: Store, color: '#888888', name: 'Unknown' };
              
              return (
                <Card key={marketplace.id} className="overflow-hidden border-gray-800 hover:border-gray-700 transition-all">
                  <CardHeader className="bg-gradient-to-br from-gray-900 to-gray-800 border-b border-gray-800 pb-4">
                    <div className="flex items-center">
                      <Icon className="h-8 w-8 mr-3" style={{ color }} />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {marketplace.name}
                          {marketplace.isConnected && (
                            <Badge className="bg-green-900/30 text-green-400 py-0">
                              Connected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="capitalize">{marketplace.type}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => testConnection(marketplace)}
                        disabled={isTestingConnection}
                      >
                        {isTestingConnection ? (
                          <CircularProgress size={16} className="mr-2" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                      
                      <Button 
                        variant={marketplace.isConnected ? "destructive" : "outline"} 
                        size="sm"
                        className={marketplace.isConnected ? "w-full bg-red-900/20 hover:bg-red-800/40 text-red-400" : "w-full"}
                        onClick={() => toggleConnection(marketplace)}
                      >
                        <Power className="h-4 w-4 mr-2" />
                        {marketplace.isConnected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                    
                    {marketplace.isConnected && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => syncProducts(marketplace)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? (
                            <CircularProgress size={16} className="mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Sync Products
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={marketplace.syncEnabled 
                            ? "w-full bg-blue-900/20 hover:bg-blue-800/40 text-blue-400" 
                            : "w-full"
                          }
                          onClick={() => toggleSyncEnabled(marketplace)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {marketplace.syncEnabled ? 'Auto Sync: On' : 'Auto Sync: Off'}
                        </Button>
                      </div>
                    )}
                    
                    {marketplace.lastSyncDate && (
                      <div className="flex justify-between items-center pt-2 text-sm">
                        <span className="text-gray-400">Last Synced</span>
                        <span className="text-gray-300">
                          {new Date(marketplace.lastSyncDate).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t border-gray-800 pt-4 flex justify-between">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(marketplace)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setDeleteMarketplace(marketplace);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            
            {/* Add new marketplace card */}
            <Card className="overflow-hidden border-dashed border-gray-700 hover:border-blue-700 transition-all bg-transparent">
              <CardContent className="flex flex-col items-center justify-center h-[300px]">
                <PlusCircle className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-medium mb-2">Add Marketplace</h3>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Connect a new sales channel to expand your reach
                </p>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Marketplace
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this marketplace connection? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {deleteMarketplace && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Deleting {deleteMarketplace.name} ({deleteMarketplace.type}) will remove all connection settings.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMarketplaceMutation.isPending}
              className="bg-red-700 hover:bg-red-800"
            >
              {deleteMarketplaceMutation.isPending && (
                <CircularProgress size={16} className="mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}