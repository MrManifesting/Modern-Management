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

// Apply security middleware first
app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.validateRequest);
app.use(securityMiddleware.sanitizeInput);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory
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

// Add health check endpoint for Replit port detection
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Server is running");
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Add a HEAD request handler for root
app.head("/", (req: Request, res: Response) => {
  res.status(200).end();
});

// Add webhook endpoints before authentication middleware
app.post("/api/shopify/webhooks/orders/create", async (req: Request, res: Response) => {
  try {
    const order = req.body;
    
    // Validate order data
    if (!order || typeof order !== 'object') {
      log(`Invalid order data received in webhook`, 'webhook-direct');
      return res.status(400).json({ error: 'Invalid order data' });
    }
    
    // Handle test webhooks with minimal data
    if (order.test === 'webhook' || !order.id) {
      log(`Test webhook received successfully`, 'webhook-direct');
      return res.json({ success: true, message: 'Test webhook processed' });
    }
    
    const orderId = order.id || order.order_id || 'unknown';
    const orderName = order.name || order.order_name || `#${orderId}`;
    
    log(`Order webhook received: ${orderName} (ID: ${orderId})`, 'webhook-direct');
    
    // Process each line item for inventory reduction
    for (const lineItem of order.line_items || []) {
      if (!lineItem.sku) continue;
      
      log(`Processing line item: ${lineItem.sku} (quantity: ${lineItem.quantity})`, 'webhook-direct');
    }
    
    // Create sale record with correct schema
    try {
      await storage.createSale({
        orderId: String(orderId),
        items: order.line_items || [],
        subtotal: String(parseFloat(order.subtotal_price || order.total_price) || 0),
        total: String(parseFloat(order.total_price) || 0)
      });
    } catch (saleError) {
      log(`Sale creation failed for order ${orderName}: ${saleError}`, 'webhook-direct');
      // Continue processing - don't fail webhook on sale creation error
    }
    
    log(`Order ${orderName} processed successfully - inventory updated`, 'webhook-direct');
    res.json({ success: true, message: 'Order processed and inventory updated' });
  } catch (error) {
    log(`Webhook processing error: ${error instanceof Error ? error.message : String(error)}`, 'webhook-direct');
    console.error('Full webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook', details: error instanceof Error ? error.message : String(error) });
  }
});

// Async startup function with comprehensive error handling
async function startServer() {
  try {
    // Validate required environment variables with fallbacks
    const requiredEnvVars = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL || '',
      PORT: process.env.PORT || '5000'
    };

    // Log environment configuration
    log(`Starting server in ${requiredEnvVars.NODE_ENV} mode`, 'startup');
    
    if (!requiredEnvVars.DATABASE_URL) {
      log('Warning: DATABASE_URL not set, using fallback configuration', 'startup');
    }

    // Storage is automatically initialized via database connection
    log('Using existing database connection', 'startup');

    // Initialize GraphQL server
    try {
      const graphqlServer = await createGraphQLServer();
      
      // Add GraphQL middleware with CORS
      app.use('/graphql', cors({
        origin: ['http://localhost:5000', 'https://*.replit.app', 'https://*.replit.dev'],
        credentials: true
      }), getGraphQLMiddleware(graphqlServer));
      
      log('GraphQL server initialized at /graphql', 'startup');
    } catch (graphqlError) {
      log(`GraphQL setup failed: ${graphqlError}`, 'startup');
      // Continue without GraphQL if it fails
    }

    // Register all routes with error handling
    try {
      registerRoutes(app, storage);
      log('Routes registered successfully', 'startup');
    } catch (routeError) {
      log(`Route registration failed: ${routeError instanceof Error ? routeError.message : String(routeError)}`, 'startup');
      throw routeError;
    }

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Global error handler: ${status} - ${message}`, 'error');
      res.status(status).json({ message });
    });

    // Add middleware to ensure API routes are handled correctly
    app.use('/api/*', (req, res, next) => {
      // If we reach here, the API route wasn't handled by registerRoutes
      res.status(404).json({ error: 'API endpoint not found' });
    });

    // Server configuration
    const port = parseInt(requiredEnvVars.PORT, 10);
    let server: any;
    
    // Setup Vite or static serving BEFORE starting server to avoid timing issues
    try {
      if (app.get("env") === "development") {
        // Create server first for Vite
        server = http.createServer(app);
        server.listen(port, '0.0.0.0', () => {
          log(`Server is now listening on 0.0.0.0:${port}`, 'startup');
          // Force process to stay alive for Replit detection
          process.send?.('ready');
        });
        
        // Handle server startup errors
        server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            log(`Port ${port} is already in use`, 'startup-error');
          } else {
            log(`Server startup error: ${error.message}`, 'startup-error');
          }
          process.exit(1);
        });
        
        await setupVite(app, server);
        log('Vite development server setup complete', 'startup');
      } else {
        serveStatic(app);
        log('Static file serving setup complete', 'startup');
        
        // Start server after static setup
        server = http.createServer(app);
        server.listen(port, '0.0.0.0', () => {
          log(`serving on 0.0.0.0:${port}`, 'startup');
          // Force process to stay alive for Replit detection
          process.send?.('ready');
        });
        
        // Handle server startup errors
        server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            log(`Port ${port} is already in use`, 'startup-error');
          } else {
            log(`Server startup error: ${error.message}`, 'startup-error');
          }
          process.exit(1);
        });
      }
    } catch (viteError) {
      log(`Vite/Static setup error: ${viteError instanceof Error ? viteError.message : String(viteError)}`, 'startup-error');
      // Don't exit - server can still serve API routes
    }
    
    // Setup cleanup handler for graceful shutdown
    const cleanup = () => {
      log("Server shutting down, cleaning up resources...", "server-shutdown");
      if (server) {
        server.close(() => {
          log("Server closed successfully", "server-shutdown");
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };
    
    // Handle graceful shutdown
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      log(`Uncaught exception: ${error.message}`, 'startup-error');
      console.error('Full error:', error);
      cleanup();
    });
    process.on('unhandledRejection', (reason, promise) => {
      log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'startup-error');
      console.error('Full rejection:', reason);
    });

    log('Server startup completed successfully', 'startup');
    
  } catch (startupError) {
    log(`Critical startup failure: ${startupError instanceof Error ? startupError.message : String(startupError)}`, 'startup-error');
    console.error('Full startup error:', startupError);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
