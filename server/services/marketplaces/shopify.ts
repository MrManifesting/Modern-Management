import { type Item } from '@shared/schema';
import { IMarketplaceService } from '../marketplace';
import Shopify from 'shopify-api-node';
import { log } from '../../vite';
import { createShopifyClient, getShopifyCredentials } from '../shopify-auth';

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
      // Use the shared testShopifyConnection function for consistency
      const { testShopifyConnection } = await import('../shopify-auth');
      const connectionResult = await testShopifyConnection();
      
      return {
        success: connectionResult.success,
        message: connectionResult.success ? 
          `Successfully connected to Shopify store: ${connectionResult.shop?.name || 'Unknown'}` : 
          connectionResult.error || 'Failed to connect to Shopify'
      };
    } catch (error: any) {
      log(`Marketplace Shopify test connection error: ${error.message}`, 'marketplace-shopify-error');
      return { 
        success: false, 
        message: `Error testing Shopify connection: ${error.message}` 
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
}

/**
 * Standalone function for testing Shopify connection - used by API routes
 */
export async function testShopifyConnection(): Promise<{ success: boolean; error?: string; store?: string }> {
  try {
    // Check environment variables - use SHOPIFY_STORE instead of SHOPIFY_STORE_URL
    const storeUrl = process.env.SHOPIFY_STORE;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
    
    if (!storeUrl || !accessToken) {
      return { 
        success: false, 
        error: `Shopify credentials not configured. Store: ${storeUrl ? 'set' : 'missing'}, Token: ${accessToken ? 'set' : 'missing'}` 
      };
    }

    // Clean up store URL - ensure it doesn't include protocol or trailing slash
    let cleanStoreUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Ensure .myshopify.com domain if not already included
    if (!cleanStoreUrl.includes('myshopify.com')) {
      cleanStoreUrl = `${cleanStoreUrl}.myshopify.com`;
    }
    
    // Test connection with direct API call
    const response = await fetch(`https://${cleanStoreUrl}/admin/api/2023-10/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText} - ${errorText}` 
      };
    }

    const data = await response.json();
    
    if (data.shop && data.shop.name) {
      log(`Successfully connected to Shopify store: ${data.shop.name}`, 'shopify-test');
      return { 
        success: true, 
        store: data.shop.myshopify_domain || data.shop.name 
      };
    } else {
      return { 
        success: false, 
        error: 'Invalid response from Shopify API' 
      };
    }
  } catch (error: any) {
    log(`Shopify connection test failed: ${error.message}`, 'shopify-test-error');
    return { 
      success: false, 
      error: error.message || 'Connection test failed' 
    };
  }
}