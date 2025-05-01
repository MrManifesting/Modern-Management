import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CannabisMascotLoader, LoadingPage } from "@/components/ui/cannabis-loader";
import { AlertTriangle, CheckCircle, PlusSquare, Trash2, Package, Clipboard, ArrowRight, Layers, ArrowDownUp } from "lucide-react";

type Item = {
  id: number;
  name: string;
  description: string;
  sku: string;
  quantity: number;
  price: number;
  category: string;
  condition: string;
  images: string[];
  itemType: string;
  breakdownStatus: string;
  strain?: string;
  thcContent?: number;
  cbdContent?: number;
  weight?: number;
  weightUnit?: string;
};

type ProductBreakdown = {
  id: number;
  bulkItemId: number;
  employeeId: number | null;
  status: string;
  notes: string | null;
  startedAt: Date;
  completedAt: Date | null;
  targetProducts: any[];
  completedProducts: number[];
};

type BreakdownTarget = {
  name?: string;
  sku?: string;
  price: number;
  quantity: number;
  weight: number;
  weightUnit: string;
};

export default function BulkBreakdownPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for selected bulk item and breakdown dialog
  const [selectedBulkItem, setSelectedBulkItem] = useState<Item | null>(null);
  const [moveToWaitingOpen, setMoveToWaitingOpen] = useState(false);
  const [breakdownQuantity, setBreakdownQuantity] = useState(1);
  
  // State for breakdown targets
  const [breakdownTargets, setBreakdownTargets] = useState<BreakdownTarget[]>([]);
  const [createBreakdownOpen, setCreateBreakdownOpen] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<ProductBreakdown | null>(null);
  
  // Get all bulk items
  const { data: bulkItems, isLoading: isLoadingBulk } = useQuery({ 
    queryKey: ['/api/bulk-items'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Get all waiting items
  const { data: waitingItems, isLoading: isLoadingWaiting } = useQuery({ 
    queryKey: ['/api/waiting-items'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Get all breakdown items (products created from bulk items)
  const { data: breakdownItems, isLoading: isLoadingBreakdown } = useQuery({ 
    queryKey: ['/api/breakdown-items'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Get all product breakdowns (the breakdown process records)
  const { data: productBreakdowns, isLoading: isLoadingProductBreakdowns } = useQuery({ 
    queryKey: ['/api/product-breakdowns'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Mutation to move bulk item to waiting area
  const moveToBulkWaitingMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      return apiRequest(`/api/bulk-items/${id}/move-to-waiting`, {
        method: 'POST',
        body: JSON.stringify({
          quantity,
          employeeId: 1 // TODO: Replace with actual logged-in employee ID
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Moved to waiting area",
        description: "The bulk item has been moved to the waiting area for breakdown.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waiting-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/product-breakdowns'] });
      setMoveToWaitingOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to move item: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to create breakdown products
  const createBreakdownProductsMutation = useMutation({
    mutationFn: async ({ breakdownId, targetProducts }: { breakdownId: number; targetProducts: BreakdownTarget[] }) => {
      return apiRequest(`/api/product-breakdowns/${breakdownId}/create-products`, {
        method: 'POST',
        body: JSON.stringify({
          targetProducts,
          employeeId: 1 // TODO: Replace with actual logged-in employee ID
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Breakdown completed",
        description: "The bulk item has been broken down into individual products.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waiting-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/breakdown-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/product-breakdowns'] });
      setCreateBreakdownOpen(false);
      setBreakdownTargets([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create breakdown products: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Handler for adding a new target product for breakdown
  const handleAddBreakdownTarget = () => {
    if (!selectedBreakdown) return;
    
    const bulkItem = bulkItems?.find((item: Item) => item.id === selectedBreakdown.bulkItemId);
    if (!bulkItem) return;
    
    const newTarget: BreakdownTarget = {
      price: bulkItem.price / 4, // Default to 1/4 of bulk price
      quantity: 1,
      weight: bulkItem.weight ? bulkItem.weight / 4 : 3.5, // Default to quarter if weight exists
      weightUnit: bulkItem.weightUnit || 'g'
    };
    
    setBreakdownTargets([...breakdownTargets, newTarget]);
  };
  
  // Handler for updating a target product
  const handleUpdateBreakdownTarget = (index: number, field: keyof BreakdownTarget, value: any) => {
    const updatedTargets = [...breakdownTargets];
    updatedTargets[index] = {
      ...updatedTargets[index],
      [field]: field === 'price' || field === 'quantity' || field === 'weight' ? parseFloat(value) : value
    };
    setBreakdownTargets(updatedTargets);
  };
  
  // Handler for removing a target product
  const handleRemoveBreakdownTarget = (index: number) => {
    const updatedTargets = [...breakdownTargets];
    updatedTargets.splice(index, 1);
    setBreakdownTargets(updatedTargets);
  };
  
  // Handler for creating breakdown products
  const handleCreateBreakdownProducts = () => {
    if (!selectedBreakdown || breakdownTargets.length === 0) return;
    
    createBreakdownProductsMutation.mutate({
      breakdownId: selectedBreakdown.id,
      targetProducts: breakdownTargets
    });
  };
  
  if (isLoadingBulk || isLoadingWaiting || isLoadingBreakdown || isLoadingProductBreakdowns) {
    return <LoadingPage text="Loading inventory data..." variant="bud" />;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Bulk Product Breakdown</h1>
      
      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="bulk">Bulk Inventory</TabsTrigger>
          <TabsTrigger value="waiting">Waiting Area</TabsTrigger>
          <TabsTrigger value="breakdowns">Active Breakdowns</TabsTrigger>
          <TabsTrigger value="completed">Breakdown Products</TabsTrigger>
        </TabsList>
        
        {/* Bulk Inventory Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {bulkItems?.length > 0 ? (
              bulkItems.map((item: Item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{item.sku}</CardDescription>
                      </div>
                      <Badge variant={item.quantity > 0 ? "outline" : "destructive"}>
                        {item.quantity} in stock
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center mb-2">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{item.weight}{item.weightUnit} {item.strain}</span>
                    </div>
                    <div className="h-20 overflow-hidden">
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedBulkItem(item);
                        setBreakdownQuantity(1);
                        setMoveToWaitingOpen(true);
                      }}
                      disabled={item.quantity <= 0}
                    >
                      Move to Waiting
                    </Button>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-normal">Price: </Label>
                      <span className="font-medium">${item.price.toFixed(2)}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center p-8 bg-muted rounded-md">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No Bulk Items</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No bulk items are currently available in inventory. Add items with the type "BULK" to manage breakdown processes.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Waiting Area Tab */}
        <TabsContent value="waiting" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {waitingItems?.length > 0 ? (
              waitingItems.map((item: Item) => (
                <Card key={item.id} className="overflow-hidden border-gold-500 border">
                  <CardHeader className="p-4 bg-gold-50/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{item.sku}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {item.quantity} in waiting
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex items-center mb-2">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{item.weight}{item.weightUnit} {item.strain}</span>
                    </div>
                    
                    {/* Find the corresponding breakdown */}
                    {productBreakdowns?.filter((bd: ProductBreakdown) => 
                      bd.bulkItemId === item.id && bd.status === 'WAITING'
                    ).map((breakdown: ProductBreakdown) => (
                      <div key={breakdown.id} className="mt-2 p-2 bg-muted rounded-md">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Breakdown #{breakdown.id}</span>
                          <Badge variant="outline" className="text-xs">Waiting</Badge>
                        </div>
                        <div className="flex items-center justify-end mt-2">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedBreakdown(breakdown);
                              setBreakdownTargets([]);
                              setCreateBreakdownOpen(true);
                            }}
                          >
                            Start Breakdown
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center p-8 bg-muted rounded-md">
                <Clipboard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Waiting Area Empty</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No items are currently in the waiting area. Move bulk items here to prepare them for breakdown.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Active Breakdowns Tab */}
        <TabsContent value="breakdowns" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Bulk Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productBreakdowns?.filter((bd: ProductBreakdown) => bd.status !== 'COMPLETED').length > 0 ? (
                productBreakdowns
                  .filter((bd: ProductBreakdown) => bd.status !== 'COMPLETED')
                  .map((breakdown: ProductBreakdown) => {
                    const bulkItem = bulkItems?.find((item: Item) => item.id === breakdown.bulkItemId);
                    return (
                      <TableRow key={breakdown.id}>
                        <TableCell>#{breakdown.id}</TableCell>
                        <TableCell>
                          {bulkItem ? (
                            <div className="flex flex-col">
                              <span>{bulkItem.name}</span>
                              <span className="text-xs text-muted-foreground">{bulkItem.sku}</span>
                            </div>
                          ) : 'Unknown Item'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={breakdown.status === 'WAITING' ? 'outline' : 'secondary'}
                          >
                            {breakdown.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(breakdown.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>Employee #{breakdown.employeeId || 'N/A'}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setSelectedBreakdown(breakdown);
                              setBreakdownTargets([]);
                              setCreateBreakdownOpen(true);
                            }}
                            disabled={breakdown.status !== 'WAITING'}
                          >
                            {breakdown.status === 'WAITING' ? 'Start Breakdown' : 'View Details'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No active breakdowns found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
        
        {/* Breakdown Products Tab */}
        <TabsContent value="completed" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {breakdownItems?.length > 0 ? (
              breakdownItems.map((item: Item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{item.sku}</CardDescription>
                      </div>
                      <Badge variant={item.quantity > 0 ? "outline" : "destructive"}>
                        {item.quantity} in stock
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center mb-2">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{item.weight}{item.weightUnit} {item.strain}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <ArrowDownUp className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">From bulk item #{item.sourceItemId || 'N/A'}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 flex justify-between">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-normal">Price: </Label>
                      <span className="font-medium">${item.price.toFixed(2)}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center p-8 bg-muted rounded-md">
                <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No Breakdown Products</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No breakdown products have been created yet. Complete a bulk breakdown process to create individual products.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Dialog for moving to waiting area */}
      <Dialog open={moveToWaitingOpen} onOpenChange={setMoveToWaitingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Waiting Area</DialogTitle>
            <DialogDescription>
              Specify the quantity to move from bulk inventory to the waiting area for breakdown.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBulkItem && (
            <div className="space-y-4 py-2">
              <div className="flex items-center space-x-3">
                {selectedBulkItem.images && selectedBulkItem.images[0] ? (
                  <Avatar className="h-12 w-12">
                    <img src={selectedBulkItem.images[0]} alt={selectedBulkItem.name} />
                  </Avatar>
                ) : (
                  <Avatar className="h-12 w-12">
                    <Package className="h-8 w-8" />
                  </Avatar>
                )}
                <div>
                  <h3 className="font-medium">{selectedBulkItem.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBulkItem.sku} · {selectedBulkItem.quantity} in stock
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to move</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  min={1} 
                  max={selectedBulkItem.quantity}
                  value={breakdownQuantity}
                  onChange={(e) => setBreakdownQuantity(parseInt(e.target.value))}
                />
                {breakdownQuantity > selectedBulkItem.quantity && (
                  <p className="text-sm text-destructive">
                    Quantity cannot exceed available stock.
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveToWaitingOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedBulkItem && breakdownQuantity > 0 && breakdownQuantity <= selectedBulkItem.quantity) {
                  moveToBulkWaitingMutation.mutate({
                    id: selectedBulkItem.id,
                    quantity: breakdownQuantity
                  });
                }
              }}
              disabled={
                !selectedBulkItem || 
                breakdownQuantity <= 0 || 
                breakdownQuantity > (selectedBulkItem?.quantity || 0) ||
                moveToBulkWaitingMutation.isPending
              }
            >
              {moveToBulkWaitingMutation.isPending ? (
                <CannabisMascotLoader size="sm" variant="leaf" />
              ) : (
                'Move to Waiting'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for creating breakdown products */}
      <Dialog open={createBreakdownOpen} onOpenChange={setCreateBreakdownOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Breakdown Products</DialogTitle>
            <DialogDescription>
              Specify the products to create from the bulk item.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBreakdown && (
            <div className="space-y-4 py-2">
              <div className="flex items-center space-x-3">
                {(() => {
                  const bulkItem = bulkItems?.find((item: Item) => item.id === selectedBreakdown.bulkItemId);
                  return bulkItem ? (
                    <>
                      {bulkItem.images && bulkItem.images[0] ? (
                        <Avatar className="h-12 w-12">
                          <img src={bulkItem.images[0]} alt={bulkItem.name} />
                        </Avatar>
                      ) : (
                        <Avatar className="h-12 w-12">
                          <Package className="h-8 w-8" />
                        </Avatar>
                      )}
                      <div>
                        <h3 className="font-medium">{bulkItem.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {bulkItem.sku} · Breakdown #{selectedBreakdown.id}
                        </p>
                      </div>
                    </>
                  ) : <p>Bulk item not found</p>;
                })()}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Target Products</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddBreakdownTarget}
                  >
                    <PlusSquare className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                <ScrollArea className="h-64 rounded-md border">
                  {breakdownTargets.length > 0 ? (
                    <div className="p-4 space-y-4">
                      {breakdownTargets.map((target, index) => (
                        <div key={index} className="space-y-3 p-3 bg-muted rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Product #{index + 1}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveBreakdownTarget(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`name-${index}`}>Name (Optional)</Label>
                              <Input
                                id={`name-${index}`}
                                value={target.name || ''}
                                onChange={(e) => handleUpdateBreakdownTarget(index, 'name', e.target.value)}
                                placeholder="Product name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`sku-${index}`}>SKU (Optional)</Label>
                              <Input
                                id={`sku-${index}`}
                                value={target.sku || ''}
                                onChange={(e) => handleUpdateBreakdownTarget(index, 'sku', e.target.value)}
                                placeholder="Auto-generated if empty"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`price-${index}`}>Price</Label>
                              <Input
                                id={`price-${index}`}
                                type="number"
                                step="0.01"
                                value={target.price}
                                onChange={(e) => handleUpdateBreakdownTarget(index, 'price', e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                              <Input
                                id={`quantity-${index}`}
                                type="number"
                                value={target.quantity}
                                onChange={(e) => handleUpdateBreakdownTarget(index, 'quantity', e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`weight-${index}`}>Weight</Label>
                              <Input
                                id={`weight-${index}`}
                                type="number"
                                step="0.1"
                                value={target.weight}
                                onChange={(e) => handleUpdateBreakdownTarget(index, 'weight', e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`weightUnit-${index}`}>Weight Unit</Label>
                              <Input
                                id={`weightUnit-${index}`}
                                value={target.weightUnit}
                                onChange={(e) => handleUpdateBreakdownTarget(index, 'weightUnit', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4">
                      <ArrowRight className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-center">
                        Add target products to create from this bulk item.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBreakdownOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateBreakdownProducts}
              disabled={breakdownTargets.length === 0 || createBreakdownProductsMutation.isPending}
            >
              {createBreakdownProductsMutation.isPending ? (
                <CannabisMascotLoader size="sm" variant="bud" />
              ) : (
                'Create Products'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}