/**
 * Simple Breakdown Routes - Working implementation without complex types
 */
import type { Express, Request, Response } from "express";

// Predefined weight conversions for 1 pound
const WEIGHT_CONVERSIONS: Record<string, { quantity: number; weight: string; description: string }> = {
  'ounce': { quantity: 16, weight: 'ounce', description: 'Ounce' },
  'quarter-pound': { quantity: 4, weight: 'quarter pound', description: 'Quarter Pound (QP)' },
  'half-ounce': { quantity: 32, weight: 'half ounce', description: 'Half Ounce' },
  'quarter-ounce': { quantity: 64, weight: 'quarter ounce', description: 'Quarter Ounce' },
  'eighth': { quantity: 128, weight: 'eighth', description: 'Eighth (3.5g)' },
  'gram': { quantity: 454, weight: '1g', description: '1 Gram' }
};

/**
 * Register simple breakdown routes
 */
export function registerSimpleBreakdownRoutes(app: Express, storage: any) {
  
  /**
   * One-click breakdown: automatically deduct 1lb and add calculated smaller units
   */
  app.post("/api/items/:id/simple-breakdown", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const { weightType } = req.body;
      
      // Validate weight type
      if (!WEIGHT_CONVERSIONS[weightType]) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid weight type" 
        });
      }
      
      // Get the parent item
      const parentItem = await storage.getItem(itemId);
      if (!parentItem) {
        return res.status(404).json({ 
          success: false, 
          message: "Item not found" 
        });
      }
      
      // Check if item has 1 unit available
      if (!parentItem.quantity || parentItem.quantity < 1) {
        return res.status(400).json({ 
          success: false, 
          message: "Item must have at least 1 unit available for breakdown" 
        });
      }
      
      // Check if item is 1 pound (or bulk)
      const itemWeight = (parentItem.weight || '').toString().toLowerCase();
      console.log(`Weight validation: "${parentItem.weight}" -> "${itemWeight}"`);
      console.log(`Parent item data:`, JSON.stringify(parentItem, null, 2));
      
      if (!itemWeight.includes('pound') && !itemWeight.includes('lb') && !itemWeight.includes('bulk')) {
        return res.status(400).json({ 
          success: false, 
          message: "Item must be 1 pound or bulk weight for breakdown" 
        });
      }
      
      // Get conversion data
      const conversion = WEIGHT_CONVERSIONS[weightType];
      
      // Calculate price per unit (divide parent price by quantity created)
      const parentPrice = parseFloat(parentItem.basePrice || '0');
      const unitPrice = parentPrice > 0 ? (parentPrice / conversion.quantity).toFixed(2) : '0.00';
      
      // Create new draft items
      const newItems = [];
      for (let i = 1; i <= conversion.quantity; i++) {
        const newItem = {
          name: `${parentItem.name} - ${conversion.description} #${i}`,
          description: `${conversion.description} from ${parentItem.name} breakdown`,
          category: parentItem.category || 'Flower',
          weight: conversion.weight,
          basePrice: unitPrice,
          salePrice: unitPrice,
          quantity: 1,
          status: 'draft', // Create as drafts
          sku: `${parentItem.sku || 'BRK'}-${weightType.toUpperCase()}-${String(i).padStart(3, '0')}`,
          brand: parentItem.brand || 'Gold Standard',
          condition: parentItem.condition || 'Top Shelf',
          parentItemId: parentItem.id,
          createdAt: new Date()
        };
        
        try {
          const createdItem = await storage.createItem(newItem);
          newItems.push(createdItem);
        } catch (error) {
          console.error(`Error creating breakdown item ${i}:`, error);
          // Continue creating other items
        }
      }
      
      // Reduce parent item quantity by 1
      const newParentQuantity = parentItem.quantity - 1;
      await storage.updateItem(itemId, { 
        quantity: newParentQuantity,
        updatedAt: new Date()
      });
      
      res.json({
        success: true,
        message: `Successfully broke down 1lb into ${conversion.quantity} ${conversion.description} units`,
        breakdown: {
          parentItem: {
            id: parentItem.id,
            name: parentItem.name,
            previousQuantity: parentItem.quantity,
            newQuantity: newParentQuantity
          },
          createdItems: newItems.length,
          weightType: conversion.description,
          unitPrice: unitPrice,
          totalValue: (parseFloat(unitPrice) * conversion.quantity).toFixed(2)
        },
        createdItems: newItems.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.basePrice,
          status: item.status
        }))
      });
      
    } catch (error) {
      console.error("Error processing simple breakdown:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process breakdown",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  /**
   * Get breakdown options for an item
   */
  app.get("/api/items/:id/simple-breakdown-options", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const itemWeight = (item.weight || '').toLowerCase();
      const canBreakdown = (itemWeight.includes('pound') || itemWeight.includes('lb')) && 
                          item.quantity && item.quantity > 0;
      
      if (!canBreakdown) {
        return res.json({
          canBreakdown: false,
          reason: "Item must be 1 pound or bulk weight with available quantity"
        });
      }
      
      // Calculate potential breakdown values
      const parentPrice = parseFloat(item.basePrice || '0');
      const options = Object.entries(WEIGHT_CONVERSIONS).map(([key, conversion]) => ({
        weightType: key,
        description: conversion.description,
        quantity: conversion.quantity,
        unitWeight: conversion.weight,
        unitPrice: parentPrice > 0 ? (parentPrice / conversion.quantity).toFixed(2) : '0.00',
        totalValue: parentPrice.toFixed(2)
      }));
      
      res.json({
        canBreakdown: true,
        itemName: item.name,
        availableQuantity: item.quantity,
        currentPrice: parentPrice.toFixed(2),
        options
      });
      
    } catch (error) {
      console.error("Error fetching breakdown options:", error);
      res.status(500).json({ message: "Failed to fetch breakdown options" });
    }
  });
}