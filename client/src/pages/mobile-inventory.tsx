import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Minus, 
  Package, 
  AlertCircle, 
  CheckCircle,
  Scan,
  Filter,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  status: string;
  category: string | null;
  base_price: number | null;
  sale_price: number | null;
  weight: string | null;
  tier: string | null;
  image: string | null;
}

export default function MobileInventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const { toast } = useToast();

  // Fetch inventory items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/items', searchTerm, selectedCategory],
    queryFn: async () => {
      let url = '/api/items?';
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (selectedCategory !== 'all') url += `category=${encodeURIComponent(selectedCategory)}&`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    }
  });

  // Filter active items with quantities
  const activeItems = items.filter((item: InventoryItem) => 
    item.status === 'active' && item.quantity > 0
  );

  // Stock adjustment mutation
  const adjustStockMutation = useMutation({
    mutationFn: async ({ itemId, adjustment, type }: { itemId: number; adjustment: number; type: 'add' | 'remove' }) => {
      const response = await apiRequest('POST', `/api/items/${itemId}/adjust-stock`, {
        adjustment,
        type,
        reason: `Mobile ${type === 'add' ? 'intake' : 'fulfillment'}`
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Stock Updated",
        description: "Inventory quantity has been adjusted successfully"
      });
      setSelectedItem(null);
      setAdjustQuantity('');
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleStockAdjustment = (type: 'add' | 'remove') => {
    if (!selectedItem || !adjustQuantity) return;
    
    const adjustment = parseInt(adjustQuantity);
    if (isNaN(adjustment) || adjustment <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }

    adjustStockMutation.mutate({
      itemId: selectedItem.id,
      adjustment,
      type
    });
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A';
    return `$${(price / 100).toFixed(2)}`;
  };

  const getStockLevelColor = (quantity: number) => {
    if (quantity === 0) return 'bg-red-500';
    if (quantity < 10) return 'bg-orange-500';
    if (quantity < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return React.createElement('div', { className: "min-h-screen bg-gray-50 pb-20" },
    // Header
    React.createElement('div', { className: "sticky top-0 z-40 bg-white shadow-sm" },
      React.createElement('div', { className: "p-4" },
        React.createElement('h1', { className: "text-2xl font-bold text-gray-900 mb-4" }, 'Mobile Inventory'),
        
        // Search Bar
        React.createElement('div', { className: "relative" },
          React.createElement(Input, {
            type: "search",
            placeholder: "Search products...",
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            className: "pl-10 pr-10 h-12 text-lg"
          }),
          React.createElement(Search, {
            className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400",
            size: 20
          }),
          React.createElement(Button, {
            variant: "ghost",
            size: "sm",
            onClick: () => setShowFilters(!showFilters),
            className: "absolute right-2 top-1/2 transform -translate-y-1/2"
          },
            React.createElement(Filter, { size: 20 })
          )
        ),
        
        // Filters
        showFilters && React.createElement('div', { className: "mt-4 p-4 bg-gray-100 rounded-lg" },
          React.createElement('div', { className: "flex items-center justify-between mb-3" },
            React.createElement('span', { className: "font-semibold" }, 'Filters'),
            React.createElement(Button, {
              variant: "ghost",
              size: "sm",
              onClick: () => setShowFilters(false)
            },
              React.createElement(X, { size: 16 })
            )
          ),
          React.createElement(Select, {
            value: selectedCategory,
            onValueChange: setSelectedCategory
          },
            React.createElement(SelectTrigger, { className: "h-12" },
              React.createElement(SelectValue, { placeholder: "All Categories" })
            ),
            React.createElement(SelectContent, {},
              React.createElement(SelectItem, { value: "all" }, "All Categories"),
              React.createElement(SelectItem, { value: "flower" }, "Flower"),
              React.createElement(SelectItem, { value: "bulk-flower" }, "Bulk Flower"),
              React.createElement(SelectItem, { value: "preroll" }, "Pre-Rolls"),
              React.createElement(SelectItem, { value: "edible" }, "Edibles"),
              React.createElement(SelectItem, { value: "concentrate" }, "Concentrates")
            )
          )
        )
      )
    ),
    
    // Content
    React.createElement('div', { className: "p-4" },
      // Summary Stats
      React.createElement('div', { className: "grid grid-cols-2 gap-4 mb-6" },
        React.createElement(Card, { className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white" },
          React.createElement(CardContent, { className: "p-4" },
            React.createElement('div', { className: "text-3xl font-bold" }, activeItems.length),
            React.createElement('div', { className: "text-sm opacity-90" }, 'Active Products')
          )
        ),
        React.createElement(Card, { className: "bg-gradient-to-r from-green-500 to-green-600 text-white" },
          React.createElement(CardContent, { className: "p-4" },
            React.createElement('div', { className: "text-3xl font-bold" }, 
              activeItems.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0)
            ),
            React.createElement('div', { className: "text-sm opacity-90" }, 'Total Units')
          )
        )
      ),
      
      // Loading State
      isLoading && React.createElement('div', { className: "text-center py-8" },
        React.createElement('div', { className: "text-gray-500" }, 'Loading inventory...')
      ),
      
      // Items List
      React.createElement('div', { className: "space-y-4" },
        activeItems.map((item: InventoryItem) =>
          React.createElement(Card, {
            key: item.id,
            className: "overflow-hidden touch-manipulation",
            onClick: () => setSelectedItem(item)
          },
            React.createElement(CardContent, { className: "p-4" },
              React.createElement('div', { className: "flex items-start gap-4" },
                // Product Image
                React.createElement('div', { 
                  className: "w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0" 
                },
                  item.image 
                    ? React.createElement('img', {
                        src: item.image,
                        alt: item.name,
                        className: "w-full h-full object-cover rounded-lg"
                      })
                    : React.createElement(Package, { className: "text-gray-400", size: 32 })
                ),
                
                // Product Details
                React.createElement('div', { className: "flex-1 min-w-0" },
                  React.createElement('h3', { className: "font-semibold text-lg truncate" }, item.name),
                  React.createElement('div', { className: "flex items-center gap-2 mt-1" },
                    React.createElement('span', { className: "text-sm text-gray-500" }, item.sku),
                    item.weight && React.createElement(Badge, { variant: "outline" }, item.weight),
                    item.tier && React.createElement(Badge, { variant: "secondary" }, item.tier)
                  ),
                  React.createElement('div', { className: "flex items-center justify-between mt-2" },
                    React.createElement('div', { className: "flex items-center gap-2" },
                      React.createElement('div', { 
                        className: `w-3 h-3 rounded-full ${getStockLevelColor(item.quantity)}` 
                      }),
                      React.createElement('span', { className: "font-medium" }, `${item.quantity} units`)
                    ),
                    React.createElement('div', { className: "text-sm" },
                      item.sale_price 
                        ? React.createElement('span', { className: "font-semibold text-green-600" }, 
                            formatPrice(item.sale_price)
                          )
                        : React.createElement('span', { className: "text-gray-500" }, 
                            formatPrice(item.base_price)
                          )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),
    
    // Stock Adjustment Modal
    selectedItem && React.createElement('div', {
      className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
    },
      React.createElement('div', {
        className: "bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto animate-slide-up"
      },
        React.createElement('div', { className: "p-6" },
          React.createElement('div', { className: "flex items-center justify-between mb-4" },
            React.createElement('h2', { className: "text-xl font-bold" }, 'Adjust Stock'),
            React.createElement(Button, {
              variant: "ghost",
              size: "sm",
              onClick: () => {
                setSelectedItem(null);
                setAdjustQuantity('');
              }
            },
              React.createElement(X, { size: 20 })
            )
          ),
          
          // Selected Item Details
          React.createElement('div', { className: "bg-gray-50 rounded-lg p-4 mb-6" },
            React.createElement('h3', { className: "font-semibold text-lg mb-2" }, selectedItem.name),
            React.createElement('div', { className: "grid grid-cols-2 gap-2 text-sm" },
              React.createElement('div', {},
                React.createElement('span', { className: "text-gray-500" }, 'SKU: '),
                React.createElement('span', { className: "font-medium" }, selectedItem.sku)
              ),
              React.createElement('div', {},
                React.createElement('span', { className: "text-gray-500" }, 'Current Stock: '),
                React.createElement('span', { className: "font-medium" }, `${selectedItem.quantity} units`)
              )
            )
          ),
          
          // Quantity Input
          React.createElement('div', { className: "mb-6" },
            React.createElement('label', { className: "block text-sm font-medium mb-2" }, 'Adjustment Quantity'),
            React.createElement(Input, {
              type: "number",
              placeholder: "Enter quantity",
              value: adjustQuantity,
              onChange: (e) => setAdjustQuantity(e.target.value),
              className: "h-12 text-lg"
            })
          ),
          
          // Action Buttons
          React.createElement('div', { className: "grid grid-cols-2 gap-4" },
            React.createElement(Button, {
              onClick: () => handleStockAdjustment('add'),
              disabled: !adjustQuantity || adjustStockMutation.isPending,
              className: "h-14 text-lg bg-green-600 hover:bg-green-700"
            },
              React.createElement(Plus, { className: "mr-2", size: 20 }),
              'Add Stock'
            ),
            React.createElement(Button, {
              onClick: () => handleStockAdjustment('remove'),
              disabled: !adjustQuantity || parseInt(adjustQuantity) > selectedItem.quantity || adjustStockMutation.isPending,
              variant: "destructive",
              className: "h-14 text-lg"
            },
              React.createElement(Minus, { className: "mr-2", size: 20 }),
              'Remove Stock'
            )
          )
        )
      )
    ),
    
    // Bottom Navigation
    React.createElement('div', {
      className: "fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30"
    },
      React.createElement('div', { className: "grid grid-cols-3 p-2" },
        React.createElement(Button, {
          variant: "ghost",
          className: "flex flex-col items-center py-3"
        },
          React.createElement(Package, { size: 24 }),
          React.createElement('span', { className: "text-xs mt-1" }, 'Products')
        ),
        React.createElement(Button, {
          variant: "ghost",
          className: "flex flex-col items-center py-3"
        },
          React.createElement(Scan, { size: 24 }),
          React.createElement('span', { className: "text-xs mt-1" }, 'Scanner')
        ),
        React.createElement(Button, {
          variant: "ghost",
          className: "flex flex-col items-center py-3"
        },
          React.createElement(Plus, { size: 24 }),
          React.createElement('span', { className: "text-xs mt-1" }, 'Add Item')
        )
      )
    )
  );
}