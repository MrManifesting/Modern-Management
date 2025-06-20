import express from 'express';
import { MinimalStorage } from './storage-minimal.js';

const storage = new MinimalStorage();

export function registerRoutes(app: express.Application) {
  // Essential item routes
  app.get('/api/items', async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error('Error in /api/items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  app.get('/api/items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Error in /api/items/:id:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  app.post('/api/items', async (req, res) => {
    try {
      const item = await storage.createItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error in POST /api/items:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  app.put('/api/items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateItem(id, req.body);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Error in PUT /api/items/:id:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  app.delete('/api/items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteItem(id);
      if (!success) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error in DELETE /api/items/:id:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // Inventory stats endpoint for activation page
  app.get('/api/inventory/stats', async (req, res) => {
    try {
      const items = await storage.getItems();
      
      const stats = {
        total: items.length,
        available: items.filter(item => item.status === 'available').length,
        draft: items.filter(item => item.status === 'draft').length,
        withPricing: items.filter(item => 
          (item.base_price && item.base_price > 0) || 
          (item.sale_price && item.sale_price > 0) || 
          (item.cost_price && item.cost_price > 0)
        ).length,
        flowers: items.filter(item => 
          item.category?.toLowerCase().includes('flower') || 
          item.name?.toLowerCase().includes('flower')
        ).length,
        activationCandidates: items.filter(item => 
          item.status === 'draft' && 
          item.quantity && item.quantity > 0 &&
          ((item.base_price && item.base_price > 0) || 
           (item.sale_price && item.sale_price > 0) || 
           (item.cost_price && item.cost_price > 0))
        ).length,
        totalValue: items.reduce((sum, item) => {
          const price = item.sale_price || item.base_price || 0;
          const quantity = item.quantity || 0;
          return sum + (price * quantity);
        }, 0)
      };
      
      res.json({ stats });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
  });

  // Activation candidates endpoint
  app.get('/api/inventory/activation-candidates', async (req, res) => {
    try {
      const items = await storage.getItems();
      
      const candidates = items
        .filter(item => 
          item.status === 'draft' && 
          item.quantity && item.quantity > 0 &&
          ((item.base_price && item.base_price > 0) || 
           (item.sale_price && item.sale_price > 0) || 
           (item.cost_price && item.cost_price > 0))
        )
        .map(item => ({
          id: item.id,
          name: item.name || '',
          sku: item.sku || '',
          base_price: item.base_price,
          sale_price: item.sale_price,
          cost_price: item.cost_price,
          category: item.category,
          brand: item.brand,
          status: item.status || 'draft',
          quantity: item.quantity
        }))
        .sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      
      res.json(candidates);
    } catch (error) {
      console.error('Error fetching activation candidates:', error);
      res.status(500).json({ error: 'Failed to fetch activation candidates' });
    }
  });

  // Bulk activation endpoint
  app.post('/api/inventory/activate-items', async (req, res) => {
    try {
      const { itemIds } = req.body;
      
      if (!Array.isArray(itemIds)) {
        return res.status(400).json({ error: 'itemIds must be an array' });
      }
      
      const results = [];
      for (const itemId of itemIds) {
        try {
          const updatedItem = await storage.updateItem(itemId, { status: 'available' });
          if (updatedItem) {
            results.push({ id: itemId, success: true });
          } else {
            results.push({ id: itemId, success: false, error: 'Item not found' });
          }
        } catch (error) {
          results.push({ id: itemId, success: false, error: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      res.json({ 
        success: true, 
        activated: successCount, 
        total: itemIds.length,
        results 
      });
    } catch (error) {
      console.error('Error activating items:', error);
      res.status(500).json({ error: 'Failed to activate items' });
    }
  });

  // Basic stats endpoint
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error in /api/stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Price sheet generation
  app.get('/api/generate-price-sheet', async (req, res) => {
    try {
      const items = await storage.getItems();
      const activeItems = items.filter(item => 
        (item.quantity || 0) > 0 && 
        ((item.base_price || 0) > 0 || (item.sale_price || 0) > 0)
      );

      const catalogHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gold Standard Management - Price Sheet</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; color: #D4AF37; margin-bottom: 30px; }
              .item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
              .price { font-weight: bold; color: #228B22; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Gold Standard Management</h1>
              <h2>Live Price Sheet</h2>
              <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="content">
              ${activeItems.map(item => `
                  <div class="item">
                      <h3>${item.name}</h3>
                      <p>SKU: ${item.sku || 'N/A'}</p>
                      <p>Category: ${item.category || 'N/A'}</p>
                      <p>Brand: ${item.brand || 'N/A'}</p>
                      <p>Quantity: ${item.quantity || 0}</p>
                      <p class="price">Price: $${item.sale_price || item.base_price || 0}</p>
                  </div>
              `).join('')}
          </div>
      </body>
      </html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(catalogHtml);
    } catch (error) {
      console.error('Error generating price sheet:', error);
      res.status(500).json({ error: 'Failed to generate price sheet' });
    }
  });
}