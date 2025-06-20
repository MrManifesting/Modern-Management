// Essential API endpoints for Gold-Standard_Management system
import { Router } from 'express';
import { MinimalStorage } from './storage-minimal.js';

const storage = new MinimalStorage();

// Enhanced inventory filtering for authentic items only
function filterAuthenticItems(items: any[]) {
  return items.filter(item => {
    // Only show items with authentic pricing (not $50 defaults)
    const hasAuthenticPricing = (item.base_price && item.base_price > 0) || 
                               (item.sale_price && item.sale_price > 0) || 
                               (item.cost_price && item.cost_price > 0);
    
    // Priority for flower products with quantities
    const isFlowerWithQuantity = (item.category?.toLowerCase().includes('flower') || 
                                 item.name?.toLowerCase().includes('flower')) && 
                                (item.quantity || 0) > 0;
    
    return hasAuthenticPricing && (isFlowerWithQuantity || (item.quantity || 0) > 0);
  });
}

// Sort items by priority: flower products first, then by highest quantities
function sortItemsByPriority(items: any[]) {
  return items.sort((a, b) => {
    // Check if items are flowers
    const aIsFlower = a.category?.toLowerCase().includes('flower') || a.name?.toLowerCase().includes('flower');
    const bIsFlower = b.category?.toLowerCase().includes('flower') || b.name?.toLowerCase().includes('flower');
    
    // Flowers first
    if (aIsFlower && !bIsFlower) return -1;
    if (!aIsFlower && bIsFlower) return 1;
    
    // Then by highest quantity
    const aQty = a.quantity || 0;
    const bQty = b.quantity || 0;
    if (aQty !== bQty) return bQty - aQty;
    
    // Finally by newest (highest ID)
    return (b.id || 0) - (a.id || 0);
  });
}

export function registerRoutes(app: any) {
  const router = Router();

  // Get all items with enhanced filtering
  router.get('/api/items', async (req, res) => {
    try {
      const allItems = await storage.getItems();
      const authenticItems = filterAuthenticItems(allItems);
      const sortedItems = sortItemsByPriority(authenticItems);
      
      res.json(sortedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  // Enhanced inventory endpoint with authentic item prioritization
  router.get('/api/inventory/enhanced', async (req, res) => {
    try {
      const allItems = await storage.getItems();
      const authenticItems = filterAuthenticItems(allItems);
      const sortedItems = sortItemsByPriority(authenticItems);
      
      const stats = await storage.getStats();
      
      res.json({
        items: sortedItems,
        stats: {
          ...stats,
          availableItems: authenticItems.length,
          flowerProducts: authenticItems.filter(item => 
            item.category?.toLowerCase().includes('flower') || 
            item.name?.toLowerCase().includes('flower')
          ).length
        }
      });
    } catch (error) {
      console.error('Error fetching enhanced inventory:', error);
      res.status(500).json({ error: 'Failed to fetch enhanced inventory' });
    }
  });

  // Get single item
  router.get('/api/items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Error fetching item:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  // Update item
  router.put('/api/items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const item = await storage.updateItem(id, updates);
      res.json(item);
    } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  // Get system stats
  router.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      const allItems = await storage.getItems();
      const authenticItems = filterAuthenticItems(allItems);
      
      res.json({
        ...stats,
        totalItems: allItems.length,
        availableItems: authenticItems.length,
        flowerProducts: authenticItems.filter(item => 
          item.category?.toLowerCase().includes('flower') || 
          item.name?.toLowerCase().includes('flower')
        ).length,
        totalValue: authenticItems.reduce((sum, item) => {
          const price = item.sale_price || item.base_price || 0;
          const quantity = item.quantity || 0;
          return sum + (price * quantity);
        }, 0)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Live catalog endpoint with authentic products only
  router.get('/api/catalog', async (req, res) => {
    try {
      const allItems = await storage.getItems();
      const authenticItems = filterAuthenticItems(allItems);
      const sortedItems = sortItemsByPriority(authenticItems);
      
      // Generate HTML catalog
      const catalogItems = sortedItems.map(item => {
        const price = item.sale_price || item.base_price || 0;
        const strain = item.name || 'Unknown Strain';
        const quantity = item.quantity || 0;
        
        return `
          <div class="catalog-item">
            <h3>${strain}</h3>
            <p>Price: $${price.toFixed(2)}</p>
            <p>Available: ${quantity} units</p>
            <p>Category: ${item.category || 'Cannabis'}</p>
            <p>Brand: ${item.brand || 'Gold Standard'}</p>
          </div>
        `;
      }).join('');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gold Standard Live Catalog</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #000; color: #d4af37; }
            h1 { color: #d4af37; text-align: center; }
            .catalog-item { border: 1px solid #d4af37; margin: 10px 0; padding: 15px; background: #1a1a1a; }
            .catalog-item h3 { color: #228b22; margin-top: 0; }
          </style>
        </head>
        <body>
          <h1>Gold Standard Live Inventory Catalog</h1>
          <p>Total Available Products: ${sortedItems.length}</p>
          ${catalogItems}
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error generating catalog:', error);
      res.status(500).json({ error: 'Failed to generate catalog' });
    }
  });

  // Sales endpoints
  router.get('/api/sales/recent', async (req, res) => {
    try {
      const sales = await storage.getRecentSales(10);
      res.json(sales);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      res.status(500).json({ error: 'Failed to fetch recent sales' });
    }
  });

  // System health check
  router.get('/api/system/health', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        database: 'connected',
        stats
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      res.status(500).json({ error: 'System health check failed' });
    }
  });

  app.use(router);
}