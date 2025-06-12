import type { Express } from "express";
import { shopifyEnhancedService } from "./services/shopify-enhanced";
import { storage } from "./storage";

export function registerShopifyFixRoutes(app: Express) {
  // Test Shopify connection with detailed diagnostics
  app.get("/api/shopify/fix/test-connection", async (req, res) => {
    try {
      console.log("=== Shopify Connection Diagnostic ===");
      
      // Check environment variables
      const hasToken = !!process.env.SHOPIFY_ACCESS_TOKEN;
      const hasStore = !!process.env.SHOPIFY_STORE;
      const hasApiKey = !!process.env.SHOPIFY_API_KEY;
      
      console.log(`Environment check: TOKEN=${hasToken}, STORE=${hasStore}, API_KEY=${hasApiKey}`);
      
      if (!hasToken) {
        return res.status(400).json({
          success: false,
          error: "SHOPIFY_ACCESS_TOKEN environment variable is missing",
          diagnostics: {
            hasToken,
            hasStore,
            hasApiKey,
            message: "Please set the SHOPIFY_ACCESS_TOKEN environment variable"
          }
        });
      }
      
      // Test the enhanced service
      const connectionResult = await shopifyEnhancedService.testConnection();
      
      res.json({
        success: true,
        connection: connectionResult,
        diagnostics: {
          hasToken,
          hasStore,
          hasApiKey,
          tokenLength: process.env.SHOPIFY_ACCESS_TOKEN?.length || 0,
          storeName: process.env.SHOPIFY_STORE || 'default'
        }
      });
      
    } catch (error) {
      console.error("Shopify connection test failed:", error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        diagnostics: {
          hasToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
          hasStore: !!process.env.SHOPIFY_STORE,
          hasApiKey: !!process.env.SHOPIFY_API_KEY,
          errorType: error instanceof Error ? error.name : "Unknown",
          suggestion: "Check if your Shopify access token has the required permissions"
        }
      });
    }
  });

  // Create test inventory item to verify database operations
  app.post("/api/shopify/fix/create-test-item", async (req, res) => {
    try {
      const testItem = {
        name: "Test Item " + Date.now(),
        description: "Test item for database validation",
        sku: "TEST-" + Date.now(),
        basePrice: "10.00",
        quantity: 1,
        status: "active",
        category: "test",
        tags: ["test"],
        images: [],
        marketplace: {},
        metadata: {}
      };
      
      console.log("Creating test item:", testItem);
      const createdItem = await storage.createItem(testItem);
      
      if (createdItem) {
        res.json({
          success: true,
          message: "Test item created successfully",
          item: createdItem
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create test item"
        });
      }
      
    } catch (error) {
      console.error("Test item creation failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Clean up malformed data in database
  app.post("/api/shopify/fix/cleanup-database", async (req, res) => {
    try {
      console.log("Starting database cleanup...");
      
      // Get all items
      const items = await storage.getItems();
      console.log(`Found ${items.length} items to check`);
      
      let cleaned = 0;
      let errors = 0;
      
      for (const item of items) {
        try {
          // Check if marketplace field needs fixing
          let needsUpdate = false;
          const updates: any = {};
          
          if (typeof item.marketplace === 'string') {
            updates.marketplace = {};
            needsUpdate = true;
          }
          
          if (typeof item.metadata === 'string') {
            updates.metadata = {};
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await storage.updateItem(item.id, updates);
            cleaned++;
            console.log(`Cleaned item ${item.id}: ${item.name}`);
          }
          
        } catch (itemError) {
          console.error(`Error cleaning item ${item.id}:`, itemError);
          errors++;
        }
      }
      
      res.json({
        success: true,
        message: `Database cleanup completed. Cleaned ${cleaned} items, ${errors} errors`,
        stats: {
          totalItems: items.length,
          cleaned,
          errors
        }
      });
      
    } catch (error) {
      console.error("Database cleanup failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Import simplified CSV data
  app.post("/api/shopify/fix/simple-import", async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData) {
        return res.status(400).json({
          success: false,
          error: "No CSV data provided"
        });
      }
      
      console.log("Starting simple CSV import...");
      
      // Parse CSV manually with basic splitting
      const lines = csvData.split('\n').filter((line: string) => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          error: "CSV must have at least a header row and one data row"
        });
      }
      
      const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
      console.log("Headers found:", headers);
      
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (let i = 1; i < Math.min(lines.length, 11); i++) { // Limit to 10 items for testing
        try {
          const row = lines[i].split(',').map((cell: string) => cell.trim().replace(/"/g, ''));
          
          if (row.length < 2) continue;
          
          const itemData = {
            name: row[0] || `Item ${i}`,
            description: row[1] || "Imported item",
            sku: `IMPORT-${Date.now()}-${i}`,
            basePrice: "0.00",
            quantity: 1,
            status: "active",
            category: "imported",
            tags: ["imported"],
            images: [],
            marketplace: {},
            metadata: {}
          };
          
          const createdItem = await storage.createItem(itemData);
          if (createdItem) {
            imported++;
            console.log(`Imported: ${itemData.name}`);
          } else {
            failed++;
            errors.push(`Failed to create item: ${itemData.name}`);
          }
          
        } catch (rowError) {
          failed++;
          errors.push(`Row ${i}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
        }
      }
      
      res.json({
        success: imported > 0,
        message: `Import completed: ${imported} imported, ${failed} failed`,
        stats: {
          imported,
          failed,
          errors: errors.slice(0, 5) // Show first 5 errors
        }
      });
      
    } catch (error) {
      console.error("Simple import failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}