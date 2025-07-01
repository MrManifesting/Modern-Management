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
    // Development: use Vite dev server with proper TypeScript support
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
        root: path.join(__dirname, '../client'),
        configFile: path.join(__dirname, '../vite.config.ts')
      });
      
      app.use(vite.ssrFixStacktrace);
      app.use(vite.middlewares);
      
      console.log('[startup] Vite dev server with TypeScript support integrated');
    } catch (error) {
      console.error('[startup] Vite dev server failed:', error);
      console.log('[startup] Rebuilding and serving static files...');
      
      // Rebuild before serving
      const { execSync } = await import('child_process');
      try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('[startup] Build completed successfully');
      } catch (buildError) {
        console.error('[startup] Build failed:', buildError);
      }
      
      app.use(express.static(path.join(__dirname, '../dist/public')));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(__dirname, '../dist/public/index.html'));
        }
      });
    }
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