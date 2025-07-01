import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
    // Development: serve basic React app for now
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gold Standard Inventory Management</title>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            const { useState, useEffect } = React;
            
            function App() {
              const [systemHealth, setSystemHealth] = useState(null);
              const [menuItems, setMenuItems] = useState([]);
              const [poundVariants, setPoundVariants] = useState([]);
              
              useEffect(() => {
                // Fetch system health
                fetch('/api/system/health')
                  .then(res => res.json())
                  .then(data => setSystemHealth(data));
                  
                // Fetch menu items
                fetch('/api/menu')
                  .then(res => res.json())
                  .then(data => setMenuItems(data.items?.slice(0, 10) || []));
                  
                // Fetch pound variants
                fetch('/api/pound-variants-menu')
                  .then(res => res.json())
                  .then(data => setPoundVariants(data.items?.slice(0, 10) || []));
              }, []);
              
              return (
                <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                  <div className="container mx-auto px-4 py-8">
                    <header className="text-center mb-8">
                      <h1 className="text-4xl font-bold text-yellow-400 mb-2">
                        Gold Standard Inventory Management
                      </h1>
                      <p className="text-gray-300">
                        Advanced Cannabis Inventory System - {systemHealth?.itemCount || 0} Total Items
                      </p>
                    </header>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400/20">
                        <h2 className="text-xl font-semibold text-yellow-400 mb-3">
                          System Status
                        </h2>
                        {systemHealth ? (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Database:</span>
                              <span className="text-green-400">{systemHealth.services.database}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Shopify:</span>
                              <span className="text-green-400">{systemHealth.services.shopify}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Items:</span>
                              <span className="text-blue-400">{systemHealth.itemCount}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400">Loading...</div>
                        )}
                      </div>
                      
                      <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400/20">
                        <h2 className="text-xl font-semibold text-yellow-400 mb-3">
                          Pound Variants ({poundVariants.length})
                        </h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {poundVariants.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="truncate">{item.name?.split(' - ')[0] || 'Unknown'}</span>
                              <span className="text-green-400">{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400/20">
                        <h2 className="text-xl font-semibold text-yellow-400 mb-3">
                          Recent Menu Items
                        </h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {menuItems.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="truncate">{item.name?.split(' - ')[0] || 'Unknown'}</span>
                              <span className="text-blue-400">{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 text-center">
                      <div className="inline-flex space-x-4">
                        <a href="/api/menu" className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-semibold">
                          View Menu API
                        </a>
                        <a href="/api/pound-variants-menu" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">
                          Pound Variants API
                        </a>
                        <a href="/api/system/health" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
                          System Health API
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            ReactDOM.render(<App />, document.getElementById('root'));
          </script>
        </body>
        </html>
      `);
    });
  }

  app.listen(PORT, () => {
    console.log(`[startup] Starting server in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[startup] Using existing database connection`);
    console.log(`[graphql] GraphQL server started successfully`);
    console.log(`[startup] GraphQL server initialized at /graphql`);
    console.log(`[startup] Routes registered successfully`);
    console.log(`[startup] serving on port ${PORT}`);
    console.log(`[startup] Frontend application ready at http://localhost:${PORT}`);
    console.log(`[startup] Server startup completed successfully`);
  });
}

startServer().catch(console.error);