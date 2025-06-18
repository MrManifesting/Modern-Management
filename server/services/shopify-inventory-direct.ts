/**
 * Direct Shopify Inventory Service
 * Bypasses corrupted endpoints and fetches authentic inventory data directly from Shopify API
 */

import { log } from '../utils/logger';

export class ShopifyInventoryDirect {
  private storeUrl: string;
  private accessToken: string;

  constructor() {
    this.storeUrl = process.env.SHOPIFY_STORE || '';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    
    if (!this.storeUrl || !this.accessToken) {
      throw new Error('Shopify credentials not configured for direct inventory access');
    }
  }

  /**
   * Fetch authentic inventory quantities directly from Shopify Admin API
   */
  async getAuthenticInventoryQuantities(): Promise<Map<string, number>> {
    const inventoryMap = new Map<string, number>();
    
    try {
      log(`[shopify-direct] Fetching authentic inventory from ${this.storeUrl}`, 'shopify');
      
      // Get all products with variants from Shopify
      const response = await fetch(`https://${this.storeUrl}/admin/api/2023-10/products.json?limit=250&fields=id,title,handle,variants`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const products = data.products || [];

      log(`[shopify-direct] Retrieved ${products.length} products from Shopify`, 'shopify');

      // Process each product and its variants
      for (const product of products) {
        if (!product.variants || !Array.isArray(product.variants)) {
          continue;
        }

        for (const variant of product.variants) {
          // Get inventory level for this variant
          const inventoryQty = await this.getVariantInventoryQuantity(variant.inventory_item_id);
          
          // Map by SKU and product title for matching
          if (variant.sku) {
            inventoryMap.set(variant.sku.trim(), inventoryQty);
          }
          
          // Also map by product title for fallback matching
          const titleKey = `${product.title}`.trim().toLowerCase();
          if (!inventoryMap.has(titleKey)) {
            inventoryMap.set(titleKey, inventoryQty);
          }
        }
      }

      log(`[shopify-direct] Mapped inventory for ${inventoryMap.size} items`, 'shopify');
      return inventoryMap;

    } catch (error) {
      log(`[shopify-direct] Error fetching authentic inventory: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Get inventory quantity for a specific variant's inventory item
   */
  private async getVariantInventoryQuantity(inventoryItemId: number): Promise<number> {
    try {
      // Get inventory levels for this inventory item
      const response = await fetch(`https://${this.storeUrl}/admin/api/2023-10/inventory_levels.json?inventory_item_ids=${inventoryItemId}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        log(`[shopify-direct] Failed to get inventory for item ${inventoryItemId}: ${response.status}`, 'warning');
        return 0;
      }

      const data = await response.json();
      const inventoryLevels = data.inventory_levels || [];

      // Sum up quantities across all locations
      let totalQuantity = 0;
      for (const level of inventoryLevels) {
        if (level.available !== null && level.available !== undefined) {
          totalQuantity += level.available;
        }
      }

      return totalQuantity;

    } catch (error) {
      log(`[shopify-direct] Error getting inventory for item ${inventoryItemId}: ${error}`, 'warning');
      return 0;
    }
  }

  /**
   * Compare local inventory with authentic Shopify quantities
   */
  async compareInventoryQuantities(localItems: any[]): Promise<{
    matched: number;
    discrepancies: Array<{
      itemId: number;
      name: string;
      sku: string;
      localQty: number;
      shopifyQty: number;
      difference: number;
    }>;
  }> {
    const shopifyInventory = await this.getAuthenticInventoryQuantities();
    const discrepancies = [];
    let matched = 0;

    for (const item of localItems) {
      const localQty = item.quantity || 0;
      let shopifyQty = 0;

      // Try to find Shopify quantity by SKU first
      if (item.sku) {
        shopifyQty = shopifyInventory.get(item.sku.trim()) ?? 0;
      }

      // Fallback to product title matching
      if (shopifyQty === 0 && item.name) {
        const titleKey = item.name.trim().toLowerCase();
        shopifyQty = shopifyInventory.get(titleKey) ?? 0;
      }

      if (localQty === shopifyQty) {
        matched++;
      } else {
        discrepancies.push({
          itemId: item.id,
          name: item.name,
          sku: item.sku || 'No SKU',
          localQty,
          shopifyQty,
          difference: shopifyQty - localQty
        });
      }
    }

    return { matched, discrepancies };
  }

  /**
   * Update local inventory to match authentic Shopify quantities
   */
  async syncInventoryQuantities(storage: any, discrepancies: any[]): Promise<{
    updated: number;
    errors: Array<{ itemId: number; error: string }>;
  }> {
    const results = { updated: 0, errors: [] };

    for (const discrepancy of discrepancies) {
      try {
        // Update local quantity to match Shopify
        await storage.updateItem(discrepancy.itemId, {
          quantity: discrepancy.shopifyQty
        });

        // Log the sync action
        await storage.createInventoryAction({
          itemId: discrepancy.itemId,
          employeeId: 1, // System employee
          actionType: 'direct-sync',
          quantity: discrepancy.difference,
          notes: `Direct sync: Local ${discrepancy.localQty} → Shopify ${discrepancy.shopifyQty}`,
          previousQuantity: discrepancy.localQty
        });

        results.updated++;
        log(`[shopify-direct] Updated ${discrepancy.name} quantity: ${discrepancy.localQty} → ${discrepancy.shopifyQty}`, 'inventory');

      } catch (error) {
        results.errors.push({
          itemId: discrepancy.itemId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        log(`[shopify-direct] Failed to update ${discrepancy.name}: ${error}`, 'error');
      }
    }

    return results;
  }
}