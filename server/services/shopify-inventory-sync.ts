/**
 * Comprehensive Shopify inventory synchronization service
 * Syncs prices, quantities, and product data from live Shopify store
 */

import { IStorage } from '../storage';
import { Item } from '@shared/schema';
import { getShopifyClient } from './shopify-auth';
import { shopifyRateLimiter } from './rate-limiter';

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: ShopifyVariant[];
  images: Array<{ src: string }>;
}

interface ShopifyVariant {
  id: string;
  title: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  inventory_management: string;
  weight: number;
  weight_unit: string;
}

export class ShopifyInventorySync {
  constructor(private storage?: IStorage) {}

  /**
   * Create a Shopify product from an inventory item
   */
  async createProductFromItem(item: Item): Promise<{
    success: boolean;
    message: string;
    productId?: string;
  }> {
    try {
      const shopifyClient = await getShopifyClient();
      if (!shopifyClient || !shopifyClient.shopify) {
        throw new Error('Shopify client not available');
      }

      const { shopify } = shopifyClient;
      
      // Create product data
      const productData = {
        title: item.name,
        body_html: item.description || `High-quality ${item.category} product`,
        vendor: item.brand || 'Gold Standard',
        product_type: item.category || 'Flower',
        status: 'draft' as const,
        variants: [{
          title: 'Default Title',
          sku: item.sku,
          price: item.basePrice || '0.00',
          inventory_quantity: item.quantity || 0,
          inventory_management: 'shopify',
          weight: parseFloat(item.weight?.replace(/[^0-9.]/g, '') || '0'),
          weight_unit: 'g'
        }]
      };

      const product = await shopify.rest.Product.save({
        session: shopify.session,
        ...productData
      });

      return {
        success: true,
        message: `Product created successfully: ${product.title}`,
        productId: product.id?.toString()
      };

    } catch (error) {
      console.error('Error creating Shopify product:', error);
      return {
        success: false,
        message: `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Sync all inventory data from Shopify store
   */
  async syncInventoryFromShopify(): Promise<{
    success: boolean;
    message: string;
    updated: number;
    created: number;
    errors: string[];
  }> {
    try {
      console.log('Starting comprehensive Shopify inventory sync...');
      
      const shopifyClient = await getShopifyClient();
      if (!shopifyClient) {
        throw new Error('Shopify client not available');
      }

      // Fetch all products from Shopify with full details
      const products = await this.fetchAllShopifyProducts(shopifyClient);
      console.log(`Fetched ${products.length} products from Shopify`);

      let updated = 0;
      let created = 0;
      const errors: string[] = [];

      // Get existing items for comparison
      const existingItems = this.storage ? await this.storage.getItems() : [];
      const existingItemsMap = new Map<string, Item>();
      
      // Create maps by SKU and handle for efficient lookup
      existingItems.forEach(item => {
        if (item.sku) existingItemsMap.set(item.sku, item);
        if (item.handle) existingItemsMap.set(item.handle, item);
      });

      // Process each Shopify product
      for (const product of products) {
        try {
          await this.syncSingleProduct(product, existingItemsMap, (type) => {
            if (type === 'updated') updated++;
            else if (type === 'created') created++;
          });
        } catch (error) {
          const errorMsg = `Error syncing product ${product.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: true,
        message: `Sync completed: ${updated} items updated, ${created} items created`,
        updated,
        created,
        errors
      };

    } catch (error) {
      console.error('Shopify inventory sync failed:', error);
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
   * Sync prices and quantities only (faster update)
   */
  async syncPricesAndQuantities(): Promise<{
    success: boolean;
    message: string;
    updated: number;
    errors: string[];
  }> {
    try {
      console.log('Starting price and quantity sync from Shopify...');
      
      const shopifyClient = await getShopifyClient();
      if (!shopifyClient) {
        throw new Error('Shopify client not available');
      }

      const products = await this.fetchAllShopifyProducts(shopifyClient);
      const existingItems = this.storage ? await this.storage.getItems() : [];
      
      let updated = 0;
      const errors: string[] = [];

      for (const item of existingItems) {
        try {
          const matchingProduct = this.findMatchingShopifyProduct(item, products);
          if (matchingProduct) {
            const variant = this.findMatchingVariant(item, matchingProduct);
            if (variant) {
              const hasUpdates = await this.updateItemPricesAndQuantity(item, variant);
              if (hasUpdates) updated++;
            }
          }
        } catch (error) {
          const errorMsg = `Error updating item ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: true,
        message: `Price/quantity sync completed: ${updated} items updated`,
        updated,
        errors
      };

    } catch (error) {
      console.error('Price/quantity sync failed:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Fetch all products from Shopify with rate limiting
   */
  private async fetchAllShopifyProducts(shopifyClient: any): Promise<ShopifyProduct[]> {
    return await shopifyRateLimiter.executeWithBackoff(async () => {
      const { shopify } = shopifyClient;
      const products = await shopify.rest.Product.all({
        session: shopify.session,
        limit: 250
      });
      return products.data;
    });
  }

  /**
   * Find matching Shopify product for an inventory item
   */
  private findMatchingShopifyProduct(item: Item, products: ShopifyProduct[]): ShopifyProduct | null {
    // Try to match by SKU first
    if (item.sku) {
      for (const product of products) {
        for (const variant of product.variants || []) {
          if (variant.sku === item.sku) {
            return product;
          }
        }
      }
    }

    // Try to match by handle or name
    const itemNameLower = item.name?.toLowerCase() || '';
    const itemHandle = item.handle?.toLowerCase() || '';
    
    return products.find(product => 
      product.handle === itemHandle || 
      product.title.toLowerCase().includes(itemNameLower)
    ) || null;
  }

  /**
   * Find matching variant within a product
   */
  private findMatchingVariant(item: Item, product: ShopifyProduct): ShopifyVariant | null {
    if (!item.sku) return product.variants?.[0] || null;
    
    return product.variants?.find(variant => variant.sku === item.sku) || null;
  }

  /**
   * Update item prices and quantities from Shopify variant
   */
  private async updateItemPricesAndQuantity(item: Item, variant: ShopifyVariant): Promise<boolean> {
    if (!this.storage) return false;

    const updateData: Partial<Item> = {};
    let needsUpdate = false;

    // Check price
    const shopifyPrice = parseFloat(variant.price || '0');
    if (item.basePrice !== shopifyPrice) {
      updateData.basePrice = shopifyPrice;
      needsUpdate = true;
    }

    // Check quantity
    const shopifyQuantity = variant.inventory_quantity || 0;
    if (item.quantity !== shopifyQuantity) {
      updateData.quantity = shopifyQuantity;
      needsUpdate = true;
    }

    // Update shopifyId if missing
    if (!item.shopifyId && variant.id) {
      updateData.shopifyId = variant.id.toString();
      needsUpdate = true;
    }

    if (needsUpdate) {
      await this.storage.updateItem(item.id, updateData);
      console.log(`Updated ${item.name}: price=${shopifyPrice}, quantity=${shopifyQuantity}`);
      return true;
    }

    return false;
  }

  /**
   * Sync a single product with rate limiting
   */
  private async syncSingleProduct(
    product: ShopifyProduct, 
    existingItemsMap: Map<string, Item>,
    onUpdate: (type: 'updated' | 'created') => void
  ): Promise<void> {
    if (!this.storage) return;

    await shopifyRateLimiter.executeWithRateLimit(async () => {
      for (const variant of product.variants || []) {
        if (!variant.sku) continue;

        const existingItem = existingItemsMap.get(variant.sku);

        if (existingItem) {
          // Update existing item
          const updateData = {
            name: product.title,
            basePrice: parseFloat(variant.price || '0'),
            quantity: variant.inventory_quantity || 0,
            shopifyId: variant.id?.toString(),
            brand: product.vendor || existingItem.brand,
            category: product.product_type || existingItem.category,
            description: product.body_html || existingItem.description,
            handle: product.handle
          };

          await this.storage!.updateItem(existingItem.id, updateData);
          console.log(`Updated: ${product.title} - ${variant.sku}`);
          onUpdate('updated');
        } else {
          // Create new item
          const newItem = {
            name: product.title,
            sku: variant.sku,
            basePrice: parseFloat(variant.price || '0'),
            quantity: variant.inventory_quantity || 0,
            shopifyId: variant.id?.toString(),
            brand: product.vendor || 'Unknown',
            category: product.product_type || 'Uncategorized',
            description: product.body_html || '',
            weight: `${variant.weight || 0} ${variant.weight_unit || 'g'}`,
            status: 'available',
            active: true,
            handle: product.handle
          };

          await this.storage!.createItem(newItem);
          console.log(`Created: ${product.title} - ${variant.sku}`);
          onUpdate('created');
        }
      }
    });
  }
}