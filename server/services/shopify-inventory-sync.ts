/**
 * Shopify Inventory Synchronization Service
 * Ensures local inventory exactly matches Shopify store quantities
 */

import { DatabaseStorage } from '../storage.js';
import { createShopifyClient } from './shopify-auth.js';

export class ShopifyInventorySync {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Sync all inventory quantities to match Shopify exactly
   */
  async syncInventoryFromShopify(): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
    results: Array<{
      sku: string;
      name: string;
      oldQuantity: number;
      newQuantity: number;
      shopifyId: string;
    }>;
  }> {
    const results = {
      success: false,
      updated: 0,
      errors: [] as string[],
      results: [] as Array<{
        sku: string;
        name: string;
        oldQuantity: number;
        newQuantity: number;
        shopifyId: string;
      }>
    };

    try {
      console.log('[shopify-sync] Starting inventory sync from Shopify...');
      
      // Get Shopify client
      const shopify = createShopifyClient();
      if (!shopify) {
        results.errors.push('Failed to create Shopify client');
        return results;
      }

      // Fetch all products from Shopify with inventory data
      console.log('[shopify-sync] Fetching products from Shopify...');
      const shopifyProducts = await shopify.product.list({ limit: 250 });
      
      console.log(`[shopify-sync] Found ${shopifyProducts.length} products in Shopify`);

      // Get all local inventory items
      const localItems = await this.storage.getItems();
      console.log(`[shopify-sync] Found ${localItems.length} local items`);

      // Process each Shopify product
      for (const product of shopifyProducts) {
        try {
          // Skip products without variants
          if (!product.variants || product.variants.length === 0) {
            continue;
          }

          const variant = product.variants[0]; // Use first variant
          const shopifyQuantity = variant.inventory_quantity || 0;
          const shopifySku = variant.sku || '';
          
          if (!shopifySku) {
            console.log(`[shopify-sync] Skipping product ${product.title} - no SKU`);
            continue;
          }

          // Find matching local item by SKU
          const localItem = localItems.find(item => 
            item.sku === shopifySku || 
            item.name?.toLowerCase().includes(product.title.toLowerCase())
          );

          if (!localItem) {
            console.log(`[shopify-sync] No local item found for SKU: ${shopifySku}`);
            continue;
          }

          const currentQuantity = localItem.quantity || 0;

          // Update if quantities don't match
          if (currentQuantity !== shopifyQuantity) {
            console.log(`[shopify-sync] Updating ${localItem.name}: ${currentQuantity} → ${shopifyQuantity}`);
            
            // Update local inventory to match Shopify
            await this.storage.updateItem(localItem.id, {
              quantity: shopifyQuantity,
              shopifyId: product.id.toString()
            });

            // Log the inventory action
            await this.storage.createInventoryAction({
              itemId: localItem.id,
              type: 'sync',
              quantity: shopifyQuantity - currentQuantity,
              reason: `Synced from Shopify (${currentQuantity} → ${shopifyQuantity})`,
              previousQuantity: currentQuantity,
              newQuantity: shopifyQuantity
            });

            results.results.push({
              sku: shopifySku,
              name: localItem.name || 'Unknown',
              oldQuantity: currentQuantity,
              newQuantity: shopifyQuantity,
              shopifyId: product.id.toString()
            });

            results.updated++;
          }

        } catch (error) {
          const errorMsg = `Failed to process product ${product.title}: ${error}`;
          console.error(`[shopify-sync] ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      results.success = true;
      console.log(`[shopify-sync] Sync completed: ${results.updated} items updated`);

    } catch (error) {
      const errorMsg = `Inventory sync failed: ${error}`;
      console.error(`[shopify-sync] ${errorMsg}`);
      results.errors.push(errorMsg);
    }

    return results;
  }

  /**
   * Sync a specific item's quantity from Shopify
   */
  async syncItemFromShopify(itemId: number): Promise<{
    success: boolean;
    oldQuantity: number;
    newQuantity: number;
    message: string;
  }> {
    try {
      const item = await this.storage.getItem(itemId);
      if (!item) {
        return {
          success: false,
          oldQuantity: 0,
          newQuantity: 0,
          message: 'Item not found'
        };
      }

      if (!item.shopifyId) {
        return {
          success: false,
          oldQuantity: item.quantity || 0,
          newQuantity: item.quantity || 0,
          message: 'Item not linked to Shopify'
        };
      }

      const shopify = createShopifyClient();
      if (!shopify) {
        return {
          success: false,
          oldQuantity: item.quantity || 0,
          newQuantity: item.quantity || 0,
          message: 'Failed to create Shopify client'
        };
      }

      // Get product from Shopify
      const product = await shopify.product.get(parseInt(item.shopifyId));
      const variant = product.variants?.[0];
      
      if (!variant) {
        return {
          success: false,
          oldQuantity: item.quantity || 0,
          newQuantity: item.quantity || 0,
          message: 'No variant found in Shopify'
        };
      }

      const shopifyQuantity = variant.inventory_quantity || 0;
      const currentQuantity = item.quantity || 0;

      if (currentQuantity !== shopifyQuantity) {
        // Update local quantity to match Shopify
        await this.storage.updateItem(itemId, {
          quantity: shopifyQuantity
        });

        // Log the sync action
        await this.storage.createInventoryAction({
          itemId: itemId,
          type: 'sync',
          quantity: shopifyQuantity - currentQuantity,
          reason: `Synced from Shopify (${currentQuantity} → ${shopifyQuantity})`,
          previousQuantity: currentQuantity,
          newQuantity: shopifyQuantity
        });

        return {
          success: true,
          oldQuantity: currentQuantity,
          newQuantity: shopifyQuantity,
          message: `Updated from ${currentQuantity} to ${shopifyQuantity}`
        };
      }

      return {
        success: true,
        oldQuantity: currentQuantity,
        newQuantity: shopifyQuantity,
        message: 'Already in sync'
      };

    } catch (error) {
      return {
        success: false,
        oldQuantity: 0,
        newQuantity: 0,
        message: `Sync failed: ${error}`
      };
    }
  }
}