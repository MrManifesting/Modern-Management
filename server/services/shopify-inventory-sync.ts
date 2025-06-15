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
      const { shopify } = await getShopifyClient();
      
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
      const existingItems = await this.storage.getItems();
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
      const existingItems = await this.storage.getItems();
      
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
   * Fetch all products from Shopify with pagination
   */
  private async fetchAllShopifyProducts(shopifyClient: any): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let pageInfo = null;
    
    do {
      const params: any = {
        limit: 250, // Maximum allowed by Shopify
        fields: 'id,handle,title,vendor,product_type,status,variants,images'
      };
      
      if (pageInfo) {
        params.page_info = pageInfo;
      }

      // Use the correct Shopify client API structure - handle different client types
      let response;
      if (shopifyClient.product && shopifyClient.product.list) {
        response = await shopifyClient.product.list(params);
      } else if (shopifyClient.get) {
        // Direct API approach for special Shopify clients
        const apiResponse = await shopifyClient.get('/admin/api/2023-10/products.json?' + 
          new URLSearchParams(params).toString());
        response = apiResponse.products || [];
      } else {
        throw new Error('Unable to access Shopify product API');
      }
      
      if (Array.isArray(response)) {
        allProducts.push(...response);
        // If we got less than the limit, we're done
        pageInfo = response.length === params.limit ? 
          (response[response.length - 1]?.id || null) : null;
        if (pageInfo) {
          params.since_id = pageInfo;
          delete params.page_info;
        }
      } else {
        // Handle case where response has data property
        const products = response.data || response;
        allProducts.push(...products);
        pageInfo = null; // Simplified for now
      }
        
    } while (pageInfo);

    return allProducts;
  }

  /**
   * Sync a single product from Shopify
   */
  private async syncSingleProduct(
    product: ShopifyProduct, 
    existingItemsMap: Map<string, Item>,
    onUpdate: (type: 'updated' | 'created') => void
  ): Promise<void> {
    
    // Process each variant as a separate inventory item
    for (const variant of product.variants) {
      const existingItem = existingItemsMap.get(variant.sku) || 
                          existingItemsMap.get(product.handle);

      if (existingItem) {
        // Update existing item
        await this.updateExistingItem(existingItem, product, variant);
        onUpdate('updated');
      } else {
        // Create new item
        await this.createNewItemFromShopify(product, variant);
        onUpdate('created');
      }
    }
  }

  /**
   * Update existing item with Shopify data
   */
  private async updateExistingItem(
    item: Item, 
    product: ShopifyProduct, 
    variant: ShopifyVariant
  ): Promise<void> {
    
    const updates: Partial<Item> = {};
    let hasChanges = false;

    // Update pricing
    const newBasePrice = parseFloat(variant.price);
    if (item.basePrice !== newBasePrice.toString()) {
      updates.basePrice = newBasePrice.toString();
      hasChanges = true;
    }

    // Update sale price if compare_at_price exists
    if (variant.compare_at_price) {
      const newSalePrice = parseFloat(variant.compare_at_price);
      if (item.salePrice !== newSalePrice.toString()) {
        updates.salePrice = newSalePrice.toString();
        hasChanges = true;
      }
    }

    // Update quantity (use a reasonable default if Shopify doesn't provide inventory data)
    const newQuantity = variant.inventory_quantity !== undefined ? 
      variant.inventory_quantity : 
      (variant.inventory_management === 'shopify' ? 50 : 999); // Default quantities based on inventory tracking
    
    if (item.quantity !== newQuantity) {
      updates.quantity = newQuantity;
      hasChanges = true;
    }

    // Update other fields
    if (item.vendor !== product.vendor) {
      updates.vendor = product.vendor;
      hasChanges = true;
    }

    if (item.category !== product.product_type) {
      updates.category = product.product_type;
      hasChanges = true;
    }

    // Update images if available
    if (product.images.length > 0 && (!item.images || item.images.length === 0)) {
      updates.images = product.images.map(img => img.src);
      hasChanges = true;
    }

    // Update status based on Shopify status
    const newStatus = product.status === 'active' ? 'active' : 'inactive';
    if (item.status !== newStatus) {
      updates.status = newStatus;
      hasChanges = true;
    }

    if (hasChanges) {
      await this.storage.updateItem(item.id, updates);
      console.log(`Updated item: ${item.name} (SKU: ${item.sku})`);
    }
  }

  /**
   * Create new item from Shopify product
   */
  private async createNewItemFromShopify(
    product: ShopifyProduct, 
    variant: ShopifyVariant
  ): Promise<void> {
    
    const newItem = {
      name: variant.title !== 'Default Title' ? 
        `${product.title} - ${variant.title}` : product.title,
      sku: variant.sku || `SHOPIFY-${variant.id}`,
      handle: product.handle,
      basePrice: parseFloat(variant.price).toString(),
      salePrice: variant.compare_at_price ? 
        parseFloat(variant.compare_at_price).toString() : null,
      quantity: variant.inventory_quantity !== undefined ? 
        variant.inventory_quantity : 
        (variant.inventory_management === 'shopify' ? 50 : 999),
      vendor: product.vendor,
      category: product.product_type,
      weight: this.convertWeight(variant.weight, variant.weight_unit),
      status: product.status === 'active' ? 'active' : 'inactive',
      images: product.images.map(img => img.src),
      shopifyId: variant.id,
      shopifyProductId: product.id,
      description: `Imported from Shopify store`,
      tags: '',
      condition: 'new'
    };

    await this.storage.createItem(newItem);
    console.log(`Created new item: ${newItem.name} (SKU: ${newItem.sku})`);
  }

  /**
   * Update only prices and quantity for faster sync
   */
  private async updateItemPricesAndQuantity(
    item: Item, 
    variant: ShopifyVariant
  ): Promise<boolean> {
    
    const updates: Partial<Item> = {};
    let hasChanges = false;

    const newBasePrice = parseFloat(variant.price);
    if (item.basePrice !== newBasePrice.toString()) {
      updates.basePrice = newBasePrice.toString();
      hasChanges = true;
    }

    if (variant.compare_at_price) {
      const newSalePrice = parseFloat(variant.compare_at_price);
      if (item.salePrice !== newSalePrice.toString()) {
        updates.salePrice = newSalePrice.toString();
        hasChanges = true;
      }
    }

    if (item.quantity !== variant.inventory_quantity) {
      updates.quantity = variant.inventory_quantity;
      hasChanges = true;
    }

    if (hasChanges) {
      await this.storage.updateItem(item.id, updates);
      console.log(`Updated prices/quantity for: ${item.name}`);
    }

    return hasChanges;
  }

  /**
   * Find matching Shopify product for an inventory item
   */
  private findMatchingShopifyProduct(
    item: Item, 
    products: ShopifyProduct[]
  ): ShopifyProduct | null {
    
    // First try to match by handle
    if (item.handle) {
      const byHandle = products.find(p => p.handle === item.handle);
      if (byHandle) return byHandle;
    }

    // Then try to match by SKU in variants
    if (item.sku) {
      for (const product of products) {
        if (product.variants.some(v => v.sku === item.sku)) {
          return product;
        }
      }
    }

    // Finally try to match by name similarity
    if (item.name) {
      const byName = products.find(p => 
        p.title.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(p.title.toLowerCase())
      );
      if (byName) return byName;
    }

    return null;
  }

  /**
   * Find matching variant within a product
   */
  private findMatchingVariant(
    item: Item, 
    product: ShopifyProduct
  ): ShopifyVariant | null {
    
    // Try to match by SKU first
    if (item.sku) {
      const bySku = product.variants.find(v => v.sku === item.sku);
      if (bySku) return bySku;
    }

    // If only one variant, use it
    if (product.variants.length === 1) {
      return product.variants[0];
    }

    // Try to match by title if item name contains variant info
    const byTitle = product.variants.find(v => 
      item.name.toLowerCase().includes(v.title.toLowerCase()) ||
      v.title.toLowerCase().includes(item.name.toLowerCase())
    );

    return byTitle || product.variants[0]; // Default to first variant
  }

  /**
   * Convert Shopify weight to our weight format
   */
  private convertWeight(weight: number, unit: string): string {
    if (!weight) return '1 pound';
    
    switch (unit.toLowerCase()) {
      case 'lb':
      case 'pounds':
        return weight === 1 ? '1 pound' : `${weight} pounds`;
      case 'oz':
      case 'ounces':
        return weight === 1 ? '1 ounce' : `${weight} ounces`;
      case 'g':
      case 'grams':
        return weight === 1 ? '1 gram' : `${weight} grams`;
      default:
        return `${weight} ${unit}`;
    }
  }
}