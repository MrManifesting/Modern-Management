import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { log } from "./vite";
import { 
  getPushStatus, 
  isShopifyConfigured, 
  syncProductsFromShopify,
  getItemPushInfo,
  pushItemToShopify 
} from "./services/shopify-integration";
import { setupAuth, requireAuth } from "./auth-simple";

// Memory storage for file uploads
const uploadMemory = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);
  
  // Setup authentication
  setupAuth(app);

  // Basic inventory endpoints
  app.get("/api/items", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Three-tier priority sorting: 
      // 1) Active items with pricing and quantity
      // 2) Draft items with quantity  
      // 3) Newest items first
      const sortedItems = items.sort((a, b) => {
        const aPrice = parseFloat(a.basePrice || '0');
        const aQty = parseInt(a.quantity?.toString() || '0');
        const bPrice = parseFloat(b.basePrice || '0');
        const bQty = parseInt(b.quantity?.toString() || '0');
        
        const aIsActive = a.status === 'active' && aPrice > 0 && aQty > 0;
        const bIsActive = b.status === 'active' && bPrice > 0 && bQty > 0;
        
        const aIsDraft = a.status === 'draft' && aQty > 0;
        const bIsDraft = b.status === 'draft' && bQty > 0;
        
        // Priority 1: Active items with pricing and quantity
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;
        
        // Priority 2: Draft items with quantity
        if (aIsDraft && !bIsDraft) return -1;
        if (!aIsDraft && bIsDraft) return 1;
        
        // Priority 3: Newest first
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        return b.id - a.id;
      });
      
      log(`Retrieved ${sortedItems.length} items with active item prioritization`, 'inventory');
      res.json(sortedItems);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", uploadMemory.array("files", 5), async (req: Request, res: Response) => {
    try {
      const itemData = req.body;
      
      // Ensure breakdown items start as draft status
      if (itemData.parentId) {
        itemData.status = 'draft';
      }
      
      const newItem = await storage.createItem(itemData);
      log(`Created new item: ${newItem.name} (ID: ${newItem.id})`, 'inventory');
      res.json(newItem);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.patch("/api/items/:id", uploadMemory.array("files", 5), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Validate active status requirements
      if (updates.status === 'active') {
        const basePrice = parseFloat(updates.basePrice || '0');
        const quantity = parseInt(updates.quantity?.toString() || '0');
        
        if (basePrice <= 0 || quantity <= 0) {
          return res.status(400).json({ 
            error: "Items must have valid pricing (>$0) and available quantity (>0) to be set as active" 
          });
        }
      }
      
      const updatedItem = await storage.updateItem(id, updates);
      if (!updatedItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      log(`Updated item: ${updatedItem.name} (ID: ${id})`, 'inventory');
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/bulk-delete", async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid or empty item IDs array" });
      }
      
      let deletedCount = 0;
      for (const id of ids) {
        const success = await storage.deleteItem(parseInt(id));
        if (success) deletedCount++;
      }
      
      log(`Bulk deleted ${deletedCount} items`, 'inventory');
      res.json({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} items` 
      });
    } catch (error) {
      console.error("Error in bulk delete:", error);
      res.status(500).json({ error: "Failed to delete items" });
    }
  });

  app.delete("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteItem(id);
      
      if (!success) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      log(`Deleted item with ID: ${id}`, 'inventory');
      res.json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Live catalog endpoint
  app.get("/api/catalog/live", async (req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Filter for catalog: active or available status with valid pricing
      const catalogItems = items.filter(item => {
        const price = parseFloat(item.basePrice || '0');
        const quantity = parseInt(item.quantity?.toString() || '0');
        const hasValidStatus = item.status === 'active' || item.status === 'available';
        return hasValidStatus && price > 0 && quantity > 0;
      }).slice(0, 8); // Limit to 8 items for catalog display
      
      log(`Live catalog serving ${catalogItems.length} available items`, 'catalog');
      res.json(catalogItems);
    } catch (error) {
      console.error("Error fetching live catalog:", error);
      res.status(500).json({ error: "Failed to fetch catalog items" });
    }
  });

  // Enhanced inventory endpoint with same prioritization
  app.get("/api/inventory/enhanced", async (req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Apply same three-tier priority sorting
      const sortedItems = items.sort((a, b) => {
        const aPrice = parseFloat(a.basePrice || '0');
        const aQty = parseInt(a.quantity?.toString() || '0');
        const bPrice = parseFloat(b.basePrice || '0');
        const bQty = parseInt(b.quantity?.toString() || '0');
        
        const aIsActive = a.status === 'active' && aPrice > 0 && aQty > 0;
        const bIsActive = b.status === 'active' && bPrice > 0 && bQty > 0;
        
        const aIsDraft = a.status === 'draft' && aQty > 0;
        const bIsDraft = b.status === 'draft' && bQty > 0;
        
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;
        
        if (aIsDraft && !bIsDraft) return -1;
        if (!aIsDraft && bIsDraft) return 1;
        
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        return b.id - a.id;
      });
      
      log(`Enhanced inventory retrieved ${sortedItems.length} items with active prioritization`, 'inventory');
      res.json(sortedItems);
    } catch (error) {
      console.error("Error fetching enhanced inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  // Shopify status endpoint
  app.get("/api/shopify/status", async (_req: Request, res: Response) => {
    try {
      const isConfigured = await isShopifyConfigured();
      const pushStatus = await getPushStatus();
      
      res.json({
        configured: isConfigured,
        pushStatus: pushStatus
      });
    } catch (error) {
      console.error("Error checking Shopify status:", error);
      res.status(500).json({ error: "Failed to check Shopify status" });
    }
  });

  // Affiliate API endpoints
  app.get("/api/affiliates", async (_req: Request, res: Response) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      res.json({ success: true, data: affiliates });
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({ success: false, message: "Error fetching affiliates" });
    }
  });

  app.get("/api/affiliates/stats", async (_req: Request, res: Response) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      const totalAffiliates = affiliates.length;
      const totalEarnings = affiliates.reduce((sum, affiliate) => {
        const earnings = typeof affiliate.totalEarnings === 'string' 
          ? parseFloat(affiliate.totalEarnings) || 0 
          : affiliate.totalEarnings || 0;
        return sum + earnings;
      }, 0);
      const totalSales = affiliates.reduce((sum, affiliate) => sum + (affiliate.totalSales || 0), 0);
      
      // Count active QR codes
      let activeQrCodes = 0;
      for (const affiliate of affiliates) {
        try {
          const qrCodes = await storage.getQrCodesByAffiliateId(affiliate.id);
          activeQrCodes += qrCodes.filter(qr => qr.status === 'active').length;
        } catch (error) {
          console.warn(`Failed to get QR codes for affiliate ${affiliate.id}`);
        }
      }

      res.json({
        success: true,
        data: {
          totalAffiliates,
          totalEarnings,
          totalSales,
          activeQrCodes
        }
      });
    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
      res.status(500).json({ success: false, message: "Error fetching affiliate stats" });
    }
  });

  app.post("/api/affiliates", async (req: Request, res: Response) => {
    try {
      const affiliate = await storage.createAffiliate(req.body);
      res.json({ success: true, data: affiliate });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      res.status(500).json({ success: false, message: "Error creating affiliate" });
    }
  });

  app.get("/api/qr-codes", async (_req: Request, res: Response) => {
    try {
      const qrCodes = await storage.getAllQrCodes();
      res.json({ success: true, data: qrCodes });
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      res.status(500).json({ success: false, message: "Error fetching QR codes" });
    }
  });

  app.post("/api/qr-codes", async (req: Request, res: Response) => {
    try {
      const qrCode = await storage.createQrCode(req.body);
      res.json({ success: true, data: qrCode });
    } catch (error) {
      console.error("Error creating QR code:", error);
      res.status(500).json({ success: false, message: "Error creating QR code" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const totalItems = items.length;
      const activeItems = items.filter(item => item.status === 'active').length;
      const lowStockItems = items.filter(item => (item.quantity || 0) < 10).length;
      
      res.json({
        success: true,
        data: {
          totalItems,
          activeItems,
          lowStockItems,
          totalValue: items.reduce((sum, item) => sum + (parseFloat(item.basePrice || '0') * (item.quantity || 0)), 0)
        }
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, message: "Error fetching stats" });
    }
  });

  // User endpoint  
  app.get("/api/user", async (req: Request, res: Response) => {
    if (req.user) {
      res.json({ success: true, user: req.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  return server;
}