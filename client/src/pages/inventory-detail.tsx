import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Edit, 
  Trash, 
  Tag, 
  Box, 
  ShoppingCart, 
  Clock, 
  LayoutGrid,
  PackageOpen
} from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { ColorBarcode, CategoryColorLegend } from "@/components/inventory/color-barcode";
import ShopifyStorePreview from "@/components/inventory/shopify-store-preview";
import { format } from "date-fns";
import AddItemModal from "@/components/modals/add-item-modal";
import { BulkBreakdownDialog } from "@/components/inventory/bulk-breakdown-dialog";
import { useToast } from "@/hooks/use-toast";

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch item details
  const { 
    data: item, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/items', parseInt(id)],
    queryFn: async () => {
      const response = await fetch(`/api/items/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!id
  });

  useEffect(() => {
    // Set up listener to handle updates from other components
    const handleUpdate = () => {
      refetch();
    };
    
    window.addEventListener('refetch-inventory-item', handleUpdate);
    
    return () => {
      window.removeEventListener('refetch-inventory-item', handleUpdate);
    };
  }, [refetch]);

  // Delete item mutation
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      toast({
        title: "Item deleted",
        description: "The item has been removed from inventory",
      });
      
      // Navigate back to inventory list
      navigate('/products-inventory');
    } catch (err) {
      toast({
        title: "Failed to delete item",
        description: "There was an error deleting this item",
        variant: "destructive"
      });
    }
  };
  
  // Format dates safely
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return <LoadingOverlay isLoading={true} message="Loading item details..." />;
  }

  if (isError) {
    return (
      <div className="container max-w-7xl py-10">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products-inventory')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              There was an error loading this item
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error instanceof Error ? error.message : "Unknown error"}
          </CardContent>
          <CardFooter>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container max-w-7xl py-10">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products-inventory')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Item Not Found</CardTitle>
            <CardDescription>
              The requested item could not be found
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/products-inventory')}>
              Return to Inventory
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/products-inventory')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Button>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsBreakdownModalOpen(true)}
            disabled={!item.itemType || item.itemType !== 'bulk'}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Breakdown
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDelete}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{item.name}</CardTitle>
                  <CardDescription>{item.sku}</CardDescription>
                </div>
                <Badge variant={item.quantity > 0 ? "outline" : "destructive"} className="ml-2">
                  {item.quantity} in stock
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="shopify">Shopify</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                      <p className="mt-1">{item.description || "No description available"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                      <p className="mt-1">{item.category || "Uncategorized"}</p>
                      {item.subcategory && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Subcategory: {item.subcategory}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Weight</h3>
                      <p className="mt-1">{item.weight || 0}{item.weightUnit || 'g'}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Dimensions</h3>
                      <p className="mt-1">
                        {item.dimensions ? item.dimensions : "Not specified"}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Brand</h3>
                      <p className="mt-1">{item.brand || "No brand"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Supplier</h3>
                      <p className="mt-1">{typeof item.metadata === 'object' && item.metadata !== null ? (item.metadata.supplier || "No supplier") : "No supplier"}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Updated</h3>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>{formatDate(item.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Show additional attributes if available */}
                  {item.attributes && typeof item.attributes === 'object' && item.attributes !== null && Object.keys(item.attributes).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Additional Attributes</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(item.attributes as Record<string, any>).map(([key, value]) => (
                            <div key={key}>
                              <h4 className="text-xs font-medium text-muted-foreground capitalize">{key}</h4>
                              <p className="mt-1">{typeof value === 'object' ? JSON.stringify(value) : (value?.toString() || "")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="pricing" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Standard Pricing</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Base Price:</span>
                          <span className="font-semibold">${(item.basePrice || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Sale Price:</span>
                          <span className="font-semibold text-green-600">
                            {item.salePrice ? `$${(item.salePrice || 0).toFixed(2)}` : 'N/A'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Wholesale & Cost</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Cost Price:</span>
                          <span className="font-semibold">${(item.costPrice || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Wholesale Price:</span>
                          <span className="font-semibold">
                            {item.wholesalePrice ? `$${(item.wholesalePrice || 0).toFixed(2)}` : 'N/A'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Profit Margins</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {item.costPrice ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Retail Margin:</span>
                              <span className="font-semibold">
                                {item.basePrice && item.costPrice 
                                  ? `${(((parseFloat(item.basePrice.toString()) - parseFloat(item.costPrice.toString())) / parseFloat(item.basePrice.toString())) * 100).toFixed(2)}%` 
                                  : 'N/A'}
                              </span>
                            </div>
                            {item.wholesalePrice && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Wholesale Margin:</span>
                                <span className="font-semibold">
                                  {`${(((parseFloat(item.wholesalePrice.toString()) - parseFloat(item.costPrice.toString())) / parseFloat(item.wholesalePrice.toString())) * 100).toFixed(2)}%`}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            Cost price is required to calculate margins
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="shopify" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Shopify Store Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ShopifyStorePreview item={item} />
                    </CardContent>
                  </Card>
                </TabsContent>
                
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Inventory Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Box className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">In Stock:</span>
                    </div>
                    <Badge variant={item.quantity > 0 ? "outline" : "destructive"}>
                      {item.quantity}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">SKU:</span>
                    </div>
                    <span className="font-mono text-sm">{item.sku || 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Status:</span>
                    </div>
                    <Badge variant={item.quantity > 0 ? "outline" : "destructive"}>
                      {item.quantity > 0 ? "Available" : "Out of Stock"}
                    </Badge>
                  </div>
                  
                  {item.itemType === 'bulk' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <PackageOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">Bulk Item:</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50">
                        Available for Breakdown
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Images Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Array.isArray(item.images) && item.images.length > 0 ? (
                    item.images.map((image: string, index: number) => (
                      <div key={index} className="aspect-square bg-muted rounded-md overflow-hidden">
                        <img 
                          src={image} 
                          alt={`${item.name} - ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                      No images available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Color Barcode */}
          <ColorBarcode item={item} />
          
          {/* Category Color Legend */}
          <CategoryColorLegend />
        </div>
      </div>
      
      {/* Edit Item Modal */}
      <AddItemModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          refetch();
          window.dispatchEvent(new CustomEvent('refetch-inventory'));
        }} 
        editItem={item}
      />
      
      {/* Breakdown Modal */}
      {item && (
        <BulkBreakdownDialog
          item={item}
          open={isBreakdownModalOpen}
          onOpenChange={setIsBreakdownModalOpen}
          onComplete={() => {
            setIsBreakdownModalOpen(false);
            refetch();
            window.dispatchEvent(new CustomEvent('refetch-inventory'));
          }}
        />
      )}
    </div>
  );
}