/**
 * Routes for handling real-time synchronization between app and marketplaces
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { log } from './vite';
import { MarketplaceService } from "./services/marketplace";
import { getMarketplaceScheduler } from "./services/marketplace-scheduler";

/**
 * Register sync routes
 */
export function registerSyncRoutes(app: Express, storage: IStorage) {
  /**
   * Force immediate sync with all enabled marketplaces
   * This helps resolve any sync issues and ensures data is up-to-date
   */
  app.post("/api/sync/force", async (req: Request, res: Response) => {
    try {
      // Get all enabled marketplaces
      const marketplaces = await storage.getAllMarketplaces();
      const enabledMarketplaces = marketplaces.filter(m => m.isConnected && m.isSyncEnabled);
      
      if (enabledMarketplaces.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "No enabled marketplaces found for synchronization" 
        });
      }
      
      log(`Force sync: Starting bidirectional sync with ${enabledMarketplaces.length} marketplaces`, 'marketplace-sync');
      
      // Start the sync processes
      const scheduler = getMarketplaceScheduler(storage);
      const syncPromises = enabledMarketplaces.map(async (marketplace) => {
        // First pull from marketplace to get current data
        const pullResult = await scheduler.manualPullSync(marketplace.id);
        
        // Then push our data to marketplace
        const pushResult = await scheduler.manualPushSync(marketplace.id);
        
        return { 
          marketplaceId: marketplace.id,
          name: marketplace.name,
          pullResult,
          pushResult
        };
      });
      
      // Wait for all sync processes to complete
      const results = await Promise.all(syncPromises);
      
      return res.json({
        success: true,
        message: `Force sync completed with ${enabledMarketplaces.length} marketplaces`,
        details: results
      });
    } catch (error: any) {
      log(`Error during force sync: ${error.message}`, 'marketplace-sync-error');
      return res.status(500).json({
        success: false,
        message: `Error during force sync: ${error.message}`
      });
    }
  });
  
  /**
   * Force sync an individual item with all enabled marketplaces
   */
  app.post("/api/sync/item/:id", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      // Get all enabled marketplaces
      const marketplaces = await storage.getAllMarketplaces();
      const enabledMarketplaces = marketplaces.filter(m => m.isConnected && m.isSyncEnabled);
      
      if (enabledMarketplaces.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "No enabled marketplaces found for synchronization" 
        });
      }
      
      log(`Forcing sync for item "${item.name}" (ID: ${item.id}) with ${enabledMarketplaces.length} marketplaces`, 'marketplace-sync');
      
      // Push to each marketplace
      const results = await Promise.all(enabledMarketplaces.map(async (marketplace) => {
        const marketplaceService = new MarketplaceService(marketplace);
        const result = await marketplaceService.pushProduct(item);
        
        if (result.success) {
          // Update the item's last pushed timestamp for this marketplace
          await storage.updateItemLastPushed(item.id, marketplace.id, new Date());
        }
        
        return {
          marketplaceId: marketplace.id,
          name: marketplace.name,
          success: result.success,
          message: result.message
        };
      }));
      
      return res.json({
        success: true,
        message: `Force sync completed for item "${item.name}"`,
        results
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Error syncing item: ${error.message}`
      });
    }
  });

  /**
   * Check latest inventory levels from marketplaces for an item
   */
  app.get("/api/sync/check-inventory/:id", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      // Get the external IDs for this item in each marketplace
      const externalIds = await storage.getItemExternalIds(itemId);
      
      if (!externalIds || Object.keys(externalIds).length === 0) {
        return res.json({
          success: false,
          message: "This item has not been pushed to any marketplaces yet"
        });
      }
      
      // Get all connected marketplaces
      const marketplaces = await storage.getAllMarketplaces();
      const connectedMarketplaces = marketplaces.filter(m => m.isConnected);
      
      const inventoryResults = await Promise.all(
        connectedMarketplaces.map(async (marketplace) => {
          const marketplaceId = marketplace.id.toString();
          
          if (!externalIds[marketplaceId]) {
            return {
              marketplaceId: marketplace.id,
              name: marketplace.name,
              status: "not-synced",
              message: "Item not synced with this marketplace"
            };
          }
          
          try {
            const marketplaceService = new MarketplaceService(marketplace);
            // This is a placeholder - the actual implementation would depend on your marketplace service
            // You would need to add a method to fetch current inventory for an item
            // const inventoryInfo = await marketplaceService.getItemInventory(externalIds[marketplaceId]);
            
            return {
              marketplaceId: marketplace.id,
              name: marketplace.name,
              status: "synced",
              externalId: externalIds[marketplaceId],
              // Add actual inventory data when the method is implemented
              inventoryLevel: "Check implementation", // This would be replaced with actual data
              lastSyncedAt: await storage.getItemLastPushedTime(itemId, marketplace.id)
            };
          } catch (error: any) {
            return {
              marketplaceId: marketplace.id,
              name: marketplace.name,
              status: "error",
              message: `Error checking inventory: ${error.message}`
            };
          }
        })
      );
      
      return res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          currentQuantity: item.quantity
        },
        marketplaces: inventoryResults
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Error checking inventory: ${error.message}`
      });
    }
  });
}