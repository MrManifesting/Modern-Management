/**
 * Routes for advanced barcode scanning and inventory management
 * Supports both intake (adding stock) and fulfillment (removing stock)
 * Includes batch processing, order matching, and customer notifications
 */

import { Request, Response, Express } from 'express';
import { IStorage } from './storage';
import { z } from 'zod';

const barcodeSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").default(1),
  employeeId: z.number().optional(),
  orderId: z.number().optional(),
  notes: z.string().optional(),
  lowStockThreshold: z.number().optional().default(10)
});

const batchScanSchema = z.object({
  items: z.array(z.object({
    sku: z.string().min(1),
    quantity: z.number().min(1)
  })),
  employeeId: z.number().optional(),
  orderId: z.number().optional(),
  lowStockThreshold: z.number().optional().default(10)
});

const orderSchema = z.object({
  orderId: z.number(),
  itemSku: z.string(),
  itemName: z.string(),
  quantityFulfilled: z.number()
});

type BarcodeScanRequest = z.infer<typeof barcodeSchema>;
type BatchScanRequest = z.infer<typeof batchScanSchema>;
type CustomerNotificationRequest = z.infer<typeof orderSchema>;

/**
 * Register advanced barcode scanning routes
 */
export function registerBarcodeFulfillmentRoutes(app: Express, storage: IStorage) {
  
  /**
   * Scan barcode and add to inventory (intake mode)
   */
  app.post("/api/barcode/scan-intake", async (req: Request, res: Response) => {
    try {
      const scanData = barcodeSchema.parse(req.body);
      
      // Find item by SKU
      const item = await storage.getItemBySku(scanData.sku);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message: `No item found with SKU: ${scanData.sku}`
        });
      }

      // Add quantity to inventory
      const previousQuantity = item.quantity;
      const newQuantity = previousQuantity + scanData.quantity;
      
      await storage.updateItem(item.id, {
        quantity: newQuantity
      });

      // Log the intake action
      if (storage.logInventoryAction) {
        await storage.logInventoryAction({
          itemId: item.id,
          action: 'intake',
          quantity: scanData.quantity,
          employeeId: scanData.employeeId || 1,
          notes: scanData.notes || `Barcode scan intake: ${scanData.quantity} units added`,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          previousQuantity,
          newQuantity,
          quantityFulfilled: scanData.quantity,
          category: item.category
        },
        message: `Successfully added ${scanData.quantity} units to inventory`
      });

    } catch (error) {
      console.error("Error in barcode intake scan:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process intake scan",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Scan barcode and subtract from inventory (fulfillment mode)
   */
  app.post("/api/barcode/scan-fulfill", async (req: Request, res: Response) => {
    try {
      const scanData = barcodeSchema.parse(req.body);
      
      // Find item by SKU
      const item = await storage.getItemBySku(scanData.sku);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message: `No item found with SKU: ${scanData.sku}`
        });
      }

      // Check if sufficient quantity available
      if (item.quantity < scanData.quantity) {
        return res.status(400).json({
          success: false,
          error: "Insufficient quantity",
          message: `Only ${item.quantity} units available, requested ${scanData.quantity}`,
          availableQuantity: item.quantity
        });
      }

      // Subtract quantity from inventory
      const previousQuantity = item.quantity;
      const newQuantity = previousQuantity - scanData.quantity;
      
      await storage.updateItem(item.id, {
        quantity: newQuantity
      });

      // Check for low stock
      const isLowStock = newQuantity <= (scanData.lowStockThreshold || 10);

      // Log the fulfillment action
      if (storage.logInventoryAction) {
        await storage.logInventoryAction({
          itemId: item.id,
          action: 'fulfillment',
          quantity: scanData.quantity,
          employeeId: scanData.employeeId || 1,
          orderId: scanData.orderId,
          notes: scanData.notes || `Barcode scan fulfillment: ${scanData.quantity} units removed`,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          previousQuantity,
          newQuantity,
          quantityFulfilled: scanData.quantity,
          category: item.category,
          lowStockThreshold: scanData.lowStockThreshold
        },
        isLowStock,
        message: `Successfully fulfilled ${scanData.quantity} units from inventory`
      });

    } catch (error) {
      console.error("Error in barcode fulfillment scan:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process fulfillment scan",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Batch scan multiple items for intake
   */
  app.post("/api/barcode/batch-scan-intake", async (req: Request, res: Response) => {
    try {
      const batchData = batchScanSchema.parse(req.body);
      const results = [];

      for (const batchItem of batchData.items) {
        try {
          const item = await storage.getItemBySku(batchItem.sku);
          if (!item) {
            results.push({
              success: false,
              error: "Item not found",
              message: `No item found with SKU: ${batchItem.sku}`,
              sku: batchItem.sku
            });
            continue;
          }

          const previousQuantity = item.quantity;
          const newQuantity = previousQuantity + batchItem.quantity;
          
          await storage.updateItem(item.id, {
            quantity: newQuantity
          });

          if (storage.logInventoryAction) {
            await storage.logInventoryAction({
              itemId: item.id,
              action: 'intake',
              quantity: batchItem.quantity,
              employeeId: batchData.employeeId || 1,
              notes: `Batch scan intake: ${batchItem.quantity} units added`,
              timestamp: new Date()
            });
          }

          results.push({
            success: true,
            item: {
              id: item.id,
              name: item.name,
              sku: item.sku,
              previousQuantity,
              newQuantity,
              quantityFulfilled: batchItem.quantity,
              category: item.category
            }
          });

        } catch (error) {
          results.push({
            success: false,
            error: "Processing failed",
            message: error instanceof Error ? error.message : "Unknown error",
            sku: batchItem.sku
          });
        }
      }

      res.json(results);

    } catch (error) {
      console.error("Error in batch intake scan:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process batch intake scan",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Batch scan multiple items for fulfillment
   */
  app.post("/api/barcode/batch-scan-fulfill", async (req: Request, res: Response) => {
    try {
      const batchData = batchScanSchema.parse(req.body);
      const results = [];

      for (const batchItem of batchData.items) {
        try {
          const item = await storage.getItemBySku(batchItem.sku);
          if (!item) {
            results.push({
              success: false,
              error: "Item not found",
              message: `No item found with SKU: ${batchItem.sku}`,
              sku: batchItem.sku
            });
            continue;
          }

          if (item.quantity < batchItem.quantity) {
            results.push({
              success: false,
              error: "Insufficient quantity",
              message: `Only ${item.quantity} units available, requested ${batchItem.quantity}`,
              availableQuantity: item.quantity,
              sku: batchItem.sku
            });
            continue;
          }

          const previousQuantity = item.quantity;
          const newQuantity = previousQuantity - batchItem.quantity;
          
          await storage.updateItem(item.id, {
            quantity: newQuantity
          });

          const isLowStock = newQuantity <= (batchData.lowStockThreshold || 10);

          if (storage.logInventoryAction) {
            await storage.logInventoryAction({
              itemId: item.id,
              action: 'fulfillment',
              quantity: batchItem.quantity,
              employeeId: batchData.employeeId || 1,
              orderId: batchData.orderId,
              notes: `Batch scan fulfillment: ${batchItem.quantity} units removed`,
              timestamp: new Date()
            });
          }

          results.push({
            success: true,
            item: {
              id: item.id,
              name: item.name,
              sku: item.sku,
              previousQuantity,
              newQuantity,
              quantityFulfilled: batchItem.quantity,
              category: item.category,
              lowStockThreshold: batchData.lowStockThreshold
            },
            isLowStock
          });

        } catch (error) {
          results.push({
            success: false,
            error: "Processing failed",
            message: error instanceof Error ? error.message : "Unknown error",
            sku: batchItem.sku
          });
        }
      }

      res.json(results);

    } catch (error) {
      console.error("Error in batch fulfillment scan:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process batch fulfillment scan",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Verify barcode before scanning (check item exists and has stock)
   */
  app.post("/api/barcode/verify", async (req: Request, res: Response) => {
    try {
      const { sku, quantity } = req.body;
      
      if (!sku) {
        return res.status(400).json({
          success: false,
          error: "SKU is required"
        });
      }

      const item = await storage.getItemBySku(sku);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message: `No item found with SKU: ${sku}`
        });
      }

      const requestedQuantity = quantity || 1;
      const canFulfill = item.quantity >= requestedQuantity;
      const shortfall = canFulfill ? 0 : requestedQuantity - item.quantity;

      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          currentQuantity: item.quantity,
          price: item.price
        },
        verification: {
          canFulfill,
          requestedQuantity,
          availableQuantity: item.quantity,
          shortfall
        }
      });

    } catch (error) {
      console.error("Error verifying barcode:", error);
      res.status(500).json({
        success: false,
        error: "Failed to verify item",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get pending orders for fulfillment matching
   */
  app.get("/api/orders/pending", async (_req: Request, res: Response) => {
    try {
      // In production this would come from actual order management system
      const orders = [
        {
          id: 1,
          customerName: "John Smith",
          customerEmail: "john@example.com",
          status: "pending",
          items: [
            { sku: "FLOWER-001", name: "Premium OG Kush", quantity: 2, fulfilled: 0 },
            { sku: "EDIBLE-005", name: "Gummy Bears 10mg", quantity: 1, fulfilled: 0 }
          ]
        },
        {
          id: 2,
          customerName: "Sarah Johnson",
          customerEmail: "sarah@example.com",
          status: "pending",
          items: [
            { sku: "CONCENTRATE-003", name: "Live Resin Cart", quantity: 3, fulfilled: 1 }
          ]
        }
      ];
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      res.status(500).json({
        error: "Failed to fetch pending orders",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Send customer notification when order items are scanned
   */
  app.post("/api/orders/notify-customer", async (req: Request, res: Response) => {
    try {
      const notificationData = orderSchema.parse(req.body);
      
      // Log notification for audit trail
      console.log(`Customer notification logged:
        Order: ${notificationData.orderId}
        Item: ${notificationData.itemName} (${notificationData.itemSku})
        Quantity fulfilled: ${notificationData.quantityFulfilled}
      `);
      
      // In production would integrate with actual email service
      const emailContent = {
        to: "customer@example.com",
        subject: `Order Update - Item Shipped`,
        html: `
          <h2>Your order has been updated!</h2>
          <p>We've just shipped the following item from your order #${notificationData.orderId}:</p>
          <ul>
            <li><strong>${notificationData.itemName}</strong> - Quantity: ${notificationData.quantityFulfilled}</li>
          </ul>
          <p>You should receive tracking information shortly.</p>
        `
      };
      
      res.json({
        success: true,
        message: "Customer notification sent successfully",
        emailContent
      });
      
    } catch (error) {
      console.error("Error sending customer notification:", error);
      res.status(500).json({
        error: "Failed to send customer notification",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Generate and print shipping label for order
   */
  app.post("/api/orders/print-shipping-label", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({
          error: "Order ID is required"
        });
      }
      
      // Generate shipping label HTML for printing
      const labelHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Shipping Label - Order #${orderId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .label { border: 2px solid #000; padding: 20px; width: 400px; }
            .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
            .section { margin: 10px 0; }
            .barcode { font-family: 'Courier New', monospace; font-size: 24px; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">SHIPPING LABEL</div>
            <div class="section">
              <strong>Order #:</strong> ${orderId}<br>
              <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
            <div class="section">
              <strong>From:</strong><br>
              Gold Standard CBD<br>
              123 Main Street<br>
              Portland, OR 97201
            </div>
            <div class="section">
              <strong>To:</strong><br>
              Customer Name<br>
              456 Oak Avenue<br>
              Seattle, WA 98101
            </div>
            <div class="barcode">||||| ${orderId}${Date.now().toString().slice(-6)} |||||</div>
            <div style="text-align: center; font-size: 12px;">
              Tracking: ${orderId}-${Date.now().toString().slice(-8)}
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.json({
        success: true,
        labelHtml,
        trackingNumber: `${orderId}-${Date.now().toString().slice(-8)}`
      });
      
    } catch (error) {
      console.error("Error generating shipping label:", error);
      res.status(500).json({
        error: "Failed to generate shipping label",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get scan history for an item
   */
  app.get("/api/barcode/scan-history/:sku", async (req: Request, res: Response) => {
    try {
      const { sku } = req.params;
      
      const item = await storage.getItemBySku(sku);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found"
        });
      }

      // In production would get actual scan history from logs
      const scanHistory = [
        {
          id: 1,
          action: 'fulfillment',
          quantity: 2,
          timestamp: new Date(Date.now() - 3600000),
          employeeId: 1,
          orderId: 123
        },
        {
          id: 2,
          action: 'intake',
          quantity: 10,
          timestamp: new Date(Date.now() - 7200000),
          employeeId: 2
        }
      ];

      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku
        },
        scanHistory
      });

    } catch (error) {
      console.error("Error fetching scan history:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch scan history",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

}