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
          console.log('Using standard structure (client.shopify.product.create)');
          const response = await client.shopify.product.create(shopifyProduct);
          console.log('Shopify API response structure:', Object.keys(response));
          result = response;
        } else if (client.product && typeof client.product.create === 'function') {
          // Alternative client structure
          console.log('Using alternative structure (client.product.create)');
          const response = await client.product.create(shopifyProduct);
          console.log('Shopify API response structure:', Object.keys(response));
          result = response;
        } else if (typeof client.create === 'function') {
          // Direct client structure
          console.log('Using direct structure (client.create)');
          const response = await client.create(shopifyProduct);
          console.log('Shopify API response structure:', Object.keys(response));
          result = response;
        } else {
          // Fallback to direct API call using Fetch
          console.log('Using fallback direct fetch API call');
          const credentials = await getShopifyCredentials();
          
          if (!credentials || !credentials.accessToken || !credentials.storeUrl) {
            console.error('Missing credentials for Shopify API call');
            throw new Error('Missing Shopify credentials for direct API call');
          }
          
          const storeUrl = credentials.storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const accessToken = credentials.accessToken;
          
          console.log(`[${new Date().toISOString()}] Making direct API call to ${storeUrl}/admin/api/2023-10/products.json`);
          
          // Log product data for debugging
          console.log('Shopify product data being sent:', {
            title: shopifyProduct.title,
            body_html: shopifyProduct.body_html ? shopifyProduct.body_html.substring(0, 100) + '...' : 'None',
            variants: shopifyProduct.variants?.length || 0,
            price: shopifyProduct.variants?.[0]?.price || 'N/A',
            sku: shopifyProduct.variants?.[0]?.sku || 'N/A',
            quantity: shopifyProduct.variants?.[0]?.inventory_quantity || 0
          });
          
          // Prepare the request body
          const requestBody = JSON.stringify({ product: shopifyProduct });
          console.log('Request body length:', requestBody.length, 'bytes');
          
          // Make the API call with a timeout to detect hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          try {
            const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json`, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: requestBody,
              signal: controller.signal
            });
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            
            // Log the raw response details
            console.log(`[${new Date().toISOString()}] Shopify API response received:`, {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries([...response.headers.entries()]),
              size: response.headers.get('content-length') || 'unknown'
            });
          
            console.log('Shopify API direct fetch response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Shopify API error response:', errorText);
              throw new Error(`Shopify API error (${response.status}): ${errorText}`);
            }
          
            const data = await response.json();
            // Safely log the response structure without risking circular reference issues
            try {
              console.log('Shopify API response JSON structure:', Object.keys(data));
              
              // Create a safe version of the data for logging by removing potentially circular references
              const safeData = {};
              Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object' && data[key] !== null) {
                  safeData[key] = '[Object]';
                } else {
                  safeData[key] = data[key];
                }
              });
              
              console.log('Shopify API response data keys:', safeData);
              
              // Only try to stringify the full object if it's reasonably small
              if (JSON.stringify(safeData).length < 10000) {
                console.log('Complete Shopify API response (limited):', JSON.stringify(data, null, 2).substring(0, 2000) + '...');
              } else {
                console.log('Shopify API response too large to log completely');
              }
            } catch (logError) {
              console.error('Error logging Shopify API response:', logError);
            }
          
            // Check for various response structures
            if (data.product) {
              result = data.product;
              console.log(`[${new Date().toISOString()}] Found product in data.product`);
            } else if (data.products) {
              // Some versions of the API might return an array in 'products'
              result = data.products[0];
              console.log(`[${new Date().toISOString()}] Found product in data.products[0]`);
            } else if (data.data && data.data.product) {
              // GraphQL response format
              result = data.data.product;
              console.log(`[${new Date().toISOString()}] Found product in data.data.product`);
            } else if (data.id) {
              // The response might be the product object directly
              result = data;
              console.log(`[${new Date().toISOString()}] Using data directly as product (has ID)`);
            } else {
              console.error('Shopify API response missing product data:', data);
              throw new Error('Shopify API response missing product data');
            }
          } catch (fetchError) {
            // Clean up the timeout if there was an error
            clearTimeout(timeoutId);
            console.error(`[${new Date().toISOString()}] Error making Shopify API request:`, fetchError);
            throw fetchError;
          }
        }
      } catch (error) {
        const clientError = error as Error;
        console.error('Error in Shopify client.create:', clientError);
        console.error('Full error details:', {
          message: clientError.message,
          stack: clientError.stack,
          name: clientError.name
        });
        
        // Check for specific Shopify error patterns
        if (clientError.message && clientError.message.includes('401')) {
          throw new Error(`Shopify authentication error: Invalid or expired token. Please update your Shopify credentials.`);
        } else if (clientError.message && clientError.message.includes('422')) {
          throw new Error(`Invalid product data: ${clientError.message}`);
        } else if (clientError.message && clientError.message.includes('429')) {
          throw new Error(`Shopify rate limit exceeded. Please try again later.`);
        } else {
          throw new Error(`Client create error: ${clientError.message || 'Unknown error'}`);
        }
      }
      
      // Verify that we have a valid result before proceeding
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from Shopify API: No product data returned');
      }
      
      // Handle different ID formats from Shopify API
      let shopifyProductId = 0;
      
      try {
        // Make sure we have an ID in the result
        if (!result.id) {
          console.warn('Shopify product result has no ID property:', result);
          // Try to find ID in a different location
          if (result.admin_graphql_api_id) {
            console.log('Using admin_graphql_api_id instead of id');
            result.id = result.admin_graphql_api_id;
          } else {
            throw new Error('No product ID found in Shopify API response');
          }
        }
        
        const shopifyId = result.id.toString();
        console.log('Raw Shopify product ID:', shopifyId);
        
        // Handle numeric ID
        if (/^\d+$/.test(shopifyId)) {
          shopifyProductId = parseInt(shopifyId);
        } 
        // Handle GID format (gid://shopify/Product/1234567890)
        else if (shopifyId.includes('/')) {
          const idParts = shopifyId.split('/');
          const lastPart = idParts[idParts.length - 1];
          shopifyProductId = parseInt(lastPart || '0');
        }
        
        console.log('Extracted Shopify product ID:', shopifyProductId);
        
        if (isNaN(shopifyProductId) || shopifyProductId === 0) {
          throw new Error(`Failed to extract valid product ID from: ${shopifyId}`);
        }
      } catch (error) {
        console.error('Error extracting Shopify product ID:', error);
        // Continue with shopifyProductId = 0, we'll handle this in the updateItemWithShopifyId check
      }
      
      // In a real implementation, we would update the item with the Shopify ID
      if (shopifyProductId > 0) {
        await updateItemWithShopifyId(item.id, shopifyProductId);
      }
      
      // Make sure we have variants array before trying to map it
      let variantIds: any[] = [];
      
      try {
        const variants = result.variants || [];
        
        if (Array.isArray(variants)) {
          console.log('Variant data available:', variants.length, 'variants found');
          variantIds = variants
            .map((v: any) => v && v.id ? v.id : null)
            .filter(Boolean);
        } else {
          console.log('No variant array found in result');
        }
      } catch (error) {
        console.error('Error processing variant IDs:', error);
      }
        
      return {
        success: true,
        message: `Successfully pushed product "${item.name}" to Shopify`,
        data: {
          shopifyProductId,
          shopifyProductGid: result.id || 'unknown',
          shopifyVariantIds: variantIds,
          responseType: typeof result,
          responseKeys: Object.keys(result)
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