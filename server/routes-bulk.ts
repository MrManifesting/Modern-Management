/**
 * Routes for bulk operations on inventory items
 */
import { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { z } from "zod";

const bulkItemIdsSchema = z.object({
  itemIds: z.array(z.number()).min(1, "At least one item ID is required")
});

/**
 * Register bulk operation routes
 */
export function registerBulkOperationRoutes(app: Express, storage: IStorage) {
  /**
   * Bulk delete items
   */
  app.post("/api/items/bulk-delete", async (req: Request, res: Response) => {
    try {
      const { itemIds } = bulkItemIdsSchema.parse(req.body);
      
      // Delete each item
      const results = await Promise.all(
        itemIds.map(id => storage.deleteItem(id))
      );
      
      // Count successful deletions
      const successCount = results.filter(Boolean).length;
      
      res.json({
        success: true,
        message: `Successfully deleted ${successCount} of ${itemIds.length} items`
      });
    } catch (error) {
      console.error("Error in bulk delete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete items"
      });
    }
  });

  /**
   * Bulk publish items to marketplaces
   */
  app.post("/api/items/bulk-publish", async (req: Request, res: Response) => {
    try {
      const { itemIds } = bulkItemIdsSchema.parse(req.body);
      
      // Get all active marketplaces
      const marketplaces = await storage.getMarketplaces();
      const activeMarketplaces = marketplaces.filter(m => m.isActive);
      
      if (activeMarketplaces.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No active marketplaces found"
        });
      }
      
      // Get items
      const items = await Promise.all(
        itemIds.map(id => storage.getItem(id))
      );
      
      // Filter out any undefined items
      const validItems = items.filter(Boolean);
      
      // Track publish results
      let successCount = 0;
      let failedCount = 0;
      
      // Publish each item to each marketplace
      for (const item of validItems) {
        for (const marketplace of activeMarketplaces) {
          try {
            // This would use your actual marketplace publishing logic
            await storage.pushItemToMarketplace(item.id, marketplace.id);
            successCount++;
          } catch (error) {
            console.error(`Failed to publish item ${item.id} to marketplace ${marketplace.id}:`, error);
            failedCount++;
          }
        }
      }
      
      res.json({
        success: true,
        message: `Published ${successCount} items to marketplaces (${failedCount} failed)`
      });
    } catch (error) {
      console.error("Error in bulk publish:", error);
      res.status(500).json({
        success: false,
        message: "Failed to publish items"
      });
    }
  });

  /**
   * Bulk update items with the same property
   */
  app.post("/api/items/bulk-update", async (req: Request, res: Response) => {
    try {
      const { itemIds, updates } = req.body;
      
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No item IDs provided"
        });
      }
      
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          success: false, 
          message: "No updates provided"
        });
      }
      
      // Update each item
      const results = await Promise.all(
        itemIds.map(async (id) => {
          const item = await storage.getItem(id);
          if (!item) return false;
          
          return storage.updateItem(id, { ...item, ...updates });
        })
      );
      
      // Count successful updates
      const successCount = results.filter(Boolean).length;
      
      res.json({
        success: true,
        message: `Successfully updated ${successCount} of ${itemIds.length} items`
      });
    } catch (error) {
      console.error("Error in bulk update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update items"
      });
    }
  });
}