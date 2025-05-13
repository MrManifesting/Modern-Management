import React from 'react';
import { useDrop } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BreakdownItem, convertWeight } from './drag-drop-context';
import { DraggableInventoryItem } from './draggable-inventory-item';
import { Scale, ArrowDownUp } from 'lucide-react';

interface DroppableWeightCategoryProps {
  name: string;
  weight: number;
  unit: string;
  items: BreakdownItem[];
  onDrop: (item: BreakdownItem & { dragQuantity: number }) => void;
  onMoveToWaiting: (itemId: number) => void;
}

export const DroppableWeightCategory: React.FC<DroppableWeightCategoryProps> = ({
  name,
  weight,
  unit,
  items,
  onDrop,
  onMoveToWaiting
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'INVENTORY_ITEM',
    drop: (droppedItem: BreakdownItem & { dragQuantity: number }) => {
      onDrop(droppedItem);
    },
    canDrop: (droppedItem: BreakdownItem) => {
      // Can only drop if the item has a weight and it's greater than or equal to the category weight
      if (!droppedItem.weight || !droppedItem.weightUnit) return false;
      
      // Convert the item's weight to the category's unit for comparison
      const itemWeightInCategoryUnit = convertWeight(
        droppedItem.weight,
        droppedItem.weightUnit,
        unit
      );
      
      return itemWeightInCategoryUnit >= weight;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }), [weight, unit, onDrop]);
  
  const getBorderStyle = () => {
    if (isOver && canDrop) return 'border-2 border-dashed border-green-500';
    if (isOver && !canDrop) return 'border-2 border-dashed border-red-500';
    return 'border';
  };
  
  return (
    <div className="h-full">
      <Card 
        ref={drop}
        className={`${getBorderStyle()} h-full transition-colors overflow-hidden`}
      >
        <CardHeader className="p-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex items-center">
              <Scale className="h-4 w-4 mr-2" />
              {name}
            </CardTitle>
            <Badge variant="secondary">
              {items.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 h-[calc(100%-60px)] overflow-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <ArrowDownUp className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Drag items here to break down into {name} units</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <DraggableInventoryItem
                  key={item.id}
                  item={item}
                  onMoveToWaiting={() => onMoveToWaiting(item.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};