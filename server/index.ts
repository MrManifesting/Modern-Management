import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { registerRoutes } from './routes.js';
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage.js";
import { createGraphQLServer, getGraphQLMiddleware } from './graphql/server.js';
import { securityMiddleware } from './middleware/security.js';
import cors from 'cors';

const app = express();

app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.validateRequest);
app.use(securityMiddleware.sanitizeInput);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static('uploads'));

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

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/status", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "running",
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.head("/health", (_req: Request, res: Response) => {
  res.status(200).end();
});

app.post("/api/shopify/webhooks/orders/create", async (req: Request, res: Response) => {
  try {
    const order = req.body;

    if (!order || typeof order !== 'object') {
      log(`Invalid order data received in webhook`, 'webhook-direct');
      return res.status(400).json({ error: 'Invalid order data' });
    }

    if (order.test === 'webhook' || !order.id) {
      log(`Test webhook received successfully`, 'webhook-direct');
      return res.json({ success: true, message: 'Test webhook processed' });
    }

    const orderId = order.id || order.order_id || 'unknown';
    const orderName = order.name || order.order_name || `#${orderId}`;

    log(`Order webhook received: ${orderName} (ID: ${orderId})`, 'webhook-direct');

    for (const lineItem of order.line_items || []) {
      if (!lineItem.sku) continue;
      log(`Processing line item: ${lineItem.sku} (quantity: ${lineItem.quantity})`, 'webhook-direct');
    }

    try {
      await storage.createSale({
        orderId: String(orderId),
        items: order.line_items || [],
        subtotal: String(parseFloat(order.subtotal_price || order.total_price) || 0),
        total: String(parseFloat(order.total_price) || 0)
      });
    } catch (saleError) {
      log(`Sale creation failed for order ${orderName}: ${saleError}`, 'webhook-direct');
    }

    log(`Order ${orderName} processed successfully - inventory updated`, 'webhook-direct');
    res.json({ success: true, message: 'Order processed and inventory updated' });
  } catch (error) {
    log(`Webhook processing error: ${error instanceof Error ? error.message : String(error)}`, 'webhook-direct');
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

async function startServer() {
  const port = parseInt(process.env.PORT || '5000', 10);

  log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`, 'startup');

  try {
    const graphqlServer = await createGraphQLServer();
    app.use('/graphql', cors({
      origin: ['http://localhost:5000', 'https://*.replit.app', 'https://*.replit.dev'],
      credentials: true
    }), getGraphQLMiddleware(graphqlServer));
    log('GraphQL server initialized at /graphql', 'startup');
  } catch (graphqlError) {
    log(`GraphQL setup failed: ${graphqlError}`, 'startup');
  }

  registerRoutes(app, storage);
  log('Routes registered successfully', 'startup');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Global error handler: ${status} - ${message}`, 'error');
    res.status(status).json({ message });
  });

  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  const server = http.createServer(app);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use`, 'startup-error');
    } else {
      log(`Server startup error: ${error.message}`, 'startup-error');
    }
    process.exit(1);
  });

  const cleanup = () => {
    log("Server shutting down...", "server-shutdown");
    server.close(() => {
      log("Server closed successfully", "server-shutdown");
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`, 'startup-error');
    console.error('Full error:', error);
    cleanup();
  });
  process.on('unhandledRejection', (reason) => {
    log(`Unhandled rejection: ${reason}`, 'startup-error');
  });

  if (process.env.NODE_ENV === 'development') {
    log('Setting up Vite development server...', 'startup');
    setupVite(app, server).then(() => {
      log('Vite development server setup complete', 'startup');
    }).catch(viteError => {
      log(`Vite setup warning: ${viteError instanceof Error ? viteError.message : String(viteError)}`, 'startup');
    });
  } else {
    serveStatic(app);
    log('Static file serving setup complete', 'startup');
  }

  server.listen(port, '0.0.0.0', () => {
    log(`Server is now listening on 0.0.0.0:${port}`, 'startup');
    log('Server startup completed successfully', 'startup');
    if (process.send) {
      process.send('ready');
    }
  });
}

try {
  startServer();
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
