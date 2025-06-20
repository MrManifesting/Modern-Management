// Essential API endpoints for Gold-Standard_Management system
import { Router } from 'express';
import { FixedStorage } from './storage-fixed.js';

const storage = new FixedStorage();

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
  // Enhanced inventory stats
  app.get('/api/inventory/stats', async (req: Request, res: Response) => {
    try {
      const stats = await storage.getInventoryStats();
      res.json({ stats });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
  });

  // Price sheet generation
  app.get('/api/generate-price-sheet', async (req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const availableItems = items.filter(item => 
        item.status === 'available' && 
        item.quantity > 0 && 
        (item.basePrice > 0 || item.salePrice > 0 || item.costPrice > 0)
      );

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gold Standard Management - Price Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #D4AF37; margin: 0; font-size: 2.5em; }
            .header p { color: #666; margin: 5px 0; }
            .category { margin-bottom: 30px; }
            .category h2 { color: #228B22; border-bottom: 2px solid #D4AF37; padding-bottom: 5px; }
            .item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .item-name { font-weight: bold; color: #333; font-size: 1.1em; }
            .item-details { margin: 5px 0; color: #666; }
            .price { color: #D4AF37; font-weight: bold; font-size: 1.2em; }
            .quantity { color: #228B22; font-weight: bold; }
            .links { margin-top: 10px; }
            .btn { display: inline-block; padding: 8px 16px; margin: 2px; text-decoration: none; border-radius: 4px; font-size: 0.9em; }
            .btn-coa { background: #4CAF50; color: white; }
            .btn-order { background: #D4AF37; color: white; }
            .btn-media { background: #2196F3; color: white; }
            @media print { body { background: white; } .btn { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gold Standard Management</h1>
            <p>Premium Cannabis Products Price Sheet</p>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="category">
            <h2>Available Flower Products (${availableItems.length} items)</h2>
            ${availableItems.map(item => {
              const price = item.salePrice || item.basePrice || item.costPrice || 0;
              const strain = item.name.toLowerCase().replace(/\s+/g, '-');
              return `
                <div class="item">
                  <div class="item-name">${item.name}</div>
                  <div class="item-details">
                    SKU: ${item.sku || 'N/A'} | 
                    Brand: ${item.brand || 'Gold Standard'} | 
                    Category: ${item.category || 'Bulk Flower'}
                  </div>
                  <div class="price">$${price.toFixed(2)}</div>
                  <div class="quantity">In Stock: ${item.quantity || 0} units</div>
                  <div class="links">
                    <a href="https://gold-standard-cbd.com/coa/${strain}" class="btn btn-coa" target="_blank">View COA</a>
                    <a href="https://gold-standard-cbd.myshopify.com/search?q=${encodeURIComponent(item.name)}" class="btn btn-order" target="_blank">Order Now</a>
                    <a href="https://gold-standard-cbd.com/media/download/${item.sku || item.id}" class="btn btn-media" target="_blank">Download Media</a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="text-align: center; margin-top: 40px; color: #666; font-size: 0.9em;">
            <p>Contact: jon@goldcbd.com | 541-291-2404</p>
            <p>Gold Standard Management - Professional Cannabis Inventory System</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error generating price sheet:', error);
      res.status(500).json({ error: 'Failed to generate price sheet' });
    }
  });

  // Get all items with enhanced filtering
  app.get('/api/items', async (req: Request, res: Response) => {
    try {
      const allItems = await storage.getItems();
      console.log('Raw items from storage:', allItems.length);
      const authenticItems = filterAuthenticItems(allItems);
      console.log('Authentic items after filtering:', authenticItems.length);
      const sortedItems = sortItemsByPriority(authenticItems);
      
      res.json(sortedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  // Enhanced inventory endpoint with authentic item prioritization
  app.get('/api/inventory/enhanced', async (req: Request, res: Response) => {
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
  app.get('/api/items/:id', async (req, res) => {
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