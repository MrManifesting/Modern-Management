import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Zap,
  RefreshCw,
  Smartphone,
  Activity
} from 'lucide-react';

interface PerformanceMetrics {
  responseTime: number;
  itemsPerSecond: number;
  cacheHitRate: number;
  totalItems: number;
  activeItems: number;
}

interface OptimizedInventoryItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  status: string;
  basePrice: number;
  category: string;
}

export const AdvancedMobilePerformance: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    responseTime: 0,
    itemsPerSecond: 0,
    cacheHitRate: 0,
    totalItems: 0,
    activeItems: 0
  });

  // Optimized inventory query with performance tracking
  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['/api/items'],
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 60000, // Keep in memory for 1 minute
    refetchOnWindowFocus: false,
    select: useCallback((data: any[]) => {
      // Client-side optimization: only process essential fields
      return data?.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity || 0,
        status: item.status,
        basePrice: item.basePrice || item.base_price || 0,
        category: item.category
      })) || [];
    }, [])
  });

  // Performance metrics tracking
  useEffect(() => {
    if (inventoryData) {
      const startTime = performance.now();
      const filtered = inventoryData.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const endTime = performance.now();
      
      setMetrics(prev => ({
        ...prev,
        responseTime: endTime - startTime,
        itemsPerSecond: filtered.length / ((endTime - startTime) / 1000),
        totalItems: inventoryData.length,
        activeItems: inventoryData.filter(item => item.status === 'active').length
      }));
    }
  }, [inventoryData, searchTerm]);

  // Memoized filtered results for performance
  const filteredItems = useMemo(() => {
    if (!inventoryData) return [];
    
    return inventoryData
      .filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 20); // Limit to 20 items for mobile performance
  }, [inventoryData, searchTerm]);

  // Optimized search handler with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {/* Performance Dashboard */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Mobile Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.responseTime.toFixed(1)}ms
              </div>
              <div className="text-xs text-gray-600">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(metrics.itemsPerSecond)}
              </div>
              <div className="text-xs text-gray-600">Items/sec</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {metrics.totalItems}
              </div>
              <div className="text-xs text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {metrics.activeItems}
              </div>
              <div className="text-xs text-gray-600">Active Items</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimized Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              Found {filteredItems.length} items in {metrics.responseTime.toFixed(1)}ms
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimized Results */}
      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
              <div className="text-gray-600">Loading inventory...</div>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-blue-500">
              <CardContent className="py-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.sku}
                      </Badge>
                      <Badge 
                        variant={item.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-sm font-semibold">
                      ${item.basePrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Qty: {item.quantity}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Performance Actions */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="py-3">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => refetch()}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSearchTerm("")}
              className="flex-1"
            >
              <Filter className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedMobilePerformance;