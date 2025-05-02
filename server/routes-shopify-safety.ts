/**
 * Routes for Shopify safety features
 */

import { Request, Response, Express } from 'express';
import { 
  getSafetyMode, 
  setSafetyMode, 
  setConfirmationRequired,
  confirmOperation,
  clearConfirmation,
  ShopifySafetyMode,
  getOperationsReport,
  logShopifyOperation
} from './services/shopify-safety';
import { generateSku, generateSkuBatch } from './services/sku-generator';
import { IStorage } from './storage';

/**
 * Register Shopify safety routes
 */
export function registerShopifySafetyRoutes(app: Express, storage: IStorage) {
  // Get current safety mode
  app.get("/api/shopify/safety", async (_req: Request, res: Response) => {
    try {
      const safetyStatus = getSafetyMode();
      res.json(safetyStatus);
    } catch (error) {
      console.error("Failed to get Shopify safety status:", error);
      res.status(500).json({ 
        error: "Failed to get Shopify safety status", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Set safety mode
  app.post("/api/shopify/safety/mode", async (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      
      if (!mode || !Object.values(ShopifySafetyMode).includes(mode)) {
        return res.status(400).json({ 
          error: "Invalid safety mode", 
          validModes: Object.values(ShopifySafetyMode)
        });
      }
      
      const result = setSafetyMode(mode as ShopifySafetyMode);
      res.json(result);
    } catch (error) {
      console.error("Failed to set Shopify safety mode:", error);
      res.status(500).json({ 
        error: "Failed to set Shopify safety mode", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Set confirmation requirement
  app.post("/api/shopify/safety/confirmation-required", async (req: Request, res: Response) => {
    try {
      const { required } = req.body;
      
      if (typeof required !== 'boolean') {
        return res.status(400).json({ 
          error: "Invalid request. 'required' must be a boolean value." 
        });
      }
      
      const result = setConfirmationRequired(required);
      res.json(result);
    } catch (error) {
      console.error("Failed to set confirmation requirement:", error);
      res.status(500).json({ 
        error: "Failed to set confirmation requirement", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Confirm operations
  app.post("/api/shopify/safety/confirm", async (_req: Request, res: Response) => {
    try {
      const result = confirmOperation();
      res.json(result);
    } catch (error) {
      console.error("Failed to confirm operations:", error);
      res.status(500).json({ 
        error: "Failed to confirm operations", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Clear confirmation
  app.post("/api/shopify/safety/clear-confirmation", async (_req: Request, res: Response) => {
    try {
      const result = clearConfirmation();
      res.json(result);
    } catch (error) {
      console.error("Failed to clear confirmation:", error);
      res.status(500).json({ 
        error: "Failed to clear confirmation", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get operations report
  app.get("/api/shopify/safety/operations-report", async (_req: Request, res: Response) => {
    try {
      const report = getOperationsReport();
      res.json(report);
    } catch (error) {
      console.error("Failed to generate operations report:", error);
      res.status(500).json({ 
        error: "Failed to generate operations report", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Generate SKU for an item without Shopify API calls
  app.post("/api/items/:id/generate-sku", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Generate the SKU
      const sku = generateSku(item);
      
      // Log the operation
      logShopifyOperation(
        'generateSku',
        { itemId: id, oldSku: item.sku, newSku: sku },
        true
      );
      
      // If apply flag is set to true, update the item
      if (req.body.apply === true) {
        await storage.updateItem(id, { ...item, sku });
        
        res.json({
          success: true,
          message: `SKU generated and applied to item: ${sku}`,
          sku,
          item: { ...item, sku }
        });
      } else {
        // Just return the generated SKU without applying it
        res.json({
          success: true,
          message: `SKU generated: ${sku}`,
          sku,
          item
        });
      }
    } catch (error) {
      console.error("Failed to generate SKU:", error);
      res.status(500).json({ 
        error: "Failed to generate SKU", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Generate SKUs for multiple items in bulk
  app.post("/api/items/generate-skus-bulk", async (req: Request, res: Response) => {
    try {
      const { itemIds, apply } = req.body;
      
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ 
          error: "Invalid request. 'itemIds' must be a non-empty array." 
        });
      }
      
      // Get all items
      const items = await storage.getItems();
      
      // Filter selected items
      const selectedItems = items.filter(item => itemIds.includes(item.id));
      
      if (selectedItems.length === 0) {
        return res.status(404).json({ error: "No matching items found" });
      }
      
      // Generate SKUs
      const skuMap = generateSkuBatch(selectedItems);
      
      // Log the operation
      logShopifyOperation(
        'generateSkuBatch',
        { itemIds, skuMap },
        true
      );
      
      // If apply flag is set to true, update the items
      if (apply === true) {
        const updatedItems = [];
        
        for (const item of selectedItems) {
          if (!item.id || !skuMap[item.id]) continue;
          
          const updatedItem = { 
            ...item, 
            sku: skuMap[item.id] 
          };
          
          await storage.updateItem(item.id, updatedItem);
          updatedItems.push(updatedItem);
        }
        
        res.json({
          success: true,
          message: `Generated and applied ${Object.keys(skuMap).length} SKUs`,
          skuMap,
          updatedItems
        });
      } else {
        // Just return the generated SKUs without applying them
        res.json({
          success: true,
          message: `Generated ${Object.keys(skuMap).length} SKUs`,
          skuMap,
          items: selectedItems
        });
      }
    } catch (error) {
      console.error("Failed to generate SKUs in bulk:", error);
      res.status(500).json({ 
        error: "Failed to generate SKUs in bulk", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}