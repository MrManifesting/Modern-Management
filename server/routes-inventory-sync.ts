/**
 * Direct Inventory Synchronization Routes
 * Ensures local inventory matches Shopify store quantities exactly
 */

import type { Express } from "express";
import { storage } from "./storage.js";

export function registerInventorySyncRoutes(app: Express) {
  
  // Sync all inventory quantities from Shopify
  app.post('/api/inventory/sync-from-shopify', async (req, res) => {
    try {
      console.log('[inventory-sync] Starting full Shopify inventory sync...');
      
      const storeUrl = process.env.SHOPIFY_STORE;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!storeUrl || !accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Shopify credentials not configured',
          updated: 0
        });
      }

      // Fetch all products from Shopify
      const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          error: `Shopify API error: ${response.status}`,
          updated: 0
        });
      }

      const data = await response.json();
      const shopifyProducts = data.products || [];
      
      console.log(`[inventory-sync] Found ${shopifyProducts.length} products in Shopify`);

      // Get all local inventory items
      const localItems = await storage.getItems();
      console.log(`[inventory-sync] Found ${localItems.length} local items`);

      let updateCount = 0;
      const results = [];
      const errors = [];

      // Process each Shopify product
      for (const product of shopifyProducts) {
        try {
          if (!product.variants || product.variants.length === 0) continue;

          const variant = product.variants[0];
          const shopifyQuantity = variant.inventory_quantity || 0;
          const shopifySku = variant.sku || '';
          
          if (!shopifySku) continue;

          // Find matching local item by SKU or product name
          const localItem = localItems.find(item => 
            item.sku === shopifySku || 
            item.name?.toLowerCase().includes(product.title.toLowerCase()) ||
            product.title.toLowerCase().includes(item.name?.toLowerCase() || '')
          );

          if (!localItem) continue;

          const currentQuantity = localItem.quantity || 0;

          // Update if quantities don't match
          if (currentQuantity !== shopifyQuantity) {
            console.log(`[inventory-sync] Updating ${localItem.name}: ${currentQuantity} → ${shopifyQuantity}`);
            
            // Update local inventory to match Shopify
            await storage.updateItem(localItem.id, {
              quantity: shopifyQuantity,
              shopifyId: product.id.toString()
            });

            // Log the inventory action
            await storage.createInventoryAction({
              itemId: localItem.id,
              type: 'sync',
              quantity: shopifyQuantity - currentQuantity,
              reason: `Synced from Shopify (${currentQuantity} → ${shopifyQuantity})`,
              previousQuantity: currentQuantity,
              newQuantity: shopifyQuantity
            });

            results.push({
              sku: shopifySku,
              name: localItem.name || 'Unknown',
              oldQuantity: currentQuantity,
              newQuantity: shopifyQuantity,
              shopifyId: product.id.toString()
            });

            updateCount++;
          }

        } catch (error) {
          const errorMsg = `Failed to process product ${product.title}: ${error}`;
          console.error(`[inventory-sync] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`[inventory-sync] Sync completed: ${updateCount} items updated`);

      res.json({
        success: true,
        updated: updateCount,
        results: results,
        errors: errors,
        message: `Successfully synced ${updateCount} items from Shopify`
      });

    } catch (error) {
      console.error('[inventory-sync] Sync failed:', error);
      res.status(500).json({
        success: false,
        error: `Inventory sync failed: ${error}`,
        updated: 0
      });
    }
  });

  // Sync specific item from Shopify by item ID
  app.post('/api/inventory/:id/sync-from-shopify', async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      if (!item.shopifyId) {
        return res.status(400).json({
          success: false,
          message: 'Item not linked to Shopify'
        });
      }

      const storeUrl = process.env.SHOPIFY_STORE;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!storeUrl || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Shopify credentials not configured'
        });
      }

      // Get product from Shopify
      const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products/${item.shopifyId}.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          message: `Shopify API error: ${response.status}`
        });
      }

      const data = await response.json();
      const product = data.product;
      const variant = product.variants?.[0];
      
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'No variant found in Shopify'
        });
      }

      const shopifyQuantity = variant.inventory_quantity || 0;
      const currentQuantity = item.quantity || 0;

      if (currentQuantity !== shopifyQuantity) {
        // Update local quantity to match Shopify
        await storage.updateItem(itemId, {
          quantity: shopifyQuantity
        });

        // Log the sync action
        await storage.createInventoryAction({
          itemId: itemId,
          type: 'sync',
          quantity: shopifyQuantity - currentQuantity,
          reason: `Synced from Shopify (${currentQuantity} → ${shopifyQuantity})`,
          previousQuantity: currentQuantity,
          newQuantity: shopifyQuantity
        });

        res.json({
          success: true,
          oldQuantity: currentQuantity,
          newQuantity: shopifyQuantity,
          message: `Updated from ${currentQuantity} to ${shopifyQuantity}`
        });
      } else {
        res.json({
          success: true,
          oldQuantity: currentQuantity,
          newQuantity: shopifyQuantity,
          message: 'Already in sync'
        });
      }

    } catch (error) {
      console.error('[inventory-sync] Item sync failed:', error);
      res.status(500).json({
        success: false,
        message: `Sync failed: ${error}`
      });
    }
  });

  // Get sync status and statistics
  app.get('/api/inventory/sync-status', async (req, res) => {
    try {
      const items = await storage.getItems();
      const linkedItems = items.filter(item => item.shopifyId);
      const unlinkedItems = items.filter(item => !item.shopifyId);
      
      res.json({
        totalItems: items.length,
        linkedToShopify: linkedItems.length,
        notLinkedToShopify: unlinkedItems.length,
        syncPercentage: Math.round((linkedItems.length / items.length) * 100),
        lastSyncTime: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sync status' });
    }
  });
}