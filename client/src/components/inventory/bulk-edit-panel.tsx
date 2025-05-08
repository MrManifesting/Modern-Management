import React, { useState } from 'react';
import { 
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Item } from "@shared/schema";
import { Tags, Store, PenSquare, CircleDollarSign, Percent, ShoppingCart, Tag, AlertCircle, CheckCircle2 } from "lucide-react";
import { ApiResponse, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type BulkEditPanelProps = {
  selectedItems: Item[];
  onBulkEditComplete: () => void;
};

// Define the form schema for bulk edits
const bulkEditSchema = z.object({
  action: z.enum(['status', 'price', 'sale', 'category', 'tags', 'syncToShopify']),
  status: z.enum(['draft', 'listed', 'sold', 'archived']).optional(),
  priceAdjustment: z.enum(['fixed', 'percentage', 'increase', 'decrease']).optional(),
  priceValue: z.string().optional(),
  category: z.string().optional(),
  salePrice: z.string().optional(),
  syncToShopify: z.boolean().optional(),
  tags: z.string().optional(),
});

type BulkEditFormValues = z.infer<typeof bulkEditSchema>;

export default function BulkEditPanel({ selectedItems, onBulkEditComplete }: BulkEditPanelProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    items: { id: number; name: string; success: boolean; message?: string }[];
  }>({ success: 0, failed: 0, items: [] });

  const form = useForm<BulkEditFormValues>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      action: 'status',
      status: 'listed',
      priceAdjustment: 'fixed',
      priceValue: '',
      category: '',
      salePrice: '',
      syncToShopify: false,
      tags: '',
    },
  });

  const selectedAction = form.watch('action');
  const selectedPriceAdjustment = form.watch('priceAdjustment');

  const applyBulkEdit = async (values: BulkEditFormValues) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to bulk edit.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults({ success: 0, failed: 0, items: [] });

    const totalItems = selectedItems.length;
    let successCount = 0;
    let failCount = 0;
    const resultDetails: { id: number; name: string; success: boolean; message?: string }[] = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      try {
        // Prepare the update data based on the selected action
        const updateData: Record<string, any> = {};
        
        if (values.action === 'status' && values.status) {
          updateData.status = values.status;
        } 
        else if (values.action === 'price' && values.priceValue) {
          const numericValue = parseFloat(values.priceValue);
          if (!isNaN(numericValue)) {
            if (values.priceAdjustment === 'fixed') {
              updateData.basePrice = numericValue;
            } else if (values.priceAdjustment === 'percentage') {
              // Apply percentage change to base price
              const currentPrice = item.basePrice || 0;
              updateData.basePrice = currentPrice * (1 + (numericValue / 100));
            } else if (values.priceAdjustment === 'increase') {
              // Add fixed amount to current price
              const currentPrice = item.basePrice || 0;
              updateData.basePrice = currentPrice + numericValue;
            } else if (values.priceAdjustment === 'decrease') {
              // Subtract fixed amount from current price
              const currentPrice = item.basePrice || 0;
              updateData.basePrice = Math.max(0, currentPrice - numericValue);
            }
          }
        } 
        else if (values.action === 'sale' && values.salePrice) {
          const numericValue = parseFloat(values.salePrice);
          if (!isNaN(numericValue)) {
            updateData.salePrice = numericValue;
          }
        } 
        else if (values.action === 'category' && values.category) {
          updateData.category = values.category;
        } 
        else if (values.action === 'tags' && values.tags) {
          const newTags = values.tags.split(',').map(tag => tag.trim());
          updateData.tags = newTags;
        }
        else if (values.action === 'syncToShopify') {
          // This is handled separately via a dedicated endpoint
          const syncResponse = await apiRequest('POST', `/api/items/${item.id}/push-to-marketplace/4`, {});
          const syncData = await syncResponse.json();
          
          if (syncResponse.ok) {
            successCount++;
            resultDetails.push({
              id: item.id,
              name: item.name,
              success: true,
              message: syncData.message || 'Synchronized with Shopify'
            });
          } else {
            failCount++;
            resultDetails.push({
              id: item.id,
              name: item.name,
              success: false,
              message: syncData.error || 'Failed to sync with Shopify'
            });
          }
          
          setProgress(Math.floor(((i + 1) / totalItems) * 100));
          continue; // Skip the regular update for this item
        }

        // If we have updates to apply
        if (Object.keys(updateData).length > 0) {
          // Call the API to update the item
          const response = await apiRequest('PATCH', `/api/items/${item.id}`, updateData);
          const data = await response.json();
          
          if (response.ok) {
            successCount++;
            resultDetails.push({
              id: item.id,
              name: item.name,
              success: true
            });
          } else {
            failCount++;
            resultDetails.push({
              id: item.id,
              name: item.name,
              success: false,
              message: data.error || 'Update failed'
            });
          }
        }
      } catch (error) {
        failCount++;
        resultDetails.push({
          id: item.id,
          name: item.name,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Update progress
      setProgress(Math.floor(((i + 1) / totalItems) * 100));
    }
    
    // Update final results
    setResults({
      success: successCount,
      failed: failCount,
      items: resultDetails
    });
    
    setIsProcessing(false);
    
    // Show toast with summary
    toast({
      title: "Bulk edit complete",
      description: `Successfully updated ${successCount} items. Failed: ${failCount} items.`,
      variant: successCount > 0 && failCount === 0 ? "default" : "destructive",
    });
  };

  const handleSubmit = form.handleSubmit(applyBulkEdit);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bulk Edit {selectedItems.length} Items</CardTitle>
        <CardDescription>
          Make changes to multiple inventory items at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Action</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isProcessing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="status">
                        <div className="flex items-center">
                          <Tag className="mr-2 h-4 w-4" />
                          <span>Change Status</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="price">
                        <div className="flex items-center">
                          <CircleDollarSign className="mr-2 h-4 w-4" />
                          <span>Update Price</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="sale">
                        <div className="flex items-center">
                          <Percent className="mr-2 h-4 w-4" />
                          <span>Set Sale Price</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="category">
                        <div className="flex items-center">
                          <PenSquare className="mr-2 h-4 w-4" />
                          <span>Change Category</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tags">
                        <div className="flex items-center">
                          <Tags className="mr-2 h-4 w-4" />
                          <span>Update Tags</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="syncToShopify">
                        <div className="flex items-center">
                          <Store className="mr-2 h-4 w-4" />
                          <span>Sync to Shopify</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the action you want to perform on all selected items
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedAction === 'status' && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isProcessing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="listed">Listed</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Set the new status for all selected items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedAction === 'price' && (
              <>
                <FormField
                  control={form.control}
                  name="priceAdjustment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Adjustment Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isProcessing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select adjustment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Set Fixed Price</SelectItem>
                          <SelectItem value="percentage">Percentage Change</SelectItem>
                          <SelectItem value="increase">Increase by Amount</SelectItem>
                          <SelectItem value="decrease">Decrease by Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose how to adjust the price
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedPriceAdjustment === 'fixed' && 'New Price ($)'}
                        {selectedPriceAdjustment === 'percentage' && 'Percentage (%)'}
                        {selectedPriceAdjustment === 'increase' && 'Amount to Add ($)'}
                        {selectedPriceAdjustment === 'decrease' && 'Amount to Subtract ($)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder={
                            selectedPriceAdjustment === 'fixed' ? '19.99' : 
                            selectedPriceAdjustment === 'percentage' ? '10' :
                            '5.00'
                          } 
                          {...field}
                          disabled={isProcessing}
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedPriceAdjustment === 'fixed' && 'Set a specific price for all selected items'}
                        {selectedPriceAdjustment === 'percentage' && 'Enter a percentage (e.g., 10 for 10% increase, -10 for 10% decrease)'}
                        {selectedPriceAdjustment === 'increase' && 'Add this amount to the current price of each item'}
                        {selectedPriceAdjustment === 'decrease' && 'Subtract this amount from the current price of each item'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {selectedAction === 'sale' && (
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Price ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="14.99" 
                        {...field}
                        disabled={isProcessing}
                      />
                    </FormControl>
                    <FormDescription>
                      Set a sale price for all selected items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedAction === 'category' && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Category</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Category name" 
                        {...field}
                        disabled={isProcessing}
                      />
                    </FormControl>
                    <FormDescription>
                      Set a category for all selected items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedAction === 'tags' && (
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="tag1, tag2, tag3" 
                        {...field}
                        disabled={isProcessing}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of tags to apply to all selected items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedAction === 'syncToShopify' && (
              <Alert className="my-4">
                <Store className="h-4 w-4" />
                <AlertTitle>Sync Selected Items to Shopify</AlertTitle>
                <AlertDescription>
                  This will push all selected items to your Shopify store. 
                  Make sure your items have SKUs and required information.
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing {progress}%</span>
                  <span>{Math.floor(progress/100 * selectedItems.length)}/{selectedItems.length} items</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {results.items.length > 0 && (
              <div className="space-y-4 mt-4">
                <div className="flex space-x-4">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Success: {results.success}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Failed: {results.failed}
                  </Badge>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {results.items.map((result, index) => (
                    <div 
                      key={index} 
                      className={`py-1 px-2 text-sm flex items-center ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      } ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                    >
                      {result.success ? 
                        <CheckCircle2 className="h-3 w-3 mr-2" /> : 
                        <AlertCircle className="h-3 w-3 mr-2" />
                      }
                      <span className="font-medium">{result.name}</span>
                      {result.message && (
                        <span className="ml-2 text-xs opacity-80">- {result.message}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBulkEditComplete}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isProcessing || selectedItems.length === 0}
                className="min-w-[120px]"
              >
                {isProcessing ? 'Processing...' : 'Apply Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}