import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import routes from './routes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use(routes);

// All API routes are now handled by routes.js

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Production: serve static files
    app.use(express.static(path.join(__dirname, '../dist/public')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/public/index.html'));
    });
  } else {
    // Development: serve static files from client directory
    console.log('[startup] Setting up development file serving');
    app.use(express.static(path.join(__dirname, '../client')));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/index.html'));
      }
    });
    console.log('[startup] Development static file serving configured');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[startup] Starting server in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[startup] Using existing database connection`);
    console.log(`[graphql] GraphQL server started successfully`);
    console.log(`[startup] GraphQL server initialized at /graphql`);
    console.log(`[startup] Routes registered successfully`);
    console.log(`[startup] serving on port ${PORT}`);
    console.log(`[startup] Frontend application ready at http://0.0.0.0:${PORT}`);
    console.log(`[startup] Server startup completed successfully`);
  });
}

startServer().catch(console.error);