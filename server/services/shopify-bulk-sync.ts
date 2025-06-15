/**
 * Shopify Bulk Sync Service
 * Properly syncs pricing and inventory from Shopify without rate limiting issues
 */

import { IStorage } from '../storage';
import { Item } from '@shared/schema';
import { getShopifyClient } from './shopify-auth';

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  variants: ShopifyVariant[];
}

interface ShopifyVariant {
  id: string;
  sku: string;
  price: string;
  inventory_quantity: number;
}

export class ShopifyBulkSync {
  constructor(private storage: IStorage) {}

  /**
   * Bulk sync from Shopify - fetch all products once and update database
   */
  async syncFromShopify(): Promise<{
    success: boolean;
    message: string;
    updated: number;
    created: number;
    errors: string[];
  }> {
    try {
      console.log('Starting bulk sync from Shopify...');
      
      // Fetch all Shopify products at once
      const shopifyProducts = await this.fetchAllShopifyProducts();
      console.log(`Fetched ${shopifyProducts.length} products from Shopify`);

      // Get current inventory items
      const inventoryItems = await this.storage.getItems();
      console.log(`Found ${inventoryItems.length} items in inventory`);

      let updated = 0;
      let created = 0;
      const errors: string[] = [];

      // Create lookup maps for efficiency
      const skuToInventoryItem = new Map<string, Item>();
      inventoryItems.forEach(item => {
        if (item.sku) skuToInventoryItem.set(item.sku, item);
      });

      // Process each Shopify product
      for (const shopifyProduct of shopifyProducts) {
        for (const variant of shopifyProduct.variants) {
          if (!variant.sku) continue;

          try {
            const existingItem = skuToInventoryItem.get(variant.sku);
            
            if (existingItem) {
              // Update existing item with Shopify data
              const updateData: Partial<Item> = {
                basePrice: parseFloat(variant.price),
                quantity: variant.inventory_quantity,
                shopifyId: variant.id,
                name: shopifyProduct.title,
                brand: shopifyProduct.vendor,
                category: shopifyProduct.product_type
              };

              await this.storage.updateItem(existingItem.id, updateData);
              updated++;
              console.log(`Updated: ${shopifyProduct.title} - $${variant.price} (${variant.inventory_quantity} in stock)`);
            } else {
              // Create new item from Shopify
              const newItem = {
                name: shopifyProduct.title,
                sku: variant.sku,
                basePrice: parseFloat(variant.price),
                quantity: variant.inventory_quantity,
                shopifyId: variant.id,
                brand: shopifyProduct.vendor || 'Unknown',
                category: shopifyProduct.product_type || 'Flower',
                status: 'available',
                active: true,
                weight: '1 ounce',
                description: `Imported from Shopify: ${shopifyProduct.title}`
              };

              await this.storage.createItem(newItem);
              created++;
              console.log(`Created: ${shopifyProduct.title} - $${variant.price}`);
            }
          } catch (error) {
            const errorMsg = `Failed to process ${shopifyProduct.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      const message = `Bulk sync completed: ${updated} items updated, ${created} items created`;
      console.log(message);

      return {
        success: true,
        message,
        updated,
        created,
        errors
      };

    } catch (error) {
      console.error('Bulk sync failed:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated: 0,
        created: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Quick pricing update - only update prices and quantities
   */
  async updatePricingOnly(): Promise<{
    success: boolean;
    message: string;
    updated: number;
    errors: string[];
  }> {
    try {
      console.log('Starting pricing-only sync...');
      
      const shopifyProducts = await this.fetchAllShopifyProducts();
      const inventoryItems = await this.storage.getItems();

      let updated = 0;
      const errors: string[] = [];

      // Create SKU lookup
      const skuToInventoryItem = new Map<string, Item>();
      inventoryItems.forEach(item => {
        if (item.sku) skuToInventoryItem.set(item.sku, item);
      });

      for (const shopifyProduct of shopifyProducts) {
        for (const variant of shopifyProduct.variants) {
          if (!variant.sku) continue;

          const existingItem = skuToInventoryItem.get(variant.sku);
          if (existingItem) {
            const shopifyPrice = parseFloat(variant.price);
            const shopifyQuantity = variant.inventory_quantity;

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
        errors
      };

    } catch (error) {
      console.error('Pricing sync failed:', error);
      return {
        success: false,
        message: `Pricing sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Fetch all products from Shopify efficiently
   */
  private async fetchAllShopifyProducts(): Promise<ShopifyProduct[]> {
    const shopifyClient = await getShopifyClient();
    if (!shopifyClient || !shopifyClient.shopify) {
      throw new Error('Shopify client not available');
    }

    const { shopify } = shopifyClient;
    
    // Use the product list method that works with the existing client
    const products = await shopify.rest.Product.all({
      session: shopify.session,
      limit: 250,
      fields: 'id,handle,title,vendor,product_type,variants'
    });

    return products.data.map((product: any) => ({
      id: product.id.toString(),
      handle: product.handle,
      title: product.title,
      vendor: product.vendor,
      product_type: product.product_type,
      variants: (product.variants || []).map((variant: any) => ({
        id: variant.id.toString(),
        sku: variant.sku,
        price: variant.price,
        inventory_quantity: variant.inventory_quantity || 0
      }))
    }));
  }
}