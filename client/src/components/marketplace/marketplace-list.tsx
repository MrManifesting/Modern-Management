import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiRequestSimple } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShoppingBag,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  HelpCircle,
  GanttChart,
  Settings,
  Activity
} from "lucide-react";
import MarketplaceCredentialsForm from './marketplace-credentials-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Skeleton } from "@/components/ui/skeleton";

type Marketplace = {
  id: number;
  name: string;
  type: string;
  isConnected: boolean;
  storeUrl?: string;
  apiEndpoint?: string;
  syncEnabled?: boolean;
  lastSyncDate?: string;
  credentials: {
    storeUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    apiEndpoint?: string;
  };
};

function formatDate(dateString?: string): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString();
}

function MarketplaceStatusBadge({ marketplace }: { marketplace: Marketplace }) {
  if (marketplace.isConnected) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
      <HelpCircle className="h-3 w-3 mr-1" />
      Not Connected
    </Badge>
  );
}

function SyncStatusBadge({ enabled }: { enabled?: boolean }) {
  if (enabled) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <RefreshCw className="h-3 w-3 mr-1" />
        Enabled
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
      <XCircle className="h-3 w-3 mr-1" />
      Disabled
    </Badge>
  );
}

export default function MarketplaceList() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMarketplaceId, setEditMarketplaceId] = useState<number | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all marketplaces
  const { data: marketplaces, isLoading } = useQuery({
    queryKey: ['/api/marketplaces'],
    queryFn: () => apiRequest<Marketplace[]>('/api/marketplaces'),
  });

  // Delete a marketplace
  const deleteMarketplaceMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequestSimple(`/api/marketplaces/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      toast({
        title: "Marketplace Deleted",
        description: "The marketplace has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete marketplace. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting marketplace:", error);
    }
  });

  // Toggle sync enabled status
  const toggleSyncMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequestSimple(`/api/marketplaces/${id}/sync-toggle`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      toast({
        title: "Sync Status Updated",
        description: "Sync settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update sync settings. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating sync settings:", error);
    }
  });

  // Test connection to a marketplace
  const testConnection = async (id: number) => {
    setIsTestingConnection(id);
    try {
      const result = await apiRequestSimple(`/api/marketplaces/${id}/test`, { method: 'POST' });
      if (result.connected) {
        toast({
          title: "Connection Successful",
          description: result.message || "Successfully connected to marketplace",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message || "Failed to connect to marketplace",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "An error occurred while testing the connection",
        variant: "destructive",
      });
      console.error("Error testing connection:", error);
    } finally {
      setIsTestingConnection(null);
    }
  };

  // Sync products from marketplace
  const syncFromMarketplace = async (id: number) => {
    setIsSyncing(id);
    try {
      const result = await apiRequestSimple(`/api/marketplaces/${id}/sync`, { method: 'POST' });
      
      if (result.success) {
        toast({
          title: "Sync Successful",
          description: result.message || `Successfully synced products from marketplace`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      } else {
        toast({
          title: "Sync Failed",
          description: result.message || "Failed to sync products from marketplace",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "An error occurred while syncing products from marketplace",
        variant: "destructive",
      });
      console.error("Error syncing from marketplace:", error);
    } finally {
      setIsSyncing(null);
    }
  };

  // Handle marketplace creation
  const handleMarketplaceSaved = (id: number) => {
    queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    setShowAddForm(false);
    setEditMarketplaceId(null);
    
    toast({
      title: "Marketplace Saved",
      description: "Marketplace settings have been saved successfully.",
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-72" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-10 w-1/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (editMarketplaceId) {
    const marketplace = marketplaces?.find(m => m.id === editMarketplaceId);
    if (!marketplace) return null;
    
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setEditMarketplaceId(null)}
          className="mb-4"
        >
          &larr; Back to Marketplaces
        </Button>
        
        <MarketplaceCredentialsForm 
          marketplaceId={editMarketplaceId} 
          onSaved={handleMarketplaceSaved}
        />
      </div>
    );
  }

  if (showAddForm) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowAddForm(false)}
          className="mb-4"
        >
          &larr; Back to Marketplaces
        </Button>
        
        <MarketplaceCredentialsForm onSaved={handleMarketplaceSaved} />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              Marketplaces
            </CardTitle>
            <CardDescription>
              Connect and manage your online sales channels
            </CardDescription>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Marketplace
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {marketplaces && marketplaces.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketplaces.map((marketplace) => (
                <TableRow key={marketplace.id}>
                  <TableCell className="font-medium">{marketplace.name}</TableCell>
                  <TableCell>
                    <span className="capitalize">{marketplace.type}</span>
                  </TableCell>
                  <TableCell>
                    <MarketplaceStatusBadge marketplace={marketplace} />
                  </TableCell>
                  <TableCell>
                    <SyncStatusBadge enabled={marketplace.syncEnabled} />
                  </TableCell>
                  <TableCell>
                    {formatDate(marketplace.lastSyncDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditMarketplaceId(marketplace.id)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => testConnection(marketplace.id)}
                        disabled={!!isTestingConnection}
                      >
                        {isTestingConnection === marketplace.id ? (
                          <CircularProgress size={16} className="mr-2" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleSyncMutation.mutate(marketplace.id)}
                        disabled={toggleSyncMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => syncFromMarketplace(marketplace.id)}
                        disabled={!marketplace.isConnected || !!isSyncing}
                        className={marketplace.isConnected ? "text-blue-700 hover:text-blue-800" : "text-gray-400"}
                      >
                        {isSyncing === marketplace.id ? (
                          <CircularProgress size={16} className="mr-2" />
                        ) : (
                          <GanttChart className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the {marketplace.name} integration. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMarketplaceMutation.mutate(marketplace.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Marketplaces Connected</h3>
            <p className="text-gray-500 mb-4">
              Connect your online sales channels to sync inventory and orders
            </p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Marketplace
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}