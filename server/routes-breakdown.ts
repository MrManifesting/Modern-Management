/**
 * Routes for inventory breakdown operations
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { z } from "zod";
import { ItemType, BreakdownStatus } from "@shared/schema";
import { generateBarcodeData } from "./services/barcode";
import { generateQRCodeDataURL } from "./services/qrcode";
import { generateSKU, generateBreakdownSKUs } from "./services/sku-generator";

// Cannabis weight conversion functions (accurate to industry standards)
function convertToGrams(weight: number, unit: string): number {
  const lowerUnit = unit.toLowerCase();
  switch (lowerUnit) {
    case 'pound':
    case 'pounds':
    case 'lb':
    case 'lbs':
      return weight * 454; // 1 pound = 454 grams
    case 'ounce':
    case 'ounces':
    case 'oz':
      return weight * 28.35; // 1 ounce = 28.35 grams
    case 'gram':
    case 'grams':
    case 'g':
      return weight;
    default:
      // Handle text weights like "1 pound", "half pound", etc.
      if (lowerUnit.includes('pound')) {
        if (lowerUnit.includes('half')) return 227; // half pound
        if (lowerUnit.includes('quarter')) return 113.5; // quarter pound
        return 454; // default to 1 pound
      }
      if (lowerUnit.includes('ounce')) {
        if (lowerUnit.includes('half')) return 14.175; // half ounce
        if (lowerUnit.includes('quarter')) return 7.0875; // quarter ounce
        return 28.35; // default to 1 ounce
      }
      if (lowerUnit.includes('eighth')) return 3.5; // eighth of ounce
      return weight; // assume grams if unknown
  }
}

function parseWeightValue(weightStr: string | number): { value: number; unit: string } {
  if (typeof weightStr === 'number') {
    return { value: weightStr, unit: 'grams' };
  }
  
  const str = weightStr.toLowerCase().trim();
  
  // Handle common cannabis weights
  if (str === '1 pound' || str === 'pound') return { value: 1, unit: 'pound' };
  if (str === 'half pound') return { value: 0.5, unit: 'pound' };
  if (str === 'quarter pound') return { value: 0.25, unit: 'pound' };
  if (str === 'ounce' || str === '1 ounce') return { value: 1, unit: 'ounce' };
  if (str === 'half ounce') return { value: 0.5, unit: 'ounce' };
  if (str === 'quarter ounce') return { value: 0.25, unit: 'ounce' };
  if (str === 'eighth') return { value: 3.5, unit: 'grams' };
  if (str === 'gram' || str === '1 gram') return { value: 1, unit: 'grams' };
  
  // Extract numeric value and unit
  const match = str.match(/^(\d*\.?\d+)\s*([a-z]+)$/);
  if (match) {
    return { value: parseFloat(match[1]), unit: match[2] };
  }
  
  return { value: parseFloat(str) || 1, unit: 'grams' };
}

// Define a schema for breakdown targets
const breakdownTargetSchema = z.object({
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  weight: z.number().positive(),
  weightUnit: z.string(),
  parentItemId: z.number().int().positive(),
});

type BreakdownTarget = z.infer<typeof breakdownTargetSchema>;

// Schema for the drag and drop breakdown request
const dragDropBreakdownSchema = z.object({
  targetWeight: z.number().positive(),
  targetUnit: z.string(),
  quantity: z.number().int().positive(),
});

/**
 * Register breakdown routes
 */
