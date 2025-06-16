/**
 * Shopify Inventory Sync Service
 * Syncs real quantities and images from Shopify store
 */

import { IStorage } from '../storage';
import { Item } from '@shared/schema';

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: Array<{
    id: number;
    sku: string;
    inventory_quantity: number;
    price: string;
  }>;
  images: Array<{
    src: string;
    alt?: string;
  }>;
}

export class ShopifyInventorySync {
  private storage: IStorage;
  private shopifyStore: string;
  private accessToken: string;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.shopifyStore = process.env.SHOPIFY_STORE || '';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  }

  /**
   * Fetch products from Shopify using REST API
   */
  private async fetchShopifyProducts(limit: number = 250): Promise<ShopifyProduct[]> {
    const url = `https://${this.shopifyStore}/admin/api/2023-10/products.json?limit=${limit}&fields=id,title,handle,variants,images`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.products || [];
  }

  /**
   * Sync quantities and images from Shopify to local inventory
   */
  async syncInventoryFromShopify(): Promise<{
    synced: number;
    updated: number;
    errors: string[];
  }> {
    console.log('Starting inventory sync from Shopify...');
    
    const results = {
      synced: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Get all local items
      const localItems = await this.storage.getItems();
      console.log(`Found ${localItems.length} local items`);

      // Fetch all products from Shopify
      let allShopifyProducts: ShopifyProduct[] = [];
      let hasMoreProducts = true;
      let sinceId = 0;

      while (hasMoreProducts) {
        try {
          const url = `https://${this.shopifyStore}/admin/api/2023-10/products.json?limit=250&since_id=${sinceId}&fields=id,title,handle,variants,images`;
          
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': this.accessToken,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`Shopify API error: ${response.status}`);
          }

          const data = await response.json();
          const products = data.products || [];
          
          if (products.length === 0) {
            hasMoreProducts = false;
          } else {
            allShopifyProducts = allShopifyProducts.concat(products);
            sinceId = products[products.length - 1].id;
            console.log(`Fetched ${products.length} products, total: ${allShopifyProducts.length}`);
            
            // Rate limiting - wait 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error('Error fetching Shopify products:', error);
          hasMoreProducts = false;
        }
      }

      console.log(`Total Shopify products fetched: ${allShopifyProducts.length}`);

      // Create lookup maps for efficient matching
      const shopifyByHandle = new Map<string, ShopifyProduct>();
      const shopifyBySku = new Map<string, { product: ShopifyProduct; variant: any }>();

      allShopifyProducts.forEach(product => {
        shopifyByHandle.set(product.handle, product);
        
        product.variants.forEach(variant => {
          if (variant.sku) {
            shopifyBySku.set(variant.sku, { product, variant });
          }
        });
      });

      // Sync each local item with Shopify data
      for (const item of localItems) {
        try {
          let shopifyMatch: { product: ShopifyProduct; variant?: any } | null = null;

          // Try matching by SKU first
          if (item.sku && shopifyBySku.has(item.sku)) {
            shopifyMatch = shopifyBySku.get(item.sku)!;
          }
          
          // If no SKU match, try matching by name/handle
          if (!shopifyMatch && item.name) {
            const handle = this.nameToHandle(item.name);
            const product = shopifyByHandle.get(handle);
            if (product) {
              shopifyMatch = { product, variant: product.variants[0] };
            }
          }

          if (shopifyMatch) {
            const { product, variant } = shopifyMatch;
            const updates: Partial<Item> = {};
            let hasUpdates = false;

            // Update quantity from variant
            if (variant && variant.inventory_quantity !== undefined) {
              const shopifyQuantity = variant.inventory_quantity;
              if (item.quantity !== shopifyQuantity) {
                updates.quantity = shopifyQuantity;
                hasUpdates = true;
              }
            }

            // Update price from variant
            if (variant && variant.price) {
              const shopifyPrice = parseFloat(variant.price);
              const currentPrice = typeof item.basePrice === 'string' ? parseFloat(item.basePrice) : item.basePrice;
              if (currentPrice !== shopifyPrice) {
                updates.basePrice = shopifyPrice.toString();
                hasUpdates = true;
              }
            }

            // Update images from product
            if (product.images && product.images.length > 0) {
              const imageUrls = product.images.map(img => img.src);
              const currentImages = Array.isArray(item.images) ? item.images : [];
              
              if (JSON.stringify(currentImages) !== JSON.stringify(imageUrls)) {
                updates.images = imageUrls;
                hasUpdates = true;
              }
            }

            // Store Shopify ID for future syncing
            if (!item.shopifyId && variant) {
              updates.shopifyId = variant.id.toString();
              hasUpdates = true;
            }

            if (hasUpdates) {
              await this.storage.updateItem(item.id, updates);
              results.updated++;
              console.log(`Updated ${item.name}: quantity=${updates.quantity || item.quantity}, images=${updates.images?.length || 0}`);
            }

            results.synced++;
          }
        } catch (error) {
          const errorMsg = `Failed to sync ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`Sync complete: ${results.synced} items processed, ${results.updated} updated`);
      return results;

    } catch (error) {
      const errorMsg = `Shopify sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg);
      return results;
    }
  }

  /**
   * Convert item name to Shopify handle format
   */
  private nameToHandle(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Sync specific items by ID
   */
  async syncSpecificItems(itemIds: number[]): Promise<{
    synced: number;
    updated: number;
    errors: string[];
  }> {
    console.log(`Syncing specific items: ${itemIds.join(', ')}`);
    
    const results = {
      synced: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Get the specific items
      const items = await Promise.all(
        itemIds.map(id => this.storage.getItem(id))
      );
      
      const validItems = items.filter(item => item !== undefined) as Item[];
      
      if (validItems.length === 0) {
        results.errors.push('No valid items found for the provided IDs');
        return results;
      }

      // Fetch Shopify products for comparison
      const shopifyProducts = await this.fetchShopifyProducts();
      
      // Create lookup map
      const shopifyBySku = new Map<string, { product: ShopifyProduct; variant: any }>();
      shopifyProducts.forEach(product => {
        product.variants.forEach(variant => {
          if (variant.sku) {
            shopifyBySku.set(variant.sku, { product, variant });
          }
        });
      });

      // Sync each item
      for (const item of validItems) {
        try {
          if (item.sku && shopifyBySku.has(item.sku)) {
            const { product, variant } = shopifyBySku.get(item.sku)!;
            const updates: Partial<Item> = {};
            let hasUpdates = false;

            // Update quantity
            if (variant.inventory_quantity !== undefined && item.quantity !== variant.inventory_quantity) {
              updates.quantity = variant.inventory_quantity;
              hasUpdates = true;
            }

            // Update images
            if (product.images?.length > 0) {
              const imageUrls = product.images.map(img => img.src);
              const currentImages = Array.isArray(item.images) ? item.images : [];
              
              if (JSON.stringify(currentImages) !== JSON.stringify(imageUrls)) {
                updates.images = imageUrls;
                hasUpdates = true;
              }
            }

            if (hasUpdates) {
              await this.storage.updateItem(item.id, updates);
              results.updated++;
            }

            results.synced++;
          } else {
            results.errors.push(`No Shopify match found for ${item.name} (SKU: ${item.sku})`);
          }
        } catch (error) {
          results.errors.push(`Failed to sync ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;
    } catch (error) {
      results.errors.push(`Specific item sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return results;
    }
  }
}