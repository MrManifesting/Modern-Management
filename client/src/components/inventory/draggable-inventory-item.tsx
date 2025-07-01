import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { BreakdownItem } from './drag-drop-context';

interface DraggableInventoryItemProps {
  item: BreakdownItem;
  onMoveToWaiting?: () => void;
}

export const DraggableInventoryItem: React.FC<DraggableInventoryItemProps> = ({ 
  item, 
  onMoveToWaiting
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'INVENTORY_ITEM',
    item: { ...item, dragQuantity: quantity },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }), [item, quantity]);
  
  // Validate that the quantity is at least 1 and no more than the available quantity
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) {
      setQuantity(1);
    } else if (value > item.quantity) {
      setQuantity(item.quantity);
    } else {
      setQuantity(value);
    }
  };
  
  return (
    <Card 
      ref={drag} 
      className={`${isDragging ? 'opacity-50' : 'opacity-100'} cursor-move border-primary/20 hover:border-primary/50 transition-colors`}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{item.name}</CardTitle>
            <CardDescription>{item.sku}</CardDescription>
          </div>
          <Badge variant={item.quantity > 0 ? "outline" : "destructive"}>
            {item.quantity} in stock
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center mb-2">
          <Package className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm">
            {item.weight}{item.weightUnit} {item.strain}
          </span>
        </div>
        {onMoveToWaiting ? null : (
          <div className="mt-3">
            <Label htmlFor={`quantity-${item.id}`} className="text-sm font-medium">
              Drag Quantity:
            </Label>
            <div className="flex items-center mt-1">
              <Input
                id={`quantity-${item.id}`}
                type="number"
                min={1}
                max={item.quantity}
                value={quantity}
                onChange={handleQuantityChange}
                className="w-20"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                of {item.quantity}
              </span>
            </div>
          </div>
        )}
      </CardContent>
      {onMoveToWaiting && (
        <CardFooter className="p-4 pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onMoveToWaiting}
            className="w-full"
          >
            Return to Waiting Area
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};