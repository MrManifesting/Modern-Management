import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, AlertTriangle, Info, Package, RefreshCcw, ArrowUpDown, CheckCircle2 } from 'lucide-react';

export interface StockAlert {
  id: number;
  itemId: number;
  itemName: string;
  sku: string;
  currentQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: 'critical' | 'low' | 'reorder' | 'ok';
  category: string;
  lastRestockDate: string | null;
}

export interface StockAlertsProps {
  onRestock?: (itemId: number, quantity: number) => void;
  showLowStockOnly?: boolean;
}

const StockAlerts: React.FC<StockAlertsProps> = ({ 
  onRestock,
  showLowStockOnly = false
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<string>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<string>(showLowStockOnly ? 'alerts' : 'all');
  
  // Function to fetch stock alerts data
  const { data: stockAlerts, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/items'], 
    queryFn: async () => {
      const items = await apiRequest('/api/items', { method: 'GET' }) as any[];
      
      // Transform items into stock alerts
      return items.map(item => {
        let status: 'critical' | 'low' | 'reorder' | 'ok' = 'ok';
        
        // Determine status based on quantity thresholds
        if (item.quantity <= 0) {
          status = 'critical';
        } else if (item.quantity <= item.reorderPoint) {
          status = 'reorder';
        } else if (item.quantity <= item.lowStockThreshold) {
          status = 'low';
        }
        
        return {
          id: Date.now() + item.id, // Unique ID for the alert
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          currentQuantity: item.quantity,
          lowStockThreshold: item.lowStockThreshold || 5,
          reorderPoint: item.reorderPoint || 3,
          reorderQuantity: item.reorderQuantity || 10,
          status,
          category: item.category,
          lastRestockDate: item.lastRestockDate
        } as StockAlert;
      });
    }
  });
  
  // Filter based on user selection
  const filteredAlerts = stockAlerts?.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'alerts') return alert.status !== 'ok';
    if (filter === 'critical') return alert.status === 'critical';
    if (filter === 'low') return alert.status === 'low';
    if (filter === 'reorder') return alert.status === 'reorder';
    return true;
  });
  
  // Sort based on user selection
  const sortedAlerts = filteredAlerts?.sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'status') {
      const statusOrder = { critical: 0, reorder: 1, low: 2, ok: 3 };
      comparison = statusOrder[a.status] - statusOrder[b.status];
    } else if (sortField === 'quantity') {
      comparison = a.currentQuantity - b.currentQuantity;
    } else if (sortField === 'name') {
      comparison = a.itemName.localeCompare(b.itemName);
    } else if (sortField === 'category') {
      comparison = a.category.localeCompare(b.category);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Handle restock action
  const handleRestock = async (alert: StockAlert) => {
    try {
      const response = await apiRequest(`/api/items/${alert.itemId}/restock`, {
        method: 'POST',
        body: JSON.stringify({ quantity: alert.reorderQuantity }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // If we get a successful response
      if (response) {
        // Invalidate the items query to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
        
        toast({
          title: 'Restock Successful',
          description: `Added ${alert.reorderQuantity} units of ${alert.itemName}`,
          variant: 'default'
        });
        
        // Call the callback if provided
        if (onRestock) {
          onRestock(alert.itemId, alert.reorderQuantity);
        }
      }
    } catch (error) {
      console.error('Error restocking item:', error);
      toast({
        title: 'Restock Failed',
        description: 'There was a problem processing the restock request.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle sorting change
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Function to get badge variant based on status
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'critical':
        return 'destructive';
      case 'low':
        return 'warning';
      case 'reorder':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  // Function to get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Out of Stock';
      case 'low':
        return 'Low Stock';
      case 'reorder':
        return 'Reorder Now';
      default:
        return 'In Stock';
    }
  };
  
  const getInventoryIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4" />;
      case 'reorder':
        return <Info className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Inventory Stock Alerts</CardTitle>
            <CardDescription>
              Monitor low stock levels and reorder inventory items
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Badge 
            variant={filter === 'all' ? 'default' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All Items
          </Badge>
          <Badge 
            variant={filter === 'alerts' ? 'default' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('alerts')}
          >
            All Alerts
          </Badge>
          <Badge 
            variant={filter === 'critical' ? 'destructive' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('critical')}
          >
            Out of Stock
          </Badge>
          <Badge 
            variant={filter === 'reorder' ? 'secondary' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('reorder')}
          >
            Reorder
          </Badge>
          <Badge 
            variant={filter === 'low' ? 'warning' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('low')}
          >
            Low Stock
          </Badge>
        </div>
        
        {/* Sorting Header */}
        <div className="grid grid-cols-8 gap-2 mb-2 text-sm font-medium text-muted-foreground">
          <div 
            className="col-span-3 flex items-center cursor-pointer"
            onClick={() => handleSortChange('name')}
          >
            Item
            {sortField === 'name' && (
              <ArrowUpDown className="h-3 w-3 ml-1" />
            )}
          </div>
          <div 
            className="col-span-1 flex items-center cursor-pointer"
            onClick={() => handleSortChange('quantity')}
          >
            Qty
            {sortField === 'quantity' && (
              <ArrowUpDown className="h-3 w-3 ml-1" />
            )}
          </div>
          <div 
            className="col-span-2 flex items-center cursor-pointer"
            onClick={() => handleSortChange('status')}
          >
            Status
            {sortField === 'status' && (
              <ArrowUpDown className="h-3 w-3 ml-1" />
            )}
          </div>
          <div 
            className="col-span-2 flex items-center cursor-pointer"
            onClick={() => handleSortChange('category')}
          >
            Category
            {sortField === 'category' && (
              <ArrowUpDown className="h-3 w-3 ml-1" />
            )}
          </div>
        </div>
        
        <Separator className="my-2" />
        
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <Package className="animate-pulse h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading inventory data...</p>
          </div>
        )}
        
        {/* Error State */}
        {isError && (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load inventory data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}
        
        {/* No Alerts */}
        {!isLoading && !isError && sortedAlerts?.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-2">No inventory alerts found</p>
            {filter !== 'all' && (
              <p className="text-sm text-muted-foreground">
                Try changing your filter to see more items
              </p>
            )}
          </div>
        )}
        
        {/* Stock Alert List */}
        <div className="space-y-3">
          {sortedAlerts?.map((alert) => (
            <div key={alert.id} className="grid grid-cols-8 gap-2 items-center py-2">
              <div className="col-span-3 font-medium truncate" title={alert.itemName}>
                {alert.itemName}
                <div className="text-xs text-muted-foreground">SKU: {alert.sku}</div>
              </div>
              
              <div className="col-span-1">
                {alert.currentQuantity}
              </div>
              
              <div className="col-span-2">
                <Badge variant={getBadgeVariant(alert.status)} className="inline-flex items-center gap-1">
                  {getInventoryIcon(alert.status)}
                  {getStatusText(alert.status)}
                </Badge>
                <div className="mt-1">
                  <Progress 
                    value={(alert.currentQuantity / alert.lowStockThreshold) * 100} 
                    max={100} 
                    className={`h-1.5 ${alert.status === 'critical' ? 'bg-destructive/30' : 'bg-gray-200'}`}
                  />
                </div>
              </div>
              
              <div className="col-span-1 text-sm truncate" title={alert.category}>
                {alert.category}
              </div>
              
              <div className="col-span-1 text-right">
                {(alert.status === 'critical' || alert.status === 'reorder') && (
                  <Button 
                    size="sm" 
                    variant={alert.status === 'critical' ? 'destructive' : 'outline'}
                    onClick={() => handleRestock(alert)}
                  >
                    Restock
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      {/* Additional Information */}
      {(filter === 'all' || filter === 'alerts') && sortedAlerts && sortedAlerts.length > 0 && (
        <CardFooter className="bg-muted/50 px-6 py-4 text-sm text-muted-foreground">
          <div className="grid grid-cols-4 gap-4 w-full">
            <div>
              <div className="font-medium">Total Items</div>
              <div>{sortedAlerts.length}</div>
            </div>
            <div>
              <div className="font-medium">Critical</div>
              <div>{sortedAlerts.filter(a => a.status === 'critical').length}</div>
            </div>
            <div>
              <div className="font-medium">Reorder</div>
              <div>{sortedAlerts.filter(a => a.status === 'reorder').length}</div>
            </div>
            <div>
              <div className="font-medium">Low Stock</div>
              <div>{sortedAlerts.filter(a => a.status === 'low').length}</div>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default StockAlerts;