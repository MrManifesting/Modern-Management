/**
 * Routes for managing marketplace integrations
 */
import { Request, Response, Express } from 'express';
import { IStorage } from './storage';
import { 
  testMarketplaceConnection, 
  isMarketplaceConfigured,
  prepareItemForMarketplace,
  pushItemToMarketplace,
  syncProductsFromMarketplace
} from './services/marketplace';
import { getOperationsLog, clearOperationsLog } from './services/marketplace-logger';
import { insertMarketplaceSchema } from '@shared/schema';
import { z } from 'zod';

/**
 * Register marketplace routes
 */
export function registerMarketplaceRoutes(app: Express, storage: IStorage) {
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

      const result = await testMarketplaceConnection(testMarketplace);
      res.json(result);
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

      const result = await testMarketplaceConnection(marketplace);
      res.json(result);
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
      const testResult = await testMarketplaceConnection(marketplace);
      if (!testResult.connected) {
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
        syncEnabled
      });
      
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
      const log = getOperationsLog(id, limit);
      
      res.json(log);
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

      const success = clearOperationsLog(id);
      
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

      // Check if marketplace is configured
      if (!await isMarketplaceConfigured(marketplace)) {
        return res.status(400).json({ 
          error: "Marketplace not properly configured",
          message: `${marketplace.name} credentials are incomplete or invalid`
        });
      }

      // Perform the sync
      const result = await syncProductsFromMarketplace(marketplace, storage);
      
      // Update last sync date
      await storage.updateMarketplace(id, { 
        lastSyncDate: new Date() 
      });
      
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

      // Push the item to the marketplace
      const result = await pushItemToMarketplace(item, marketplace, pushEnabled);
      
      // If successful, update the item with the marketplace ID
      if (result.success && result.productId) {
        const marketplaceIds = item.marketplaceIds || {};
        marketplaceIds[marketplace.type] = result.productId;
        
        const syncedToMarketplaces = new Set(item.syncedToMarketplaces || []);
        syncedToMarketplaces.add(marketplace.type);
        
        await storage.updateItem(itemId, { 
          marketplaceIds,
          syncedToMarketplaces: Array.from(syncedToMarketplaces)
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

      // Prepare the item for the marketplace to get a preview
      const marketplaceProduct = prepareItemForMarketplace(item, marketplace);
      
      // Check if marketplace is configured
      const isConfigured = await isMarketplaceConfigured(marketplace);
      
      // Validate the item for the marketplace
      const errors: string[] = [];
      if (!item.name) errors.push('Item name is required');
      if (!item.basePrice) errors.push('Item price is required');
      if (item.quantity === undefined) errors.push('Item quantity is required');
      if (!marketplaceProduct.variants[0].sku) errors.push('SKU is missing and could not be generated');
      
      res.json({
        item,
        marketplace,
        marketplaceProduct,
        canPush: errors.length === 0 && isConfigured && marketplace.isConnected,
        errors,
        status: {
          isMarketplaceConfigured: isConfigured,
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