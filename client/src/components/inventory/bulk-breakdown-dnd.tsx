import { useState, useEffect } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, PackageCheck, Scale, GripVertical } from "lucide-react";
import { Item } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Common weight units for cannabis products
const WEIGHT_UNITS = ["g", "mg", "kg", "oz", "lb"];

// Standard weight breakdown options for cannabis
const STANDARD_WEIGHTS = [
  { label: "1 gram", value: 1, unit: "g" },
  { label: "3.5 grams (Eighth)", value: 3.5, unit: "g" },
  { label: "7 grams (Quarter)", value: 7, unit: "g" },
  { label: "14 grams (Half)", value: 14, unit: "g" },
  { label: "28 grams (Ounce)", value: 28, unit: "g" },
  { label: "113 grams (Quarter Pound)", value: 113, unit: "g" },
  { label: "226 grams (Half Pound)", value: 226, unit: "g" },
  { label: "453 grams (Pound)", value: 453, unit: "g" },
];

// Interface for a breakdown result
interface BreakdownResult {
  weight: number;
  unit: string;
  quantity: number;
  newSku?: string;
  newItemId?: number;
}

interface BulkWeightDragItemProps {
  id: string;
  weight: number;
  unit: string;
  label: string;
  onDrag?: () => void;
}

// Draggable weight card component
const BulkWeightDragItem = ({ id, weight, unit, label, onDrag }: BulkWeightDragItemProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "weight",
    item: { id, weight, unit, label },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        onDrag && onDrag();
      }
    },
  }));

  return (
    <div
      ref={drag}
      className={`bg-primary/10 rounded-md p-3 flex items-center justify-between cursor-grab border 
        ${isDragging ? "opacity-50 border-primary" : "border-primary/20"}`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {weight} {unit}
          </p>
        </div>
      </div>
      <Scale className="h-4 w-4 text-primary" />
    </div>
  );
};

interface BreakdownDropAreaProps {
  bulkItem: Item;
  onDrop: (weight: number, unit: string, label: string) => void;
  isProcessing: boolean;
  results: BreakdownResult[];
}

// Drop area for the bulk item breakdown
const BreakdownDropArea = ({ bulkItem, onDrop, isProcessing, results }: BreakdownDropAreaProps) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "weight",
    drop: (item: { weight: number; unit: string; label: string }) => {
      onDrop(item.weight, item.unit, item.label);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div className="flex flex-col gap-4 w-full">
      <div
        ref={drop}
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] 
          ${isOver ? "border-primary bg-primary/5" : "border-gray-300"}
          ${canDrop ? "bg-primary/5" : ""}
          ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div 
            className={`p-3 rounded-full mb-3 ${
              isOver ? "bg-primary/20" : "bg-muted"
            }`}
          >
            <ArrowDown className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{bulkItem.name}</h3>
          <p className="text-muted-foreground text-sm mb-2">
            {bulkItem.quantity} units available
          </p>
          <p className="text-sm font-semibold">
            Drag weight from left to create new inventory items
          </p>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="font-semibold">Results</h3>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className="p-3 border rounded-md flex items-center justify-between bg-green-50 animate-fadeIn"
              >
                <div>
                  <span className="font-medium">
                    {result.weight} {result.unit} × {result.quantity}
                  </span>
                  {result.newItemId && (
                    <span className="block text-xs text-green-600">
                      New item created (ID: {result.newItemId})
                    </span>
                  )}
                </div>
                {result.newSku && (
                  <span className="text-xs bg-green-100 px-2 py-1 rounded">
                    SKU: {result.newSku}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface BulkBreakdownDndProps {
  item: Item;
  onComplete?: () => void;
}

export function BulkBreakdownDnd({ item, onComplete }: BulkBreakdownDndProps) {
  const [results, setResults] = useState<BreakdownResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customWeight, setCustomWeight] = useState("");
  const [customUnit, setCustomUnit] = useState("g");
  const { toast } = useToast();

  // Function to handle dropping a weight
  const handleDrop = async (weight: number, unit: string, label: string) => {
    if (isProcessing) return;
    if (item.quantity === 0) {
      toast({
        title: "Error",
        description: "No bulk items available to break down",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create a breakdown API request
      const response = await apiRequest<{
        success: boolean;
        message: string;
        newItemId?: number;
        newSku?: string;
        remainingQuantity?: number;
      }>(`/api/items/${item.id}/drag-drop-breakdown`, {
        method: "POST",
        data: {
          targetWeight: weight,
          targetUnit: unit,
          quantity: quantity,
        },
      });

      if (response && response.success) {
        // Add the new breakdown to results
        setResults((prev) => [
          ...prev,
          {
            weight,
            unit,
            quantity,
            newSku: response.newSku,
            newItemId: response.newItemId,
          },
        ]);

        // Update local item quantity if response includes it
        if (response.remainingQuantity !== undefined) {
          item.quantity = response.remainingQuantity;
        }

        toast({
          title: "Success",
          description: `Created ${quantity} new item(s) of ${weight} ${unit}`,
        });

        // Invalidate inventory queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
        
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error("Error in breakdown:", error);
      toast({
        title: "Error",
        description: "Failed to create breakdown",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for custom weight drag
  const handleCustomWeight = () => {
    if (!customWeight || isNaN(Number(customWeight))) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    handleDrop(Number(customWeight), customUnit, `${customWeight} ${customUnit}`);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Predefined weights panel */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Standard Weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {STANDARD_WEIGHTS.map((weight) => (
                <BulkWeightDragItem
                  key={`${weight.value}${weight.unit}`}
                  id={`${weight.value}${weight.unit}`}
                  weight={weight.value}
                  unit={weight.unit}
                  label={weight.label}
                  onDrag={() => setQuantity(1)} // Reset quantity after drag
                />
              ))}
            </div>

            <div className="border-t pt-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="custom-weight">Custom Weight</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-weight"
                    type="number"
                    placeholder="Amount"
                    min="0.01"
                    step="0.01"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                  />
                  <Select
                    value={customUnit}
                    onValueChange={setCustomUnit}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCustomWeight}
                  disabled={!customWeight || isProcessing}
                  className="w-full"
                  size="sm"
                >
                  Create Custom Weight
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <div className="w-full space-y-1">
              <Label htmlFor="quantity">Quantity to Create</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={isProcessing}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Drag a weight to the area on the right to break down this bulk item
            </p>
          </CardFooter>
        </Card>

        {/* Drop area for bulk item */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Break Down Bulk Item</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownDropArea
              bulkItem={item}
              onDrop={handleDrop}
              isProcessing={isProcessing}
              results={results}
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={onComplete} 
              className="w-full"
              variant="outline"
            >
              <PackageCheck className="h-4 w-4 mr-2" />
              Done
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DndProvider>
  );
}