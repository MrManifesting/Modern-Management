/**
 * Routes for automatic breakdown of bulk items (1lb/454g+)
 * Automatically removes breakdown amounts from active inventory
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { IStorage } from "./storage";

// Schema for auto breakdown request
const autoBreakdownSchema = z.object({
  itemId: z.number(),
  breakdownUnits: z.array(z.object({
    weight: z.number().positive(),
    unit: z.enum(['g', 'oz', 'lb']),
    quantity: z.number().positive().int(),
    description: z.string().optional()
  }))
});

type AutoBreakdownRequest = z.infer<typeof autoBreakdownSchema>;

// Weight conversion utilities
const convertToGrams = (weight: number, unit: string): number => {
  switch (unit) {
    case 'g': return weight;
    case 'oz': return weight * 28.3495;
    case 'lb': return weight * 453.592;
    default: return weight;
  }
};

const convertFromGrams = (weightInGrams: number, targetUnit: string): number => {
  switch (targetUnit) {
    case 'g': return weightInGrams;
    case 'oz': return weightInGrams / 28.3495;
    case 'lb': return weightInGrams / 453.592;
    default: return weightInGrams;
  }
};

// Check if an item qualifies for automatic breakdown (1lb/454g+)
const qualifiesForAutoBreakdown = (item: any): boolean => {
  if (!item.weight || !item.weightUnit) return false;
  
  const weightInGrams = convertToGrams(parseFloat(item.weight), item.weightUnit);
  return weightInGrams >= 454; // 1 pound or more
};

// Generate SKUs for breakdown items
const generateBreakdownSKU = (parentSku: string, weight: number, unit: string, index: number): string => {
  const cleanWeight = weight.toString().replace('.', '-');
  return `${parentSku}-BRK-${cleanWeight}${unit.toUpperCase()}-${index + 1}`;
};

/**
 * Register automatic breakdown routes
 */
