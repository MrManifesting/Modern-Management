/**
 * Force Sync Routes - Debug quantity discrepancies
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage.js";

export function registerForceSyncRoutes(app: Express) {
  
  // Force sync with detailed logging to debug quantity issues
  app.post('/api/inventory/force-sync-debug', async (req: Request, res: Response) => {
    try {
      console.log('[force-sync] Starting detailed force sync to debug quantity issues...');
      
      const storeUrl = process.env.SHOPIFY_STORE;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!storeUrl || !accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Shopify credentials missing'
        });
      }

      // Fetch products directly from Shopify with inventory levels
      const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json?limit=250&fields=id,title,variants`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      const shopifyProducts = data.products || [];
      
      console.log(`[force-sync] Found ${shopifyProducts.length} Shopify products`);

      // Get local items
      const localItems = await storage.getAllItems();
      console.log(`[force-sync] Found ${localItems.length} local items`);

      const updates: Array<{
        itemName: string;
        sku: string;
        appQuantity: number;
        shopifyQuantity: number;
        updated: boolean;
      }> = [];

      let totalUpdated = 0;

      // Process each Shopify product and its variants
      for (const product of shopifyProducts) {
        if (!product.variants || product.variants.length === 0) {
          continue;
        }

        for (const variant of product.variants) {
          const shopifyQty = variant.inventory_quantity || 0;
          const variantSku = variant.sku;

          if (!variantSku) {
            continue;
          }

          // Find matching local item
          const localItem = localItems.find(item => 
            item.sku === variantSku ||
            item.name?.toLowerCase().includes(product.title?.toLowerCase() || '')
          );

          if (localItem) {
            const appQty = parseInt(String(localItem.quantity || 0));
            
            const updateRecord = {
              itemName: localItem.name || 'Unknown',
              sku: variantSku,
              appQuantity: appQty,
              shopifyQuantity: shopifyQty,
              updated: false
            };

            // Check for discrepancy
            if (appQty !== shopifyQty) {
              console.log(`[force-sync] DISCREPANCY FOUND: ${localItem.name}`);
              console.log(`[force-sync] App: ${appQty}, Shopify: ${shopifyQty}`);
              
              // Force update to match Shopify
              await storage.updateItem(localItem.id, {
                quantity: shopifyQty,
                shopifyId: product.id.toString()
              });

              // Log the action
              await storage.createInventoryAction({
                itemId: localItem.id,
                type: 'force-sync',
                quantity: shopifyQty - appQty,
                reason: `Force sync: App had ${appQty}, Shopify has ${shopifyQty}`,
                previousQuantity: appQty,
                newQuantity: shopifyQty
              });

              updateRecord.updated = true;
              totalUpdated++;
            }

            updates.push(updateRecord);
          }
        }
      }

      console.log(`[force-sync] Force sync completed: ${totalUpdated} items updated`);

      return res.json({
        success: true,
        totalUpdated,
        discrepancies: updates.filter(u => u.updated),
        allChecked: updates,
        message: `Found and fixed ${totalUpdated} quantity discrepancies`
      });

    } catch (error) {
      console.error('[force-sync] Error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}