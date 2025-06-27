import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { Package, Zap, BarChart3, CheckCircle } from 'lucide-react';

interface InventoryStats {
  total: number;
  available: number;
  draft: number;
  withPricing: number;
  flowers: number;
  activationCandidates: number;
  totalValue: number;
}

interface ActivationCandidate {
  id: number;
  name: string;
  sku: string;
  base_price: number | null;
  sale_price: number | null;
  cost_price: number | null;
  category: string | null;
  brand: string | null;
  status: string;
  quantity: number | null;
}

export default function InventoryActivationPage() {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [defaultQuantity, setDefaultQuantity] = useState(1);
  const queryClient = useQueryClient();

  // Fetch inventory statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/inventory/stats'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const stats: InventoryStats = statsData?.stats || {
    total: 0, available: 0, draft: 0, withPricing: 0, 
    flowers: 0, activationCandidates: 0, totalValue: 0
  };

  // Fetch activation candidates
  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ['/api/inventory/activation-candidates'],
    refetchInterval: 30000
  });

  const candidates: ActivationCandidate[] = candidatesData?.candidates || [];

  // Bulk activation mutation
  const bulkActivate = useMutation({
    mutationFn: async (data: { itemIds: number[], defaultQuantity: number }) => {
      return apiRequest('/api/inventory/bulk-activate', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/activation-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      setSelectedItems(new Set());
    }
  });

  const formatPrice = (price: number | null) => {
    if (!price) return '$0.00';
    return `$${price.toFixed(2)}`;
  };

  const getHighestPrice = (item: ActivationCandidate) => {
    return Math.max(item.base_price || 0, item.sale_price || 0, item.cost_price || 0);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === candidates.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(candidates.map(c => c.id)));
    }
  };

  const handleItemSelect = (itemId: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleBulkActivate = () => {
    if (selectedItems.size === 0) return;
    
    bulkActivate.mutate({
      itemIds: Array.from(selectedItems),
      defaultQuantity: defaultQuantity
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-6 w-6 text-yellow-600" />
        <h1 className="text-3xl font-bold">Inventory Activation Center</h1>
      </div>

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="candidates">
            Activation Candidates
            {stats.activationCandidates > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.activationCandidates}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  All inventory items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Items</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <p className="text-xs text-muted-foreground">
                  With quantities &gt; 0
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Draft Items</CardTitle>
                <Package className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
                <p className="text-xs text-muted-foreground">
                  Inactive inventory
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${stats.totalValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available inventory value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flower Products</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.flowers}</div>
                <p className="text-xs text-muted-foreground">
                  Cannabis flower items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">With Pricing</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.withPricing}</div>
                <p className="text-xs text-muted-foreground">
                  Items with valid pricing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ready to Activate</CardTitle>
                <Zap className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.activationCandidates}</div>
                <p className="text-xs text-muted-foreground">
                  Draft items with pricing
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <CardTitle>Activation Candidates</CardTitle>
              <CardDescription>
                Draft items with pricing that can be activated for sale. These items have authentic pricing but no quantities assigned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.activationCandidates === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All items with pricing are already activated! Your inventory is fully optimized.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {/* Bulk actions */}
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Checkbox
                      checked={selectedItems.size === candidates.length && candidates.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      Select All ({selectedItems.size} of {candidates.length} selected)
                    </span>
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <Label htmlFor="defaultQuantity" className="text-sm">Default Quantity:</Label>
                      <Input
                        id="defaultQuantity"
                        type="number"
                        min="1"
                        max="1000"
                        value={defaultQuantity}
                        onChange={(e) => setDefaultQuantity(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Button
                        onClick={handleBulkActivate}
                        disabled={selectedItems.size === 0 || bulkActivate.isPending}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Activate {selectedItems.size} Items
                      </Button>
                    </div>
                  </div>

                  {/* Results */}
                  {bulkActivate.data && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        {bulkActivate.data.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Candidates list */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center py-8">Loading candidates...</div>
                    ) : (
                      candidates.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => handleItemSelect(item.id)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.sku} • {item.brand} • {item.category}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              {formatPrice(getHighestPrice(item))}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.base_price && `Base: ${formatPrice(item.base_price)}`}
                              {item.sale_price && ` Sale: ${formatPrice(item.sale_price)}`}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}