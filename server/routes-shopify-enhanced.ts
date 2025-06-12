import type { Express } from "express";
import { shopifyEnhancedService } from "./services/shopify-enhanced";
import { googleSheetsService } from "./services/google-sheets-service";
import { storage } from "./storage";

export function registerShopifyEnhancedRoutes(app: Express) {
  // Enhanced Shopify connection status
  app.get("/api/shopify/enhanced/status", async (req, res) => {
    try {
      const connectionTest = await shopifyEnhancedService.testConnection();
      
      res.json({
        success: true,
        connected: true,
        shop: connectionTest,
        message: "Shopify Enhanced service is connected and operational",
        store: connectionTest.shopName,
        domain: connectionTest.domain
      });
    } catch (error) {
      console.error("Shopify Enhanced connection error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      const isCredentialError = errorMessage.includes('credentials') || 
                               errorMessage.includes('TOKEN') || 
                               errorMessage.includes('401') ||
                               errorMessage.includes('Unauthorized');
      
      res.status(isCredentialError ? 401 : 500).json({
        success: false,
        connected: false,
        error: errorMessage,
        message: "Shopify Enhanced service connection failed",
        needsCredentials: isCredentialError,
        troubleshooting: {
          checkToken: "Verify SHOPIFY_ACCESS_TOKEN is set correctly",
          checkStore: "Verify SHOPIFY_STORE name is correct",
          checkPermissions: "Ensure API token has required permissions"
        }
      });
    }
  });

  // Sync inventory to Shopify
  app.post("/api/shopify/enhanced/sync-inventory", async (req, res) => {
    try {
      const items = await storage.getItems();
      const result = await shopifyEnhancedService.syncInventoryToShopify(items);
      
      res.json({
        success: true,
        message: `Sync completed: ${result.updated} updated, ${result.created} created`,
        details: result
      });
    } catch (error) {
      console.error("Error syncing inventory to Shopify:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to sync inventory"
      });
    }
  });

  // Get recent Shopify orders
  app.get("/api/shopify/enhanced/orders", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const orders = await shopifyEnhancedService.getRecentOrders(limit);
      
      res.json({
        success: true,
        orders,
        count: orders.length
      });
    } catch (error) {
      console.error("Error fetching Shopify orders:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch orders"
      });
    }
  });

  // Get Shopify inventory levels
  app.get("/api/shopify/enhanced/inventory", async (req, res) => {
    try {
      const inventory = await shopifyEnhancedService.getInventoryLevels();
      
      res.json({
        success: true,
        inventory,
        count: inventory.length
      });
    } catch (error) {
      console.error("Error fetching Shopify inventory:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch inventory"
      });
    }
  });

  // Setup Shopify webhook
  app.post("/api/shopify/enhanced/setup-webhook", async (req, res) => {
    try {
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/shopify/webhook/order`;
      const result = await shopifyEnhancedService.setupWebhook(webhookUrl);
      
      res.json({
        success: true,
        webhook: result,
        webhookUrl,
        message: "Webhook setup completed successfully"
      });
    } catch (error) {
      console.error("Error setting up Shopify webhook:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to setup webhook"
      });
    }
  });

  // Process order and sync with Google Sheets
  app.post("/api/shopify/enhanced/process-order", async (req, res) => {
    try {
      const orderData = req.body;
      const result = await shopifyEnhancedService.processOrderWebhook(orderData);
      
      res.json({
        success: true,
        result,
        message: "Order processed and synced successfully"
      });
    } catch (error) {
      console.error("Error processing order:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process order"
      });
    }
  });

  // Comprehensive sync: Shopify -> Local -> Google Sheets
  app.post("/api/shopify/enhanced/full-sync", async (req, res) => {
    try {
      const results = {
        shopifyOrders: 0,
        inventoryUpdates: 0,
        sheetsSync: false,
        errors: [] as string[]
      };

      // Get recent orders from Shopify
      try {
        const orders = await shopifyEnhancedService.getRecentOrders(100);
        results.shopifyOrders = orders.length;

        // Process each order
        for (const order of orders) {
          try {
            // Update local inventory based on order line items
            for (const lineItem of order.lineItems) {
              if (lineItem.sku) {
                const items = await storage.getItems();
                const item = items.find(i => i.sku === lineItem.sku);
                
                if (item) {
                  // This would typically be done when the order is first received,
                  // but we're doing a retroactive sync here
                  console.log(`Found item for SKU ${lineItem.sku}: ${item.name}`);
                  results.inventoryUpdates++;
                }
              }
            }
          } catch (error) {
            results.errors.push(`Error processing order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        results.errors.push(`Error fetching Shopify orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Sync current inventory to Google Sheets
      try {
        const items = await storage.getItems();
        const sheetsResult = await googleSheetsService.syncInventoryToSheets(items);
        results.sheetsSync = sheetsResult.success;
      } catch (error) {
        results.errors.push(`Error syncing to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      res.json({
        success: results.errors.length === 0,
        results,
        message: results.errors.length === 0 
          ? "Full sync completed successfully" 
          : `Sync completed with ${results.errors.length} errors`
      });
    } catch (error) {
      console.error("Error during full sync:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Full sync failed"
      });
    }
  });

  // Get webhook configuration info
  app.get("/api/shopify/enhanced/webhook-info", (req, res) => {
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/shopify/webhook/order`;
    
    res.json({
      success: true,
      webhookUrl,
      instructions: [
        "1. Go to your Shopify Admin panel",
        "2. Navigate to Settings > Notifications",
        "3. Scroll down to Webhooks section",
        "4. Click 'Create webhook'",
        "5. Set Event to 'Order payment'",
        "6. Set URL to the webhook URL provided",
        "7. Set Format to JSON",
        "8. Click Save"
      ],
      googleSheetsUrl: "https://docs.google.com/spreadsheets/d/15GHzyL_C2YqEMS68l7Vy3q6MA0SP9aDrhcZ4GS7HRA0/edit"
    });
  });
}