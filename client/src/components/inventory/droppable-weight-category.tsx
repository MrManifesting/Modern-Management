import React from 'react';
import { useDrop, DropTargetMonitor } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BreakdownItem, convertWeight } from './drag-drop-context';
import { DraggableInventoryItem } from './draggable-inventory-item';
import { Scale, ArrowDownUp } from 'lucide-react';

// Define the type for items being dragged
type DraggableItem = BreakdownItem & { dragQuantity: number };

interface DroppableWeightCategoryProps {
  name: string;
  weight: number;
  unit: string;
  items: BreakdownItem[];
  onDrop: (item: DraggableItem) => void;
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
  const [{ isOver, canDrop }, drop] = useDrop<DraggableItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: 'INVENTORY_ITEM',
    drop: (droppedItem) => {
      onDrop(droppedItem);
      return undefined;
    },
    canDrop: (droppedItem: DraggableItem) => {
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
    collect: (monitor: DropTargetMonitor<DraggableItem, void>) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }, [weight, unit, onDrop]);
  
  const getBorderStyle = () => {
    if (isOver && canDrop) return 'border-2 border-dashed border-green-500';
    if (isOver && !canDrop) return 'border-2 border-dashed border-red-500';
    return 'border';
  };
  
  return (
    <div className="h-full">
      <Card 
        ref={drop}
        className={`${getBorderStyle()} h-full sm:h-auto min-h-[200px] transition-colors overflow-hidden`}
      >
        <CardHeader className="p-2 sm:p-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm sm:text-md flex items-center">
              <Scale className="h-4 w-4 mr-1 sm:mr-2" />
              {name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {items.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 pt-0 overflow-y-auto max-h-[calc(100vh-400px)] sm:max-h-[250px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 sm:h-40 text-center text-muted-foreground">
              <ArrowDownUp className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Drag items here to break down into {name} units</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
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