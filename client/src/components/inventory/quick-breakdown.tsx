import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Item } from '@shared/schema';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PackageOpen, Printer, ArrowRight, Save, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BarcodePrint from './barcode-print';

interface QuickBreakdownProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

// Weight brackets 
const WEIGHT_BRACKETS = {
  SEVEN_GRAM: { name: '7 Gram', value: 7, unit: 'g' },
  FOURTEEN_GRAM: { name: '14 Gram', value: 14, unit: 'g' },
  TWENTY_EIGHT_GRAM: { name: '28 Gram', value: 28, unit: 'g' },
  QUARTER_LB: { name: 'Quarter Pound', value: 113.4, unit: 'g' },
};

export default function QuickBreakdown({ item, isOpen, onClose }: QuickBreakdownProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [quantities, setQuantities] = useState<Record<string, number>>({
    [WEIGHT_BRACKETS.SEVEN_GRAM.name]: 0,
    [WEIGHT_BRACKETS.FOURTEEN_GRAM.name]: 0,
    [WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name]: 0,
    [WEIGHT_BRACKETS.QUARTER_LB.name]: 0,
  });
  const [calculatingBreakdown, setCalculatingBreakdown] = useState(false);
  const [createdItems, setCreatedItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Calculate the maximum quantities possible for each bracket
  const calculateMaxQuantities = () => {
    if (!item.weight) {
      toast({
        title: "Missing weight information",
        description: "This item doesn't have weight information needed for breakdown.",
        variant: "destructive"
      });
      return;
    }

    const bulkWeight = item.weight;
    const newQuantities = { ...quantities };
    
    Object.values(WEIGHT_BRACKETS).forEach(bracket => {
      // Calculate maximum possible quantity for this weight bracket
      const maxQty = Math.floor(bulkWeight / bracket.value);
      newQuantities[bracket.name] = maxQty;
    });
    
    setQuantities(newQuantities);
  };

  // Handle quantity change
  const handleQuantityChange = (bracketName: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [bracketName]: value
    }));
  };

  // Create breakdown mutation
  const createBreakdownMutation = useMutation({
    mutationFn: async () => {
      // Convert quantities to breakdown targets
      const targets = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([bracketName, qty]) => {
          const bracket = Object.values(WEIGHT_BRACKETS).find(b => b.name === bracketName);
          if (!bracket) return null;
          
          return {
            name: `${item.name} - ${bracket.name}`,
            price: calculatePriceForWeight(item, bracket.value),
            quantity: qty,
            weight: bracket.value,
            weightUnit: bracket.unit,
            parentItemId: item.id,
          };
        })
        .filter(Boolean);
      
      if (targets.length === 0) {
        throw new Error("No targets specified for breakdown");
      }
      
      const res = await apiRequest('POST', `/api/items/${item.id}/quick-breakdown`, { targets });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedItems(data.createdItems || []);
      toast({
        title: "Breakdown created",
        description: `Successfully created ${data.createdItems?.length || 0} breakdown products.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create breakdown products",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setCalculatingBreakdown(false);
    }
  });

  // Handle breakdown creation
  const handleCreateBreakdown = () => {
    setCalculatingBreakdown(true);
    createBreakdownMutation.mutate();
  };

  // Calculate price for a given weight
  const calculatePriceForWeight = (bulkItem: Item, weight: number): number => {
    if (!bulkItem.weight || bulkItem.weight <= 0) return 0;
    
    const ratio = weight / bulkItem.weight;
    const basePrice = bulkItem.basePrice * ratio;
    
    // Round to 2 decimal places
    return Math.round(basePrice * 100) / 100;
  };

  // Handle print barcode for an item
  const handlePrintBarcode = (breakdownItem: Item) => {
    setSelectedItem(breakdownItem);
    setIsPrintModalOpen(true);
  };

  // Reset the form when dialog closes
  const handleClose = () => {
    setCreatedItems([]);
    setQuantities({
      [WEIGHT_BRACKETS.SEVEN_GRAM.name]: 0,
      [WEIGHT_BRACKETS.FOURTEEN_GRAM.name]: 0,
      [WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name]: 0,
      [WEIGHT_BRACKETS.QUARTER_LB.name]: 0,
    });
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Quick Breakdown - {item.name}</DialogTitle>
            <DialogDescription>
              Create smaller weight products from this bulk item.
            </DialogDescription>
          </DialogHeader>
          
          {createdItems.length === 0 ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Bulk Item Weight: {item.weight} {item.weightUnit}</p>
                  <p className="text-sm text-gray-500">Bulk Item Price: ${item.basePrice?.toFixed(2)}</p>
                </div>
                <Button size="sm" onClick={calculateMaxQuantities}>
                  Calculate Max
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                {Object.values(WEIGHT_BRACKETS).map(bracket => (
                  <div key={bracket.name} className="grid grid-cols-3 gap-4 items-center">
                    <Label htmlFor={`qty-${bracket.name}`} className="col-span-1">
                      {bracket.name}
                    </Label>
                    <div className="col-span-1">
                      <Input
                        id={`qty-${bracket.name}`}
                        type="number"
                        min="0"
                        value={quantities[bracket.name]}
                        onChange={(e) => handleQuantityChange(bracket.name, parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm text-gray-500">
                        ${calculatePriceForWeight(item, bracket.value).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateBreakdown} 
                  disabled={calculatingBreakdown || Object.values(quantities).every(qty => qty === 0)}
                >
                  {calculatingBreakdown ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <PackageOpen className="w-4 h-4 mr-2" />
                      Create Breakdown
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <h3 className="font-medium text-green-600 flex items-center">
                <Check className="w-4 h-4 mr-2" />
                Breakdown Created Successfully
              </h3>
              
              <div className="max-h-[300px] overflow-y-auto space-y-3">
                {createdItems.map(breakdownItem => (
                  <Card key={breakdownItem.id} className="overflow-hidden">
                    <CardHeader className="p-3">
                      <div className="flex justify-between">
                        <CardTitle className="text-md">{breakdownItem.name}</CardTitle>
                        <Badge variant="outline">
                          {breakdownItem.weight} {breakdownItem.weightUnit}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm">Quantity: {breakdownItem.quantity}</p>
                          <p className="text-sm">Price: ${breakdownItem.basePrice?.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">SKU: {breakdownItem.sku}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintBarcode(breakdownItem)}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={() => {
                  handleClose();
                  navigate('/products-inventory');
                }}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Go to Inventory
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Barcode Print Dialog */}
      {selectedItem && (
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
          <DialogContent className="sm:max-w-md">
            <BarcodePrint item={selectedItem} onClose={() => setIsPrintModalOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}