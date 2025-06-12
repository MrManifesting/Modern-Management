/**
 * Working Shopify Service - Uses the same pattern as the successful connection in logs
 */

import Shopify from 'shopify-api-node';

export class WorkingShopifyService {
  private shopify: any;
  private initialized = false;

  constructor() {
    this.initializeShopify();
  }

  private initializeShopify() {
    try {
      // Use the exact same configuration that works in the logs
      this.shopify = new Shopify({
        shopName: 'simplifiedcurations',
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
        apiVersion: '2023-10'
      });
      this.initialized = true;
      console.log('Working Shopify Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Working Shopify Service:', error);
      this.initialized = false;
    }
  }

  async testConnection() {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Service not initialized - missing SHOPIFY_ACCESS_TOKEN'
      };
    }

    try {
      console.log('Testing Working Shopify Service connection...');
      const shop = await this.shopify.shop.get();
      
      return {
        success: true,
        store: {
          name: shop.name,
          domain: shop.domain,
          email: shop.email,
          currency: shop.currency
        },
        connected: true
      };
    } catch (error) {
      console.error('Working Shopify connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProducts(limit = 50) {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    try {
      const products = await this.shopify.product.list({ limit });
      return products;
    } catch (error) {
      console.error('Failed to get products:', error);
      return [];
    }
  }

  async createProduct(productData: any) {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    try {
      const product = await this.shopify.product.create(productData);
      return product;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  async syncInventoryItem(item: any) {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    try {
      // Check if product exists
      const products = await this.shopify.product.list({
        limit: 250,
        fields: 'id,variants'
      });

      let existingProduct = null;
      for (const product of products) {
        const variant = product.variants.find((v: any) => v.sku === item.sku);
        if (variant) {
          existingProduct = { product, variant };
          break;
        }
      }

      if (existingProduct) {
        // Update existing
        await this.shopify.productVariant.update(existingProduct.variant.id, {
          inventory_quantity: item.quantity,
          price: item.basePrice || '0'
        });
        return { action: 'updated', productId: existingProduct.product.id };
      } else {
        // Create new
        const newProduct = await this.shopify.product.create({
          title: item.name,
          body_html: item.description || '',
          vendor: item.brand || '',
          product_type: item.category || '',
          variants: [{
            sku: item.sku,
            price: item.basePrice || '0',
            inventory_quantity: item.quantity,
            inventory_management: 'shopify',
            inventory_policy: 'deny'
          }],
          tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
        });
        return { action: 'created', productId: newProduct.id };
      }
    } catch (error) {
      console.error('Failed to sync inventory item:', error);
      throw error;
    }
  }
}

export const workingShopifyService = new WorkingShopifyService();