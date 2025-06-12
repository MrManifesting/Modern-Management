import Shopify from 'shopify-api-node';
import { googleSheetsService } from './google-sheets-service';

// Shopify API Configuration
const SHOPIFY_CONFIG = {
  shopName: process.env.SHOPIFY_STORE || 'mrlisterscurations',
  apiKey: process.env.SHOPIFY_API_KEY || '68ec43584780d8b93ff60e05b89fb86e',
  password: process.env.SHOPIFY_ACCESS_TOKEN || '',
  autoLimit: true,
  apiVersion: '2024-01'
};

export class ShopifyEnhancedService {
  private shopify: any;
  private initialized = false;

  constructor() {
    this.initializeShopify();
  }

  private initializeShopify() {
    try {
      this.shopify = new Shopify({
        shopName: SHOPIFY_CONFIG.shopName,
        apiKey: SHOPIFY_CONFIG.apiKey,
        password: SHOPIFY_CONFIG.password,
        autoLimit: SHOPIFY_CONFIG.autoLimit,
        apiVersion: SHOPIFY_CONFIG.apiVersion
      });
      this.initialized = true;
      console.log('Shopify Enhanced Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Shopify Enhanced Service:', error);
      this.initialized = false;
    }
  }

  async testConnection() {
    if (!this.initialized) {
      throw new Error('Shopify service not initialized - missing credentials');
    }

    // Validate required credentials
    if (!SHOPIFY_CONFIG.password) {
      throw new Error('SHOPIFY_ACCESS_TOKEN environment variable is required');
    }

    if (!SHOPIFY_CONFIG.shopName) {
      throw new Error('SHOPIFY_STORE environment variable is required');
    }

    try {
      console.log(`Testing Shopify connection to: ${SHOPIFY_CONFIG.shopName}`);
      const shop = await this.shopify.shop.get();
      
      console.log(`Successfully connected to Shopify store: ${shop.name}`);
      return {
        success: true,
        shopName: shop.name,
        domain: shop.domain,
        email: shop.email,
        currency: shop.currency,
        connected: true
      };
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      
      // Provide specific error guidance
      let errorMessage = 'Unknown connection error';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Invalid API credentials - please check your SHOPIFY_ACCESS_TOKEN';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = 'Store not found - please check your SHOPIFY_STORE name';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access denied - please check API permissions';
        } else {
          errorMessage = error.message;
        }
      }
      
      throw new Error(`Shopify connection failed: ${errorMessage}`);
    }
  }

  async syncInventoryToShopify(items: any[]) {
    if (!this.initialized) {
      throw new Error('Shopify service not initialized');
    }

    const results = {
      updated: 0,
      created: 0,
      errors: [] as string[],
      processed: [] as any[]
    };

    for (const item of items) {
      try {
        // Check if product exists by SKU
        const existingProducts = await this.shopify.product.list({
          limit: 250,
          fields: 'id,variants'
        });

        let productToUpdate = null;
        let variantToUpdate = null;

        for (const product of existingProducts) {
          const variant = product.variants.find((v: any) => v.sku === item.sku);
          if (variant) {
            productToUpdate = product;
            variantToUpdate = variant;
            break;
          }
        }

        if (variantToUpdate) {
          // Update existing variant inventory
          await this.shopify.productVariant.update(variantToUpdate.id, {
            inventory_quantity: item.quantity,
            price: item.salePrice || item.basePrice || '0'
          });
          results.updated++;
          results.processed.push({
            sku: item.sku,
            action: 'updated',
            productId: productToUpdate.id,
            variantId: variantToUpdate.id
          });
        } else {
          // Create new product
          const newProduct = await this.shopify.product.create({
            title: item.name,
            body_html: item.description || '',
            vendor: item.brand || '',
            product_type: item.category || '',
            variants: [{
              sku: item.sku,
              price: item.salePrice || item.basePrice || '0',
              inventory_quantity: item.quantity,
              inventory_management: 'shopify',
              inventory_policy: 'deny'
            }],
            tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')
          });
          results.created++;
          results.processed.push({
            sku: item.sku,
            action: 'created',
            productId: newProduct.id,
            variantId: newProduct.variants[0].id
          });
        }
      } catch (error) {
        const errorMsg = `Failed to sync ${item.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return results;
  }

  async getRecentOrders(limit = 50) {
    if (!this.initialized) {
      throw new Error('Shopify service not initialized');
    }

    try {
      const orders = await this.shopify.order.list({
        status: 'any',
        limit,
        fields: 'id,name,email,created_at,total_price,line_items,financial_status'
      });

      return orders.map((order: any) => ({
        id: order.id,
        name: order.name,
        email: order.email,
        createdAt: order.created_at,
        totalPrice: order.total_price,
        financialStatus: order.financial_status,
        lineItems: order.line_items.map((item: any) => ({
          id: item.id,
          title: item.title,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price
        }))
      }));
    } catch (error) {
      console.error('Failed to get recent orders:', error);
      throw new Error(`Failed to get orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processOrderWebhook(orderData: any) {
    try {
      console.log(`Processing Shopify order webhook: ${orderData.id}`);

      // Format order data for Google Sheets
      const formattedOrder = {
        orderId: orderData.id?.toString() || '',
        customerEmail: orderData.email || '',
        lineItems: orderData.line_items?.map((item: any) => ({
          sku: item.sku || '',
          title: item.title || '',
          quantity: item.quantity || 0,
          price: item.price || '0'
        })) || [],
        totalPrice: orderData.total_price || '0',
        orderDate: orderData.created_at || new Date().toISOString()
      };

      // Send to Google Sheets
      const sheetsResult = await googleSheetsService.processShopifyOrder(formattedOrder);

      return {
        success: true,
        orderId: formattedOrder.orderId,
        sheetsSync: sheetsResult,
        lineItemsProcessed: formattedOrder.lineItems.length
      };
    } catch (error) {
      console.error('Error processing order webhook:', error);
      throw new Error(`Failed to process order webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getInventoryLevels() {
    if (!this.initialized) {
      throw new Error('Shopify service not initialized');
    }

    try {
      const products = await this.shopify.product.list({
        limit: 250,
        fields: 'id,title,variants'
      });

      const inventory = [];
      for (const product of products) {
        for (const variant of product.variants) {
          if (variant.sku) {
            inventory.push({
              productId: product.id,
              variantId: variant.id,
              title: product.title,
              sku: variant.sku,
              price: variant.price,
              inventoryQuantity: variant.inventory_quantity || 0,
              inventoryManagement: variant.inventory_management
            });
          }
        }
      }

      return inventory;
    } catch (error) {
      console.error('Failed to get inventory levels:', error);
      throw new Error(`Failed to get inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setupWebhook(webhookUrl: string) {
    if (!this.initialized) {
      throw new Error('Shopify service not initialized');
    }

    try {
      const webhook = await this.shopify.webhook.create({
        topic: 'orders/paid',
        address: webhookUrl,
        format: 'json'
      });

      return {
        success: true,
        webhookId: webhook.id,
        topic: webhook.topic,
        address: webhook.address
      };
    } catch (error) {
      console.error('Failed to setup webhook:', error);
      throw new Error(`Failed to setup webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const shopifyEnhancedService = new ShopifyEnhancedService();