import { Request, Response } from "express";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { items, sales, inventoryActions, Item } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadMemory = multer({ storage: multer.memoryStorage() });

// Utility functions
const log = (message: string, context: string = 'general') => {
  console.log(`${new Date().toLocaleTimeString()} [${context}] ${message}`);
};

export function registerRoutes(app: any, storage: any) {
  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // User auth endpoints
  app.get("/api/user", (req: Request, res: Response) => {
    const session = req.session as any;
    if (!session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: session.userId, authenticated: true });
  });

  // Stats endpoint
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const activeItems = items.filter((item: any) => 
        item.status === 'active' || item.status === 'available'
      ).length;
      const totalValue = items.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.base_price || '0') * (item.quantity || 0)), 0
      );

      res.json({
        success: true,
        data: {
          totalItems: items.length,
          activeItems,
          totalValue: totalValue.toFixed(2)
        }
      });
    } catch (error) {
      log(`Stats error: ${error}`, 'stats');
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Items endpoints
  app.get("/api/items", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Sort with flower products with quantities at top
      const sortedItems = items.sort((a: any, b: any) => {
        const aHasFlower = (a.name || '').toLowerCase().includes('flower') || 
                          (a.category || '').toLowerCase().includes('flower');
        const bHasFlower = (b.name || '').toLowerCase().includes('flower') || 
                          (b.category || '').toLowerCase().includes('flower');
        const aQuantity = a.quantity || 0;
        const bQuantity = b.quantity || 0;
        
        // Priority: flower items with quantities first
        if (aHasFlower && aQuantity > 0 && (!bHasFlower || bQuantity === 0)) return -1;
        if (bHasFlower && bQuantity > 0 && (!aHasFlower || aQuantity === 0)) return 1;
        
        // Then by quantity descending
        if (aQuantity !== bQuantity) return bQuantity - aQuantity;
        
        // Finally by ID descending (newest first)
        return (b.id || 0) - (a.id || 0);
      });

      log(`Retrieved ${items.length} items with ALL available flower products prioritized at top`, 'inventory');
      res.json(sortedItems);
    } catch (error) {
      log(`Items fetch error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Enhanced inventory endpoint
  app.get("/api/inventory/enhanced", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Filter items with quantities OR pricing
      const enhancedItems = items.filter((item: any) => {
        const hasQuantity = (item.quantity || 0) > 0;
        const hasPricing = (item.base_price && parseFloat(item.base_price) > 0) ||
                          (item.sale_price && parseFloat(item.sale_price) > 0) ||
                          (item.cost_price && parseFloat(item.cost_price) > 0);
        return hasQuantity || hasPricing;
      }).map((item: any) => {
        // Get thumbnail URL with proper fallbacks
        let thumbnailUrl = null;
        if (item.images && typeof item.images === 'string') {
          try {
            const imageUrls = JSON.parse(item.images);
            if (Array.isArray(imageUrls) && imageUrls.length > 0) {
              thumbnailUrl = imageUrls[0];
            } else if (typeof imageUrls === 'string') {
              thumbnailUrl = imageUrls;
            }
          } catch {
            // If JSON parse fails, treat as single URL
            thumbnailUrl = item.images;
          }
        } else if (item.image_url) {
          thumbnailUrl = item.image_url;
        } else if (item.imageUrl) {
          thumbnailUrl = item.imageUrl;
        }
        
        // Ensure URL is properly formatted
        if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
          thumbnailUrl = `/uploads/${thumbnailUrl}`;
        }

        return {
          ...item,
          thumbnailUrl,
          hasImage: !!thumbnailUrl,
          displayPrice: parseFloat(item.base_price || item.sale_price || item.cost_price || '0')
        };
      });

      log(`Enhanced inventory: ${enhancedItems.length} items with quantities available`, 'inventory');
      res.json(enhancedItems);
    } catch (error) {
      log(`Enhanced inventory error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to fetch enhanced inventory" });
    }
  });

  // Get single item
  app.get("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      log(`Item fetch error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  // Create item
  app.post("/api/items", uploadMemory.array("files", 5), async (req: Request, res: Response) => {
    try {
      const itemData = req.body;
      
      // Set defaults
      if (!itemData.description || itemData.description.trim() === '') {
        itemData.description = `${itemData.name || 'New Item'} - Cannabis product`;
      }
      
      const newItem = await storage.createItem(itemData);
      log(`Created item: ${newItem.name} (ID: ${newItem.id})`, 'inventory');
      res.json(newItem);
    } catch (error) {
      log(`Item creation error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // Update item
  app.put("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updatedItem = await storage.updateItem(id, updates);
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      log(`Item update error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Delete item
  app.delete("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteItem(id);
      res.json({ success: true });
    } catch (error) {
      log(`Item deletion error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Shopify endpoints
  app.get("/api/shopify/test-connection", async (_req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Shopify access token not configured"
        });
      }

      const response = await fetch(`https://${shopifyDomain}/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const shopData = await response.json();
        log(`Successfully connected to Shopify store: ${shopData.shop?.name || shopifyDomain}`, 'shopify-test');
        res.json({
          success: true,
          connected: true,
          message: `Connected to ${shopData.shop?.name || shopifyDomain}`,
          store: shopData.shop?.name || shopifyDomain,
          domain: shopifyDomain
        });
      } else {
        res.status(response.status).json({
          success: false,
          connected: false,
          error: `Connection failed: ${response.status} ${response.statusText}`
        });
      }
    } catch (error) {
      log(`Shopify connection test error: ${error}`, 'shopify-test');
      res.status(500).json({
        success: false,
        connected: false,
        error: "Failed to test Shopify connection"
      });
    }
  });

  // Shopify products endpoint
  app.get("/api/shopify/products", async (_req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ error: "Shopify access token not configured" });
      }

      const response = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data.products || []);
      } else {
        res.status(response.status).json({ error: "Failed to fetch Shopify products" });
      }
    } catch (error) {
      log(`Shopify products error: ${error}`, 'shopify');
      res.status(500).json({ error: "Failed to fetch Shopify products" });
    }
  });

  // Shopify view item endpoint
  app.get("/api/items/:id/shopify-store-view", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      let url = `https://${shopifyDomain}/admin/products`;
      
      if (item.shopifyId) {
        url = `https://${shopifyDomain}/admin/products/${item.shopifyId}`;
      } else if (item.sku) {
        url = `https://${shopifyDomain}/admin/products?query=sku:${encodeURIComponent(item.sku)}`;
      } else if (item.name) {
        url = `https://${shopifyDomain}/admin/products?query=${encodeURIComponent(item.name)}`;
      }

      res.json({ success: true, url });
    } catch (error) {
      log(`Shopify view error: ${error}`, 'shopify');
      res.status(500).json({ error: "Failed to generate Shopify view URL" });
    }
  });

  // Sales reports
  app.get("/api/shopify/reports/sales/:period", async (req: Request, res: Response) => {
    try {
      const period = req.params.period;
      const sales = await storage.getRecentSales(parseInt(period.replace('d', '')) || 7);
      
      const totalRevenue = sales.reduce((sum: number, sale: any) => 
        sum + parseFloat(sale.total || '0'), 0
      );
      
      res.json({
        success: true,
        data: {
          period,
          totalSales: sales.length,
          totalRevenue: totalRevenue.toFixed(2),
          averageOrderValue: sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : '0.00',
          sales: sales.slice(0, 10) // Last 10 sales
        }
      });
    } catch (error) {
      log(`Sales report error: ${error}`, 'reports');
      res.status(500).json({ error: "Failed to generate sales report" });
    }
  });

  // CSV import endpoint
  app.post("/api/import-from-csv", uploadMemory.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have header and at least one data row" });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const imported = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const itemData: any = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            if (header.toLowerCase().includes('name') || header.toLowerCase().includes('title')) {
              itemData.name = values[index];
            } else if (header.toLowerCase().includes('price')) {
              itemData.base_price = parseFloat(values[index]) || 0;
            } else if (header.toLowerCase().includes('quantity')) {
              itemData.quantity = parseInt(values[index]) || 0;
            } else if (header.toLowerCase().includes('sku')) {
              itemData.sku = values[index];
            }
          }
        });

        if (itemData.name) {
          itemData.status = 'draft'; // Import as drafts
          itemData.description = `Imported from CSV - ${itemData.name}`;
          const newItem = await storage.createItem(itemData);
          imported.push(newItem);
        }
      }

      res.json({
        success: true,
        message: `Successfully imported ${imported.length} items`,
        imported: imported.length
      });
    } catch (error) {
      log(`CSV import error: ${error}`, 'csv-import');
      res.status(500).json({ error: "Failed to import CSV" });
    }
  });
}