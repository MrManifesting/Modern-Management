/**
 * Shopify Inventory Fix Service
 * Enables inventory tracking and updates quantities for all products
 */

export class ShopifyInventoryFix {
  private storeUrl: string;
  private accessToken: string;

  constructor() {
    this.storeUrl = process.env.SHOPIFY_STORE || '';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  }

  async enableInventoryTracking() {
    try {
      console.log('[shopify-fix] Fetching all products to enable inventory tracking...');
      
      // Get all products
      const response = await fetch(`https://${this.storeUrl}/admin/api/2023-10/products.json?limit=250`, {
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
      
      console.log(`[shopify-fix] Found ${products.length} products to fix`);

      let fixedCount = 0;
      const results = [];

      for (const product of products) {
        try {
          if (!product.variants || product.variants.length === 0) continue;

          for (const variant of product.variants) {
            // Check if inventory tracking is disabled
            if (variant.inventory_management === null) {
              console.log(`[shopify-fix] Enabling inventory tracking for ${product.title} (${variant.sku})`);
              
              // Enable inventory tracking and set quantity
              const updateResponse = await fetch(
                `https://${this.storeUrl}/admin/api/2023-10/variants/${variant.id}.json`,
                {
                  method: 'PUT',
                  headers: {
                    'X-Shopify-Access-Token': this.accessToken,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    variant: {
                      id: variant.id,
                      inventory_management: 'shopify',
                      inventory_policy: 'deny', // Don't allow overselling
                      inventory_quantity: 1 // Set default quantity
                    }
                  })
                }
              );

              if (updateResponse.ok) {
                results.push({
                  productTitle: product.title,
                  sku: variant.sku,
                  variantId: variant.id,
                  status: 'enabled_tracking'
                });
                fixedCount++;
              } else {
                const errorText = await updateResponse.text();
                console.error(`[shopify-fix] Failed to update variant ${variant.id}: ${errorText}`);
              }
            }
          }
        } catch (error) {
          console.error(`[shopify-fix] Error processing product ${product.title}:`, error);
        }
      }

      console.log(`[shopify-fix] Fixed ${fixedCount} variants`);
      return {
        success: true,
        fixed: fixedCount,
        results: results
      };

    } catch (error) {
      console.error('[shopify-fix] Failed to enable inventory tracking:', error);
      return {
        success: false,
        error: error.message,
        fixed: 0
      };
    }
  }

  async syncQuantitiesFromLocal(storage: any) {
    try {
      console.log('[shopify-fix] Syncing quantities from local inventory to Shopify...');
      
      // Get local items with quantities
      const localItems = await storage.getItems();
      const itemsWithQuantity = localItems.filter(item => 
        item.quantity > 0 && (item.sku || item.shopifyId)
      );

      console.log(`[shopify-fix] Found ${itemsWithQuantity.length} local items with quantities to sync`);

      // Get Shopify products
      const response = await fetch(`https://${this.storeUrl}/admin/api/2023-10/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      const shopifyProducts = data.products || [];

      let syncedCount = 0;
      const results = [];

      for (const localItem of itemsWithQuantity) {
        try {
          // Find matching Shopify product
          const shopifyProduct = shopifyProducts.find(product => {
            if (localItem.shopifyId && product.id.toString() === localItem.shopifyId) {
              return true;
            }
            
            if (localItem.sku && product.variants) {
              return product.variants.some(variant => variant.sku === localItem.sku);
            }
            
            if (localItem.name && product.title) {
              const localName = localItem.name.toLowerCase();
              const shopifyTitle = product.title.toLowerCase();
              return localName.includes(shopifyTitle) || shopifyTitle.includes(localName);
            }
            
            return false;
          });

          if (!shopifyProduct || !shopifyProduct.variants) continue;

          const variant = shopifyProduct.variants[0];
          const currentShopifyQuantity = variant.inventory_quantity || 0;
          const localQuantity = localItem.quantity || 0;

          if (currentShopifyQuantity !== localQuantity) {
            console.log(`[shopify-fix] Updating ${localItem.name}: Shopify ${currentShopifyQuantity} → ${localQuantity}`);
            
            // Update Shopify quantity
            const updateResponse = await fetch(
              `https://${this.storeUrl}/admin/api/2023-10/variants/${variant.id}.json`,
              {
                method: 'PUT',
                headers: {
                  'X-Shopify-Access-Token': this.accessToken,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  variant: {
                    id: variant.id,
                    inventory_quantity: localQuantity,
                    inventory_management: 'shopify' // Ensure tracking is enabled
                  }
                })
              }
            );

            if (updateResponse.ok) {
              results.push({
                name: localItem.name,
                sku: localItem.sku,
                oldQuantity: currentShopifyQuantity,
                newQuantity: localQuantity,
                variantId: variant.id
              });
              syncedCount++;
            }
          }

        } catch (error) {
          console.error(`[shopify-fix] Error syncing ${localItem.name}:`, error);
        }
      }

      console.log(`[shopify-fix] Synced ${syncedCount} items to Shopify`);
      return {
        success: true,
        synced: syncedCount,
        results: results
      };

    } catch (error) {
      console.error('[shopify-fix] Failed to sync quantities:', error);
      return {
        success: false,
        error: error.message,
        synced: 0
      };
    }
  }
}