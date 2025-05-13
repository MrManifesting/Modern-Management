import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingPage } from '@/components/ui/inventory-loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  PlusSquare, 
  PackageCheck, 
  Package, 
  AlertCircle,
  Scale,
  Save
} from 'lucide-react';

import { 
  BreakdownProvider, 
  useBreakdown, 
  BreakdownItem, 
  WEIGHT_BRACKETS,
  calculateQuantity,
  convertWeight
} from '@/components/inventory/drag-drop-context';
import { DraggableInventoryItem } from '@/components/inventory/draggable-inventory-item';
import { DroppableWeightCategory } from '@/components/inventory/droppable-weight-category';

type Item = {
  id: number;
  name: string;
  description: string;
  sku: string;
  quantity: number;
  basePrice: number;
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

// The main component for the new bulk breakdown page
const DragBulkBreakdownPage: React.FC = () => {
  return (
    <BreakdownProvider>
      <BulkBreakdownContent />
    </BreakdownProvider>
  );
};

// The internal component that uses the breakdown context
const BulkBreakdownContent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    waitingItems, 
    targetItems, 
    addToWaiting, 
    moveToTarget, 
    moveToWaiting,
    clearTargets
  } = useBreakdown();
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savingBreakdown, setSavingBreakdown] = useState(false);
  
  // Query for all available bulk items
  const { data: allItems, isLoading: isLoadingItems } = useQuery({ 
    queryKey: ['/api/items'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Filter items with weight >= 1 lb or 16 oz
  const bulkItems = React.useMemo(() => {
    if (!allItems || !Array.isArray(allItems)) return [];
    
    return allItems.filter((item: Item) => {
      // Convert different units to a standard (ounces)
      let standardizedWeight = 0;
      
      if (item.weight && item.weightUnit) {
        if (item.weightUnit.toLowerCase() === 'lb' || item.weightUnit.toLowerCase() === 'lbs') {
          standardizedWeight = item.weight * 16; // 1 lb = 16 oz
        } else if (item.weightUnit.toLowerCase() === 'oz') {
          standardizedWeight = item.weight;
        } else if (item.weightUnit.toLowerCase() === 'g') {
          standardizedWeight = item.weight / 28.35; // Approximate conversion from grams to oz
        }
      }
      
      // Consider items with at least 16 oz (1 lb) as bulk items
      return standardizedWeight >= 16 && item.quantity > 0;
    });
  }, [allItems]);
  
  // Mutation to add an item to the waiting area
  const moveToWaitingAreaMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      return apiRequest(`/api/bulk-items/${id}/move-to-waiting`, 'POST', {
        quantity,
        employeeId: 1 // TODO: Replace with actual logged-in employee ID
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Item added to waiting area",
        description: "The bulk item has been moved to the waiting area for breakdown."
      });
      
      // Find the item in the bulk items and add it to our local waiting area
      const item = bulkItems.find((item: Item) => item.id === variables.id);
      if (item) {
        addToWaiting({
          ...item,
          quantity: variables.quantity
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waiting-items'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add item to waiting area: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to create breakdown products
  const createBreakdownMutation = useMutation({
    mutationFn: async (breakdownTargets: any[]) => {
      return apiRequest('/api/product-breakdowns', 'POST', {
        bulkItemId: waitingItems[0]?.id, // Use the first waiting item
        employeeId: 1, // TODO: Replace with actual logged-in employee ID
        targetProducts: breakdownTargets
      });
    },
    onSuccess: (data: any) => {
      // Now process the breakdown
      if (data && data.id) {
        processBreakdownMutation.mutate({
          breakdownId: data.id,
          targets: Object.values(targetItems).flat().map(item => ({
            name: item.name,
            price: item.price || 0,
            quantity: item.quantity,
            weight: item.weight || 0,
            weightUnit: item.weightUnit || 'g',
            sku: item.sku
          }))
        });
      } else {
        setSavingBreakdown(false);
        toast({
          title: "Error",
          description: "Failed to create breakdown: Invalid response from server",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      setSavingBreakdown(false);
      toast({
        title: "Error",
        description: `Failed to create breakdown: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to process the breakdown
  const processBreakdownMutation = useMutation({
    mutationFn: async ({ breakdownId, targets }: { breakdownId: number; targets: any[] }) => {
      return apiRequest(`/api/product-breakdowns/${breakdownId}/create-products`, 'POST', {
        employeeId: 1, // TODO: Replace with actual logged-in employee ID
        targetProducts: targets
      });
    },
    onSuccess: () => {
      setSavingBreakdown(false);
      setSaveDialogOpen(false);
      
      toast({
        title: "Breakdown completed",
        description: "The bulk item has been successfully broken down into smaller products."
      });
      
      // Clear the breakdown
      clearTargets();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waiting-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/breakdown-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/product-breakdowns'] });
    },
    onError: (error) => {
      setSavingBreakdown(false);
      toast({
        title: "Error",
        description: `Failed to process breakdown: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
  });
  
  // Handle adding a bulk item to the waiting area
  const handleAddToWaiting = (item: Item) => {
    moveToWaitingAreaMutation.mutate({ id: item.id, quantity: 1 });
  };
  
  // Handle moving an item from waiting to a target category
  const handleDropOnCategory = (categoryName: string, item: BreakdownItem & { dragQuantity: number }) => {
    // Get the weight for this category
    const category = Object.values(WEIGHT_BRACKETS).find(bracket => bracket.name === categoryName);
    if (!category || !item.weight || !item.weightUnit) return;
    
    // Calculate how many target items can be created from the source item
    const maxCreatable = calculateQuantity(item.weight, item.weightUnit, category.value, category.unit);
    
    // If the calculated quantity is zero, don't allow the drop
    if (maxCreatable <= 0) {
      toast({
        title: "Cannot create product",
        description: `The source item is too small to create a ${category.name} product.`,
        variant: "destructive"
      });
      return;
    }
    
    // Limit by the drag quantity or calculated max
    const quantity = Math.min(item.dragQuantity || 1, maxCreatable);
    
    // Calculate the price based on weight ratio
    const sourceWeightInG = convertWeight(item.weight, item.weightUnit, 'g');
    const targetWeightInG = convertWeight(category.value, category.unit, 'g');
    const weightRatio = targetWeightInG / sourceWeightInG;
    
    // Apply the weight ratio to the base price, with a small markup for smaller quantities
    const basePrice = item.price || 0;
    let adjustedPrice = basePrice * weightRatio;
    
    // Add markup for smaller divisions
    if (targetWeightInG < 28) {
      adjustedPrice *= 1.15; // 15% markup for small quantities
    } else if (targetWeightInG < 113) {
      adjustedPrice *= 1.1; // 10% markup for medium quantities
    } else if (targetWeightInG < 227) {
      adjustedPrice *= 1.05; // 5% markup for larger quantities
    }
    
    // Create a unique name for the new product
    const newName = `${item.name || ''} (${category.name})`;
    
    // Move the item to the target category
    moveToTarget(item.id, categoryName, quantity);
  };
  
  // Handle saving the breakdown
  const handleSaveBreakdown = () => {
    setSavingBreakdown(true);
    
    // Get all targets from all categories and flatten them
    const allTargets = Object.entries(targetItems).flatMap(([categoryName, items]) => {
      const category = Object.values(WEIGHT_BRACKETS).find(bracket => bracket.name === categoryName);
      if (!category) return [];
      
      return items.map(item => ({
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity,
        weight: category.value,
        weightUnit: category.unit,
        sku: item.sku
      }));
    });
    
    // If no targets, show an error
    if (allTargets.length === 0) {
      setSavingBreakdown(false);
      toast({
        title: "No products to create",
        description: "You must add products to at least one weight category before saving.",
        variant: "destructive"
      });
      return;
    }
    
    // Create the breakdown
    createBreakdownMutation.mutate(allTargets);
  };
  
  if (isLoadingItems) {
    return <LoadingPage message="Loading inventory data..." variant="boxes" />;
  }
  
  const hasBreakdownProducts = Object.values(targetItems).some(items => items.length > 0);
  
  return (
    <div className="container mx-auto p-2 sm:p-4 pb-16">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Bulk Product Breakdown</h1>
      
      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4 max-w-full sm:max-w-md overflow-x-auto">
          <TabsTrigger value="bulk">Bulk Inventory</TabsTrigger>
          <TabsTrigger value="waiting">Waiting Area</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>
        
        {/* Bulk Inventory Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] pb-6">
            {bulkItems?.length > 0 ? (
              bulkItems.map((item: Item) => (
                <div key={item.id} className="relative">
                  <DraggableInventoryItem
                    item={{
                      id: item.id,
                      name: item.name,
                      sku: item.sku,
                      quantity: item.quantity,
                      weight: item.weight,
                      weightUnit: item.weightUnit,
                      strain: item.strain,
                      price: item.basePrice
                    }}
                  />
                  <Button
                    className="absolute bottom-4 right-4"
                    size="sm"
                    onClick={() => handleAddToWaiting(item)}
                  >
                    Add to Waiting
                  </Button>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-8 bg-muted rounded-md">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No Bulk Items</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No bulk items are currently available in inventory. Add items with sufficient weight to manage breakdown processes.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Waiting Area Tab */}
        <TabsContent value="waiting" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] pb-6">
            {waitingItems.length > 0 ? (
              waitingItems.map((item) => (
                <DraggableInventoryItem key={item.id} item={item} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-8 bg-muted rounded-md">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Waiting Area Empty</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No items are currently in the waiting area. Move bulk items here to prepare them for breakdown.
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-8">
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>How to use the breakdown system</AlertTitle>
              <AlertDescription>
                Drag items from the waiting area to the breakdown tab, and drop them into appropriate weight categories.
                The system will automatically calculate how many units can be created based on the weight conversion.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Weight Breakdown Categories</h2>
            <Button 
              disabled={!hasBreakdownProducts}
              onClick={() => setSaveDialogOpen(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Breakdown
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 h-auto md:h-[500px] max-h-[calc(100vh-280px)] overflow-y-auto pb-6">
            {/* 7 Gram Category */}
            <DroppableWeightCategory
              name={WEIGHT_BRACKETS.SEVEN_GRAM.name}
              weight={WEIGHT_BRACKETS.SEVEN_GRAM.value}
              unit={WEIGHT_BRACKETS.SEVEN_GRAM.unit}
              items={targetItems[WEIGHT_BRACKETS.SEVEN_GRAM.name]}
              onDrop={(item) => handleDropOnCategory(WEIGHT_BRACKETS.SEVEN_GRAM.name, item)}
              onMoveToWaiting={(itemId) => moveToWaiting(itemId, WEIGHT_BRACKETS.SEVEN_GRAM.name)}
            />
            
            {/* 14 Gram Category */}
            <DroppableWeightCategory
              name={WEIGHT_BRACKETS.FOURTEEN_GRAM.name}
              weight={WEIGHT_BRACKETS.FOURTEEN_GRAM.value}
              unit={WEIGHT_BRACKETS.FOURTEEN_GRAM.unit}
              items={targetItems[WEIGHT_BRACKETS.FOURTEEN_GRAM.name]}
              onDrop={(item) => handleDropOnCategory(WEIGHT_BRACKETS.FOURTEEN_GRAM.name, item)}
              onMoveToWaiting={(itemId) => moveToWaiting(itemId, WEIGHT_BRACKETS.FOURTEEN_GRAM.name)}
            />
            
            {/* 28 Gram Category */}
            <DroppableWeightCategory
              name={WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name}
              weight={WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.value}
              unit={WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.unit}
              items={targetItems[WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name]}
              onDrop={(item) => handleDropOnCategory(WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name, item)}
              onMoveToWaiting={(itemId) => moveToWaiting(itemId, WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name)}
            />
            
            {/* Quarter Pound Category */}
            <DroppableWeightCategory
              name={WEIGHT_BRACKETS.QUARTER_POUND.name}
              weight={WEIGHT_BRACKETS.QUARTER_POUND.value}
              unit={WEIGHT_BRACKETS.QUARTER_POUND.unit}
              items={targetItems[WEIGHT_BRACKETS.QUARTER_POUND.name]}
              onDrop={(item) => handleDropOnCategory(WEIGHT_BRACKETS.QUARTER_POUND.name, item)}
              onMoveToWaiting={(itemId) => moveToWaiting(itemId, WEIGHT_BRACKETS.QUARTER_POUND.name)}
            />
            
            {/* Half Pound Category */}
            <DroppableWeightCategory
              name={WEIGHT_BRACKETS.HALF_POUND.name}
              weight={WEIGHT_BRACKETS.HALF_POUND.value}
              unit={WEIGHT_BRACKETS.HALF_POUND.unit}
              items={targetItems[WEIGHT_BRACKETS.HALF_POUND.name]}
              onDrop={(item) => handleDropOnCategory(WEIGHT_BRACKETS.HALF_POUND.name, item)}
              onMoveToWaiting={(itemId) => moveToWaiting(itemId, WEIGHT_BRACKETS.HALF_POUND.name)}
            />
          </div>
          
          <Alert variant="default" className="mt-4">
            <Scale className="h-4 w-4" />
            <AlertTitle>How to use weight categories</AlertTitle>
            <AlertDescription>
              Drag bulk items from the waiting area to these weight categories to break them down.
              The system will calculate the maximum number of units that can be created based on 
              weight conversion (1 pound = 454 grams).
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
      
      {/* Save Breakdown Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Breakdown</DialogTitle>
            <DialogDescription>
              You're about to create the following breakdown products from your bulk inventory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {Object.entries(targetItems).map(([categoryName, items]) => {
              if (items.length === 0) return null;
              
              return (
                <div key={categoryName} className="space-y-2">
                  <h3 className="font-medium flex items-center">
                    <PlusSquare className="h-4 w-4 mr-2" />
                    {categoryName} Products
                  </h3>
                  <div className="ml-6 space-y-1">
                    {items.map((item, index) => (
                      <div key={item.id} className="text-sm flex justify-between">
                        <span>{item.name || `Product #${index + 1}`}</span>
                        <span>Quantity: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              );
            })}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={savingBreakdown}>
              Cancel
            </Button>
            <Button onClick={handleSaveBreakdown} disabled={savingBreakdown}>
              {savingBreakdown ? (
                <>Processing...</>
              ) : (
                <>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Create Products
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DragBulkBreakdownPage;