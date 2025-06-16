import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Edit3, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ThcaInventoryItem {
  rowNumber: number;
  strain: string;
  amount: string;
  percentage: string;
  tier: string;
  keyId: string;
  parsedAmount: number | null;
}

export default function ThcaInventoryManagerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<ThcaInventoryItem | null>(null);
  const [newAmount, setNewAmount] = useState<string>('');

  // Fetch THCa inventory status
  const { data: thcaInventory, isLoading, error } = useQuery<ThcaInventoryItem[]>({
    queryKey: ['/api/thca-inventory/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Adjust inventory mutation
  const adjustInventoryMutation = useMutation({
    mutationFn: ({ keyId, newAmount }: { keyId: string; newAmount: number }) =>
      apiRequest('/api/thca-inventory/adjust', 'POST', { keyId, newAmount }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "THCa inventory updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/thca-inventory/status'] });
      setEditingItem(null);
      setNewAmount('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update THCa inventory",
        variant: "destructive",
      });
    },
  });

  const handleEditAmount = (item: ThcaInventoryItem) => {
    setEditingItem(item);
    setNewAmount(item.parsedAmount?.toString() || '0');
  };

  const handleSaveAmount = () => {
    if (!editingItem || !newAmount) return;
    
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    adjustInventoryMutation.mutate({
      keyId: editingItem.keyId,
      newAmount: amount
    });
  };

  const getStockStatus = (amount: number | null) => {
    if (amount === null) return { status: 'unknown', color: 'bg-gray-500' };
    if (amount === 0) return { status: 'out of stock', color: 'bg-red-500' };
    if (amount <= 5) return { status: 'low stock', color: 'bg-yellow-500' };
    return { status: 'in stock', color: 'bg-green-500' };
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'top shelf': return 'bg-purple-100 text-purple-800';
      case 'exotic': return 'bg-pink-100 text-pink-800';
      case 'classic reserve': return 'bg-blue-100 text-blue-800';
      case 'aaa indoor': return 'bg-green-100 text-green-800';
      case 'aa indoor': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load THCa inventory. Please check your Google Sheets configuration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">THCa Inventory Manager</h1>
          <p className="text-muted-foreground">
            Manage THCa flower inventory with automatic order deduction from column B
          </p>
        </div>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/thca-inventory/status'] })}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Status Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Automatic Order Processing Active:</strong> When orders are placed through Shopify, 
          quantities will be automatically deducted from column B using the KEY-ID in column G for matching.
        </AlertDescription>
      </Alert>

      {/* Inventory Summary */}
      {thcaInventory && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thcaInventory.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <div className="h-3 w-3 bg-green-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {thcaInventory.filter(item => (item.parsedAmount || 0) > 5).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <div className="h-3 w-3 bg-yellow-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {thcaInventory.filter(item => {
                  const amount = item.parsedAmount || 0;
                  return amount > 0 && amount <= 5;
                }).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <div className="h-3 w-3 bg-red-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {thcaInventory.filter(item => (item.parsedAmount || 0) === 0).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>THCa Flower Inventory</CardTitle>
          <CardDescription>
            Column B amounts automatically deduct when Shopify orders are placed using KEY-ID matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strain</TableHead>
                  <TableHead>Amount (Column B)</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>KEY-ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thcaInventory?.map((item) => {
                  const stockStatus = getStockStatus(item.parsedAmount);
                  return (
                    <TableRow key={item.rowNumber}>
                      <TableCell className="font-medium">{item.strain}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{item.amount}</span>
                          {item.parsedAmount !== null && (
                            <span className="text-sm text-muted-foreground">
                              ({item.parsedAmount})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.percentage}</TableCell>
                      <TableCell>
                        <Badge className={getTierColor(item.tier)}>
                          {item.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.keyId}</TableCell>
                      <TableCell>
                        <Badge className={`text-white ${stockStatus.color}`}>
                          {stockStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAmount(item)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adjust Inventory Amount</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Strain</Label>
                                <div className="font-medium">{item.strain}</div>
                              </div>
                              <div>
                                <Label>KEY-ID</Label>
                                <div className="font-mono text-sm">{item.keyId}</div>
                              </div>
                              <div>
                                <Label htmlFor="newAmount">New Amount</Label>
                                <Input
                                  id="newAmount"
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={newAmount}
                                  onChange={(e) => setNewAmount(e.target.value)}
                                  placeholder="Enter new amount"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingItem(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleSaveAmount}
                                  disabled={adjustInventoryMutation.isPending}
                                >
                                  {adjustInventoryMutation.isPending && (
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}