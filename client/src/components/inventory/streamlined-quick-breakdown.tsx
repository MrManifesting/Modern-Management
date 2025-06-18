import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PackageOpen, Scale, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface StreamlinedQuickBreakdownProps {
  item: {
    id: number;
    name: string;
    category: string;
    basePrice: string | number;
    quantity: number;
    weight: number | string;
    sku: string;
  };
  isOpen?: boolean;
  onClose: () => void;
}

// Predefined breakdown options with precalculated math
const BREAKDOWN_OPTIONS = [
  { 
    key: 'ounce', 
    name: 'Ounces', 
    description: '16 Ounces', 
    quantity: 16, 
    icon: Scale,
    color: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
  },
  { 
    key: 'quarter-pound', 
    name: 'Quarter Pounds', 
    description: '4 Quarter Pounds', 
    quantity: 4, 
    icon: PackageOpen,
    color: 'bg-green-100 text-green-600 hover:bg-green-200'
  },
  { 
    key: 'half-ounce', 
    name: 'Half Ounces', 
    description: '32 Half Ounces', 
    quantity: 32, 
    icon: Scale,
    color: 'bg-amber-100 text-amber-600 hover:bg-amber-200'
  },
  { 
    key: 'quarter-ounce', 
    name: 'Quarter Ounces', 
    description: '64 Quarter Ounces', 
    quantity: 64, 
    icon: Scale,
    color: 'bg-purple-100 text-purple-600 hover:bg-purple-200'
  },
  { 
    key: 'eighth', 
    name: 'Eighths', 
    description: '128 Eighths (3.5g)', 
    quantity: 128, 
    icon: Calculator,
    color: 'bg-rose-100 text-rose-600 hover:bg-rose-200'
  },
  { 
    key: 'gram', 
    name: 'Grams', 
    description: '454 Individual Grams', 
    quantity: 454, 
    icon: Calculator,
    color: 'bg-teal-100 text-teal-600 hover:bg-teal-200'
  }
];

const StreamlinedQuickBreakdown: React.FC<StreamlinedQuickBreakdownProps> = ({ item, onClose }) => {
  const [breakdownOptions, setBreakdownOptions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canBreakdown, setCanBreakdown] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Convert price to number
  const itemPrice = typeof item.basePrice === 'string' ? parseFloat(item.basePrice) : item.basePrice || 0;

  // Check if item can be broken down
  useEffect(() => {
    const checkBreakdown = () => {
      const itemWeight = item.weight?.toString().toLowerCase() || '';
      const hasWeight = itemWeight.includes('pound') || itemWeight.includes('lb');
      const hasQuantity = item.quantity && item.quantity > 0;
      
      setCanBreakdown(hasWeight && hasQuantity);
      
      if (hasWeight && hasQuantity) {
        // Calculate options with pricing
        const calculatedOptions = BREAKDOWN_OPTIONS.map(option => ({
          ...option,
          unitPrice: itemPrice > 0 ? (itemPrice / option.quantity).toFixed(2) : '0.00',
          totalValue: itemPrice.toFixed(2)
        }));
        setBreakdownOptions(calculatedOptions);
      }
    };

    checkBreakdown();
  }, [item, itemPrice]);

  const handleBreakdown = async (weightType: string) => {
    try {
      setIsSubmitting(true);
      
      // Call streamlined breakdown API
      const response = await apiRequest('POST', `/api/items/${item.id}/streamlined-breakdown`, { 
        weightType
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/enhanced'] });
      
      toast({
        title: "Breakdown successful",
        description: response.message,
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Breakdown failed",
        description: error.message || "There was an error processing the breakdown.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canBreakdown) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <PackageOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Break Down</h3>
          <p className="text-sm text-gray-500">
            Item must be 1 pound or bulk weight with available quantity for breakdown.
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium mb-2">Quick Breakdown: {item.name}</h3>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Badge variant="outline" className="text-xs">
            {item.category}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            SKU: {item.sku}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Available: {item.quantity}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Price: ${itemPrice.toFixed(2)}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Select breakdown type to automatically deduct 1lb and add calculated smaller units as drafts
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {breakdownOptions.map((option) => {
          const Icon = option.icon;
          
          return (
            <Card key={option.key} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Button
                  onClick={() => handleBreakdown(option.key)}
                  disabled={isSubmitting}
                  className={`w-full h-auto p-4 ${option.color} border border-gray-200`}
                  variant="ghost"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium text-sm">{option.name}</div>
                      <div className="text-xs opacity-75">{option.description}</div>
                      <div className="text-xs font-semibold mt-1">${option.unitPrice} each</div>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <div className="flex items-start space-x-2">
          <Calculator className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 mb-1">How it works:</p>
            <ul className="text-amber-800 space-y-1 text-xs">
              <li>• Automatically deducts 1 unit from this item</li>
              <li>• Creates calculated number of smaller units as drafts</li>
              <li>• Preserves strain info and calculates individual pricing</li>
              <li>• All new items created with sequential SKUs</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default StreamlinedQuickBreakdown;