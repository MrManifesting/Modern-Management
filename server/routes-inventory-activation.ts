import express from 'express';
import { MinimalStorage } from './storage-minimal.js';

const router = express.Router();
const storage = new MinimalStorage();

// Inventory activation and management routes
router.get('/api/inventory/activation-candidates', async (req, res) => {
  try {
    const items = await storage.getItems();
    
    // Find items that could potentially be activated
    const candidates = items.filter(item => {
      const hasPrice = (item.base_price || 0) > 0 || (item.sale_price || 0) > 0 || (item.cost_price || 0) > 0;
      const isFlower = item.category?.toLowerCase().includes('flower') || 
                       item.name?.toLowerCase().includes('flower') ||
                       item.name?.toLowerCase().includes('thca');
      const isDraft = item.status === 'draft';
      
      return isDraft && hasPrice && isFlower;
    });

    // Sort by potential value (highest price first)
    candidates.sort((a, b) => {
      const aPrice = Math.max(a.base_price || 0, a.sale_price || 0, a.cost_price || 0);
      const bPrice = Math.max(b.base_price || 0, b.sale_price || 0, b.cost_price || 0);
      return bPrice - aPrice;
    });

    res.json({
      success: true,
      candidates: candidates.slice(0, 50), // Top 50 candidates
      total: candidates.length
    });
  } catch (error) {
    console.error('Error fetching activation candidates:', error);
    res.status(500).json({ error: 'Failed to fetch activation candidates' });
  }
});

// Bulk activate items with quantities
router.post('/api/inventory/bulk-activate', async (req, res) => {
  try {
    const { itemIds, defaultQuantity = 1 } = req.body;
    
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs array is required' });
    }

    let activatedCount = 0;
    const errors = [];

    for (const itemId of itemIds) {
      try {
        const item = await storage.getItem(itemId);
        if (!item) {
          errors.push(`Item ${itemId} not found`);
          continue;
        }

        // Activate item with quantity if it has pricing
        const hasPrice = (item.base_price || 0) > 0 || (item.sale_price || 0) > 0 || (item.cost_price || 0) > 0;
        if (hasPrice && item.status === 'draft') {
          await storage.updateItem(itemId, {
            status: 'available',
            quantity: item.quantity || defaultQuantity
          });
          activatedCount++;
        }
      } catch (error) {
        errors.push(`Failed to activate item ${itemId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      activated: activatedCount,
      errors: errors,
      message: `Activated ${activatedCount} items${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error in bulk activation:', error);
    res.status(500).json({ error: 'Failed to bulk activate items' });
  }
});

// Set quantities for multiple items
router.post('/api/inventory/bulk-set-quantities', async (req, res) => {
  try {
    const { updates } = req.body; // Array of {itemId, quantity}
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    let updatedCount = 0;
    const errors = [];

    for (const update of updates) {
      try {
        const { itemId, quantity } = update;
        const item = await storage.getItem(itemId);
        
        if (!item) {
          errors.push(`Item ${itemId} not found`);
          continue;
        }

        await storage.updateItem(itemId, {
          quantity: Math.max(0, parseInt(quantity) || 0),
          status: quantity > 0 ? 'available' : 'draft'
        });
        updatedCount++;
      } catch (error) {
        errors.push(`Failed to update item ${update.itemId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      updated: updatedCount,
      errors: errors,
      message: `Updated ${updatedCount} items${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error in bulk quantity update:', error);
    res.status(500).json({ error: 'Failed to bulk update quantities' });
  }
});

// Get inventory statistics
router.get('/api/inventory/stats', async (req, res) => {
  try {
    const items = await storage.getItems();
    
    const stats = {
      total: items.length,
      available: items.filter(item => item.status === 'available' && (item.quantity || 0) > 0).length,
      draft: items.filter(item => item.status === 'draft').length,
      withPricing: items.filter(item => (item.base_price || 0) > 0 || (item.sale_price || 0) > 0 || (item.cost_price || 0) > 0).length,
      flowers: items.filter(item => 
        item.category?.toLowerCase().includes('flower') || 
        item.name?.toLowerCase().includes('flower') ||
        item.name?.toLowerCase().includes('thca')
      ).length,
      activationCandidates: items.filter(item => {
        const hasPrice = (item.base_price || 0) > 0 || (item.sale_price || 0) > 0 || (item.cost_price || 0) > 0;
        const isFlower = item.category?.toLowerCase().includes('flower') || 
                         item.name?.toLowerCase().includes('flower') ||
                         item.name?.toLowerCase().includes('thca');
        return item.status === 'draft' && hasPrice && isFlower;
      }).length,
      totalValue: items.reduce((sum, item) => {
        if ((item.quantity || 0) > 0) {
          const price = item.base_price || item.sale_price || item.cost_price || 0;
          return sum + (price * (item.quantity || 0));
        }
        return sum;
      }, 0)
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ error: 'Failed to fetch inventory stats' });
  }
});

export default router;