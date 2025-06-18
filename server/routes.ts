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

  // Shopify Webhook Endpoints
  app.post("/api/shopify/webhooks/products/create", async (req: Request, res: Response) => {
    try {
      log(`Product creation webhook received: ${req.body?.title}`, 'webhook');
      // Process product creation
      res.status(200).json({ success: true, message: "Product creation webhook processed" });
    } catch (error) {
      log(`Product creation webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/products/update", async (req: Request, res: Response) => {
    try {
      log(`Product update webhook received: ${req.body?.title}`, 'webhook');
      // Process product update
      res.status(200).json({ success: true, message: "Product update webhook processed" });
    } catch (error) {
      log(`Product update webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/products/delete", async (req: Request, res: Response) => {
    try {
      log(`Product deletion webhook received: ${req.body?.id}`, 'webhook');
      // Process product deletion
      res.status(200).json({ success: true, message: "Product deletion webhook processed" });
    } catch (error) {
      log(`Product deletion webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/inventory_levels/update", async (req: Request, res: Response) => {
    try {
      log(`Inventory levels update webhook received: ${req.body?.inventory_item_id}`, 'webhook');
      // Process inventory level update
      res.status(200).json({ success: true, message: "Inventory levels update webhook processed" });
    } catch (error) {
      log(`Inventory levels update webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/orders/create", async (req: Request, res: Response) => {
    try {
      const order = req.body;
      log(`Order creation webhook received: ${order?.name || 'Unknown Order'}`, 'webhook');
      
      if (!order || !order.line_items) {
        log('Invalid order data received in webhook', 'webhook');
        return res.status(400).json({ error: "Invalid order data" });
      }

      // Process each line item to reduce inventory
      for (const lineItem of order.line_items) {
        if (lineItem.sku) {
          try {
            const item = await storage.getItemBySku(lineItem.sku);
            if (item) {
              const newQuantity = Math.max(0, (item.quantity || 0) - lineItem.quantity);
              await storage.updateItem(item.id, { quantity: newQuantity });
              
              // Log inventory action
              await storage.createInventoryAction({
                itemId: item.id,
                employeeId: 1, // System employee
                actionType: 'sale',
                quantity: -lineItem.quantity,
                previousQuantity: item.quantity || 0,
                notes: `Shopify order ${order.name}`
              });
              
              log(`Reduced inventory for ${lineItem.sku}: ${item.quantity} → ${newQuantity}`, 'webhook');
            }
          } catch (error) {
            log(`Error processing line item ${lineItem.sku}: ${error}`, 'webhook');
          }
        }
      }

      // Create sale record in database
      try {
        await storage.createSale({
          orderId: order.name || order.order_number,
          customerName: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : '',
          customerEmail: order.customer?.email || order.email || '',
          items: order.line_items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            sku: item.sku
          })),
          subtotal: order.subtotal_price || order.total_price,
          total: order.total_price,
          status: order.financial_status || 'paid',
          marketplaceId: null,
          metadata: {
            shopifyOrderId: order.id,
            fulfillmentStatus: order.fulfillment_status,
            financialStatus: order.financial_status
          }
        });
        log(`Sale record created for order ${order.name}`, 'webhook');
      } catch (error) {
        log(`Error creating sale record: ${error}`, 'webhook');
      }

      res.status(200).json({ success: true, message: "Order creation webhook processed" });
    } catch (error) {
      log(`Order creation webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/orders/cancelled", async (req: Request, res: Response) => {
    try {
      log(`Order cancellation webhook received: ${req.body?.name}`, 'webhook');
      // Process order cancellation - restore inventory
      res.status(200).json({ success: true, message: "Order cancellation webhook processed" });
    } catch (error) {
      log(`Order cancellation webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/refunds/create", async (req: Request, res: Response) => {
    try {
      log(`Refund creation webhook received: ${req.body?.id}`, 'webhook');
      // Process refund creation - restore inventory
      res.status(200).json({ success: true, message: "Refund creation webhook processed" });
    } catch (error) {
      log(`Refund creation webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/customers/create", async (req: Request, res: Response) => {
    try {
      log(`Customer creation webhook received: ${req.body?.email}`, 'webhook');
      // Process customer creation
      res.status(200).json({ success: true, message: "Customer creation webhook processed" });
    } catch (error) {
      log(`Customer creation webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/shopify/webhooks/app/uninstalled", async (req: Request, res: Response) => {
    try {
      log(`App uninstalled webhook received`, 'webhook');
      // Process app uninstallation cleanup
      res.status(200).json({ success: true, message: "App uninstalled webhook processed" });
    } catch (error) {
      log(`App uninstalled webhook error: ${error}`, 'webhook');
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Webhook status endpoint
  app.get("/api/shopify/webhooks/status", async (_req: Request, res: Response) => {
    try {
      const webhooks = [
        { topic: 'products/create', endpoint: '/api/shopify/webhooks/products/create' },
        { topic: 'products/update', endpoint: '/api/shopify/webhooks/products/update' },
        { topic: 'products/delete', endpoint: '/api/shopify/webhooks/products/delete' },
        { topic: 'inventory_levels/update', endpoint: '/api/shopify/webhooks/inventory_levels/update' },
        { topic: 'orders/create', endpoint: '/api/shopify/webhooks/orders/create' },
        { topic: 'orders/cancelled', endpoint: '/api/shopify/webhooks/orders/cancelled' },
        { topic: 'refunds/create', endpoint: '/api/shopify/webhooks/refunds/create' },
        { topic: 'customers/create', endpoint: '/api/shopify/webhooks/customers/create' },
        { topic: 'app/uninstalled', endpoint: '/api/shopify/webhooks/app/uninstalled' }
      ];

      res.json({
        success: true,
        webhooks,
        baseUrl: process.env.REPLIT_DEV_DOMAIN ? 
          `https://${process.env.REPLIT_DEV_DOMAIN}` : 
          'https://your-app-domain.replit.app',
        webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET ? 'configured' : 'not configured'
      });
    } catch (error) {
      log(`Error getting webhook status: ${error}`, 'webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Archive zero quantity items
  app.post("/api/items/archive-zero-quantity", async (req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const zeroQuantityItems = items.filter(item => (item.quantity === 0 || item.quantity === null));
      
      let updatedCount = 0;
      const updatedItems = [];

      for (const item of zeroQuantityItems) {
        if (item.status !== 'archived') {
          const updatedItem = await storage.updateItem(item.id, { 
            status: 'archived'
          });
          if (updatedItem) {
            updatedCount++;
            updatedItems.push({
              id: item.id,
              name: item.name,
              sku: item.sku,
              previousStatus: item.status,
              newStatus: 'archived'
            });
          }
        }
      }

      log(`Archived ${updatedCount} items with zero quantity`, 'inventory');
      res.json({
        success: true,
        message: `Successfully archived ${updatedCount} items with zero quantity`,
        updatedCount,
        totalZeroQuantityItems: zeroQuantityItems.length,
        updatedItems
      });
    } catch (error) {
      log(`Error archiving zero quantity items: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to archive zero quantity items" });
    }
  });

  // Shopify sales reports endpoint
  app.get("/api/shopify/reports/sales/:period", async (req: Request, res: Response) => {
    try {
      const { period } = req.params;
      
      // Get sales from database instead of external API
      const sales = await storage.getRecentSales(50);
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Filter sales by date range
      const filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt || '');
        return saleDate >= startDate && saleDate <= now;
      });

      // Calculate summary metrics
      const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total || '0'), 0);
      const totalOrders = filteredSales.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      res.json({
        success: true,
        data: {
          period,
          totalRevenue,
          totalOrders,
          averageOrderValue,
          sales: filteredSales.slice(0, 10) // Return latest 10 for display
        }
      });
    } catch (error) {
      log(`Error fetching sales report: ${error}`, 'shopify');
      res.status(500).json({ error: "Failed to fetch sales report" });
    }
  });

  return server;
}