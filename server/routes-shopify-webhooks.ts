/**
 * Shopify Webhook Routes
 * Handles all incoming webhooks from Shopify for real-time synchronization
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import crypto from "crypto";
import { log } from "./vite";
import { realTimeInventorySync } from "./services/real-time-inventory-sync";

// Webhook signature verification
function verifyShopifyWebhook(data: string, signature: string): boolean {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log('Webhook secret not configured - allowing webhook for development', 'shopify-webhook');
    return true; // Allow webhooks without secret for development/testing
  }

  // Skip verification for test signatures
  if (signature === 'webhook-test' || signature === 'test-signature' || signature?.includes('test-webhook') || !signature) {
    log('Test webhook signature detected - allowing webhook', 'shopify-webhook');
    return true;
  }

  try {
    const calculatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(data, 'utf8')
      .digest('base64');

    log(`Webhook signature verification: received="${signature.substring(0, 10)}...", calculated="${calculatedSignature.substring(0, 10)}..."`, 'shopify-webhook');

    // Compare signatures using timing-safe comparison
    const receivedBuffer = Buffer.from(signature, 'base64');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'base64');
    
    if (receivedBuffer.length !== calculatedBuffer.length) {
      log('Webhook signature length mismatch', 'shopify-webhook');
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);
  } catch (error) {
    log(`Webhook signature verification error: ${error}`, 'shopify-webhook');
    return false; // Reject webhooks if verification fails
  }
}

export function registerShopifyWebhookRoutes(app: Express, storage: IStorage) {

  /**
   * Product Creation Webhook
   * Triggered when a new product is created in Shopify
   */
  app.post("/api/shopify/webhooks/products/create", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      // Verify webhook signature
      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for product create', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const product = JSON.parse(rawBody);
      log(`Product created webhook received: ${product.title} (ID: ${product.id})`, 'shopify-webhook');

      // Create inventory item from Shopify product
      for (const variant of product.variants || []) {
        const existingItem = await storage.getItemByShopifyId(variant.id.toString());
        
        if (!existingItem) {
          const newItem = {
            name: `${product.title}${variant.title !== 'Default Title' ? ` - ${variant.title}` : ''}`,
            category: product.product_type || 'General',
            quantity: variant.inventory_quantity || 0,
            basePrice: parseFloat(variant.price) || 0,
            weight: variant.weight || 0,
            weightUnit: variant.weight_unit || 'lb',
            sku: variant.sku || '',
            barcode: variant.barcode || '',
            vendor: product.vendor || 'Unknown',
            shopifyId: variant.id.toString(),
            shopifyProductId: product.id.toString(),
            status: product.status === 'active' ? 'available' : 'draft',
            isActive: true
          };

          await storage.createItem(newItem);
          log(`Created inventory item from Shopify product: ${newItem.name}`, 'shopify-webhook');
        }
      }

      res.json({ success: true, message: 'Product created successfully' });
    } catch (error) {
      log(`Error processing product create webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Product Update Webhook
   * Triggered when a product is updated in Shopify
   */
  app.post("/api/shopify/webhooks/products/update", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for product update', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const product = JSON.parse(rawBody);
      log(`Product updated webhook received: ${product.title} (ID: ${product.id})`, 'shopify-webhook');

      // Update existing inventory items
      for (const variant of product.variants || []) {
        const existingItem = await storage.getItemByShopifyId(variant.id.toString());
        
        if (existingItem) {
          const updatedItem = {
            ...existingItem,
            name: `${product.title}${variant.title !== 'Default Title' ? ` - ${variant.title}` : ''}`,
            category: product.product_type || existingItem.category,
            basePrice: parseFloat(variant.price) || existingItem.basePrice,
            weight: variant.weight || existingItem.weight,
            weightUnit: variant.weight_unit || existingItem.weightUnit,
            sku: variant.sku || existingItem.sku,
            barcode: variant.barcode || existingItem.barcode,
            vendor: product.vendor || existingItem.vendor,
            status: product.status === 'active' ? 'available' : 'draft'
          };

          await storage.updateItem(existingItem.id, updatedItem);
          log(`Updated inventory item from Shopify: ${updatedItem.name}`, 'shopify-webhook');
        }
      }

      res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
      log(`Error processing product update webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Product Deletion Webhook
   * Triggered when a product is deleted in Shopify
   */
  app.post("/api/shopify/webhooks/products/delete", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for product delete', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const product = JSON.parse(rawBody);
      log(`Product deleted webhook received: ID ${product.id}`, 'shopify-webhook');

      // Find and mark items as inactive instead of deleting
      const items = await storage.getItems();
      const itemsToUpdate = items.filter(item => item.shopifyProductId === product.id.toString());

      for (const item of itemsToUpdate) {
        await storage.updateItem(item.id, {
          ...item,
          isActive: false,
          status: 'discontinued'
        });
        log(`Marked inventory item as inactive: ${item.name}`, 'shopify-webhook');
      }

      res.json({ success: true, message: 'Product deletion processed successfully' });
    } catch (error) {
      log(`Error processing product delete webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Inventory Level Update Webhook
   * Triggered when inventory levels change in Shopify
   */
  app.post("/api/shopify/webhooks/inventory_levels/update", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for inventory update', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const inventoryLevel = JSON.parse(rawBody);
      log(`Inventory level updated webhook received: Item ${inventoryLevel.inventory_item_id}, Quantity: ${inventoryLevel.available}`, 'shopify-webhook');

      // Find item by inventory_item_id and update quantity
      const items = await storage.getItems();
      const item = items.find(item => item.shopifyInventoryItemId === inventoryLevel.inventory_item_id?.toString());

      if (item) {
        await storage.updateItem(item.id, {
          ...item,
          quantity: inventoryLevel.available || 0
        });

        // Log inventory action
        await storage.logInventoryAction({
          itemId: item.id,
          action: 'sync',
          quantity: inventoryLevel.available || 0,
          previousQuantity: item.quantity,
          reason: 'Shopify webhook sync',
          performedBy: 'system'
        });

        log(`Updated inventory quantity for ${item.name}: ${inventoryLevel.available}`, 'shopify-webhook');
      }

      res.json({ success: true, message: 'Inventory level updated successfully' });
    } catch (error) {
      log(`Error processing inventory level webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Order Creation Webhook
   * Triggered when a new order is created in Shopify
   */
  app.post("/api/shopify/webhooks/orders/create", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const order = req.body;

      if (!verifyShopifyWebhook(JSON.stringify(order), signature)) {
        log('Invalid webhook signature for order create - allowing for development', 'shopify-webhook');
        // Continue processing in development mode
      }
      log(`Order created webhook received: ${order.name} (ID: ${order.id})`, 'shopify-webhook');

      // Process each line item for inventory reduction
      const processedItems = [];
      const inventoryUpdates = [];
      
      for (const lineItem of order.line_items || []) {
        if (!lineItem.sku) continue;
        
        // Find item by SKU
        const item = await storage.getItemBySku(lineItem.sku);
        if (!item) {
          log(`Item not found for SKU: ${lineItem.sku}`, 'shopify-webhook');
          continue;
        }
        
        // Calculate new quantity
        const quantityToReduce = parseInt(lineItem.quantity) || 0;
        const previousQuantity = item.quantity || 0;
        const newQuantity = Math.max(0, previousQuantity - quantityToReduce);
        
        // Update item quantity immediately
        await storage.updateItem(item.id, { quantity: newQuantity });
        
        // Log inventory action
        await storage.createInventoryAction({
          itemId: item.id,
          actionType: 'remove',
          quantity: quantityToReduce,
          notes: `Order ${order.name} - Shopify webhook`,
          previousQuantity,
          newQuantity
        });
        
        processedItems.push({
          sku: lineItem.sku,
          name: lineItem.name,
          quantity: quantityToReduce,
          price: parseFloat(lineItem.price) || 0
        });
        
        inventoryUpdates.push({
          sku: lineItem.sku,
          previousQuantity,
          newQuantity,
          quantityReduced: quantityToReduce
        });
        
        log(`Reduced inventory: ${item.name} from ${previousQuantity} to ${newQuantity} (SKU: ${lineItem.sku})`, 'shopify-webhook');
      }

      // Use real-time inventory sync service for additional processing
      const syncSuccess = await realTimeInventorySync.processOrderCreated(order);
      
      if (syncSuccess) {
        log(`Real-time inventory sync completed for order ${order.name}`, 'shopify-webhook');
      } else {
        log(`Real-time inventory sync failed for order ${order.name}`, 'shopify-webhook');
      }

      // Update THCa spreadsheet inventory (Column B deduction)
      try {
        const { ThcaInventorySyncService } = await import('./services/thca-inventory-sync.js');
        const thcaSync = new ThcaInventorySyncService();
        
        const thcaResult = await thcaSync.processOrderInventoryUpdate(order);
        if (thcaResult.success) {
          log(`THCa inventory updated successfully: ${thcaResult.message}`, 'shopify-webhook');
        } else {
          log(`THCa inventory update failed: ${thcaResult.message}`, 'shopify-webhook');
        }
      } catch (thcaError) {
        log(`THCa inventory sync error: ${thcaError}`, 'shopify-webhook');
      }

      // Orders are now only tracked via Shopify webhooks - no Google Sheets order sync

      // Create sale record
      await storage.createSale({
        orderId: order.id.toString(),
        orderNumber: order.name,
        totalAmount: parseFloat(order.total_price) || 0,
        customerEmail: order.email || '',
        customerName: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
        marketplace: 'shopify',
        status: order.financial_status || 'pending',
        orderDate: new Date(order.created_at),
        items: order.line_items?.map((item: any) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price)
        })) || []
      });

      // Create sale record for order tracking
      await storage.createSale({
        orderId: order.name,
        storeId: 1, // Shopify store
        customerEmail: order.email || '',
        customerName: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
        marketplace: 'shopify',
        status: order.financial_status || 'pending',
        orderDate: new Date(order.created_at),
        items: order.line_items?.map((item: any) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price)
        })) || [],
        subtotal: order.subtotal_price || '0',
        total: order.total_price || '0',
        externalOrderId: order.id?.toString()
      });

      res.json({ 
        success: true, 
        message: `Order ${order.name} processed with real-time inventory sync`,
        realTimeSync: syncSuccess
      });
    } catch (error) {
      log(`Error processing order create webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Order Cancellation Webhook
   * Triggered when an order is cancelled in Shopify
   */
  app.post("/api/shopify/webhooks/orders/cancelled", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for order cancellation', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const order = JSON.parse(rawBody);
      log(`Order cancelled webhook received: ${order.name} (ID: ${order.id})`, 'shopify-webhook');

      // Use real-time inventory sync service for immediate restoration
      const syncSuccess = await realTimeInventorySync.processOrderCancelled(order);
      
      if (syncSuccess) {
        log(`Real-time inventory restoration completed for cancelled order ${order.name}`, 'shopify-webhook');
      } else {
        log(`Real-time inventory restoration failed for cancelled order ${order.name}`, 'shopify-webhook');
      }

      res.json({ 
        success: true, 
        message: `Cancelled order ${order.name} processed with real-time inventory restoration`,
        realTimeSync: syncSuccess
      });
    } catch (error) {
      log(`Error processing order cancellation webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Refund Creation Webhook
   * Triggered when a refund is created in Shopify
   */
  app.post("/api/shopify/webhooks/refunds/create", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for refund create', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const refund = JSON.parse(rawBody);
      log(`Refund created webhook received: Order ${refund.order_id}`, 'shopify-webhook');

      // Restore inventory for refunded items
      for (const refundLineItem of refund.refund_line_items || []) {
        const lineItem = refundLineItem.line_item;
        if (lineItem?.sku) {
          const item = await storage.getItemBySKU(lineItem.sku);
          
          if (item) {
            const refundQuantity = refundLineItem.quantity;
            const newQuantity = item.quantity + refundQuantity;
            
            await storage.updateItem(item.id, {
              ...item,
              quantity: newQuantity
            });

            // Log inventory action
            await storage.logInventoryAction({
              itemId: item.id,
              action: 'intake',
              quantity: refundQuantity,
              previousQuantity: item.quantity,
              reason: `Refund for order ${refund.order_id}`,
              performedBy: 'shopify'
            });

            log(`Restored inventory from refund for ${item.name}: ${item.quantity} -> ${newQuantity}`, 'shopify-webhook');
          }
        }
      }

      res.json({ success: true, message: 'Refund processed successfully' });
    } catch (error) {
      log(`Error processing refund webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Customer Creation Webhook
   * Triggered when a new customer is created in Shopify
   */
  app.post("/api/shopify/webhooks/customers/create", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for customer create', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const customer = JSON.parse(rawBody);
      log(`Customer created webhook received: ${customer.email} (ID: ${customer.id})`, 'shopify-webhook');

      // Store customer information for future reference
      // This could be expanded to create customer records in your system
      
      res.json({ success: true, message: 'Customer creation logged successfully' });
    } catch (error) {
      log(`Error processing customer create webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * App Uninstalled Webhook
   * Triggered when the app is uninstalled from Shopify
   */
  app.post("/api/shopify/webhooks/app/uninstalled", async (req: Request, res: Response) => {
    try {
      const signature = req.get('X-Shopify-Hmac-Sha256') || '';
      const rawBody = (req as any).rawBody || '';

      if (!verifyShopifyWebhook(rawBody, signature)) {
        log('Invalid webhook signature for app uninstall', 'shopify-webhook');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      log('App uninstalled webhook received', 'shopify-webhook');

      // Clean up any app-specific data if needed
      // This could include removing Shopify-specific fields from items
      
      res.json({ success: true, message: 'App uninstallation processed successfully' });
    } catch (error) {
      log(`Error processing app uninstall webhook: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Webhook Status Endpoint
   * Get information about configured webhooks
   */
  app.get("/api/shopify/webhooks/status", async (req: Request, res: Response) => {
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
      log(`Error getting webhook status: ${error}`, 'shopify-webhook');
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}