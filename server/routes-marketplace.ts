/**
 * Routes for managing marketplace integrations
 */
import { Request, Response, Express } from 'express';
import { IStorage } from './storage';
import { MarketplaceService } from './services/marketplace';
import { MarketplaceLogger } from './services/marketplace-logger';
import { getMarketplaceScheduler } from './services/marketplace-scheduler';
import { insertMarketplaceSchema } from '@shared/schema';
import { z } from 'zod';
import { log } from './vite';

/**
 * Register marketplace routes
 */
export function registerMarketplaceRoutes(app: Express, storage: IStorage) {
  // Initialize the marketplace scheduler
  const scheduler = getMarketplaceScheduler(storage);
  scheduler.initialize().catch(error => {
    log(`Error initializing marketplace scheduler: ${error.message}`, 'marketplace-error');
  });
  /**
   * Get all marketplaces
   */
  app.get("/api/marketplaces", async (_req: Request, res: Response) => {
    try {
      const marketplaces = await storage.getMarketplaces();
      res.json(marketplaces);
    } catch (error) {
      console.error("Error fetching marketplaces:", error);
      res.status(500).json({ error: "Failed to fetch marketplaces" });
    }
  });

  /**
   * Get a specific marketplace by ID
   */
  app.get("/api/marketplaces/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Don't expose sensitive credential values
      const maskedCredentials = Object.fromEntries(
        Object.entries(marketplace.credentials as Record<string, any>).map(([key, value]) => {
          if (typeof value === 'string' && key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
            if (value.length > 8) {
              return [key, `${value.substring(0, 4)}...${value.substring(value.length - 4)}`];
            } else {
              return [key, '********'];
            }
          }
          return [key, value];
        })
      );

      res.json({
        ...marketplace,
        credentials: maskedCredentials
      });
    } catch (error) {
      console.error(`Error fetching marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch marketplace" });
    }
  });

  /**
   * Create a new marketplace
   */
  app.post("/api/marketplaces", async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const validateResult = insertMarketplaceSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({
          error: "Invalid marketplace data",
          details: validateResult.error.format()
        });
      }

      const newMarketplace = await storage.createMarketplace(validateResult.data);
      
      res.status(201).json({
        success: true,
        message: "Marketplace created successfully",
        marketplace: newMarketplace
      });
    } catch (error) {
      console.error("Error creating marketplace:", error);
      res.status(500).json({ error: "Failed to create marketplace" });
    }
  });

  /**
   * Update an existing marketplace
   */
  app.patch("/api/marketplaces/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Validate the request body against a partial of the schema
      const partialSchema = insertMarketplaceSchema.partial();
      const validateResult = partialSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({
          error: "Invalid marketplace data",
          details: validateResult.error.format()
        });
      }

      const updatedMarketplace = await storage.updateMarketplace(id, validateResult.data);
      
      // If sync settings are updated, reschedule the marketplace
      if (updatedMarketplace && (
        'syncEnabled' in validateResult.data || 
        'syncPullInterval' in validateResult.data || 
        'syncPushInterval' in validateResult.data ||
        'isSyncEnabled' in validateResult.data
      )) {
        await scheduler.scheduleMarketplaceSync(updatedMarketplace);
        log(`Rescheduled marketplace sync for ${updatedMarketplace.name}`, 'marketplace-sync');
      }
      
      res.json({
        success: true,
        message: "Marketplace updated successfully",
        marketplace: updatedMarketplace
      });
    } catch (error) {
      console.error(`Error updating marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update marketplace" });
    }
  });

  /**
   * Delete a marketplace
   */
  app.delete("/api/marketplaces/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }
      
      // Cancel any scheduled sync operations first
      log(`Cancelling scheduled syncs for marketplace ${marketplace.name} (ID: ${id})`, 'marketplace-sync');
      scheduler.cancelMarketplaceSync(id);

      const success = await storage.deleteMarketplace(id);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete marketplace" });
      }

      res.json({ success: true, message: "Marketplace deleted successfully" });
    } catch (error) {
      console.error(`Error deleting marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete marketplace" });
    }
  });

  /**
   * Test connection to a marketplace
   */
  app.post("/api/marketplaces/test", async (req: Request, res: Response) => {
    try {
      const { type, credentials } = req.body;
      
      if (!type || !credentials) {
        return res.status(400).json({ error: "Missing required fields: type and credentials" });
      }

      // Create a temporary marketplace object for testing
      const testMarketplace = {
        id: 0, // Temporary ID
        name: "Test Connection",
        type,
        credentials,
        createdAt: new Date(),
        updatedAt: new Date(),
        isConnected: false
      };

      // Create a marketplace service instance
      const marketplaceService = new MarketplaceService(testMarketplace);
      const result = await marketplaceService.testConnection();
      
      res.json({
        connected: result.success,
        name: testMarketplace.name,
        message: result.message
      });
    } catch (error) {
      console.error("Error testing marketplace connection:", error);
      res.status(500).json({ 
        connected: false,
        name: '',
        message: error instanceof Error ? error.message : "Unknown error testing connection"
      });
    }
  });

  /**
   * Test connection to an existing marketplace
   */
  app.post("/api/marketplaces/:id/test", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // If credentials were passed in the request, use them instead of stored credentials
      if (req.body.credentials) {
        // Only for testing - don't save these credentials yet
        marketplace.credentials = req.body.credentials;
      }

      // Create a marketplace service instance
      const marketplaceService = new MarketplaceService(marketplace);
      const result = await marketplaceService.testConnection();
      
      res.json({
        connected: result.success,
        name: marketplace.name,
        message: result.message
      });
    } catch (error) {
      console.error(`Error testing marketplace connection ${req.params.id}:`, error);
      res.status(500).json({ 
        connected: false,
        name: '',
        message: error instanceof Error ? error.message : "Unknown error testing connection"
      });
    }
  });

  /**
   * Connect to a marketplace (set isConnected = true)
   */
  app.post("/api/marketplaces/:id/connect", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Test connection before marking as connected
      const marketplaceService = new MarketplaceService(marketplace);
      const testResult = await marketplaceService.testConnection();
      if (!testResult.success) {
        return res.status(400).json({
          error: "Cannot connect to marketplace",
          message: testResult.message
        });
      }

      // Update the marketplace connection status
      const connectedMarketplace = await storage.connectMarketplace(id);
      
      res.json({
        success: true,
        message: "Marketplace connected successfully",
        marketplace: connectedMarketplace
      });
    } catch (error) {
      console.error(`Error connecting to marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to connect to marketplace" });
    }
  });

  /**
   * Toggle sync enabled flag for a marketplace
   */
  app.post("/api/marketplaces/:id/sync-toggle", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Update sync status (toggle)
      const syncEnabled = !marketplace.syncEnabled;
      const updatedMarketplace = await storage.updateMarketplace(id, { 
        syncEnabled,
        isSyncEnabled: syncEnabled // Also update the alias field for clarity
      });
      
      // Adjust the scheduling based on the new sync status
      if (syncEnabled) {
        await scheduler.scheduleMarketplaceSync(updatedMarketplace);
        log(`Scheduled marketplace sync for ${updatedMarketplace.name}`, 'marketplace-sync');
      } else {
        scheduler.cancelMarketplaceSync(id);
        log(`Cancelled marketplace sync for ${updatedMarketplace.name}`, 'marketplace-sync');
      }
      
      res.json({
        success: true,
        message: `Sync ${syncEnabled ? 'enabled' : 'disabled'} for ${marketplace.name}`,
        marketplace: updatedMarketplace
      });
    } catch (error) {
      console.error(`Error toggling sync for marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to toggle sync status" });
    }
  });

  /**
   * Get operations log for a marketplace
   */
  app.get("/api/marketplaces/:id/operations-log", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      // Use the MarketplaceLogger class to get logs
      const log = await MarketplaceLogger.getLog(id);
      
      // Limit the results if needed
      const limitedLog = limit < log.length ? log.slice(0, limit) : log;
      
      res.json(limitedLog);
    } catch (error) {
      console.error(`Error fetching operations log for marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch operations log" });
    }
  });

  /**
   * Clear operations log for a marketplace
   */
  app.post("/api/marketplaces/:id/clear-log", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Use the MarketplaceLogger class to clear logs
      const success = await MarketplaceLogger.clearLog(id);
      
      res.json({
        success,
        message: success 
          ? "Operations log cleared successfully" 
          : "Failed to clear operations log"
      });
    } catch (error) {
      console.error(`Error clearing operations log for marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to clear operations log" });
    }
  });

  /**
   * Sync products from marketplace to local inventory
   */
  app.post("/api/marketplaces/:id/sync", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Create marketplace service
      const marketplaceService = new MarketplaceService(marketplace);
      
      // Test connection first to make sure marketplace is accessible
      const testResult = await marketplaceService.testConnection();
      if (!testResult.success) {
        return res.status(400).json({ 
          error: "Marketplace not properly configured",
          message: testResult.message
        });
      }

      // Perform the sync with the scheduler
      log(`Manual sync triggered for marketplace ${marketplace.name} (ID: ${id})`, 'marketplace-sync');
      const result = await scheduler.manualPullSync(id);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false,
          error: "Failed to sync with marketplace",
          message: result.message
        });
      }
      
      res.json({
        success: true,
        message: `Successfully synced ${result.imported} new and ${result.updated} existing products from ${marketplace.name}`,
        result
      });
    } catch (error) {
      console.error(`Error syncing products from marketplace ${req.params.id}:`, error);
      res.status(500).json({ 
        error: "Failed to sync products from marketplace",
        message: error instanceof Error ? error.message : "Unknown error during sync"
      });
    }
  });

  /**
   * Push an item to a marketplace
   */
  app.post("/api/items/:id/push-to-marketplace/:marketplaceId", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const marketplaceId = parseInt(req.params.marketplaceId);
      if (isNaN(marketplaceId)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const marketplace = await storage.getMarketplace(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Check if marketplace is connected
      if (!marketplace.isConnected) {
        return res.status(400).json({ 
          error: "Marketplace not connected",
          message: `${marketplace.name} is not connected`
        });
      }

      // Get push-enabled status from request (default to true)
      const pushEnabled = req.body.pushEnabled !== false;

      // Create marketplace service
      const marketplaceService = new MarketplaceService(marketplace);
      
      // Push the item to the marketplace
      const result = await marketplaceService.pushProduct(item);
      
      // If successful, update the item with the marketplace ID
      if (result.success && result.data?.shopifyProductId) {
        // Initialize marketplace tracking properties if they don't exist
        const marketplaceData = item.marketplace || {};
        const marketplaceIds = marketplaceData.ids || {};
        const syncedToMarketplaces = marketplaceData.syncedTo || [];
        
        // Add marketplace info
        marketplaceIds[marketplace.type] = result.data.shopifyProductId;
        
        // Use a Set to ensure we don't add duplicates, then convert back to array
        const syncedSet = new Set([...syncedToMarketplaces, marketplace.type]);
        
        // Update the item with marketplace data
        await storage.updateItem(itemId, { 
          marketplace: {
            ...marketplaceData,
            ids: marketplaceIds,
            syncedTo: Array.from(syncedSet),
            lastSynced: new Date().toISOString()
          }
        });
      }
      
      res.json({
        success: result.success,
        message: result.message,
        productId: result.productId
      });
    } catch (error) {
      console.error(`Error pushing item to marketplace:`, error);
      res.status(500).json({ 
        error: "Failed to push item to marketplace",
        message: error instanceof Error ? error.message : "Unknown error during push"
      });
    }
  });

  /**
   * Manual push of inventory to marketplace
   */
  app.post("/api/marketplaces/:id/push-inventory", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Check if marketplace is connected
      if (!marketplace.isConnected) {
        return res.status(400).json({ 
          error: "Marketplace not connected",
          message: `${marketplace.name} is not connected`
        });
      }

      // Perform the push with the scheduler
      log(`Manual push triggered for marketplace ${marketplace.name} (ID: ${id})`, 'marketplace-sync');
      const result = await scheduler.manualPushSync(id);
      
      res.json(result);
    } catch (error) {
      console.error(`Error pushing inventory to marketplace ${req.params.id}:`, error);
      res.status(500).json({ 
        success: false,
        error: "Failed to push inventory to marketplace",
        message: error instanceof Error ? error.message : "Unknown error during push"
      });
    }
  });

  /**
   * Update marketplace sync intervals
   */
  app.post("/api/marketplaces/:id/sync-intervals", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const marketplace = await storage.getMarketplace(id);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      const { syncPullInterval, syncPushInterval } = req.body;
      
      // Validate intervals
      if (syncPullInterval !== undefined && (isNaN(syncPullInterval) || syncPullInterval < 1)) {
        return res.status(400).json({ error: "Pull interval must be a positive number" });
      }
      
      if (syncPushInterval !== undefined && (isNaN(syncPushInterval) || syncPushInterval < 1)) {
        return res.status(400).json({ error: "Push interval must be a positive number" });
      }

      // Update the marketplace with new intervals
      const updatedMarketplace = await storage.updateMarketplace(id, {
        syncPullInterval,
        syncPushInterval
      });
      
      // Re-schedule the marketplace sync
      if (updatedMarketplace && updatedMarketplace.syncEnabled) {
        await scheduler.scheduleMarketplaceSync(updatedMarketplace);
        log(`Updated sync intervals for ${updatedMarketplace.name}: pull=${syncPullInterval}min, push=${syncPushInterval}min`, 'marketplace-sync');
      }
      
      res.json({
        success: true,
        message: "Sync intervals updated successfully",
        marketplace: updatedMarketplace
      });
    } catch (error) {
      console.error(`Error updating sync intervals for marketplace ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update sync intervals" });
    }
  });

  /**
   * Get push info for an item to a marketplace
   */
  app.get("/api/items/:id/marketplace-push-info/:marketplaceId", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const marketplaceId = parseInt(req.params.marketplaceId);
      if (isNaN(marketplaceId)) {
        return res.status(400).json({ error: "Invalid marketplace ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const marketplace = await storage.getMarketplace(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }

      // Create a marketplace service
      const marketplaceService = new MarketplaceService(marketplace);
      
      // First test connection to see if marketplace is accessible
      const testResult = await marketplaceService.testConnection();
      
      // Prepare the item for the marketplace to get a preview
      const prepareResult = await marketplaceService.prepareItemForPush(item);
      const marketplaceProduct = prepareResult.data || {
        title: item.name,
        description: item.description,
        variants: [{
          sku: item.sku,
          price: item.basePrice,
          inventory_quantity: item.quantity
        }]
      };
      
      // Validate the item for the marketplace
      const errors: string[] = [];
      if (!item.name) errors.push('Item name is required');
      if (!item.basePrice) errors.push('Item price is required');
      if (item.quantity === undefined) errors.push('Item quantity is required');
      if (!item.sku) errors.push('SKU is required');
      
      res.json({
        item,
        marketplace,
        marketplaceProduct,
        canPush: errors.length === 0 && testResult.success && marketplace.isConnected,
        errors,
        status: {
          isMarketplaceConfigured: testResult.success,
          isMarketplaceConnected: marketplace.isConnected,
          syncEnabled: marketplace.syncEnabled
        }
      });
    } catch (error) {
      console.error(`Error getting push info:`, error);
      res.status(500).json({ 
        error: "Failed to get marketplace push info",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}