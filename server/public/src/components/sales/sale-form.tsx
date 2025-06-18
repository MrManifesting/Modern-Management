import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MARKETPLACE_PLATFORMS } from "@/lib/constants";
import { Item } from "../../../shared/schema";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

// Create form schema based on sales schema
const saleFormSchema = z.object({
  itemId: z.number().optional(),
  itemSku: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  salePrice: z.number().min(0.01, "Sale price must be greater than 0"),
  marketplace: z.string().min(1, "Marketplace is required"),
  orderNumber: z.string().optional(),
  trackingNumber: z.string().optional(),
  buyerInfo: z.record(z.string()).optional(),
  saleDate: z.date().default(() => new Date()),
  shippingCost: z.number().default(0),
  fees: z.number().default(0),
  status: z.string().default("completed"),
  notes: z.string().optional(),
})
// Ensure either itemId or itemSku is provided
.refine(data => data.itemId !== undefined || data.itemSku !== undefined, {
  message: "Either item ID or SKU must be provided",
  path: ["itemId"]
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SaleFormProps {
  onSuccess?: () => void;
}

export default function SaleForm({ onSuccess }: SaleFormProps) {
  const { toast } = useToast();
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [searchSku, setSearchSku] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Set up form with default values
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      quantity: 1,
      salePrice: 0,
      marketplace: "",
      shippingCost: 0,
      fees: 0,
      status: "completed",
      saleDate: new Date(),
    },
  });

  // Fetch all items for selection
  const { data: items, isLoading: isItemsLoading } = useQuery({
    queryKey: ['/api/items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/items');
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      return response.json() as Promise<Item[]>;
    },
  });

  // Filtered items based on search
  const filteredItems = items?.filter(item => 
    !searchSku || item.sku.toLowerCase().includes(searchSku.toLowerCase()) || 
    item.name.toLowerCase().includes(searchSku.toLowerCase())
  );

  // Mutation to create a new sale
  const createSaleMutation = useMutation({
    mutationFn: async (data: SaleFormValues) => {
      // Combine buyer info from separate fields
      const buyerInfo = {
        name: buyerName,
        email: buyerEmail,
        address: buyerAddress,
      };
      
      // Format date to ISO string
      const saleDate = data.saleDate.toISOString();
      
      const formattedData = {
        ...data,
        buyerInfo,
        saleDate,
      };
      
      const response = await apiRequest('POST', '/api/sales', formattedData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create sale");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sale recorded successfully",
        description: "The sale has been added to your records.",
      });
      
      // Clear form
      form.reset();
      setBuyerName("");
      setBuyerEmail("");
      setBuyerAddress("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/report'] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to record sale",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  async function onSubmit(values: SaleFormValues) {
    createSaleMutation.mutate(values);
  }

  // Handler for selecting an item
  const handleItemSelect = (itemId: number) => {
    const selectedItem = items?.find(item => item.id === itemId);
    
    if (selectedItem) {
      form.setValue("itemId", selectedItem.id);
      form.setValue("itemSku", selectedItem.sku);
      form.setValue("salePrice", selectedItem.price);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item selection section */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium mb-4">Item Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search by SKU or Name
                </label>
                <Input
                  placeholder="Enter SKU or item name"
                  value={searchSku}
                  onChange={(e) => setSearchSku(e.target.value)}
                />
              </div>
              
              <FormField
                control={form.control}
                name="itemSku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item SKU</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SKU-123456" 
                        {...field} 
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          // Clear itemId when manually entering SKU
                          form.setValue("itemId", undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Item search results */}
            {searchSku && filteredItems && filteredItems.length > 0 && (
              <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">${item.price.toFixed(2)}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleItemSelect(item.id)}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {searchSku && filteredItems?.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">No items found matching "{searchSku}"</p>
            )}
          </div>
          
          {/* Sale details section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Sale Details</h3>
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      step="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="salePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        value={field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="marketplace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marketplace</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select marketplace" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MARKETPLACE_PLATFORMS.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="saleDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Sale Date</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setIsCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Additional information section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Additional Information</h3>
            
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Order #123" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="trackingNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Tracking number" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="shippingCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Cost</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform Fees</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Buyer information section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Buyer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Name
              </label>
              <Input
                placeholder="John Doe"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Email
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Address
              </label>
              <Input
                placeholder="123 Main St, Anytown, US"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Notes section */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any additional notes about this sale"
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Submit button */}
        <Button 
          type="submit"
          className="w-full"
          disabled={createSaleMutation.isPending}
        >
          {createSaleMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Record Sale
        </Button>
      </form>
    </Form>
  );
}