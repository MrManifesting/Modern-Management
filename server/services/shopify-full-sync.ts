/**
 * Full Shopify Inventory Sync Service
 * Syncs all products with real quantities and images using REST API
 */

import { IStorage } from '../storage';

export class ShopifyFullSync {
  private storage: IStorage;
  private shopifyStore: string;
  private accessToken: string;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.shopifyStore = process.env.SHOPIFY_STORE || '';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  }

  /**
   * Fetch all products from Shopify with pagination
   */
  private async fetchAllShopifyProducts(): Promise<any[]> {
    const allProducts: any[] = [];
    let hasMore = true;
    let sinceId = 0;

    while (hasMore) {
      try {
        const url = `https://${this.shopifyStore}/admin/api/2023-10/products.json?limit=250&since_id=${sinceId}&fields=id,title,handle,variants,images`;
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`Shopify API error: ${response.status} ${response.statusText}`);
          break;
        }

        const data = await response.json();
        const products = data.products || [];
        
        if (products.length === 0) {
          hasMore = false;
        } else {
          allProducts.push(...products);
          sinceId = products[products.length - 1].id;
          console.log(`Fetched ${products.length} products, total: ${allProducts.length}`);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Error fetching Shopify products:', error);
        hasMore = false;
      }
    }

    return allProducts;
  }

  /**
   * Sync all inventory items with Shopify data
   */
  async syncAllInventory(): Promise<{
    totalItems: number;
    totalShopifyProducts: number;
    matched: number;
    updated: number;
    errors: string[];
  }> {
    console.log('Starting full inventory sync from Shopify...');
    
    const results = {
      totalItems: 0,
      totalShopifyProducts: 0,
      matched: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Get all local items
      const localItems = await this.storage.getItems();
      results.totalItems = localItems.length;
      console.log(`Found ${localItems.length} local inventory items`);

      // Fetch all Shopify products
      const shopifyProducts = await this.fetchAllShopifyProducts();
      results.totalShopifyProducts = shopifyProducts.length;
      console.log(`Found ${shopifyProducts.length} Shopify products`);

      // Create lookup maps for efficient matching
      const shopifyByHandle = new Map<string, any>();
      const shopifyBySku = new Map<string, any>();
      const shopifyByTitle = new Map<string, any>();

      shopifyProducts.forEach(product => {
        // Index by handle
        if (product.handle) {
          shopifyByHandle.set(product.handle, product);
        }

        // Index by title (normalized)
        if (product.title) {
          const normalizedTitle = this.normalizeTitle(product.title);
          shopifyByTitle.set(normalizedTitle, product);
        }

        // Index by variant SKUs
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant: any) => {
            if (variant.sku) {
              shopifyBySku.set(variant.sku, { product, variant });
            }
          });
        }
      });

      console.log(`Created lookup maps: ${shopifyByHandle.size} handles, ${shopifyBySku.size} SKUs, ${shopifyByTitle.size} titles`);

      // Process each local item
      for (const item of localItems) {
        try {
          let shopifyMatch: { product: any; variant?: any } | null = null;

          // Try matching by SKU first (most reliable)
          if (item.sku && shopifyBySku.has(item.sku)) {
            shopifyMatch = shopifyBySku.get(item.sku)!;
          }

          // Try matching by normalized title
          if (!shopifyMatch && item.name) {
            const normalizedName = this.normalizeTitle(item.name);
            const product = shopifyByTitle.get(normalizedName);
            if (product && product.variants && product.variants.length > 0) {
              shopifyMatch = { product, variant: product.variants[0] };
            }
          }

          // Try matching by handle (derived from name)
          if (!shopifyMatch && item.name) {
            const handle = this.nameToHandle(item.name);
            const product = shopifyByHandle.get(handle);
            if (product && product.variants && product.variants.length > 0) {
              shopifyMatch = { product, variant: product.variants[0] };
            }
          }

          if (shopifyMatch) {
            results.matched++;
            const { product, variant } = shopifyMatch;
            
            const updates: any = {};
            let hasUpdates = false;

            // Update quantity from variant
            if (variant && typeof variant.inventory_quantity === 'number') {
              const shopifyQuantity = variant.inventory_quantity;
              if (item.quantity !== shopifyQuantity) {
                updates.quantity = shopifyQuantity;
                hasUpdates = true;
              }
            }

            // Update price from variant
            if (variant && variant.price) {
              const shopifyPrice = parseFloat(variant.price);
              const currentPrice = typeof item.basePrice === 'string' ? parseFloat(item.basePrice) : (item.basePrice || 0);
              if (Math.abs(currentPrice - shopifyPrice) > 0.01) {
                updates.basePrice = shopifyPrice.toString();
                hasUpdates = true;
              }
            }

            // Update images from product
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              const imageUrls = product.images.map((img: any) => img.src).filter(Boolean);
              const currentImages = Array.isArray(item.images) ? item.images : [];
              
              if (imageUrls.length > 0 && JSON.stringify(currentImages) !== JSON.stringify(imageUrls)) {
                updates.images = imageUrls;
                hasUpdates = true;
              }
            }

            // Store Shopify ID for future syncing
            if (variant && variant.id && !item.shopifyId) {
              updates.shopifyId = variant.id.toString();
              hasUpdates = true;
            }

            if (hasUpdates) {
              await this.storage.updateItem(item.id, updates);
              results.updated++;
              
              const updateDetails = [];
              if (updates.quantity !== undefined) updateDetails.push(`qty: ${updates.quantity}`);
              if (updates.images) updateDetails.push(`images: ${updates.images.length}`);
              if (updates.basePrice) updateDetails.push(`price: $${updates.basePrice}`);
              
              console.log(`Updated ${item.name}: ${updateDetails.join(', ')}`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to sync ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`Full sync complete: ${results.matched} matched, ${results.updated} updated out of ${results.totalItems} items`);
      return results;

    } catch (error) {
      const errorMsg = `Full sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg);
      return results;
    }
  }

  /**
   * Normalize title for matching
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
      .replace(/^-+|-+$/g, '');
  }
}