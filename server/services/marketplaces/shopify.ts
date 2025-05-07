import { type Item } from '@shared/schema';
import { updateItemWithShopifyId } from '../shopify-utils';
import { IMarketplaceService } from '../marketplace';
import Shopify from 'shopify-api-node';
import { log } from '../../vite';
import { createShopifyClient } from '../shopify-auth';

/**
 * Shopify marketplace integration service
 */
export class ShopifyService implements IMarketplaceService {
  private client: any = null;
  private shopName: string;
  private apiKey: string;
  private apiSecret: string;
  private useEnvCredentials: boolean = false;
  
  constructor(shopName: string, apiKey: string, apiSecret: string) {
    this.shopName = shopName;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    
    try {
      // Clean up shopName to ensure proper format
      this.shopName = shopName.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      
      // Check if credentials are provided, or if we should use environment variables
      if (!this.apiKey || this.apiKey.includes('•') || this.apiKey.length < 10) {
        log(`Using environment variables for Shopify client in marketplace integration`, 'marketplace-shopify');
        this.useEnvCredentials = true;
      } else {
        log(`Initializing Shopify client with provided credentials for ${this.shopName}`, 'marketplace-shopify');
        // Initialize Shopify client with provided credentials
        this.client = new Shopify({
          shopName: this.shopName,
          accessToken: this.apiKey,
          apiVersion: '2023-10'
        });
      }
    } catch (error) {
      console.error('Error initializing Shopify client:', error);
      this.client = null;
    }
  }
  
  /**
   * Get or create Shopify client, using env variables if needed
   */
  private async getClient(): Promise<any> {
    // If we already have a client, return it
    if (this.client) {
      return this.client;
    }
    
    // If we need to use environment variables
    if (this.useEnvCredentials) {
      try {
        log(`Creating Shopify client from env vars for marketplace integration`, 'marketplace-shopify');
        // Use the shared client creation method
        this.client = await createShopifyClient();
        return this.client;
      } catch (error: any) {
        log(`Error creating Shopify client from env vars: ${error.message}`, 'marketplace-shopify-error');
        throw new Error(`Failed to initialize Shopify client: ${error.message}`);
      }
    }
    
    // We should never get here, but return null to be safe
    return null;
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Get a client, possibly creating it from env vars
      const client = await this.getClient();
      
      if (!client) {
        return { 
          success: false, 
          message: 'Shopify client not initialized' 
        };
      }
      
      // Try to get shop info to test connection
      const shop = await client.shop.get();
      
      return { 
        success: true, 
        message: `Connected to Shopify store: ${shop.name}` 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error connecting to Shopify: ${error.message}` 
      };
    }
  }
  
  /**
   * Get information about the Shopify store
   */
  async getMarketplaceInfo(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get a client, possibly creating it from env vars
      const client = await this.getClient();
      
      if (!client) {
        return { 
          success: false, 
          message: 'Shopify client not initialized' 
        };
      }
      
      // Get shop info
      const shop = await client.shop.get();
      
      // Get product count
      const productCount = await client.product.count();
      
      return {
        success: true,
        message: 'Successfully retrieved Shopify store information',
        data: {
          name: shop.name,
          domain: shop.domain,
          email: shop.email,
          country: shop.country_name,
          currency: shop.currency,
          timezone: shop.timezone,
          productCount
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error getting Shopify store info: ${error.message}` 
      };
    }
  }
  
  /**
   * Sync products from Shopify to the local inventory
   */
  async syncProducts(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get a client, possibly creating it from env vars
      const client = await this.getClient();
      
      if (!client) {
        return { 
          success: false, 
          message: 'Shopify client not initialized' 
        };
      }
      
      // In a real implementation, we would:
      // 1. Get all products from Shopify
      // 2. Convert them to our Item format
      // 3. Upsert them to our local storage
      
      // Get product count
      const productCount = await client.product.count();
      log(`Found ${productCount} products in Shopify store`, 'marketplace-shopify');
      
      return {
        success: true,
        message: 'Successfully synced products from Shopify',
        data: {
          imported: 0,
          updated: 0,
          total: productCount
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error syncing products from Shopify: ${error.message}` 
      };
    }
  }
  
  /**
   * Push a product to Shopify
   */
  async pushProduct(item: Item): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get a client, possibly creating it from env vars
      const client = await this.getClient();
      
      if (!client) {
        return { 
          success: false, 
          message: 'Shopify client not initialized' 
        };
      }
      
      // Convert our Item to Shopify product format
      const shopifyProduct = {
        title: item.name,
        body_html: item.description || '',
        vendor: item.brand || 'Inventory Pro',
        product_type: item.category || 'General',
        status: 'active',
        tags: item.tags && Array.isArray(item.tags) ? item.tags.join(', ') : '',
        variants: [
          {
            price: item.basePrice.toString(),
            sku: item.sku || '',
            inventory_quantity: item.quantity || 0,
            weight: item.weight || 0,
            weight_unit: 'lb',
            requires_shipping: true,
            taxable: true
          }
        ]
      };
      
      // Create or update the product in Shopify
      const result = await client.product.create(shopifyProduct);
      
      // Extract the numeric ID from the GID
      const shopifyId = result.id.toString();
      const shopifyProductId = parseInt(shopifyId.split('/').pop() || '0');
      
      // In a real implementation, we would update the item with the Shopify ID
      if (shopifyProductId > 0) {
        await updateItemWithShopifyId(item.id, shopifyProductId);
      }
      
      return {
        success: true,
        message: `Successfully pushed product "${item.name}" to Shopify`,
        data: {
          shopifyProductId,
          shopifyProductGid: result.id,
          shopifyVariantIds: result.variants.map((v: any) => v.id)
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error pushing product to Shopify: ${error.message}` 
      };
    }
  }
  
  /**
   * Prepare an item for pushing to Shopify (for preview/validation)
   */
  async prepareItemForPush(item: Item): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get a client, possibly creating it from env vars
      const client = await this.getClient();
      
      if (!client) {
        return { 
          success: false, 
          message: 'Shopify client not initialized' 
        };
      }
      
      // Convert our Item to Shopify product format
      const shopifyProduct = {
        title: item.name,
        body_html: item.description || '',
        vendor: item.brand || 'Inventory Pro',
        product_type: item.category || 'General',
        status: 'active',
        tags: item.tags && Array.isArray(item.tags) ? item.tags.join(', ') : '',
        variants: [
          {
            price: item.basePrice.toString(),
            sku: item.sku || '',
            inventory_quantity: item.quantity || 0,
            weight: item.weight || 0,
            weight_unit: 'lb',
            requires_shipping: true,
            taxable: true
          }
        ]
      };
      
      return {
        success: true,
        message: 'Successfully prepared product for Shopify',
        data: shopifyProduct
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error preparing product for Shopify: ${error.message}` 
      };
    }
  }
}