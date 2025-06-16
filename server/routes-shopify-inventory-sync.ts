import { Express, Request, Response } from "express";
import { GoogleSheetsService } from "./services/google-sheets";
import { IStorage } from "./storage";

interface ShopifyWebhookOrder {
  id: number;
  order_number: string;
  name: string;
  email: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    sku: string;
    name: string;
    title: string;
    quantity: number;
    price: string;
  }>;
  total_price: string;
  created_at: string;
  fulfillment_status: string | null;
  financial_status: string;
}

export function registerShopifyInventorySyncRoutes(app: Express, storage: IStorage) {
  const googleSheets = new GoogleSheetsService();

  // Initialize Google Sheets structure
  app.post("/api/shopify/sheets/setup", async (req: Request, res: Response) => {
    try {
      if (!await googleSheets.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: "Google Sheets not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEETS_SPREADSHEET_ID environment variables."
        });
      }

      // Set up all required sheets
      const inventorySetup = await googleSheets.setupInventorySheet();
      const orderLogSetup = await googleSheets.setupOrderLogSheet();
      const alertSetup = await googleSheets.createLowStockAlert();

      if (inventorySetup && orderLogSetup && alertSetup) {
        // Sync current inventory to sheets
        const items = await storage.getItems();
        const inventoryData = items.map(item => ({
          sku: item.sku || '',
          name: item.name,
          quantity: item.quantity || 0,
          basePrice: typeof item.basePrice === 'number' ? item.basePrice : parseFloat(String(item.basePrice || 0))
        }));

        await googleSheets.syncAllInventoryToSheet(inventoryData);

        res.json({
          success: true,
          message: "Google Sheets successfully configured and synced with current inventory",
          sheets: ["Inventory_Tracking", "Order_Log", "Low_Stock_Alerts"]
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to set up one or more sheets"
        });
      }
    } catch (error) {
      console.error("Error setting up Google Sheets:", error);
      res.status(500).json({
        success: false,
        message: "Error setting up Google Sheets integration"
      });
    }
  });

  // Webhook endpoint for Shopify orders
  app.post("/api/shopify/webhooks/orders/create", async (req: Request, res: Response) => {
    try {
      const order: ShopifyWebhookOrder = req.body;
      
      console.log(`Processing new Shopify order: ${order.order_number}`);

      const inventoryUpdates = [];
      const processedItems = [];

      // Process each line item in the order
      for (const lineItem of order.line_items) {
        if (!lineItem.sku) {
          console.warn(`Line item ${lineItem.id} has no SKU, skipping inventory update`);
          continue;
        }

        // Find the item in our inventory
        const item = await storage.getItemBySku(lineItem.sku);
        
        if (item) {
          // Calculate new quantity
          const newQuantity = Math.max(0, (item.quantity || 0) - lineItem.quantity);
          
          // Update inventory in database
          await storage.updateItem(item.id, {
            quantity: newQuantity
          });

          // Record the inventory update
          inventoryUpdates.push({
            sku: lineItem.sku,
            name: lineItem.name,
            quantityOrdered: lineItem.quantity,
            remainingStock: newQuantity,
            orderNumber: order.order_number,
            timestamp: order.created_at
          });

          // Log the change
          console.log(`Updated inventory for ${lineItem.sku}: ${item.quantity} -> ${newQuantity} (ordered: ${lineItem.quantity})`);
          
          // Check for low stock
          if (newQuantity <= 5) {
            console.warn(`LOW STOCK ALERT: ${lineItem.sku} now has ${newQuantity} units remaining`);
          }
          
          if (newQuantity === 0) {
            console.error(`OUT OF STOCK: ${lineItem.sku} is now out of stock`);
          }
        } else {
          console.warn(`Item with SKU ${lineItem.sku} not found in inventory`);
          
          // Still record it for the order log
          inventoryUpdates.push({
            sku: lineItem.sku,
            name: lineItem.name,
            quantityOrdered: lineItem.quantity,
            remainingStock: 0,
            orderNumber: order.order_number,
            timestamp: order.created_at
          });
        }

        processedItems.push({
          productId: lineItem.product_id.toString(),
          variantId: lineItem.variant_id.toString(),
          sku: lineItem.sku,
          name: lineItem.name,
          quantity: lineItem.quantity,
          price: lineItem.price
        });
      }

      // Create order object for Google Sheets
      const orderForSheets = {
        id: order.id.toString(),
        orderNumber: order.order_number,
        lineItems: processedItems,
        customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
        customerEmail: order.customer?.email || order.email || '',
        totalPrice: order.total_price,
        createdAt: order.created_at,
        fulfillmentStatus: order.fulfillment_status || 'unfulfilled'
      };

      // Update Google Sheets if configured
      if (await googleSheets.isConfigured()) {
        try {
          await googleSheets.logOrderToSheet(orderForSheets, inventoryUpdates);
          await googleSheets.updateInventoryInSheet(inventoryUpdates);
          console.log(`Order ${order.order_number} logged to Google Sheets`);
        } catch (error) {
          console.error("Error updating Google Sheets:", error);
        }
      }

      // Create sale record in our database
      const saleData = {
        orderId: order.order_number,
        customerName: orderForSheets.customerName,
        customerEmail: orderForSheets.customerEmail,
        items: order.line_items,
        subtotal: order.total_price,
        total: order.total_price,
        status: order.financial_status,
        marketplaceId: null, // Will be set if you have marketplace tracking
        metadata: {
          shopifyOrderId: order.id,
          fulfillmentStatus: order.fulfillment_status,
          financialStatus: order.financial_status
        }
      };

      await storage.createSale(saleData);

      res.json({
        success: true,
        message: `Order ${order.order_number} processed successfully`,
        itemsUpdated: inventoryUpdates.length,
        inventoryUpdates: inventoryUpdates.map(update => ({
          sku: update.sku,
          newStock: update.remainingStock,
          ordered: update.quantityOrdered
        }))
      });

    } catch (error) {
      console.error("Error processing Shopify order webhook:", error);
      res.status(500).json({
        success: false,
        message: "Error processing order"
      });
    }
  });

  // Manual sync endpoint
  app.post("/api/shopify/sync/inventory", async (req: Request, res: Response) => {
    try {
      if (!await googleSheets.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: "Google Sheets not configured"
        });
      }

      const items = await storage.getItems();
      const inventoryData = items.map(item => ({
        sku: item.sku || '',
        name: item.name,
        quantity: item.quantity || 0,
        basePrice: typeof item.basePrice === 'number' ? item.basePrice : parseFloat(String(item.basePrice || 0))
      }));

      const success = await googleSheets.syncAllInventoryToSheet(inventoryData);

      if (success) {
        res.json({
          success: true,
          message: `Successfully synced ${inventoryData.length} items to Google Sheets`,
          itemCount: inventoryData.length
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to sync inventory to Google Sheets"
        });
      }
    } catch (error) {
      console.error("Error syncing inventory:", error);
      res.status(500).json({
        success: false,
        message: "Error syncing inventory"
      });
    }
  });

  // Get Google Sheets configuration status
  app.get("/api/shopify/sheets/status", async (req: Request, res: Response) => {
    try {
      const isConfigured = await googleSheets.isConfigured();
      
      res.json({
        success: true,
        configured: isConfigured,
        requiredEnvVars: [
          "GOOGLE_SERVICE_ACCOUNT_EMAIL",
          "GOOGLE_PRIVATE_KEY", 
          "GOOGLE_SHEETS_SPREADSHEET_ID"
        ],
        webhookUrl: `${req.protocol}://${req.get('host')}/api/shopify/webhooks/orders/create`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error checking configuration"
      });
    }
  });

  // Test webhook endpoint
  app.post("/api/shopify/test/webhook", async (req: Request, res: Response) => {
    try {
      // Create a test order to verify the webhook works
      const testOrder: ShopifyWebhookOrder = {
        id: 999999,
        order_number: "TEST-" + Date.now(),
        name: "#TEST-" + Date.now(),
        email: "test@example.com",
        customer: {
          first_name: "Test",
          last_name: "Customer",
          email: "test@example.com"
        },
        line_items: [
          {
            id: 1,
            product_id: 1,
            variant_id: 1,
            sku: "TEST-SKU",
            name: "Test Product",
            title: "Test Product",
            quantity: 1,
            price: "10.00"
          }
        ],
        total_price: "10.00",
        created_at: new Date().toISOString(),
        fulfillment_status: null,
        financial_status: "paid"
      };

      // Process the test order (but don't actually update inventory)
      const orderForSheets = {
        id: testOrder.id.toString(),
        orderNumber: testOrder.order_number,
        lineItems: testOrder.line_items.map(item => ({
          productId: item.product_id.toString(),
          variantId: item.variant_id.toString(),
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        customerName: `${testOrder.customer.first_name} ${testOrder.customer.last_name}`,
        customerEmail: testOrder.customer.email,
        totalPrice: testOrder.total_price,
        createdAt: testOrder.created_at,
        fulfillmentStatus: testOrder.fulfillment_status || 'unfulfilled'
      };

      const inventoryUpdates = [{
        sku: "TEST-SKU",
        name: "Test Product",
        quantityOrdered: 1,
        remainingStock: 99,
        orderNumber: testOrder.order_number,
        timestamp: testOrder.created_at
      }];

      if (await googleSheets.isConfigured()) {
        await googleSheets.logOrderToSheet(orderForSheets, inventoryUpdates);
      }

      res.json({
        success: true,
        message: "Test webhook processed successfully",
        testOrder: testOrder.order_number
      });

    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({
        success: false,
        message: "Error testing webhook"
      });
    }
  });
}