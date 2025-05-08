import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CircleDollarSign, Percent, Tags, ShoppingCart, CircleCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type BulkEditPanelProps = {
  selectedItems: any[];
  onBulkEditComplete: () => void;
};

const BulkEditPanel: React.FC<BulkEditPanelProps> = ({ selectedItems, onBulkEditComplete }) => {
  const [currentTab, setCurrentTab] = useState('status');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Add debugging
  console.log("BulkEditPanel rendered with", selectedItems.length, "items");
  
  // Show toast with debug info when component mounts
  React.useEffect(() => {
    console.log("BulkEditPanel mounted");
    toast({
      title: "Bulk Edit Panel Active",
      description: `Editing ${selectedItems.length} items`
    });
  }, []);

  // Status state
  const [status, setStatus] = useState('');
  
  // Price state
  const [priceAction, setPriceAction] = useState('amount');
  const [priceValue, setPriceValue] = useState('');
  const [applyToRetail, setApplyToRetail] = useState(true);
  const [applyToWholesale, setApplyToWholesale] = useState(true);

  // Marketplace state
  const [publishTo, setPublishTo] = useState<string[]>([]);
  const [syncSelectedItems, setSyncSelectedItems] = useState(false);

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Handle status bulk edit submission
  const handleStatusUpdate = async () => {
    if (!status) {
      toast({
        title: "Status required",
        description: "Please select a status to apply to the selected items.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/items/bulk-update', {
        ids: selectedItems.map(item => item.id),
        updates: {
          status
        }
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Status updated",
          description: `Status updated to "${status}" for ${selectedItems.length} items.`
        });
        onBulkEditComplete();
      } else {
        throw new Error(result.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the selected items.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle price bulk edit submission
  const handlePriceUpdate = async () => {
    if (!priceValue || isNaN(Number(priceValue))) {
      toast({
        title: "Valid price required",
        description: "Please enter a valid price value.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const numericValue = Number(priceValue);
      const updates: any = {};

      if (priceAction === 'amount') {
        updates.basePrice = numericValue;
        if (applyToRetail) updates.retailPrice = numericValue;
        if (applyToWholesale) updates.wholesalePrice = numericValue * 0.5;
      } else if (priceAction === 'increase') {
        updates.priceModifier = {
          type: 'increase',
          value: numericValue,
          applyToRetail,
          applyToWholesale
        };
      } else if (priceAction === 'decrease') {
        updates.priceModifier = {
          type: 'decrease',
          value: numericValue,
          applyToRetail,
          applyToWholesale
        };
      } else if (priceAction === 'percent-increase') {
        updates.priceModifier = {
          type: 'percent-increase',
          value: numericValue,
          applyToRetail,
          applyToWholesale
        };
      } else if (priceAction === 'percent-decrease') {
        updates.priceModifier = {
          type: 'percent-decrease',
          value: numericValue,
          applyToRetail,
          applyToWholesale
        };
      }

      const response = await apiRequest('POST', '/api/items/bulk-update', {
        ids: selectedItems.map(item => item.id),
        updates
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Prices updated",
          description: `Prices updated for ${selectedItems.length} items.`
        });
        onBulkEditComplete();
      } else {
        throw new Error(result.message || "Failed to update prices");
      }
    } catch (error) {
      console.error("Bulk price update error:", error);
      toast({
        title: "Price update failed",
        description: "There was an error updating prices for the selected items.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle marketplace publish submission
  const handlePublishToMarketplace = async () => {
    if (publishTo.length === 0) {
      toast({
        title: "Marketplace required",
        description: "Please select at least one marketplace to publish to.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/items/bulk-publish', {
        ids: selectedItems.map(item => item.id),
        marketplaces: publishTo,
        sync: syncSelectedItems
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Items published",
          description: `${selectedItems.length} items published to selected marketplaces.`
        });
        onBulkEditComplete();
      } else {
        throw new Error(result.message || "Failed to publish items");
      }
    } catch (error) {
      console.error("Bulk publish error:", error);
      toast({
        title: "Publish failed",
        description: "There was an error publishing the selected items.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onBulkEditComplete()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedItems.length} Items</DialogTitle>
          <DialogDescription>
            Make changes to multiple items at once
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="status" onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="status">Update Status</TabsTrigger>
            <TabsTrigger value="price">Update Pricing</TabsTrigger>
            <TabsTrigger value="marketplace">Publish to Marketplaces</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Selected Items Preview</h3>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {selectedItems.map(item => (
                    <Badge key={item.id} variant="outline" className="justify-start overflow-hidden">
                      {item.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="price" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceAction">Price Action</Label>
                  <Select value={priceAction} onValueChange={setPriceAction}>
                    <SelectTrigger id="priceAction">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Set to amount</SelectItem>
                      <SelectItem value="increase">Increase by amount</SelectItem>
                      <SelectItem value="decrease">Decrease by amount</SelectItem>
                      <SelectItem value="percent-increase">Increase by percentage</SelectItem>
                      <SelectItem value="percent-decrease">Decrease by percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priceValue">
                    {priceAction.includes('percent') ? 'Percentage (%)' : 'Amount ($)'}
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      {priceAction.includes('percent') ? <Percent className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4" />}
                    </span>
                    <Input
                      type="number"
                      id="priceValue"
                      placeholder={priceAction.includes('percent') ? "e.g. 10" : "e.g. 29.99"}
                      className="pl-10"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Apply To</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="applyToRetail" checked={applyToRetail} onCheckedChange={(checked) => setApplyToRetail(!!checked)} />
                    <label htmlFor="applyToRetail" className="text-sm font-medium">
                      Apply to retail price
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="applyToWholesale" checked={applyToWholesale} onCheckedChange={(checked) => setApplyToWholesale(!!checked)} />
                    <label htmlFor="applyToWholesale" className="text-sm font-medium">
                      Apply to wholesale price (50% of retail)
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Price Change Preview</h3>
                <div className="max-h-32 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-right py-2">Current</th>
                        <th className="text-right py-2">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.slice(0, 3).map(item => {
                        let newPrice = item.price;
                        const numValue = Number(priceValue) || 0;
                        
                        if (priceAction === 'amount') {
                          newPrice = numValue;
                        } else if (priceAction === 'increase') {
                          newPrice = item.price + numValue;
                        } else if (priceAction === 'decrease') {
                          newPrice = Math.max(0, item.price - numValue);
                        } else if (priceAction === 'percent-increase') {
                          newPrice = item.price * (1 + numValue / 100);
                        } else if (priceAction === 'percent-decrease') {
                          newPrice = item.price * (1 - numValue / 100);
                        }
                        
                        return (
                          <tr key={item.id} className="border-b">
                            <td className="py-2">{item.name}</td>
                            <td className="text-right py-2">{formatPrice(item.price)}</td>
                            <td className="text-right py-2">{formatPrice(newPrice)}</td>
                          </tr>
                        );
                      })}
                      {selectedItems.length > 3 && (
                        <tr>
                          <td colSpan={3} className="text-center py-2 text-muted-foreground">
                            +{selectedItems.length - 3} more items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="marketplace" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Publish To</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <Checkbox 
                      id="shopify" 
                      checked={publishTo.includes('shopify')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPublishTo(prev => [...prev, 'shopify']);
                        } else {
                          setPublishTo(prev => prev.filter(p => p !== 'shopify'));
                        }
                      }} 
                    />
                    <label htmlFor="shopify" className="text-sm font-medium flex-1">
                      Shopify
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="syncItems" 
                    checked={syncSelectedItems}
                    onCheckedChange={(checked) => setSyncSelectedItems(!!checked)} 
                  />
                  <label htmlFor="syncItems" className="text-sm font-medium">
                    Sync inventories immediately after publishing
                  </label>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Publishing Preview</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    {selectedItems.length} items will be published to{' '}
                    {publishTo.length ? publishTo.join(', ') : 'no marketplaces selected'}.
                  </p>
                  {publishTo.includes('shopify') && (
                    <p>
                      Items will be created or updated in your Shopify store.
                    </p>
                  )}
                  <p className="text-xs mt-2">
                    Note: Only items with complete required information will be published successfully.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onBulkEditComplete} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (currentTab === 'status') {
                handleStatusUpdate();
              } else if (currentTab === 'price') {
                handlePriceUpdate();
              } else if (currentTab === 'marketplace') {
                handlePublishToMarketplace();
              }
            }}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              <>
                <CircleCheck className="h-4 w-4" />
                Apply Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditPanel;