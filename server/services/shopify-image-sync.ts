import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { StorageInterface } from '../storage';
import { log } from '../utils/logger';

interface ShopifyImage {
  id: string;
  src: string;
  alt?: string;
  position?: number;
  width?: number;
  height?: number;
}

interface ShopifyProductWithImages {
  id: string;
  handle: string;
  title: string;
  images: ShopifyImage[];
  variants: Array<{
    id: string;
    sku?: string;
    barcode?: string;
  }>;
}

export class ShopifyImageSyncService {
  private shopify: any;
  private storage: StorageInterface;

  constructor(storage: StorageInterface) {
    this.storage = storage;
    
    const shopifyConfig = {
      shopDomain: process.env.SHOPIFY_STORE_URL || 'gold-standard-cbd.myshopify.com',
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
      apiVersion: LATEST_API_VERSION
    };

    // Initialize Shopify API instance
    const shopifyApp = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY || '',
      apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
      apiVersion: shopifyConfig.apiVersion,
      isEmbeddedApp: false,
      hostName: shopifyConfig.shopDomain
    });

    // Create REST client with session
    this.shopify = new shopifyApp.clients.Rest({
      session: {
        shop: shopifyConfig.shopDomain,
        accessToken: shopifyConfig.accessToken,
        id: 'offline-session',
        state: 'offline',
        isOnline: false
      }
    });
  }

  /**
   * Sync images from Shopify for all products
   */
  async syncAllImages(): Promise<{ updated: number; failed: number; errors: string[] }> {
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      log('Starting full image sync from Shopify', 'shopify-sync');
      
      // Get all products from Shopify with images
      const products = await this.getAllShopifyProducts();
      log(`Found ${products.length} products in Shopify`, 'shopify-sync');

      // Get all local items
      const localItems = await this.storage.getItems();
      log(`Found ${localItems.length} items in local inventory`, 'shopify-sync');

      // Create maps for efficient lookup
      const skuToProduct = new Map<string, ShopifyProductWithImages>();
      const barcodeToProduct = new Map<string, ShopifyProductWithImages>();
      const variantIdToProduct = new Map<string, ShopifyProductWithImages>();

      // Build lookup maps
      for (const product of products) {
        for (const variant of product.variants) {
          if (variant.sku) {
            skuToProduct.set(variant.sku.toUpperCase(), product);
          }
          if (variant.barcode) {
            barcodeToProduct.set(variant.barcode, product);
          }
          variantIdToProduct.set(variant.id, product);
        }
      }

      // Update local items with images
      for (const item of localItems) {
        try {
          let matchedProduct: ShopifyProductWithImages | undefined;
          let matchedVariantId: string | undefined;

          // Try to match by Shopify variant ID first (most accurate)
          if (item.shopifyVariantId || item.shopify_variant_id) {
            const variantId = item.shopifyVariantId || item.shopify_variant_id;
            matchedProduct = variantIdToProduct.get(variantId);
            matchedVariantId = variantId;
          }

          // Try to match by SKU
          if (!matchedProduct && item.sku) {
            matchedProduct = skuToProduct.get(item.sku.toUpperCase());
            if (matchedProduct) {
              // Find the specific variant
              const variant = matchedProduct.variants.find(v => 
                v.sku?.toUpperCase() === item.sku.toUpperCase()
              );
              matchedVariantId = variant?.id;
            }
          }

          // Try to match by barcode
          if (!matchedProduct && item.barcode) {
            matchedProduct = barcodeToProduct.get(item.barcode);
            if (matchedProduct) {
              // Find the specific variant
              const variant = matchedProduct.variants.find(v => 
                v.barcode === item.barcode
              );
              matchedVariantId = variant?.id;
            }
          }

          if (matchedProduct && matchedProduct.images.length > 0) {
            // Update the item with images
            const imageUrls = matchedProduct.images.map(img => img.src);
            const primaryImage = matchedProduct.images[0]?.src;

            const updateData: any = {
              images: imageUrls,
              imageUrl: primaryImage,
              image_url: primaryImage
            };

            // Also update Shopify IDs if we found them
            if (matchedVariantId && (!item.shopifyVariantId && !item.shopify_variant_id)) {
              updateData.shopifyVariantId = matchedVariantId;
              updateData.shopify_variant_id = matchedVariantId;
            }
            
            if (matchedProduct.id && !item.shopifyId) {
              updateData.shopifyId = matchedProduct.id;
              updateData.shopify_id = matchedProduct.id;
            }

            if (matchedProduct.handle && !item.shopifyHandle) {
              updateData.shopifyHandle = matchedProduct.handle;
              updateData.shopify_handle = matchedProduct.handle;
            }

            await this.storage.updateItem(item.id, updateData);
            
            log(`Updated images for item ${item.id} (${item.name}) - ${imageUrls.length} images`, 'shopify-sync');
            results.updated++;
          }
        } catch (error) {
          const errorMsg = `Failed to update images for item ${item.id}: ${error}`;
          log(errorMsg, 'shopify-sync', 'error');
          results.errors.push(errorMsg);
          results.failed++;
        }
      }

    } catch (error) {
      const errorMsg = `Image sync failed: ${error}`;
      log(errorMsg, 'shopify-sync', 'error');
      results.errors.push(errorMsg);
    }

    log(`Image sync completed: ${results.updated} updated, ${results.failed} failed`, 'shopify-sync');
    return results;
  }

  /**
   * Get all products from Shopify with pagination
   */
  private async getAllShopifyProducts(): Promise<ShopifyProductWithImages[]> {
    const allProducts: ShopifyProductWithImages[] = [];
    let nextPageInfo: string | null = null;

    do {
      const params: any = {
        limit: 250,
        fields: 'id,handle,title,images,variants'
      };

      if (nextPageInfo) {
        params.page_info = nextPageInfo;
      }

      try {
        const response = await this.shopify.get({
          path: 'products',
          query: params
        });

        const products = response.body.products || [];
        allProducts.push(...products);

        // Check for next page
        const linkHeader = response.headers['link'];
        nextPageInfo = this.extractNextPageInfo(linkHeader);

      } catch (error) {
        log(`Error fetching products: ${error}`, 'shopify-sync', 'error');
        break;
      }
    } while (nextPageInfo);

    return allProducts;
  }

  /**
   * Extract next page info from Link header
   */
  private extractNextPageInfo(linkHeader: string | undefined): string | null {
    if (!linkHeader) return null;

    const links = linkHeader.split(',');
    for (const link of links) {
      const match = link.match(/<.*page_info=([^&>]+).*>; rel="next"/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Update images for specific items by ID
   */
  async updateImagesForItems(itemIds: number[]): Promise<{ updated: number; failed: number; errors: string[] }> {
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const itemId of itemIds) {
      try {
        const item = await this.storage.getItem(itemId);
        if (!item) {
          results.errors.push(`Item ${itemId} not found`);
          results.failed++;
          continue;
        }

        // Try to find the product in Shopify
        let product: ShopifyProductWithImages | undefined;

        if (item.shopifyId || item.shopify_id) {
          // Get product by ID
          try {
            const response = await this.shopify.get({
              path: `products/${item.shopifyId || item.shopify_id}`,
              query: { fields: 'id,handle,title,images,variants' }
            });
            product = response.body.product;
          } catch (error) {
            log(`Failed to fetch product by ID for item ${itemId}: ${error}`, 'shopify-sync', 'error');
          }
        }

        // If no product found by ID, try by SKU
        if (!product && item.sku) {
          try {
            const response = await this.shopify.get({
              path: 'products',
              query: {
                limit: 10,
                fields: 'id,handle,title,images,variants',
                // Shopify doesn't support direct SKU search, so we'll need to filter after
              }
            });

            const products = response.body.products || [];
            for (const p of products) {
              const variant = p.variants.find((v: any) => 
                v.sku?.toUpperCase() === item.sku.toUpperCase()
              );
              if (variant) {
                product = p;
                break;
              }
            }
          } catch (error) {
            log(`Failed to search for product by SKU for item ${itemId}: ${error}`, 'shopify-sync', 'error');
          }
        }

        if (product && product.images.length > 0) {
          const imageUrls = product.images.map((img: ShopifyImage) => img.src);
          const primaryImage = product.images[0]?.src;

          await this.storage.updateItem(itemId, {
            images: imageUrls,
            imageUrl: primaryImage,
            image_url: primaryImage
          });

          log(`Updated images for item ${itemId} - ${imageUrls.length} images`, 'shopify-sync');
          results.updated++;
        } else {
          results.errors.push(`No images found in Shopify for item ${itemId}`);
          results.failed++;
        }
      } catch (error) {
        const errorMsg = `Failed to update images for item ${itemId}: ${error}`;
        log(errorMsg, 'shopify-sync', 'error');
        results.errors.push(errorMsg);
        results.failed++;
      }
    }

    return results;
  }
}