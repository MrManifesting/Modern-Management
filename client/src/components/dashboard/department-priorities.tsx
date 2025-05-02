import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Megaphone,
  ShoppingBag,
  Package,
  Tag,
  Calendar as CalendarIcon,
  PlusCircle,
  ListChecks,
  Clock,
  ArrowUpRight,
  ShoppingCart,
} from 'lucide-react';
import { apiRequestSimple } from '@/lib/queryClient';
import { format } from 'date-fns';

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  type: 'intake' | 'marketing' | 'fulfillment' | 'meeting';
  description?: string;
}

// Mock data for initial development
const mockEvents: CalendarEvent[] = [
  {
    id: 1,
    title: 'New Product Intake',
    date: new Date(2023, 4, 15),
    type: 'intake',
    description: 'Receiving new Exotic Top Shelf products'
  },
  {
    id: 2,
    title: 'Marketing Campaign Launch',
    date: new Date(2023, 4, 20),
    type: 'marketing',
    description: 'Summer promotion launch'
  },
  {
    id: 3,
    title: 'Inventory Restock',
    date: new Date(2023, 4, 25),
    type: 'intake',
    description: 'Major restock from Tree Mason supplier'
  },
];

export function DepartmentPriorities() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState('marketing');

  // Get items that need SEO/marketing work (no descriptions or images)
  const { data: marketingItems, isLoading: isLoadingMarketingItems } = useQuery({
    queryKey: ['/api/items'],
    select: (items: any[]) => items.filter(item => 
      !item.description || 
      item.description.length < 50 || 
      (Array.isArray(item.images) && item.images.length === 0)
    ).slice(0, 5),
  });

  // Get recent Shopify orders that need fulfillment
  const { data: shopifyOrders, isLoading: isLoadingShopifyOrders } = useQuery({
    queryKey: ['/api/shopify/reports/sales/7d'],
    queryFn: async () => {
      try {
        const response = await apiRequestSimple('/api/shopify/reports/sales/7d');
        return response.periodSales || [];
      } catch (error) {
        console.error("Error fetching Shopify orders:", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get inventory items that need attention (low stock)
  const { data: inventoryItems, isLoading: isLoadingInventoryItems } = useQuery({
    queryKey: ['/api/items'],
    select: (items: any[]) => items.filter(item => 
      item.quantity < 10 && item.quantity > 0
    ).slice(0, 5),
  });

  // Render marketing priority items
  const renderMarketingPriorities = () => {
    if (isLoadingMarketingItems) {
      return Array(3).fill(0).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-3 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ));
    }

    if (!marketingItems || marketingItems.length === 0) {
      return (
        <div className="py-8 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">No marketing tasks</h3>
          <p className="text-sm text-muted-foreground mt-2">
            All products have proper descriptions and images.
          </p>
        </div>
      );
    }

    return marketingItems.map((item: any) => (
      <div key={item.id} className="flex items-start space-x-4 py-3 border-b last:border-0">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
          {item.images && item.images.length > 0 ? (
            <img 
              src={item.images[0]} 
              alt={item.name} 
              className="w-full h-full object-cover rounded" 
            />
          ) : (
            <Tag className="h-6 w-6 text-amber-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <h4 className="font-medium text-sm">{item.name}</h4>
            <Button size="sm" variant="ghost" className="h-auto p-1">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {!item.description || item.description.length < 50 ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                Needs Description
              </Badge>
            ) : null}
            {!item.images || item.images.length === 0 ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                Needs Images
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    ));
  };

  // Render fulfillment priority items (Shopify orders)
  const renderFulfillmentPriorities = () => {
    if (isLoadingShopifyOrders) {
      return Array(3).fill(0).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-3 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ));
    }

    if (!shopifyOrders || shopifyOrders.length === 0) {
      return (
        <div className="py-8 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">No pending orders</h3>
          <p className="text-sm text-muted-foreground mt-2">
            All orders have been fulfilled.
          </p>
        </div>
      );
    }

    return shopifyOrders.slice(0, 5).map((order: any, index: number) => (
      <div key={index} className="flex items-start space-x-4 py-3 border-b last:border-0">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
          <ShoppingBag className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <h4 className="font-medium text-sm">
              Order {order.orderId || `#${1000 + index}`}
            </h4>
            <Button size="sm" variant="ghost" className="h-auto p-1">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
              {order.orders || (index + 1)} items
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
              ${order.revenue?.toFixed(2) || ((index + 1) * 50).toFixed(2)}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {order.date ? format(new Date(order.date), 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>
    ));
  };

  // Render inventory priority items
  const renderInventoryPriorities = () => {
    if (isLoadingInventoryItems) {
      return Array(3).fill(0).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-3 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ));
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      return (
        <div className="py-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Inventory levels good</h3>
          <p className="text-sm text-muted-foreground mt-2">
            No products are currently low in stock.
          </p>
        </div>
      );
    }

    return inventoryItems.map((item: any) => (
      <div key={item.id} className="flex items-start space-x-4 py-3 border-b last:border-0">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center">
          <Package className="h-6 w-6 text-red-500" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <h4 className="font-medium text-sm">{item.name}</h4>
            <Button size="sm" variant="ghost" className="h-auto p-1">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge 
              variant="outline" 
              className={
                item.quantity < 5 
                  ? "bg-red-500/10 text-red-600 border-red-200" 
                  : "bg-amber-500/10 text-amber-600 border-amber-200"
              }
            >
              {item.quantity} left in stock
            </Badge>
            {item.sku && (
              <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
                SKU: {item.sku}
              </Badge>
            )}
          </div>
        </div>
      </div>
    ));
  };

  // Render calendar events for the selected date
  const renderCalendarEvents = () => {
    // Filter events for the selected date
    const todaysEvents = selectedDate ? mockEvents.filter(
      event => event.date.toDateString() === selectedDate.toDateString()
    ) : [];

    if (todaysEvents.length === 0) {
      return (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">No events scheduled for this date</p>
        </div>
      );
    }

    return todaysEvents.map(event => (
      <div key={event.id} className="flex items-start space-x-3 py-2 border-b last:border-0">
        <div className={`w-2 self-stretch rounded ${
          event.type === 'intake' ? 'bg-green-500' :
          event.type === 'marketing' ? 'bg-purple-500' :
          event.type === 'fulfillment' ? 'bg-blue-500' : 'bg-gray-500'
        }`} />
        <div className="flex-1">
          <h4 className="font-medium text-sm">{event.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
        </div>
        <div className="text-xs font-medium">
          {format(event.date, 'h:mm a')}
        </div>
      </div>
    ));
  };

  return (
    <Card className="border-2 border-amber-500/50 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-amber-500" />
          Department Priorities
        </CardTitle>
        <CardDescription>
          High-priority tasks and items requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="marketing" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-none px-6">
            <TabsTrigger value="marketing" className="flex-1">
              <Megaphone className="h-4 w-4 mr-2" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="fulfillment" className="flex-1">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Fulfillment
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
          </TabsList>
          
          {/* Marketing Tab */}
          <TabsContent value="marketing" className="m-0">
            <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-800/20">
              <h3 className="text-sm font-medium flex items-center">
                <Tag className="h-4 w-4 mr-2 text-amber-600" />
                Items Needing SEO & Images
              </h3>
            </div>
            <ScrollArea className="h-[340px]">
              <div className="px-6 divide-y">
                {renderMarketingPriorities()}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Fulfillment Tab */}
          <TabsContent value="fulfillment" className="m-0">
            <div className="px-6 py-2 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-800/20">
              <h3 className="text-sm font-medium flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2 text-blue-600" />
                Shopify Orders Waiting Fulfillment
              </h3>
            </div>
            <ScrollArea className="h-[340px]">
              <div className="px-6 divide-y">
                {renderFulfillmentPriorities()}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Inventory Tab */}
          <TabsContent value="inventory" className="m-0">
            <div className="px-6 py-2 bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-800/20">
              <h3 className="text-sm font-medium flex items-center">
                <Package className="h-4 w-4 mr-2 text-red-600" />
                Low Stock Items
              </h3>
            </div>
            <ScrollArea className="h-[340px]">
              <div className="px-6 divide-y">
                {renderInventoryPriorities()}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Calendar Tab */}
          <TabsContent value="calendar" className="m-0">
            <div className="px-6 py-2 bg-purple-50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-800/20">
              <h3 className="text-sm font-medium flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 text-purple-600" />
                Upcoming Events & Intakes
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 border-r border-gray-100 dark:border-gray-800">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="mx-auto"
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-sm">
                    {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                  </h4>
                  <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs">
                    <PlusCircle className="h-3 w-3" />
                    Add Event
                  </Button>
                </div>
                <ScrollArea className="h-[210px]">
                  <div className="divide-y">
                    {renderCalendarEvents()}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-3 border-t">
        <div className="text-xs text-muted-foreground">
          <Clock className="inline-block h-3 w-3 mr-1" />
          Last updated: {format(new Date(), 'MMM d, h:mm a')}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
          // Refresh data based on the active tab
          if (activeTab === 'marketing') {
            // Invalidate marketing items query
          } else if (activeTab === 'fulfillment') {
            // Invalidate shopify orders query
          } else if (activeTab === 'inventory') {
            // Invalidate inventory items query
          }
        }}>
          View All
        </Button>
      </CardFooter>
    </Card>
  );
}