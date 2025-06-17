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
  isCustomWeight?: boolean;
}

interface QuickBreakdownProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

// Standard cannabis weight options in grams (454g per pound conversion)
const WEIGHT_OPTIONS = [
  { label: "1 gram", value: 1 },
  { label: "3.5g (eighth)", value: 3.5 },
  { label: "7g (quarter)", value: 7 },
  { label: "14g (half ounce)", value: 14 },
  { label: "28g (ounce)", value: 28 },
  { label: "56g (2 ounces)", value: 56 },
  { label: "112g (4 ounces)", value: 112 },
  { label: "227g (half pound)", value: 227 },
  { label: "454g (pound)", value: 454 },
  { label: "Custom", value: 0 }, // Custom weight option
];

// Weight conversion utilities
const GRAMS_PER_POUND = 454;
const GRAMS_PER_OUNCE = 28.35;

const convertWeightToGrams = (weight: string | number): number => {
  if (typeof weight === 'number') return weight;
  
  const weightStr = weight.toString().toLowerCase();
  
  // Extract numeric value
  const numericMatch = weightStr.match(/([0-9.]+)/);
  if (!numericMatch) return 0;
  
  const numericValue = parseFloat(numericMatch[1]);
  
  // Convert based on unit
  if (weightStr.includes('pound') || weightStr.includes('lb')) {
    return numericValue * GRAMS_PER_POUND;
  } else if (weightStr.includes('ounce') || weightStr.includes('oz')) {
    return numericValue * GRAMS_PER_OUNCE;
  } else if (weightStr.includes('gram') || weightStr.includes('g')) {
    return numericValue;
  }
  
  // Default to grams if no unit specified
  return numericValue;
};

const QuickBreakdown: React.FC<QuickBreakdownProps> = ({ item, isOpen, onClose }) => {
  const safePrice = isNaN(item.price) ? 0 : item.price;
  
  // Convert item weight to grams for accurate calculations
  const itemWeightInGrams = convertWeightToGrams(item.weight || 1);
  const totalItemWeightInGrams = itemWeightInGrams * item.quantity;
  
  // Calculate price per gram for breakdown pricing
  const pricePerGram = totalItemWeightInGrams > 0 ? safePrice / totalItemWeightInGrams : 0;
  
  const [options, setOptions] = useState<BreakdownOption[]>([
    { weight: 1, quantity: 1, price: pricePerGram },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addOption = () => {
    setOptions([...options, { weight: 1, quantity: 1, price: pricePerGram }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: keyof BreakdownOption, value: number | boolean) => {
    const newOptions = [...options];
    if (field === 'isCustomWeight') {
      newOptions[index][field] = value as boolean;
    } else {
      const safeValue = isNaN(value as number) ? 0 : (value as number);
      newOptions[index][field] = safeValue;
    }
    setOptions(newOptions);
  };

  const updateWeightFromDropdown = (index: number, weightValue: number) => {
    const newOptions = [...options];
    newOptions[index].weight = weightValue;
    newOptions[index].isCustomWeight = weightValue === 0;
    setOptions(newOptions);
  };

  const totalWeight = options.reduce((sum, option) => sum + (option.weight * option.quantity), 0);
  const isValid = totalWeight <= totalItemWeightInGrams;

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
          <Badge variant="secondary" className="text-xs">
            Weight: {itemWeightInGrams}g per unit
          </Badge>
          <Badge variant="outline" className="text-xs">
            Qty: {item.quantity}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {options.map((option, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-start border p-3 rounded-md">
            <div className="col-span-4">
              <Label className="text-xs">Weight</Label>
              <div className="space-y-1">
                <Select
                  value={option.isCustomWeight ? "0" : option.weight.toString()}
                  onValueChange={(value) => updateWeightFromDropdown(index, parseFloat(value))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select weight" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_OPTIONS.map((weightOption) => (
                      <SelectItem key={weightOption.value} value={weightOption.value.toString()}>
                        {weightOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {option.isCustomWeight && (
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="Enter custom weight (g)"
                    value={option.weight === 0 ? '' : option.weight.toString()}
                    onChange={(e) => updateOption(index, 'weight', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            </div>
            
            <div className="col-span-2">
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
          <p className="font-medium">{totalItemWeightInGrams.toFixed(1)}g</p>
        </div>
        <div>
          <p className="text-sm">Remaining:</p>
          <p className={`font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
            {(totalItemWeightInGrams - totalWeight).toFixed(1)}g
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