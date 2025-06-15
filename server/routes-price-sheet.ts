import express from 'express';
import { storage } from './storage';
import { insertPriceSheetSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Get all price sheets
router.get('/price-sheets', async (req, res) => {
  try {
    const priceSheets = await storage.getPriceSheets();
    res.json(priceSheets);
  } catch (error) {
    console.error('Error fetching price sheets:', error);
    res.status(500).json({ error: 'Failed to fetch price sheets' });
  }
});

// Get price sheet by ID
router.get('/price-sheets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid price sheet ID' });
    }

    const priceSheet = await storage.getPriceSheet(id);
    if (!priceSheet) {
      return res.status(404).json({ error: 'Price sheet not found' });
    }

    res.json(priceSheet);
  } catch (error) {
    console.error('Error fetching price sheet:', error);
    res.status(500).json({ error: 'Failed to fetch price sheet' });
  }
});

// Get price sheet by item ID
router.get('/price-sheets/item/:itemId', async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const priceSheet = await storage.getPriceSheetByItemId(itemId);
    if (!priceSheet) {
      return res.status(404).json({ error: 'Price sheet not found for item' });
    }

    res.json(priceSheet);
  } catch (error) {
    console.error('Error fetching price sheet by item ID:', error);
    res.status(500).json({ error: 'Failed to fetch price sheet' });
  }
});

// Get price sheet by SKU
router.get('/price-sheets/sku/:sku', async (req, res) => {
  try {
    const sku = req.params.sku;
    const priceSheet = await storage.getPriceSheetBySku(sku);
    
    if (!priceSheet) {
      return res.status(404).json({ error: 'Price sheet not found for SKU' });
    }

    res.json(priceSheet);
  } catch (error) {
    console.error('Error fetching price sheet by SKU:', error);
    res.status(500).json({ error: 'Failed to fetch price sheet' });
  }
});

// Create new price sheet
router.post('/price-sheets', async (req, res) => {
  try {
    const validatedData = insertPriceSheetSchema.parse(req.body);
    const priceSheet = await storage.createPriceSheet(validatedData);
    res.status(201).json(priceSheet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid price sheet data', details: error.errors });
    }
    console.error('Error creating price sheet:', error);
    res.status(500).json({ error: 'Failed to create price sheet' });
  }
});

// Update price sheet
router.put('/price-sheets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid price sheet ID' });
    }

    const validatedData = insertPriceSheetSchema.partial().parse(req.body);
    const updatedPriceSheet = await storage.updatePriceSheet(id, validatedData);
    
    if (!updatedPriceSheet) {
      return res.status(404).json({ error: 'Price sheet not found' });
    }

    res.json(updatedPriceSheet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid price sheet data', details: error.errors });
    }
    console.error('Error updating price sheet:', error);
    res.status(500).json({ error: 'Failed to update price sheet' });
  }
});

// Delete price sheet
router.delete('/price-sheets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid price sheet ID' });
    }

    const deleted = await storage.deletePriceSheet(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Price sheet not found' });
    }

    res.json({ success: true, message: 'Price sheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting price sheet:', error);
    res.status(500).json({ error: 'Failed to delete price sheet' });
  }
});

// Sync price sheet from Shopify data
router.post('/price-sheets/sync-shopify/:itemId', async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const shopifyData = req.body;
    if (!shopifyData) {
      return res.status(400).json({ error: 'Shopify data is required' });
    }

    const priceSheet = await storage.syncPriceSheetFromShopify(itemId, shopifyData);
    res.json(priceSheet);
  } catch (error) {
    console.error('Error syncing price sheet from Shopify:', error);
    res.status(500).json({ error: 'Failed to sync price sheet from Shopify' });
  }
});

// Update stock levels
router.post('/price-sheets/:id/update-stock', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid price sheet ID' });
    }

    const { quantityChange, transactionType } = req.body;
    if (typeof quantityChange !== 'number' || !transactionType) {
      return res.status(400).json({ error: 'quantityChange (number) and transactionType (string) are required' });
    }

    const updatedPriceSheet = await storage.updateStockLevels(id, quantityChange, transactionType);
    if (!updatedPriceSheet) {
      return res.status(404).json({ error: 'Price sheet not found' });
    }

    res.json(updatedPriceSheet);
  } catch (error) {
    console.error('Error updating stock levels:', error);
    res.status(500).json({ error: 'Failed to update stock levels' });
  }
});

// Bulk sync all items with Shopify pricing
router.post('/price-sheets/bulk-sync-shopify', async (req, res) => {
  try {
    const { shopifyProducts } = req.body;
    if (!Array.isArray(shopifyProducts)) {
      return res.status(400).json({ error: 'shopifyProducts array is required' });
    }

    const results = [];
    for (const product of shopifyProducts) {
      try {
        // Find matching item by SKU or handle
        const items = await storage.getItems();
        const matchingItem = items.find(item => 
          item.sku === product.variants?.[0]?.sku || 
          item.name.toLowerCase().includes(product.title?.toLowerCase() || '')
        );

        if (matchingItem) {
          const priceSheet = await storage.syncPriceSheetFromShopify(matchingItem.id, product);
          results.push({
            itemId: matchingItem.id,
            itemName: matchingItem.name,
            priceSheetId: priceSheet.id,
            status: 'synced',
            shopifyProductId: product.id
          });
        } else {
          results.push({
            shopifyProductId: product.id,
            shopifyTitle: product.title,
            status: 'no_match',
            message: 'No matching inventory item found'
          });
        }
      } catch (error) {
        results.push({
          shopifyProductId: product.id,
          shopifyTitle: product.title,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      syncedCount: results.filter(r => r.status === 'synced').length,
      totalProcessed: results.length,
      results
    });
  } catch (error) {
    console.error('Error bulk syncing price sheets:', error);
    res.status(500).json({ error: 'Failed to bulk sync price sheets' });
  }
});

// Get order transactions
router.get('/order-transactions', async (req, res) => {
  try {
    const filters = {
      priceSheetId: req.query.priceSheetId ? parseInt(req.query.priceSheetId as string) : undefined,
      itemId: req.query.itemId ? parseInt(req.query.itemId as string) : undefined,
      transactionType: req.query.transactionType as string
    };

    const transactions = await storage.getOrderTransactions(filters);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching order transactions:', error);
    res.status(500).json({ error: 'Failed to fetch order transactions' });
  }
});

// Get transactions by item
router.get('/order-transactions/item/:itemId', async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const transactions = await storage.getTransactionsByItem(itemId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions by item:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;