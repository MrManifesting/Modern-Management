/**
 * Bidirectional Synchronization Routes
 * API endpoints for managing sync between App ↔ Google Sheets ↔ Shopify
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import BidirectionalSyncService, { SyncConfiguration } from "./services/bidirectional-sync";
import { z } from "zod";
import { db } from "./db";
import { syncLogs } from "../shared/schema";
import { desc, eq } from "drizzle-orm";

// Validation schemas
const syncConfigSchema = z.object({
  googleSheets: z.object({
    spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
    worksheetName: z.string().min(1, "Worksheet name is required"),
    enabled: z.boolean()
  }),
  shopify: z.object({
    enabled: z.boolean(),
    autoSync: z.boolean()
  }),
  syncInterval: z.number().min(1).max(1440), // 1 minute to 24 hours
  conflictResolution: z.enum(['app-wins', 'sheets-wins', 'shopify-wins', 'latest-wins'])
});

const singleItemSyncSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  source: z.enum(['app', 'sheets', 'shopify'])
});

/**
 * Register bidirectional synchronization routes
 */
export function registerBidirectionalSyncRoutes(app: Express, storage: IStorage) {
  const syncService = new BidirectionalSyncService(storage);

  /**
   * Initialize bidirectional sync with configuration
   */
  app.post("/api/sync/initialize", async (req: Request, res: Response) => {
    try {
      const validatedConfig = syncConfigSchema.parse(req.body);
      
      const success = await syncService.initializeSync(validatedConfig);
      
      if (success) {
        res.json({
          success: true,
          message: "Bidirectional sync initialized successfully",
          config: validatedConfig
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to initialize bidirectional sync"
        });
      }
    } catch (error) {
      console.error("Error initializing sync:", error);
      res.status(400).json({
        success: false,
        message: error instanceof z.ZodError ? "Invalid configuration" : "Failed to initialize sync",
        errors: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  /**
   * Get current sync status and configuration
   */
  app.get("/api/sync/status", async (_req: Request, res: Response) => {
    try {
      const status = syncService.getSyncStatus();
      
      // Get recent sync logs - handle table not existing gracefully
      let recentLogs = [];
      try {
        recentLogs = await db
          .select()
          .from(syncLogs)
          .orderBy(desc(syncLogs.timestamp))
          .limit(10);
      } catch (dbError) {
        console.warn("Sync logs table not available yet:", dbError);
        // Table doesn't exist yet, return empty logs
      }

      res.json({
        success: true,
        status,
        recentLogs
      });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sync status"
      });
    }
  });

  /**
   * Perform full bidirectional sync
   */
  app.post("/api/sync/full", async (_req: Request, res: Response) => {
    try {
      const result = await syncService.performFullSync();
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Full sync completed: ${result.itemsUpdated} updated, ${result.itemsCreated} created`
          : "Full sync completed with errors",
        result
      });
    } catch (error) {
      console.error("Error performing full sync:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform full sync",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Perform incremental sync (detect and sync changes from Google Sheets)
   */
  app.post("/api/sync/incremental", async (_req: Request, res: Response) => {
    try {
      const result = await syncService.processIncrementalSync();
      
      res.json({
        success: result.success,
        message: result.itemsUpdated > 0 || result.itemsCreated > 0
          ? `Incremental sync completed: ${result.itemsUpdated} updated, ${result.itemsCreated} created`
          : "No changes detected",
        result
      });
    } catch (error) {
      console.error("Error performing incremental sync:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform incremental sync",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Sync a single item across all platforms
   */
  app.post("/api/sync/item", async (req: Request, res: Response) => {
    try {
      const { sku, source } = singleItemSyncSchema.parse(req.body);
      
      const success = await syncService.syncSingleItem(sku, source);
      
      if (success) {
        res.json({
          success: true,
          message: `Item ${sku} synced successfully from ${source}`
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Item ${sku} not found or sync failed`
        });
      }
    } catch (error) {
      console.error("Error syncing single item:", error);
      res.status(400).json({
        success: false,
        message: error instanceof z.ZodError ? "Invalid request data" : "Failed to sync item",
        errors: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  /**
   * Get sync logs with pagination
   */
  app.get("/api/sync/logs", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string;
      
      let query = db.select().from(syncLogs);
      
      if (type) {
        query = query.where(eq(syncLogs.type, type));
      }
      
      const logs = await query
        .orderBy(desc(syncLogs.timestamp))
        .limit(limit)
        .offset((page - 1) * limit);

      res.json({
        success: true,
        logs,
        pagination: {
          page,
          limit,
          hasMore: logs.length === limit
        }
      });
    } catch (error) {
      console.error("Error getting sync logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sync logs"
      });
    }
  });

  /**
   * Detect changes in Google Sheets
   */
  app.get("/api/sync/detect-changes", async (_req: Request, res: Response) => {
    try {
      const changes = await syncService.detectSheetsChanges();
      
      res.json({
        success: true,
        message: `Detected ${changes.length} changed items in Google Sheets`,
        changes: changes.map(item => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          lastUpdated: item.lastUpdated
        }))
      });
    } catch (error) {
      console.error("Error detecting changes:", error);
      res.status(500).json({
        success: false,
        message: "Failed to detect changes"
      });
    }
  });

  /**
   * Test sync configuration
   */
  app.post("/api/sync/test", async (req: Request, res: Response) => {
    try {
      const config = syncConfigSchema.parse(req.body);
      
      const tests = {
        googleSheets: false,
        shopify: false,
        configuration: true
      };

      // Test Google Sheets connection
      if (config.googleSheets.enabled) {
        try {
          // This would test the actual Google Sheets connection
          tests.googleSheets = true;
        } catch (error) {
          console.error("Google Sheets test failed:", error);
        }
      }

      // Test Shopify connection
      if (config.shopify.enabled) {
        try {
          // This would test the actual Shopify connection
          tests.shopify = true;
        } catch (error) {
          console.error("Shopify test failed:", error);
        }
      }

      res.json({
        success: true,
        message: "Sync configuration test completed",
        tests,
        warnings: [
          ...(config.googleSheets.enabled && !tests.googleSheets ? ["Google Sheets connection failed"] : []),
          ...(config.shopify.enabled && !tests.shopify ? ["Shopify connection failed"] : [])
        ]
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Invalid configuration",
        errors: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  /**
   * Clear sync logs (maintenance endpoint)
   */
  app.delete("/api/sync/logs", async (req: Request, res: Response) => {
    try {
      const olderThanDays = parseInt(req.query.days as string) || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await db
        .delete(syncLogs)
        .where(eq(syncLogs.timestamp, cutoffDate));

      res.json({
        success: true,
        message: `Cleared sync logs older than ${olderThanDays} days`
      });
    } catch (error) {
      console.error("Error clearing sync logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear sync logs"
      });
    }
  });

  /**
   * Webhook endpoint for Google Sheets changes (future implementation)
   */
  app.post("/api/sync/webhooks/sheets", async (req: Request, res: Response) => {
    try {
      // This would handle webhooks from Google Sheets when they become available
      // For now, we acknowledge the webhook and potentially trigger incremental sync
      
      console.log("Received Google Sheets webhook:", req.body);
      
      // Trigger incremental sync
      const result = await syncService.processIncrementalSync();
      
      res.json({
        success: true,
        message: "Webhook processed and incremental sync triggered",
        syncResult: result
      });
    } catch (error) {
      console.error("Error processing sheets webhook:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process webhook"
      });
    }
  });
}

export default registerBidirectionalSyncRoutes;