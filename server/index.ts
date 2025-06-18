import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getMarketplaceScheduler } from "./services/marketplace-scheduler";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add webhook endpoints before authentication middleware
app.post("/api/shopify/webhooks/orders/create", async (req: Request, res: Response) => {
  try {
    const order = req.body;
    log(`Order webhook received: ${order.name || order.id}`, 'webhook-direct');
    
    // Process each line item for inventory reduction
    const storage = (await import('./storage.js')).storage;
    
    for (const lineItem of order.line_items || []) {
      if (!lineItem.sku) continue;
      
      // Find item by SKU
      const item = await storage.getItemBySku(lineItem.sku);
      if (!item) {
        log(`Item not found for SKU: ${lineItem.sku}`, 'webhook-direct');
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
        notes: `Order ${order.name} - Direct webhook`,
        previousQuantity,
        newQuantity
      });
      
      log(`INVENTORY REDUCED: ${item.name} from ${previousQuantity} to ${newQuantity} (SKU: ${lineItem.sku})`, 'webhook-direct');
    }
    
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
    
    log(`Order ${order.name} processed successfully - inventory updated`, 'webhook-direct');
    res.json({ success: true, message: 'Order processed and inventory updated' });
  } catch (error) {
    log(`Webhook processing error: ${error}`, 'webhook-direct');
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

(async () => {
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add middleware to ensure API routes are handled correctly
  app.use('/api/*', (req, res, next) => {
    // If we reach here, the API route wasn't handled by registerRoutes
    // This means the route doesn't exist
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const server = app.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Setup cleanup handler for graceful shutdown
  const scheduler = getMarketplaceScheduler(storage);
  
  const cleanup = () => {
    log("Server shutting down, cleaning up resources...", "server-shutdown");
    scheduler.cleanup();
    
    process.exit(0);
  };
  
  // Handle graceful shutdown
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
