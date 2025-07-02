import { shopifyService } from './shopify.js';
import { storage } from '../storage.js';
import { logger } from '../utils/logger.js';

export class ShopifyDataCorrector {
  
  /**
   * Fix inventory items by pulling authentic data from Shopify API
   */
  async correctInventoryData(): Promise<void> {
    try {
      logger.info('Starting Shopify data correction process');
      
      // Get all items with Shopify variant IDs but generic names
      const items = await storage.getItems();
      const itemsToCorrect = items.filter((item: any) => 
        item.shopify_variant_id && 
        (item.name === '1 GRAM' || 
         item.name === '14 grams' || 
         item.name === '28 grams' ||
         item.name.match(/^\d+\s*(gram|grams)$/i))
      );

      logger.info(`Found ${itemsToCorrect.length} items that need correction`);

      // Get products from Shopify GraphQL
      const shopifyProducts = await shopifyService.getProductsWithInventory();
      
      for (const item of itemsToCorrect) {
        try {
          // Find matching Shopify product by variant ID
          const shopifyProduct = this.findProductByVariantId(shopifyProducts, item.shopify_variant_id);
          
          if (shopifyProduct) {
            const variant = shopifyProduct.variants.edges.find((v: any) => 
              v.node.id === `gid://shopify/ProductVariant/${item.shopify_variant_id}`
            );
            
            if (variant) {
              const correctedData = {
                name: shopifyProduct.title,
                description: shopifyProduct.description || '',
                base_price: parseFloat(variant.node.price) || 0,
                weight: variant.node.title || item.weight,
                image_url: shopifyProduct.featuredImage?.url || item.image_url
              };

              // Update the item with authentic Shopify data
              await storage.updateItem(item.id, correctedData);
              
              logger.info(`Corrected item ${item.id}: "${item.name}" → "${correctedData.name}"`);
            }
          } else {
            logger.warn(`No Shopify product found for variant ID: ${item.shopify_variant_id}`);
          }
        } catch (error) {
          logger.error(`Failed to correct item ${item.id}: ${error}`);
        }
      }
      
      logger.info('Shopify data correction completed');
    } catch (error) {
      logger.error(`Shopify data correction failed: ${error}`);
      throw error;
    }
  }

  /**
   * Find product by variant ID in Shopify data
   */
  private findProductByVariantId(products: any[], variantId: string): any {
    for (const product of products) {
      const matchingVariant = product.variants.edges.find((v: any) => 
        v.node.id === `gid://shopify/ProductVariant/${variantId}` ||
        v.node.id.endsWith(variantId)
      );
      
      if (matchingVariant) {
        return product;
      }
    }
    return null;
  }

  /**
   * Fix pricing for specific weight categories
   */
  async fixPricingByWeight(): Promise<void> {
    logger.info('Fixing pricing by weight categories');
    
    const corrections = [
      {
        pattern: /^(1|one)\s*(gram|grams?|g)$/i,
        maxPrice: 25,
        defaultPrice: { base: 15, sale: 12, cost: 8 }
      },
      {
        pattern: /^(14|fourteen)\s*(gram|grams?|g)$/i, 
        maxPrice: 200,
        defaultPrice: { base: 120, sale: 100, cost: 80 }
      },
      {
        pattern: /^(28|twenty.eight)\s*(gram|grams?|g)$/i,
        maxPrice: 400, 
        defaultPrice: { base: 250, sale: 220, cost: 180 }
      },
      {
        pattern: /pre.?roll/i,
        maxPrice: 30,
        defaultPrice: { base: 18, sale: 15, cost: 10 }
      }
    ];

    for (const correction of corrections) {
      const items = await storage.getItems();
      const itemsToFix = items.filter((item: any) => 
        (item.weight && correction.pattern.test(item.weight)) ||
        (item.name && correction.pattern.test(item.name))
      );

      for (const item of itemsToFix) {
        if (item.base_price > correction.maxPrice || 
            item.sale_price > correction.maxPrice || 
            item.cost_price > correction.maxPrice) {
          
          await storage.updateItem(item.id, {
            base_price: correction.defaultPrice.base,
            sale_price: correction.defaultPrice.sale, 
            cost_price: correction.defaultPrice.cost
          });
          
          logger.info(`Fixed pricing for ${item.name}: $${item.base_price} → $${correction.defaultPrice.base}`);
        }
      }
    }
  }
}

export const shopifyDataCorrector = new ShopifyDataCorrector();