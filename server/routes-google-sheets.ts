/**
 * Routes for Google Sheets integration and automated inventory tracking
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import GoogleSheetsService, { SheetConfig } from "./services/google-sheets";

const sheetsService = new GoogleSheetsService();

/**
 * Register Google Sheets integration routes
 */
export function registerGoogleSheetsRoutes(app: Express, storage: IStorage) {
  
  /**
   * Check Google Sheets integration status
   */
  app.get("/api/google-sheets/status", (_req: Request, res: Response) => {
    try {
      const isConfigured = sheetsService.isConfigured();
      
      res.json({
        configured: isConfigured,
        message: isConfigured 
          ? "Google Sheets integration is active and ready" 
          : "Google Sheets integration requires configuration"
      });
    } catch (error) {
      console.error("Error checking Google Sheets status:", error);
      res.status(500).json({ error: "Failed to check integration status" });
    }
  });

  /**
   * Setup inventory worksheet in Google Sheets
   */
  app.post("/api/google-sheets/setup", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, worksheetName } = req.body;
      
      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({ 
          error: "Spreadsheet ID and worksheet name are required" 
        });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured. Please check credentials." 
        });
      }

      const config: SheetConfig = {
        spreadsheetId,
        worksheetName
      };

      const success = await sheetsService.setupInventorySheet(config);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Inventory worksheet "${worksheetName}" setup completed`,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        });
      } else {
        res.status(500).json({ 
          error: "Failed to setup inventory worksheet" 
        });
      }
    } catch (error) {
      console.error("Error setting up Google Sheets:", error);
      res.status(500).json({ error: "Failed to setup Google Sheets integration" });
    }
  });

  /**
   * Sync all inventory data to Google Sheets
   */
  app.post("/api/google-sheets/sync", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, worksheetName } = req.body;
      
      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({ 
          error: "Spreadsheet ID and worksheet name are required" 
        });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured" 
        });
      }

      const config: SheetConfig = {
        spreadsheetId,
        worksheetName
      };

      // Get all inventory items
      const items = await storage.getItems();
      
      const success = await sheetsService.syncInventoryData(items, config);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Synced ${items.length} items to Google Sheets`,
          itemCount: items.length,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        });
      } else {
        res.status(500).json({ 
          error: "Failed to sync inventory data" 
        });
      }
    } catch (error) {
      console.error("Error syncing to Google Sheets:", error);
      res.status(500).json({ error: "Failed to sync inventory data" });
    }
  });

  /**
   * Update a specific item in Google Sheets
   */
  app.post("/api/google-sheets/update-item/:id", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const { spreadsheetId, worksheetName } = req.body;
      
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({ 
          error: "Spreadsheet ID and worksheet name are required" 
        });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured" 
        });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const config: SheetConfig = {
        spreadsheetId,
        worksheetName
      };

      const success = await sheetsService.updateInventoryItem(item, config);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Updated item ${item.sku} in Google Sheets`
        });
      } else {
        res.status(500).json({ 
          error: "Failed to update item in Google Sheets" 
        });
      }
    } catch (error) {
      console.error("Error updating item in Google Sheets:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  /**
   * Log inventory changes for tracking
   */
  app.post("/api/google-sheets/log-change", async (req: Request, res: Response) => {
    try {
      const { 
        sku, 
        action, 
        quantity, 
        previousQuantity, 
        source,
        spreadsheetId, 
        worksheetName 
      } = req.body;
      
      if (!sku || !action || quantity === undefined || previousQuantity === undefined) {
        return res.status(400).json({ 
          error: "SKU, action, quantity, and previousQuantity are required" 
        });
      }

      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({ 
          error: "Spreadsheet ID and worksheet name are required" 
        });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured" 
        });
      }

      const config: SheetConfig = {
        spreadsheetId,
        worksheetName
      };

      const change = {
        sku,
        action,
        quantity: parseInt(quantity),
        previousQuantity: parseInt(previousQuantity),
        timestamp: new Date(),
        source: source || 'manual'
      };

      const success = await sheetsService.logInventoryChange(change, config);
      
      if (success) {
        res.json({ 
          success: true, 
          message: "Inventory change logged successfully"
        });
      } else {
        res.status(500).json({ 
          error: "Failed to log inventory change" 
        });
      }
    } catch (error) {
      console.error("Error logging inventory change:", error);
      res.status(500).json({ error: "Failed to log inventory change" });
    }
  });

  /**
   * Get inventory data from Google Sheets
   */
  app.get("/api/google-sheets/inventory", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, worksheetName } = req.query;
      
      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({ 
          error: "Spreadsheet ID and worksheet name are required" 
        });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured" 
        });
      }

      const config: SheetConfig = {
        spreadsheetId: spreadsheetId as string,
        worksheetName: worksheetName as string
      };

      const inventoryData = await sheetsService.getInventoryFromSheet(config);
      
      res.json({
        success: true,
        data: inventoryData,
        count: inventoryData.length
      });
    } catch (error) {
      console.error("Error getting inventory from Google Sheets:", error);
      res.status(500).json({ error: "Failed to get inventory data" });
    }
  });

  /**
   * Test Google Sheets connection
   */
  app.post("/api/google-sheets/test-connection", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId } = req.body;
      
      if (!spreadsheetId) {
        return res.status(400).json({ 
          error: "Spreadsheet ID is required" 
        });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured" 
        });
      }

      // Try to access the spreadsheet to test connection
      const config: SheetConfig = {
        spreadsheetId,
        worksheetName: 'Test' // Use a test worksheet name
      };

      try {
        await sheetsService.setupInventorySheet(config);
        res.json({ 
          success: true, 
          message: "Successfully connected to Google Sheets",
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        });
      } catch (error) {
        res.status(400).json({ 
          error: "Failed to connect to Google Sheets. Please check spreadsheet ID and permissions." 
        });
      }
    } catch (error) {
      console.error("Error testing Google Sheets connection:", error);
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  /**
   * Get Google Sheets configuration guide
   */
  app.get("/api/google-sheets/config-guide", (_req: Request, res: Response) => {
    try {
      const guide = {
        steps: [
          {
            step: 1,
            title: "Create Google Cloud Project",
            description: "Go to Google Cloud Console and create a new project or select existing one"
          },
          {
            step: 2,
            title: "Enable Google Sheets API",
            description: "Enable the Google Sheets API in your Google Cloud project"
          },
          {
            step: 3,
            title: "Create Service Account",
            description: "Create a service account and download the JSON credentials file"
          },
          {
            step: 4,
            title: "Set Environment Variables",
            description: "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN"
          },
          {
            step: 5,
            title: "Create Spreadsheet",
            description: "Create a new Google Sheets spreadsheet and copy its ID from the URL"
          },
          {
            step: 6,
            title: "Share Spreadsheet",
            description: "Share the spreadsheet with your service account email address"
          }
        ],
        requiredEnvVars: [
          "GOOGLE_CLIENT_ID",
          "GOOGLE_CLIENT_SECRET", 
          "GOOGLE_REFRESH_TOKEN"
        ],
        links: {
          googleCloudConsole: "https://console.cloud.google.com",
          sheetsApiDocs: "https://developers.google.com/sheets/api"
        }
      };

      res.json(guide);
    } catch (error) {
      console.error("Error getting config guide:", error);
      res.status(500).json({ error: "Failed to get configuration guide" });
    }
  });

  /**
   * Process orders from Google Sheets and update inventory
   */
  app.post("/api/google-sheets/process-orders", async (req: Request, res: Response) => {
    try {
      const { orderSpreadsheetId, inventorySpreadsheetId } = req.body;
      
      if (!orderSpreadsheetId || !inventorySpreadsheetId) {
        return res.status(400).json({ 
          error: "Missing required spreadsheet IDs",
          required: ["orderSpreadsheetId", "inventorySpreadsheetId"]
        });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured" 
        });
      }

      const results = await sheetsService.readAndProcessOrders(
        orderSpreadsheetId,
        inventorySpreadsheetId
      );

      res.json({
        success: true,
        ordersProcessed: results.ordersProcessed,
        inventoryUpdated: results.inventoryUpdated,
        errors: results.errors,
        message: `Processed ${results.ordersProcessed} orders and updated ${results.inventoryUpdated} inventory items`
      });
    } catch (error) {
      console.error('Error processing orders from sheets:', error);
      res.status(500).json({ 
        error: "Failed to process orders from Google Sheets",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get orders from Google Sheets for display
   */
  app.get("/api/google-sheets/orders", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId } = req.query;
      
      if (!spreadsheetId) {
        return res.status(400).json({ error: "Missing spreadsheetId parameter" });
      }

      if (!sheetsService.isConfigured()) {
        return res.status(400).json({ 
          error: "Google Sheets service not configured" 
        });
      }

      const orders = await sheetsService.getOrdersFromSheet(spreadsheetId as string);
      
      res.json({
        orders,
        count: orders.length,
        message: `Retrieved ${orders.length} orders from Google Sheets`
      });
    } catch (error) {
      console.error('Error getting orders from sheets:', error);
      res.status(500).json({ 
        error: "Failed to get orders from Google Sheets",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}