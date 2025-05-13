/**
 * Routes for inventory breakdown operations
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { z } from "zod";
import { ItemType, BreakdownStatus } from "@shared/schema";
import { generateBarcodeData } from "./services/barcode";
import { generateQRCodeDataURL } from "./services/qrcode";
import { generateSKU } from "./services/sku-generator";

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

/**
 * Register breakdown routes
 */
export function registerBreakdownRoutes(app: Express, storage: IStorage) {
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
      for (const target of validTargets) {
        const baseSku = parentItem.sku || generateSKU(parentItem);
        
        // Generate SKU for the breakdown item
        const breakdownSku = `${baseSku}-${target.weight}${target.weightUnit}`;
        
        // Prepare breakdown item data
        const breakdownItemData = {
          name: target.name,
          description: `${target.weight}${target.weightUnit} breakdown from ${parentItem.name}`,
          sku: breakdownSku,
          basePrice: target.price,
          costPrice: parentItem.costPrice * (target.weight / (parentItem.weight || 1)),
          category: parentItem.category,
          subcategory: parentItem.subcategory,
          brand: parentItem.brand,
          condition: parentItem.condition,
          quantity: target.quantity,
          weight: target.weight,
          weightUnit: target.weightUnit,
          itemType: ItemType.BREAKDOWN,
          parentItemId: target.parentItemId,
          images: parentItem.images, // Inherit images from parent
          tags: parentItem.tags, // Inherit tags from parent
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
      
      // Update the parent item's quantity if needed
      // Calculate total breakdown weight
      const totalBreakdownWeight = validTargets.reduce((sum, target) => {
        return sum + (target.weight * target.quantity);
      }, 0);
      
      if (parentItem.weight && totalBreakdownWeight > 0) {
        // Calculate how many units were consumed
        const unitsConsumed = Math.ceil(totalBreakdownWeight / parentItem.weight);
        
        // Update parent quantity
        const newQuantity = Math.max(0, parentItem.quantity - unitsConsumed);
        await storage.updateItem(itemId, { quantity: newQuantity });
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