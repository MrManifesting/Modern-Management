import express from 'express';
import { MinimalStorage } from './storage-minimal.js';
import inventoryActivationRoutes from './routes-inventory-activation.js';

const router = express.Router();
const storage = new MinimalStorage();

// Essential item routes
router.get('/api/items', async (req, res) => {
  try {
    const items = await storage.getItems();
    res.json(items);
  } catch (error) {
    console.error('Error in /api/items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.get('/api/items/:id', async (req, res) => {
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

router.post('/api/items', async (req, res) => {
  try {
    const item = await storage.createItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error in POST /api/items:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.put('/api/items/:id', async (req, res) => {
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

router.delete('/api/items/:id', async (req, res) => {
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

// Stats endpoint
router.get('/api/stats', async (req, res) => {
  try {
    const stats = await storage.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Price sheet generation
router.get('/api/generate-price-sheet', async (req, res) => {
  try {
    const items = await storage.getItems();
    const activeItems = items.filter(item => 
      (item.quantity || 0) > 0 && 
      ((item.base_price || 0) > 0 || (item.sale_price || 0) > 0)
    );

    let catalogHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gold Standard Management - Price Sheet</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; color: #D4AF37; margin-bottom: 30px; }
            .item { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
            .item-name { font-weight: bold; color: #333; }
            .item-price { color: #D4AF37; font-size: 1.2em; }
            .item-quantity { color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Gold Standard Management</h1>
            <h2>Live Inventory Price Sheet</h2>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
    `;

    activeItems.forEach(item => {
      const price = item.sale_price || item.base_price || 0;
      catalogHtml += `
        <div class="item">
            <div class="item-name">${item.name || 'Unnamed Item'}</div>
            <div class="item-price">$${price.toFixed(2)}</div>
            <div class="item-quantity">Available: ${item.quantity || 0} units</div>
            ${item.description ? `<p>${item.description}</p>` : ''}
        </div>
      `;
    });

    catalogHtml += `
        <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>Total Active Items: ${activeItems.length}</p>
        </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(catalogHtml);
  } catch (error) {
    console.error('Error generating price sheet:', error);
    res.status(500).json({ error: 'Failed to generate price sheet' });
  }
});

// Health check
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User auth stub
router.get('/api/user', (req, res) => {
  res.status(401).json({ message: 'Not authenticated' });
});

// Shopify reports stub
router.get('/api/shopify/reports/sales/:period', async (req, res) => {
  try {
    const sales = await storage.getSales();
    const totalRevenue = sales.reduce((sum, sale) => {
      const total = parseFloat(sale.total?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    res.json({
      success: true,
      data: {
        period: req.params.period,
        totalSales: sales.length,
        totalRevenue,
        orders: sales.slice(0, 10) // Recent orders
      }
    });
  } catch (error) {
    console.error('Error in shopify reports:', error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

// Register inventory activation routes
router.use('/', inventoryActivationRoutes);

export default router;