export function registerBreakdownRoutes(app: Express, storage: IStorage) {
  /**
   * Create a bulk item breakdown using drag and drop
   */
  app.post("/api/items/:id/drag-drop-breakdown", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ success: false, message: "Invalid item ID" });
      }

      // Validate request body
      const parseResult = dragDropBreakdownSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid breakdown parameters", 
          errors: parseResult.error.errors 
        });
      }

      const { targetWeight, targetUnit, quantity } = parseResult.data;

      // Get the parent item
      const parentItem = await storage.getItem(itemId);
      if (!parentItem) {
        return res.status(404).json({ success: false, message: "Item not found" });
      }

      // Check if item has enough quantity
      if (parentItem.quantity <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Insufficient quantity for breakdown" 
        });
      }

      // Generate a name for the new breakdown item
      const newItemName = `${parentItem.name} (${targetWeight}${targetUnit})`;

      // Calculate price based on weight proportion
      let newPrice = parentItem.basePrice;
      if (parentItem.weight && parentItem.weight > 0) {
        // Convert weights to same unit for calculation (simplified)
        const weightFactor = targetWeight / parentItem.weight;
        newPrice = parentItem.basePrice * weightFactor;
      }

      // Generate SKU for the breakdown item
      const breakdownSku = generateSKU(parentItem, {
        weight: targetWeight,
        weightUnit: targetUnit,
        parentSku: parentItem.sku
      });

      // Create the breakdown item
      const breakdownItemData = {
        name: newItemName,
        description: `${targetWeight}${targetUnit} breakdown from ${parentItem.name}`,
        sku: breakdownSku,
        basePrice: newPrice,
        costPrice: parentItem.costPrice ? parentItem.costPrice * (targetWeight / (parentItem.weight || 1)) : 0,
        category: parentItem.category,
        subcategory: parentItem.subcategory,
        brand: parentItem.brand,
        condition: parentItem.condition,
        quantity: quantity,
        weight: targetWeight,
        weightUnit: targetUnit,
        itemType: ItemType.BREAKDOWN,
        parentItemId: itemId,
        images: (parentItem.images || []) as any,
        tags: (parentItem.tags || []) as any,
        attributes: parentItem.attributes as any, // Copy attributes
        breakdownStatus: BreakdownStatus.COMPLETED,
        status: parentItem.status, // Inherit status from parent
      };
      
      // Create the breakdown item
      const newItem = await storage.createItem(breakdownItemData);
      
      // Generate barcode and QR code for the item
      newItem.barcode = generateBarcodeData(breakdownSku);
      newItem.qrCode = await generateQRCodeDataURL(newItem);
      
      // Update with barcode and QR code
      await storage.updateItem(newItem.id, {
        barcode: newItem.barcode,
        qrCode: newItem.qrCode
      });

      // Update the parent item's quantity
      // Simple approach: decrement by the number of items created
      const newQuantity = Math.max(0, parentItem.quantity - 1);
      await storage.updateItem(itemId, { quantity: newQuantity });

      return res.status(200).json({
        success: true,
        message: "Breakdown successful",
        newItemId: newItem.id,
        newSku: newItem.sku,
        remainingQuantity: newQuantity
      });
    } catch (error) {
      console.error("Error in drag and drop breakdown:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating breakdown item",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Create a quick breakdown for a bulk item
   */
  app.post("/api/items/:id/quick-breakdown", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const { targets } = req.body;
      
      if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No breakdown targets specified"
        });
      }
      
      // Validate the parent item exists
      const parentItem = await storage.getItem(itemId);
      if (!parentItem) {
        return res.status(404).json({ 
          success: false, 
          message: "Parent item not found"
        });
      }
      
      // Validate all targets
      const validTargets: BreakdownTarget[] = [];
      for (const target of targets) {
        try {
          const validTarget = breakdownTargetSchema.parse({
            ...target,
            parentItemId: itemId
          });
          validTargets.push(validTarget);
        } catch (error) {
          console.error("Invalid breakdown target:", error);
          // Continue with valid targets
        }
      }
      
      if (validTargets.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No valid breakdown targets provided"
        });
      }
      
      // Create the breakdown items
      const createdItems = [];
      
      // Group targets by weight for organized SKU generation
      const targetWeights = validTargets.map(target => target.weight);
      const uniqueWeightsSet = new Set(targetWeights);
      const uniqueWeights = Array.from(uniqueWeightsSet);
      
      // Generate SKUs for all weights at once
      const skuMap = generateBreakdownSKUs(
        parentItem, 
        uniqueWeights, 
        validTargets[0].weightUnit // Assuming all targets use the same weight unit
      );
      
      for (const target of validTargets) {
        // Use the pre-generated SKU for this weight
        const breakdownSku = skuMap[target.weight] || 
          generateSKU(parentItem, {
            weight: target.weight,
            weightUnit: target.weightUnit,
            parentSku: parentItem.sku
          });
        
        // Calculate proportional cost price
        const parentWeightInfo = parseWeightValue(parentItem.weight || "1 gram");
        const parentWeightGrams = convertToGrams(parentWeightInfo.value, parentWeightInfo.unit);
        const targetWeightGrams = convertToGrams(target.weight, target.weightUnit);
        const costRatio = targetWeightGrams / parentWeightGrams;
        
        // Parse and convert cost price properly
        let calculatedCostPrice = "0";
        if (parentItem.costPrice) {
          const baseCost = typeof parentItem.costPrice === 'string' ? parseFloat(parentItem.costPrice) : parentItem.costPrice;
          calculatedCostPrice = (baseCost * costRatio).toString();
        }
        
        // Prepare breakdown item data with proper weight string formatting
        const breakdownItemData = {
          name: target.name,
          description: `${target.weight} ${target.weightUnit} breakdown from ${parentItem.name}`,
          sku: breakdownSku,
          basePrice: target.price.toString(),
          costPrice: calculatedCostPrice,
          category: parentItem.category,
          brand: parentItem.brand,
          condition: parentItem.condition,
          quantity: target.quantity,
          weight: `${target.weight} ${target.weightUnit}`, // Store as string with unit
          itemType: ItemType.BREAKDOWN,
          parentItemId: target.parentItemId,
          // Cast images and tags to ensure proper typing
          images: (parentItem.images || []) as any,
          tags: (parentItem.tags || []) as any,
          breakdownStatus: BreakdownStatus.COMPLETED,
          status: parentItem.status, // Inherit status from parent
        };
        
        // Create the breakdown item
        const newItem = await storage.createItem(breakdownItemData);
        
        // Generate barcode and QR code for the item
        newItem.barcode = generateBarcodeData(breakdownSku);
        newItem.qrCode = await generateQRCodeDataURL(newItem);
        
        // Update with barcode and QR code
        await storage.updateItem(newItem.id, {
          barcode: newItem.barcode,
          qrCode: newItem.qrCode
        });
        
        createdItems.push(newItem);
      }
      
      // Update parent item quantity based on exact breakdown logic
      // For cannabis breakdown: if breaking 1 pound into 2 half-pounds, parent should go to 0
      
      const currentQuantity = parentItem.quantity ?? 0;
      if (parentItem.weight && currentQuantity > 0) {
        // Parse parent item weight and convert to grams for accuracy
        const parentWeightInfo = parseWeightValue(parentItem.weight);
        const parentGramsPerUnit = convertToGrams(parentWeightInfo.value, parentWeightInfo.unit);
        
        // Calculate total grams being broken down
        const totalBreakdownGrams = validTargets.reduce((sum, target) => {
          const targetGrams = convertToGrams(target.weight, target.weightUnit);
          return sum + (targetGrams * target.quantity);
        }, 0);
        
        // Calculate exact parent units consumed - for exact weight matches, should be 1:1
        // Example: 1 pound parent, breaking into 2x 0.5 pound = 454g total / 454g per unit = 1 unit consumed
        const exactUnitsConsumed = totalBreakdownGrams / parentGramsPerUnit;
        
        // For exact weight breakdowns (like 1 pound -> 2 half pounds), this should equal 1
        const unitsConsumed = Math.max(1, Math.round(exactUnitsConsumed));
        
        // Ensure we don't consume more than available
        const actualUnitsConsumed = Math.min(unitsConsumed, currentQuantity);
        const newQuantity = Math.max(0, currentQuantity - actualUnitsConsumed);
        
        console.log(`Breakdown calculation details:`);
        console.log(`- Parent: ${parentItem.name} (${parentItem.weight})`);
        console.log(`- Parent weight per unit: ${parentGramsPerUnit}g`);
        console.log(`- Current parent quantity: ${currentQuantity}`);
        console.log(`- Total breakdown weight: ${totalBreakdownGrams}g`);
        console.log(`- Exact units consumed calculation: ${totalBreakdownGrams}g ÷ ${parentGramsPerUnit}g = ${exactUnitsConsumed}`);
        console.log(`- Final units consumed: ${actualUnitsConsumed}`);
        console.log(`- New parent quantity: ${newQuantity}`);
        
        // Update only the quantity field
        const updateResult = await storage.updateItem(itemId, { quantity: newQuantity });
        
        if (updateResult) {
          console.log(`✓ Parent quantity successfully updated from ${currentQuantity} to ${newQuantity}`);
        } else {
          console.error(`✗ Failed to update parent quantity for item ${itemId}`);
        }
      } else {
        console.log(`Skipping parent quantity update - weight: ${parentItem.weight}, quantity: ${currentQuantity}`);
      }
      
      return res.status(200).json({
        success: true,
        message: `Created ${createdItems.length} breakdown items`,
        createdItems
      });
    } catch (error) {
      console.error("Error creating breakdown:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating breakdown items",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}