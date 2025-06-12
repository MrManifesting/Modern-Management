import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { registerShopifyImportRoutes } from "./routes-shopify-import";
import { registerCSVImportRoutes } from "./routes-csv-import";
import { registerCleanupRoutes } from "./routes-cleanup";
import { registerShopifySafetyRoutes } from "./routes-shopify-safety";
import { registerShopifyCredentialsRoutes } from "./routes-shopify-credentials";
import { registerMarketplaceRoutes } from "./routes-marketplace";
import { registerAffiliateRoutes } from "./routes-affiliate";
import { registerPayPalRoutes } from "./routes-paypal";
import { registerAIRoutes } from "./routes-ai";
import { registerSyncRoutes } from "./routes-sync";
import { registerBreakdownRoutes } from "./routes-breakdown";
import { registerBarcodeRoutes } from "./routes-barcode";
import { registerTelegramRoutes } from "./routes-telegram";
import { registerBulkOperationRoutes } from "./routes-bulk";
import { registerShopifyInventorySyncRoutes } from "./routes-shopify-inventory-sync";
import { registerAutoBreakdownRoutes } from "./routes-auto-breakdown";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth middleware for Google login and HTTPS webhooks
  await setupAuth(app);

  // Auth routes for Replit Auth
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User endpoint for authentication check
  app.get("/api/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Protected item routes
  app.get("/api/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items", details: error.message });
    }
  });

  app.get("/api/items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json(item);
    } catch (error: any) {
      console.error("Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const item = await storage.createItem(req.body);
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Error creating item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.patch("/api/items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateItem(id, req.body);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json(item);
    } catch (error: any) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteItem(id);
      
      if (!success) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Register all other route modules with authentication
  registerShopifyImportRoutes(app, storage);
  registerCSVImportRoutes(app, storage);
  registerCleanupRoutes(app, storage);
  registerShopifySafetyRoutes(app, storage);
  registerShopifyCredentialsRoutes(app, storage);
  registerMarketplaceRoutes(app, storage);
  registerAffiliateRoutes(app, storage);
  registerPayPalRoutes(app, storage);
  registerAIRoutes(app, storage);
  registerSyncRoutes(app, storage);
  registerBreakdownRoutes(app, storage);
  registerBarcodeRoutes(app, storage);
  registerTelegramRoutes(app, storage);
  registerBulkOperationRoutes(app, storage);
  registerShopifyInventorySyncRoutes(app, storage);
  registerAutoBreakdownRoutes(app, storage);

  const httpServer = createServer(app);
  return httpServer;
}