export function registerAutoBreakdownRoutes(app: Express, storage: IStorage) {
  
  /**
   * Check if an item qualifies for automatic breakdown
   */
  app.get("/api/items/:id/breakdown-eligibility", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const eligible = qualifiesForAutoBreakdown(item);
      const weightInGrams = item.weight && item.weightUnit ? 
        convertToGrams(parseFloat(item.weight), item.weightUnit) : 0;
      
      res.json({
        eligible,
        currentWeight: {
          value: item.weight,
          unit: item.weightUnit,
          grams: weightInGrams
        },
        minimumWeight: {
          grams: 454,
          pounds: 1
        },
        canBreakdown: eligible && (item.quantity || 0) > 0
      });
    } catch (error) {
      console.error("Error checking breakdown eligibility:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get suggested breakdown options for a bulk item
   */
  app.get("/api/items/:id/breakdown-suggestions", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (!qualifiesForAutoBreakdown(item)) {
        return res.status(400).json({ message: "Item does not qualify for automatic breakdown" });
      }
      
      const weightInGrams = convertToGrams(parseFloat(item.weight || '0'), item.weightUnit || 'g');
      
      // Generate common breakdown suggestions
      const suggestions = [
        // Eighth ounces (3.5g)
        {
          weight: 3.5,
          unit: 'g',
          quantity: Math.floor(weightInGrams / 3.5),
          description: 'Eighth (3.5g)',
          totalWeight: Math.floor(weightInGrams / 3.5) * 3.5
        },
        // Quarter ounces (7g)
        {
          weight: 7,
          unit: 'g',
          quantity: Math.floor(weightInGrams / 7),
          description: 'Quarter (7g)',
          totalWeight: Math.floor(weightInGrams / 7) * 7
        },
        // Half ounces (14g)
        {
          weight: 14,
          unit: 'g',
          quantity: Math.floor(weightInGrams / 14),
          description: 'Half Ounce (14g)',
          totalWeight: Math.floor(weightInGrams / 14) * 14
        },
        // Full ounces (28g)
        {
          weight: 28,
          unit: 'g',
          quantity: Math.floor(weightInGrams / 28),
          description: 'Ounce (28g)',
          totalWeight: Math.floor(weightInGrams / 28) * 28
        }
      ].filter(suggestion => suggestion.quantity > 0);
      
      res.json({
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          weight: item.weight,
          weightUnit: item.weightUnit,
          quantity: item.quantity
        },
        totalWeight: {
          grams: weightInGrams,
          ounces: convertFromGrams(weightInGrams, 'oz'),
          pounds: convertFromGrams(weightInGrams, 'lb')
        },
        suggestions
      });
    } catch (error) {
      console.error("Error generating breakdown suggestions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Execute automatic breakdown of a bulk item
   */
  app.post("/api/items/:id/auto-breakdown", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const requestData = autoBreakdownSchema.parse({
        itemId,
        breakdownUnits: req.body.breakdownUnits
      });
      
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (!qualifiesForAutoBreakdown(item)) {
        return res.status(400).json({ message: "Item does not qualify for automatic breakdown" });
      }
      
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: "Item has no available quantity to break down" });
      }
      
      // Calculate total weight to be broken down
      const totalBreakdownWeight = requestData.breakdownUnits.reduce((total, unit) => {
        return total + (convertToGrams(unit.weight, unit.unit) * unit.quantity);
      }, 0);
      
      const availableWeight = convertToGrams(parseFloat(item.weight || '0'), item.weightUnit || 'g');
      
      if (totalBreakdownWeight > availableWeight) {
        return res.status(400).json({ 
          message: "Breakdown weight exceeds available item weight",
          available: availableWeight,
          requested: totalBreakdownWeight
        });
      }
      
      // Create breakdown items
      const createdItems = [];
      
      for (let i = 0; i < requestData.breakdownUnits.length; i++) {
        const unit = requestData.breakdownUnits[i];
        
        for (let j = 0; j < unit.quantity; j++) {
          const breakdownItem = await storage.createItem({
            name: `${item.name} - ${unit.description || `${unit.weight}${unit.unit}`}`,
            description: `Breakdown from ${item.name} (Original SKU: ${item.sku})`,
            sku: generateBreakdownSKU(item.sku || '', unit.weight, unit.unit, j),
            brand: item.brand,
            category: item.category,
            weight: unit.weight.toString(),
            weightUnit: unit.unit,
            quantity: 1,
            basePrice: item.basePrice,
            costPrice: item.costPrice,
            marketPrice: item.marketPrice,
            salePrice: item.salePrice,
            parentItemId: item.id,
            visibility: 'active',
            itemType: 'breakdown'
          });
          
          createdItems.push(breakdownItem);
        }
      }
      
      // Update original item quantity (reduce by 1 unit that was broken down)
      const updatedQuantity = Math.max(0, (item.quantity || 0) - 1);
      await storage.updateItem(itemId, {
        quantity: updatedQuantity,
        visibility: updatedQuantity > 0 ? item.visibility : 'archived'
      });
      
      // Log the breakdown action
      await storage.logInventoryAction({
        itemId: itemId,
        action: 'breakdown',
        quantity: 1,
        reason: `Auto-breakdown into ${createdItems.length} smaller units`,
        notes: `Created ${createdItems.length} breakdown items from 1 bulk unit`
      });
      
      res.json({
        success: true,
        originalItem: {
          id: itemId,
          name: item.name,
          previousQuantity: item.quantity,
          newQuantity: updatedQuantity
        },
        breakdownItems: createdItems,
        summary: {
          itemsCreated: createdItems.length,
          totalWeightBrokenDown: totalBreakdownWeight,
          remainingQuantity: updatedQuantity
        }
      });
      
    } catch (error) {
      console.error("Error executing auto breakdown:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get breakdown history for an item
   */
  app.get("/api/items/:id/breakdown-history", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      // Get all breakdown items created from this parent
      const breakdownItems = await storage.getItemsByParentId(itemId);
      
      // Get breakdown actions from inventory logs
      const actions = await storage.getInventoryActionsByItemId(itemId, 'breakdown');
      
      res.json({
        parentItemId: itemId,
        breakdownItems: breakdownItems || [],
        breakdownActions: actions || [],
        totalBreakdownEvents: actions?.length || 0,
        totalItemsCreated: breakdownItems?.length || 0
      });
      
    } catch (error) {
      console.error("Error fetching breakdown history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get all items eligible for automatic breakdown
   */
  app.get("/api/items/bulk-breakdown-eligible", async (req: Request, res: Response) => {
    try {
      const allItems = await storage.getItems();
      const eligibleItems = allItems.filter(qualifiesForAutoBreakdown);
      
      const itemsWithDetails = eligibleItems.map(item => {
        const weightInGrams = convertToGrams(parseFloat(item.weight || '0'), item.weightUnit || 'g');
        return {
          ...item,
          weightInGrams,
          canBreakdown: (item.quantity || 0) > 0,
          potentialBreakdowns: {
            eighths: Math.floor(weightInGrams / 3.5),
            quarters: Math.floor(weightInGrams / 7),
            halves: Math.floor(weightInGrams / 14),
            ounces: Math.floor(weightInGrams / 28)
          }
        };
      });
      
      res.json({
        eligibleItems: itemsWithDetails,
        totalEligible: itemsWithDetails.length,
        withAvailableQuantity: itemsWithDetails.filter(item => item.canBreakdown).length
      });
      
    } catch (error) {
      console.error("Error fetching breakdown eligible items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}