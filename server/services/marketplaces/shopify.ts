import { type Item } from '@shared/schema';
import { updateItemWithShopifyId } from '../shopify-utils';
import { IMarketplaceService } from '../marketplace';
import Shopify from 'shopify-api-node';
import { log } from '../../vite';
import { createShopifyClient } from '../shopify-auth';
import { getShopifyCredentials } from '../shopify-auth';

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
        const shopifyClientResult = await createShopifyClient();
        
        // The createShopifyClient returns an object with multiple properties
        // The actual Shopify client is in the 'shopify' property
        if (shopifyClientResult && shopifyClientResult.shopify) {
          this.client = shopifyClientResult.shopify;
          return this.client;
        } else {
          log('Shopify client not found in createShopifyClient result', 'marketplace-shopify-error');
          throw new Error('Shopify client not found in result');
        }
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
      // Access the shopify object correctly from the client object
      if (client.shopify) {
        // If client has a shopify property (from createShopifyClient), use it
        const shop = await client.shopify.shop.get();
        return { 
          success: true, 
          message: `Connected to Shopify store: ${shop.name}` 
        };
      } else {
        // Otherwise try to use the client directly
        const shop = await client.shop.get();
        return { 
          success: true, 
          message: `Connected to Shopify store: ${shop.name}` 
        };
      }
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
      
      // Get shop info based on the client structure
      let shop;
      if (client.shopify) {
        // If client has a shopify property, use it
        shop = await client.shopify.shop.get();
      } else {
        // Otherwise use the client directly
        shop = await client.shop.get();
      }
      
      // Get product count with error handling
      let productCount = 0;
      try {
        if (client.shopify) {
          productCount = await client.shopify.product.count();
        } else {
          productCount = await client.product.count();
        }
      } catch (countError) {
        log(`Error getting product count in getMarketplaceInfo: ${countError}`, 'marketplace-shopify');
        // Continue without product count
      }
      
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
      
      // Get product count - wrap in try/catch to handle potential errors
      let productCount = 0;
      try {
        if (client.shopify) {
          productCount = await client.shopify.product.count();
        } else {
          productCount = await client.product.count();
        }
        log(`Found ${productCount} products in Shopify store`, 'marketplace-shopify');
      } catch (countError) {
        log(`Error getting product count, continuing with sync: ${countError}`, 'marketplace-shopify');
        // Continue without product count
      }
      
      // Get all products from Shopify
      // Use pagination to handle large catalogs
      let params: any = { limit: 50 };
      let allProducts: any[] = [];
      let page = 1;
      let hasNextPage = true;
      
      log(`Starting to fetch all products from Shopify (page ${page})`, 'marketplace-shopify');
      
      // Determine which client instance to use
      const productClient = client.shopify ? client.shopify.product : client.product;
      
      while (hasNextPage) {
        try {
          const products = await productClient.list(params);
          allProducts = allProducts.concat(products);
          
          if (products.length < params.limit) {
            hasNextPage = false;
          } else {
            page++;
            log(`Fetching next page of products (page ${page})`, 'marketplace-shopify');
            // Check if we have pagination info
            if (products.nextPageParameters) {
              params = { ...params, page_info: products.nextPageParameters.page_info };
            } else {
              // If no pagination info, just increment the page number
              params = { ...params, page: page };
            }
          }
        } catch (err: any) {
          log(`Error fetching products from Shopify page ${page}: ${err.message}`, 'marketplace-shopify-error');
          hasNextPage = false;
        }
      }
      
      log(`Successfully fetched ${allProducts.length} products from Shopify`, 'marketplace-shopify');
      
      // Import each product into the local database
      let imported = 0;
      let updated = 0;
      let failed = 0;
      
      // Dynamically import the shopify-import module
      const { importShopifyProducts } = await import('../shopify-import.js');
      if (allProducts.length > 0) {
        log(`Starting to import ${allProducts.length} products into local database`, 'marketplace-shopify');
        try {
          const importResult = await importShopifyProducts(allProducts);
          imported = importResult.imported || 0;
          updated = importResult.updated || 0;
          failed = importResult.failed || 0;
          
          log(`Import completed: ${imported} imported, ${updated} updated, ${failed} failed`, 'marketplace-shopify');
        } catch (importErr: any) {
          log(`Error during import process: ${importErr.message}`, 'marketplace-shopify-error');
          return {
            success: false,
            message: `Error importing products: ${importErr.message}`,
            data: {
              total: productCount || 0,
              fetched: allProducts.length,
              imported: 0,
              updated: 0,
              failed: 0
            }
          };
        }
      }
      
      return {
        success: true,
        message: `Successfully synced ${imported + updated} products from Shopify`,
        data: {
          total: productCount || allProducts.length,
          fetched: allProducts.length,
          imported,
          updated,
          failed
        }
      };
    } catch (error: any) {
      log(`Error syncing products from Shopify: ${error.message}`, 'marketplace-shopify-error');
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
      let result;
      
      try {
        // Try different possible client structures
        if (client.shopify && client.shopify.product && typeof client.shopify.product.create === 'function') {
          // Standard client structure
          result = await client.shopify.product.create(shopifyProduct);
        } else if (client.product && typeof client.product.create === 'function') {
          // Alternative client structure
          result = await client.product.create(shopifyProduct);
        } else if (typeof client.create === 'function') {
          // Direct client structure
          result = await client.create(shopifyProduct);
        } else {
          // Fallback to direct API call using Fetch
          const credentials = await getShopifyCredentials();
          
          if (!credentials || !credentials.accessToken || !credentials.storeUrl) {
            throw new Error('Missing Shopify credentials for direct API call');
          }
          
          const storeUrl = credentials.storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const accessToken = credentials.accessToken;
          
          const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json`, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product: shopifyProduct })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Shopify API error (${response.status}): ${errorText}`);
          }
          
          const data = await response.json();
          result = data.product;
        }
      } catch (error) {
        const clientError = error as Error;
        console.error('Error in Shopify client.create:', clientError);
        throw new Error(`Client create error: ${clientError.message || 'Unknown error'}`);
      }
      
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
  
  /**
   * Fetch a product from Shopify by its ID
   */
  async fetchProduct(externalId: string): Promise<{ success: boolean; message: string; product?: any }> {
    try {
      // Get a client, possibly creating it from env vars
      const client = await this.getClient();
      
      if (!client) {
        return { 
          success: false, 
          message: 'Shopify client not initialized' 
        };
      }
      
      // Check if the externalId is valid
      if (!externalId || isNaN(parseInt(externalId))) {
        return {
          success: false,
          message: `Invalid Shopify product ID: ${externalId}`
        };
      }
      
      // Fetch the product from Shopify
      const productClient = client.shopify ? client.shopify.product : client.product;
      const product = await productClient.get(parseInt(externalId));
      
      if (!product) {
        return {
          success: false,
          message: `Product not found in Shopify with ID: ${externalId}`
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched product from Shopify`,
        product
      };
    } catch (error: any) {
      // Handle 404 errors more gracefully
      if (error.statusCode === 404) {
        return {
          success: false,
          message: `Product not found in Shopify with ID: ${externalId}`
        };
      }
      
      return { 
        success: false, 
        message: `Error fetching product from Shopify: ${error.message}` 
      };
    }
  }
  
  /**
   * Delete a product from Shopify
   */
  async deleteProduct(externalId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get a client, possibly creating it from env vars
      const client = await this.getClient();
      
      if (!client) {
        return { 
          success: false, 
          message: 'Shopify client not initialized' 
        };
      }
      
      // Validate the external ID
      if (!externalId || isNaN(parseInt(externalId))) {
        return {
          success: false,
          message: `Invalid Shopify product ID: ${externalId}`
        };
      }
      
      // Get the appropriate product client
      const productClient = client.shopify ? client.shopify.product : client.product;
      
      // First, check if the product exists
      try {
        await productClient.get(parseInt(externalId));
      } catch (err: any) {
        // If we get a 404, the product doesn't exist
        if (err.statusCode === 404) {
          return {
            success: true,
            message: `Product already deleted or doesn't exist in Shopify (ID: ${externalId})`
          };
        }
        
        // If it's another error, rethrow to be caught by the outer catch
        throw err;
      }
      
      // Delete the product from Shopify
      await productClient.delete(parseInt(externalId));
      
      return {
        success: true,
        message: `Successfully deleted product from Shopify (ID: ${externalId})`
      };
    } catch (error: any) {
      log(`Error deleting product from Shopify (ID: ${externalId}): ${error.message}`, 'marketplace-shopify-error');
      
      return { 
        success: false, 
        message: `Error deleting product from Shopify: ${error.message}` 
      };
    }
  }
}