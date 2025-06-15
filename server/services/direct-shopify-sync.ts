/**
 * Direct Shopify Sync Service
 * Bypasses broken client structure and uses working API endpoints
 */

import { IStorage } from '../storage';
import { Item } from '@shared/schema';

interface DirectSyncResult {
  success: boolean;
  message: string;
  updated: number;
  created: number;
  errors: string[];
}

export class DirectShopifySync {
  constructor(private storage: IStorage) {}

  /**
   * Direct bulk import from Shopify using working endpoints
   */
  async bulkImportFromShopify(): Promise<DirectSyncResult> {
    try {
      console.log('Starting direct bulk import from Shopify...');
      
      // Use the working /api/shopify/products endpoint internally
      const response = await fetch('http://localhost:5000/api/shopify/products');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const shopifyProducts = await response.json();
      console.log(`Fetched ${shopifyProducts.length} products from Shopify`);

      if (!Array.isArray(shopifyProducts) || shopifyProducts.length === 0) {
        return {
          success: false,
          message: 'No products found in Shopify store',
          updated: 0,
          created: 0,
          errors: ['No products available for import']
        };
      }

      // Get current inventory items
      const inventoryItems = await this.storage.getItems();
      console.log(`Found ${inventoryItems.length} items in current inventory`);

      let updated = 0;
      let created = 0;
      const errors: string[] = [];

      // Create lookup map for existing items by SKU
      const skuToItem = new Map<string, Item>();
      inventoryItems.forEach(item => {
        if (item.sku) skuToItem.set(item.sku, item);
      });

      // Process each Shopify product (flattened structure)
      for (const shopifyProduct of shopifyProducts) {
        try {
          // Skip products without SKU or those marked as not in Shopify
          if (!shopifyProduct.sku || !shopifyProduct.inShopify) {
            console.log(`Skipping product without SKU or not in Shopify: ${shopifyProduct.title}`);
            continue;
          }

          const existingItem = skuToItem.get(shopifyProduct.sku);
          
          if (existingItem) {
            // Update existing item with Shopify data
            const updateData: Partial<Item> = {
              basePrice: shopifyProduct.price || 0,
              quantity: shopifyProduct.quantity || 0,
              shopifyId: shopifyProduct.variantId?.toString(),
              name: shopifyProduct.title || existingItem.name,
              weight: shopifyProduct.weight ? `${shopifyProduct.weight} ounce` : existingItem.weight
            };

            await this.storage.updateItem(existingItem.id, updateData);
            updated++;
            console.log(`Updated: ${shopifyProduct.title} - $${shopifyProduct.price} (${shopifyProduct.quantity} in stock)`);
          } else {
            // Create new item from Shopify
            const newItem = {
              name: shopifyProduct.title || 'Imported Product',
              sku: shopifyProduct.sku,
              basePrice: shopifyProduct.price || 0,
              quantity: shopifyProduct.quantity || 0,
              shopifyId: shopifyProduct.variantId?.toString(),
              brand: 'Gold Standard',
              category: 'Flower',
              status: 'available',
              active: true,
              weight: shopifyProduct.weight ? `${shopifyProduct.weight} ounce` : '1 ounce',
              description: `Imported from Shopify: ${shopifyProduct.title}`
            };

            await this.storage.createItem(newItem);
            created++;
            console.log(`Created: ${shopifyProduct.title} - $${shopifyProduct.price}`);
          }
        } catch (error) {
          const errorMsg = `Failed to process ${shopifyProduct.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const message = `Direct import completed: ${updated} items updated, ${created} items created`;
      console.log(message);

      return {
        success: true,
        message,
        updated,
        created,
        errors
      };

    } catch (error) {
      console.error('Direct import failed:', error);
      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated: 0,
        created: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Direct pricing update from Shopify
   */
  async bulkUpdatePricing(): Promise<DirectSyncResult> {
    try {
      console.log('Starting direct pricing update from Shopify...');
      
      const response = await fetch('http://localhost:5000/api/shopify/products');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const shopifyProducts = await response.json();
      const inventoryItems = await this.storage.getItems();

      let updated = 0;
      const errors: string[] = [];

      // Create SKU lookup
      const skuToItem = new Map<string, Item>();
      inventoryItems.forEach(item => {
        if (item.sku) skuToItem.set(item.sku, item);
      });

      for (const shopifyProduct of shopifyProducts) {
        if (!shopifyProduct.variants || !Array.isArray(shopifyProduct.variants)) {
          continue;
        }

        for (const variant of shopifyProduct.variants) {
          if (!variant.sku) continue;

          const existingItem = skuToItem.get(variant.sku);
          if (existingItem) {
            const shopifyPrice = parseFloat(variant.price) || 0;
            const shopifyQuantity = variant.inventory_quantity || 0;

            // Only update if price or quantity changed
            if (existingItem.basePrice !== shopifyPrice || existingItem.quantity !== shopifyQuantity) {
              await this.storage.updateItem(existingItem.id, {
                basePrice: shopifyPrice,
                quantity: shopifyQuantity
              });
              updated++;
              console.log(`Updated pricing: ${existingItem.name} - $${shopifyPrice} (${shopifyQuantity} in stock)`);
            }
          }
        }
      }

      return {
        success: true,
        message: `Pricing update completed: ${updated} items updated`,
        updated,
        created: 0,
        errors
      };

    } catch (error) {
      console.error('Pricing update failed:', error);
      return {
        success: false,
        message: `Pricing update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated: 0,
        created: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}