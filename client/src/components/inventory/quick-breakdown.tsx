import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { PackageOpen, Plus, Minus } from 'lucide-react';

interface Item {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  weight?: number;
  sku: string;
}

interface BreakdownOption {
  weight: number;
  quantity: number;
  price: number;
}

interface QuickBreakdownProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

const QuickBreakdown: React.FC<QuickBreakdownProps> = ({ item, isOpen, onClose }) => {
  const safePrice = isNaN(item.price) ? 0 : item.price;
  const safeWeight = item.weight && !isNaN(item.weight) ? item.weight : 1;
  const defaultUnitPrice = safeWeight > 0 ? safePrice / safeWeight : safePrice;
  
  const [options, setOptions] = useState<BreakdownOption[]>([
    { weight: 1, quantity: 1, price: isNaN(defaultUnitPrice) ? 0 : defaultUnitPrice },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addOption = () => {
    setOptions([...options, { weight: 1, quantity: 1, price: isNaN(defaultUnitPrice) ? 0 : defaultUnitPrice }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: keyof BreakdownOption, value: number) => {
    const newOptions = [...options];
    const safeValue = isNaN(value) ? 0 : value;
    newOptions[index][field] = safeValue;
    setOptions(newOptions);
  };

  const totalWeight = options.reduce((sum, option) => sum + (option.weight * option.quantity), 0);
  const isValid = totalWeight <= (item.weight || 0) * item.quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast({
        title: "Invalid breakdown",
        description: "The total weight exceeds the available weight.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Call API to create breakdown
      await apiRequest('POST', `/api/items/${item.id}/quick-breakdown`, { 
        options,
        parentSku: item.sku,
        remainingQuantity: item.quantity - 1 // Assuming we're breaking down 1 unit
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      
      toast({
        title: "Breakdown successful",
        description: `Successfully broke down ${item.name} into ${options.length} units.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Breakdown failed",
        description: "There was an error processing the breakdown. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col space-y-1 mb-4">
        <h3 className="text-lg font-medium">{item.name}</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {item.category}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            SKU: {item.sku}
          </Badge>
          {item.weight && (
            <Badge variant="secondary" className="text-xs">
              Weight: {item.weight}g
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Qty: {item.quantity}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {options.map((option, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md">
            <div className="col-span-3">
              <Label htmlFor={`weight-${index}`} className="text-xs">Weight (g)</Label>
              <Input
                id={`weight-${index}`}
                type="number"
                min="0.1"
                step="0.1"
                value={isNaN(option.weight) ? '' : option.weight.toString()}
                onChange={(e) => updateOption(index, 'weight', parseFloat(e.target.value) || 0)}
                className="h-8"
              />
            </div>
            
            <div className="col-span-3">
              <Label htmlFor={`quantity-${index}`} className="text-xs">Quantity</Label>
              <Input
                id={`quantity-${index}`}
                type="number"
                min="1"
                value={isNaN(option.quantity) ? '' : option.quantity.toString()}
                onChange={(e) => updateOption(index, 'quantity', parseInt(e.target.value) || 0)}
                className="h-8"
              />
            </div>
            
            <div className="col-span-4">
              <Label htmlFor={`price-${index}`} className="text-xs">Unit Price ($)</Label>
              <Input
                id={`price-${index}`}
                type="number"
                min="0.01"
                step="0.01"
                value={isNaN(option.price) ? '' : option.price.toString()}
                onChange={(e) => updateOption(index, 'price', parseFloat(e.target.value) || 0)}
                className="h-8"
              />
            </div>
            
            <div className="col-span-2 pt-5 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeOption(index)}
                disabled={options.length === 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Another Weight Option
        </Button>
      </div>

      <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
        <div>
          <p className="text-sm">Total breakdown weight:</p>
          <p className="font-medium">{totalWeight.toFixed(1)}g</p>
        </div>
        <div>
          <p className="text-sm">Original item weight:</p>
          <p className="font-medium">{(item.weight || 0) * item.quantity}g</p>
        </div>
        <div>
          <p className="text-sm">Remaining:</p>
          <p className={`font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
            {((item.weight || 0) * item.quantity - totalWeight).toFixed(1)}g
          </p>
        </div>
      </div>

      {!isValid && (
        <p className="text-sm text-red-600">
          Total breakdown weight exceeds the original item weight.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? "Processing..." : "Break Down Item"}
          <PackageOpen className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default QuickBreakdown;