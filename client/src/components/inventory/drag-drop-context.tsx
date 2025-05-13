import React, { createContext, useContext, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Define the item structure for drag and drop operations
export interface BreakdownItem {
  id: number;
  name: string;
  sku: string;
  strain?: string;
  quantity: number;
  weight?: number;
  weightUnit?: string;
  price?: number;
  // Other properties needed
}

// Define the weight brackets for the standard breakdown sizes
export const WEIGHT_BRACKETS = {
  SEVEN_GRAM: { name: '7g', value: 7, unit: 'g' },
  FOURTEEN_GRAM: { name: '14g', value: 14, unit: 'g' },
  TWENTY_EIGHT_GRAM: { name: '28g', value: 28, unit: 'g' },
  QUARTER_POUND: { name: 'Quarter Pound', value: 113.4, unit: 'g' }, // 1/4 lb = 113.4g
  HALF_POUND: { name: 'Half Pound', value: 226.8, unit: 'g' }, // 1/2 lb = 226.8g
};

// Conversion rates between different units
export const CONVERSION_RATES = {
  g: {
    g: 1,
    oz: 0.035274,
    lb: 0.00220462
  },
  oz: {
    g: 28.3495,
    oz: 1,
    lb: 0.0625
  },
  lb: {
    g: 453.592,
    oz: 16,
    lb: 1
  }
};

// Function to convert weights between units
export function convertWeight(value: number, fromUnit: string, toUnit: string): number {
  const normalizedFromUnit = fromUnit.toLowerCase().replace('lbs', 'lb').replace('s', '');
  const normalizedToUnit = toUnit.toLowerCase().replace('lbs', 'lb').replace('s', '');
  
  if (normalizedFromUnit === normalizedToUnit) return value;
  
  // @ts-ignore
  const rate = CONVERSION_RATES[normalizedFromUnit]?.[normalizedToUnit] || 1;
  return value * rate;
}

// Calculate how many target items can be created from a source item
export function calculateQuantity(sourceWeight: number, sourceUnit: string, targetWeight: number, targetUnit: string): number {
  const sourceInTargetUnit = convertWeight(sourceWeight, sourceUnit, targetUnit);
  return Math.floor(sourceInTargetUnit / targetWeight);
}

// Context for drag and drop operations
interface BreakdownContextType {
  waitingItems: BreakdownItem[];
  targetItems: Record<string, BreakdownItem[]>;
  addToWaiting: (item: BreakdownItem) => void;
  moveToTarget: (itemId: number, target: string, quantity: number) => void;
  moveToWaiting: (itemId: number, source: string) => void;
  getWaitingItem: (id: number) => BreakdownItem | undefined;
  clearTargets: () => void;
}

const BreakdownContext = createContext<BreakdownContextType | undefined>(undefined);

export const useBreakdown = () => {
  const context = useContext(BreakdownContext);
  if (!context) {
    throw new Error('useBreakdown must be used within a BreakdownProvider');
  }
  return context;
};

interface BreakdownProviderProps {
  children: React.ReactNode;
}

export const BreakdownProvider: React.FC<BreakdownProviderProps> = ({ children }) => {
  const [waitingItems, setWaitingItems] = useState<BreakdownItem[]>([]);
  const [targetItems, setTargetItems] = useState<Record<string, BreakdownItem[]>>({
    [WEIGHT_BRACKETS.SEVEN_GRAM.name]: [],
    [WEIGHT_BRACKETS.FOURTEEN_GRAM.name]: [],
    [WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name]: [],
    [WEIGHT_BRACKETS.QUARTER_POUND.name]: [],
    [WEIGHT_BRACKETS.HALF_POUND.name]: [],
  });
  
  const addToWaiting = (item: BreakdownItem) => {
    setWaitingItems(prev => [...prev, item]);
  };
  
  const getWaitingItem = (id: number) => {
    return waitingItems.find(item => item.id === id);
  };
  
  const moveToTarget = (itemId: number, target: string, quantity: number) => {
    const itemIndex = waitingItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const item = waitingItems[itemIndex];
    const remainingQuantity = item.quantity - quantity;
    
    // Create a copy for the target with the specified quantity
    const targetItem = {
      ...item,
      quantity,
      id: Date.now() // Generate a new id for the breakdown item
    };
    
    // Update the waiting items
    const newWaitingItems = [...waitingItems];
    if (remainingQuantity <= 0) {
      newWaitingItems.splice(itemIndex, 1);
    } else {
      newWaitingItems[itemIndex] = { ...item, quantity: remainingQuantity };
    }
    
    // Update the target items
    setTargetItems(prev => ({
      ...prev,
      [target]: [...prev[target], targetItem]
    }));
    
    setWaitingItems(newWaitingItems);
  };
  
  const moveToWaiting = (itemId: number, source: string) => {
    const sourceItems = targetItems[source];
    const itemIndex = sourceItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const item = sourceItems[itemIndex];
    
    // Move back to waiting
    setWaitingItems(prev => [...prev, item]);
    
    // Remove from target
    setTargetItems(prev => ({
      ...prev,
      [source]: prev[source].filter(i => i.id !== itemId)
    }));
  };
  
  const clearTargets = () => {
    setTargetItems({
      [WEIGHT_BRACKETS.SEVEN_GRAM.name]: [],
      [WEIGHT_BRACKETS.FOURTEEN_GRAM.name]: [],
      [WEIGHT_BRACKETS.TWENTY_EIGHT_GRAM.name]: [],
      [WEIGHT_BRACKETS.QUARTER_POUND.name]: [],
      [WEIGHT_BRACKETS.HALF_POUND.name]: [],
    });
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <BreakdownContext.Provider value={{
        waitingItems,
        targetItems,
        addToWaiting,
        moveToTarget,
        moveToWaiting,
        getWaitingItem,
        clearTargets
      }}>
        {children}
      </BreakdownContext.Provider>
    </DndProvider>
  );
};