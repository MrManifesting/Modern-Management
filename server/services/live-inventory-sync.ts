/**
 * Live Inventory Sync Service
 * Provides real-time inventory updates and prevents duplicate creation
 */

export class LiveInventorySync {
  private storeUrl: string;
  private accessToken: string;
  private storage: any;

  constructor(storage: any) {
    this.storeUrl = process.env.SHOPIFY_STORE || '';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    this.storage = storage;
  }

  async createItemAsDraft(itemData: any) {
    try {
      console.log('[live-sync] Creating new item as Shopify draft:', itemData.name);

      // First check for duplicates by SKU and name
      const existingItems = await this.storage.getItems();
      const duplicate = existingItems.find(item => 
        (item.sku && item.sku === itemData.sku) ||
        (item.name && item.name.toLowerCase() === itemData.name.toLowerCase())
      );

      if (duplicate) {
        throw new Error(`Duplicate item found: ${duplicate.name} (SKU: ${duplicate.sku})`);
      }

      // Create item in local database first
      const localItem = await this.storage.createItem({
        ...itemData,
        status: 'draft' // Always start as draft
      });

      // Create as draft in Shopify
      const shopifyProduct = await this.createShopifyDraft(localItem);
      
      // Update local item with Shopify ID
      if (shopifyProduct?.id) {
        await this.storage.updateItem(localItem.id, {
          shopifyId: shopifyProduct.id.toString()
        });
      }

      return {
        success: true,
        item: localItem,
        shopifyProduct: shopifyProduct,
        message: 'Item created as draft in both inventory and Shopify'
      };

    } catch (error) {
      console.error('[live-sync] Failed to create item as draft:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createShopifyDraft(item: any) {
    try {
      const productData = {
        product: {
          title: item.name || 'New Product',
          vendor: item.vendor || 'Gold Standard',
          product_type: item.category || 'Flower',
          status: 'draft', // Always create as draft
          variants: [{
            sku: item.sku,
            price: item.basePrice || '0.00',
            inventory_quantity: item.quantity || 0,
            inventory_management: 'shopify',
            inventory_policy: 'deny'
          }],
          metafields: [
            {
              namespace: 'inventory',
              key: 'weight',
              value: item.weight || '',
              type: 'single_line_text_field'
            },
            {
              namespace: 'inventory',
              key: 'quality',
              value: item.quality || '',
              type: 'single_line_text_field'
            }
          ]
        }
      };

      const response = await fetch(`https://${this.storeUrl}/admin/api/2023-10/products.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.product;

    } catch (error) {
      console.error('[live-sync] Failed to create Shopify draft:', error);
      throw error;
    }
  }

  async getLiveInventoryUpdate() {
    try {
      console.log('[live-sync] Fetching live inventory update from Shopify...');

      // Get current Shopify products
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
      const shopifyProducts = data.products || [];

      // Get local items
      const localItems = await this.storage.getItems();

      // Create update map with live Shopify data
      const updates = [];
      const timestamp = new Date().toISOString();

      for (const product of shopifyProducts) {
        if (!product.variants || product.variants.length === 0) continue;

        const variant = product.variants[0];
        const shopifyQuantity = variant.inventory_quantity || 0;
        const shopifySku = variant.sku || '';

        // Find matching local item
        const localItem = localItems.find(item => 
          item.shopifyId === product.id.toString() ||
          item.sku === shopifySku ||
          (item.name && product.title && 
           item.name.toLowerCase().includes(product.title.toLowerCase()))
        );

        if (localItem) {
          updates.push({
            id: localItem.id,
            name: localItem.name || product.title,
            sku: shopifySku,
            localQuantity: localItem.quantity || 0,
            shopifyQuantity: shopifyQuantity,
            status: product.status,
            needsSync: (localItem.quantity || 0) !== shopifyQuantity,
            shopifyId: product.id.toString(),
            lastUpdated: timestamp
          });
        }
      }

      return {
        success: true,
        updates: updates,
        timestamp: timestamp,
        totalItems: updates.length,
        needsSync: updates.filter(u => u.needsSync).length
      };

    } catch (error) {
      console.error('[live-sync] Failed to get live inventory update:', error);
      return {
        success: false,
        error: error.message,
        updates: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  async syncQuantityToShopify(itemId: number, newQuantity: number) {
    try {
      const item = await this.storage.getItem(itemId);
      if (!item || !item.shopifyId) {
        throw new Error('Item not found or missing Shopify ID');
      }

      // Get Shopify product to find variant ID
      const productResponse = await fetch(
        `https://${this.storeUrl}/admin/api/2023-10/products/${item.shopifyId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!productResponse.ok) {
        throw new Error(`Failed to fetch Shopify product: ${productResponse.status}`);
      }

      const productData = await productResponse.json();
      const variant = productData.product.variants[0];

      // Update variant quantity
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
              inventory_quantity: newQuantity,
              inventory_management: 'shopify'
            }
          })
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update Shopify quantity: ${updateResponse.status}`);
      }

      // Update local quantity
      await this.storage.updateItem(itemId, { quantity: newQuantity });

      // Log the action
      await this.storage.createInventoryAction({
        itemId: itemId,
        type: 'manual_sync',
        quantity: newQuantity - (item.quantity || 0),
        reason: `Manual sync to Shopify: ${item.quantity || 0} → ${newQuantity}`,
        previousQuantity: item.quantity || 0,
        newQuantity: newQuantity
      });

      return {
        success: true,
        itemId: itemId,
        newQuantity: newQuantity,
        message: 'Quantity synced to Shopify successfully'
      };

    } catch (error) {
      console.error('[live-sync] Failed to sync quantity to Shopify:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}