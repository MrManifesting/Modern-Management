import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Minus, X, Save } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku?: string;
  quantity: number;
  category?: string;
}

interface BulkQuantityEditProps {
  selectedItems: Product[];
  onClose: () => void;
  onComplete: () => void;
}

export function BulkQuantityEdit({ selectedItems, onClose, onComplete }: BulkQuantityEditProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>(
    selectedItems.reduce((acc, item) => {
      acc[item.id] = item.quantity;
      return acc;
    }, {} as Record<number, number>)
  );
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ id: number; quantity: number }>) => {
      const response = await apiRequest('POST', '/api/items/bulk-update-quantity', {
        updates
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quantities Updated",
        description: `Successfully updated quantities for ${selectedItems.length} items.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      onComplete();
    },
    onError: (error) => {
      console.error("Bulk quantity update error:", error);
      toast({
        title: "Error",
        description: "Failed to update quantities. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    setQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
  };

  const handleIncrement = (itemId: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const handleDecrement = (itemId: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) - 1)
    }));
  };

  const handleSave = () => {
    const updates = selectedItems.map(item => ({
      id: item.id,
      quantity: quantities[item.id] || 0
    })).filter(update => update.quantity !== selectedItems.find(item => item.id === update.id)?.quantity);

    if (updates.length === 0) {
      toast({
        title: "No Changes",
        description: "No quantity changes were made.",
        variant: "default"
      });
      onClose();
      return;
    }

    bulkUpdateMutation.mutate(updates);
  };

  const totalItems = selectedItems.length;
  const hasChanges = selectedItems.some(item => quantities[item.id] !== item.quantity);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          Bulk Edit Quantities ({totalItems} items)
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-96 overflow-y-auto space-y-3">
          {selectedItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {item.sku && <span className="font-mono">{item.sku}</span>}
                  {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecrement(item.id)}
                  disabled={quantities[item.id] <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <div className="flex flex-col items-center gap-1">
                  <Input
                    type="number"
                    value={quantities[item.id] || 0}
                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                    min="0"
                  />
                  {quantities[item.id] !== item.quantity && (
                    <span className="text-xs text-muted-foreground">
                      was {item.quantity}
                    </span>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleIncrement(item.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {hasChanges ? `${selectedItems.filter(item => quantities[item.id] !== item.quantity).length} item(s) modified` : 'No changes made'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={bulkUpdateMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || bulkUpdateMutation.isPending}
              className="gap-2"
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}