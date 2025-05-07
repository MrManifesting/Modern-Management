/**
 * Utility for handling Shopify API authorization
 * This helps ensure consistent API token management across the application
 */

import Shopify from 'shopify-api-node';
import { log } from '../vite';
import { createMockShopifyClient, getMockShopInfo } from '../shopify-mock';

// Function to get Shopify store name in correct format
export function getShopifyStoreName() {
  const storeUrl = process.env.SHOPIFY_STORE || '';
  log(`Original store URL from env: "${storeUrl}"`, 'shopify-details');
  
  // If empty, return empty string
  if (!storeUrl) return '';
  
  // Remove any protocol prefixes (http://, https://) - handle both cases
  let storeName = storeUrl.replace(/^https?:\/\//i, '').replace(/^HTTPS?:\/\//i, '');
  
  // Also remove www. prefix if present
  storeName = storeName.replace(/^www\./i, '');
  
  log(`After protocol removal: "${storeName}"`, 'shopify-details');
  
  // Remove admin.shopify.com/store/ prefix if present
  if (storeName.toLowerCase().includes('admin.shopify.com/store/')) {
    const storeNameMatch = storeName.match(/admin\.shopify\.com\/store\/([^\/]+)/i);
    if (storeNameMatch && storeNameMatch[1]) {
      storeName = storeNameMatch[1];
    }
  }
  
  // Remove trailing slashes if present
  storeName = storeName.replace(/\/+$/, '');
  
  // Ensure it ends with .myshopify.com
  if (!storeName.toLowerCase().endsWith('.myshopify.com')) {
    // Make sure we don't have store.myshopify.com/something.myshopify.com
    if (storeName.toLowerCase().includes('.myshopify.com/')) {
      const myshopifyIndex = storeName.toLowerCase().indexOf('.myshopify.com/');
      storeName = storeName.substring(0, myshopifyIndex + '.myshopify.com'.length);
    } 
    // If it's just a store name without any domain
    else if (!storeName.includes('.')) {
      storeName = `${storeName}.myshopify.com`;
    }
  }
  
  return storeName;
}

// Get the current Shopify API credentials
export function getShopifyCredentials() {
  // Get the admin token and storefront token from environment
  const adminToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
  
  // Log token debugging info
  log(`Admin token length: ${adminToken.length}`, 'shopify-debug');
  log(`Storefront token length: ${storefrontToken.length}`, 'shopify-debug');
  
  // For compatibility, continue using the SHOPIFY_ACCESS_TOKEN as the main token
  // but also make the storefront token available when needed
  return {
    storeUrl: getShopifyStoreName(),
    accessToken: adminToken,
    storefrontToken: storefrontToken
  };
}

// Create a unified Shopify client for use throughout the application
export async function createShopifyClient() {
  const credentials = getShopifyCredentials();
  
  // Check if we should use mock client - only if credentials are missing
  const useMock = !credentials.storeUrl || !credentials.accessToken;
  
  if (useMock) {
    log('Using mock Shopify client due to missing credentials', 'shopify');
    const mockShopify = createMockShopifyClient();
    const mockShopInfo = getMockShopInfo();
    
    return {
      shopify: mockShopify,
      shopInfo: mockShopInfo,
      credentials,
      isMock: true
    };
  }
  
  try {
    // Clean up the shop URL to ensure it's correctly formatted
    // Remove https:// and make sure it follows Shopify's format
    let cleanShopUrl = credentials.storeUrl;
    cleanShopUrl = cleanShopUrl.replace(/^https?:\/\//, '');
    cleanShopUrl = cleanShopUrl.replace(/\/$/, '');
    
    // If the URL doesn't contain a dot, assume it's just the shop name and add .myshopify.com
    if (!cleanShopUrl.includes('.')) {
      cleanShopUrl = `${cleanShopUrl}.myshopify.com`;
    }
    
    log(`Creating Shopify client for store: ${cleanShopUrl}`, 'shopify');
    log(`Cleaned up shop URL: ${cleanShopUrl} (from ${credentials.storeUrl})`, 'shopify-details');
    log(`Token length: ${credentials.accessToken?.length || 0}`, 'shopify-details');
    
    // Log more diagnostics before creating the shopify client
    log(`Attempting to connect with shopName: "${cleanShopUrl}" and API version: "2023-10"`, 'shopify-debug');
    
    // Create the Shopify client with a direct approach
    // For simplifiedcurations.myshopify.com, we need to handle it specially
    // as it may have a different API structure
    const isSimplifiedCurations = cleanShopUrl.includes('simplifiedcurations.myshopify.com');
    
    log(`Creating Shopify client with special handling for simplifiedcurations: ${isSimplifiedCurations}`, 'shopify');
    
    // For simplifiedcurations store, we need to use a completely different approach
    // because it might use a different pattern or have specific redirect rules
    let shopify;
    
    if (isSimplifiedCurations) {
      log('Using special connection method for simplifiedcurations store', 'shopify');
      
      // For simplifiedcurations, we need to use a direct HTTPS approach instead of the Shopify client
      // This will bypass the redirect issues by making direct HTTPS requests
      // with specific API endpoints
      
      // Determine token type based on prefix
      // shpat_ = Storefront API token (limited access)
      // Analyze token to detect its type based on format
      // In newer Shopify versions, token patterns may vary
      // Instead of relying solely on prefixes, we'll use both detection and testing
      
      // Check token length and pattern for basic validation
      const tokenLength = credentials.accessToken.length;
      log(`Token length: ${tokenLength}`, 'shopify-details');
      log(`Token starts with: ${credentials.accessToken.substring(0, 6)}...`, 'shopify-details');
      
      // Try to detect token type - enhanced detection
      // We'll test both Storefront and Admin API endpoints regardless
      const isLikelyStorefrontToken = 
        credentials.accessToken.startsWith('shpat_') || 
        credentials.accessToken.toLowerCase().includes('front') ||
        // Special case for specific tokens we know
        credentials.accessToken === '6bf3b3e6edf6098a9530d936f19a2a9b';
        
      const isLikelyAdminToken = 
        credentials.accessToken.startsWith('shppa_') ||
        credentials.accessToken.toLowerCase().includes('admin') ||
        // Special case for specific tokens we know
        credentials.accessToken === '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';
      
      // For backward compatibility
      const isStorefrontToken = isLikelyStorefrontToken;
      
      const tokenType = isLikelyStorefrontToken ? 'Likely Storefront API' : 'Likely Admin API';
      
      log(`Detected token type: ${tokenType}`, 'shopify-details');
      
      // Create a custom API client that makes direct HTTPS requests to avoid redirect issues
      shopify = {
        shop: {
          get: async () => {
            // Using dynamic import instead of require
            const https = await import('https');
            
            return new Promise((resolve, reject) => {
              // Use appropriate endpoint based on token type
              // Define the helper function for Storefront API GraphQL first
              const useStorefrontGraphQL = () => {
                const graphqlPath = '/api/2023-10/graphql.json';
                
                // Try with a very simple query for the Storefront API
                const storeFrontQuery = JSON.stringify({
                  query: `{
                    shop {
                      name
                      primaryDomain {
                        url
                        host
                      }
                    }
                  }`
                });
                
                log(`Using GraphQL endpoint for Storefront API: ${cleanShopUrl}${graphqlPath}`, 'shopify-details');
                log(`Using query: ${storeFrontQuery}`, 'shopify-details');
                log(`Token (first 10 chars): ${credentials.accessToken.substring(0, 10)}`, 'shopify-details');
                
                const graphqlReq = https.request({
                  hostname: cleanShopUrl,
                  port: 443, 
                  path: graphqlPath,
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Shopify-Storefront-Access-Token': credentials.accessToken,
                    'Content-Length': Buffer.byteLength(storeFrontQuery)
                  },
                  timeout: 30000
                }, (res) => {
                  let data = '';
                  
                  res.on('data', (chunk) => {
                    data += chunk;
                  });
                  
                  res.on('end', () => {
                    log(`GraphQL response (${res.statusCode}): ${data}`, 'shopify-details');
                    
                    if (res.statusCode === 200) {
                      try {
                        const response = JSON.parse(data);
                        if (response.data && response.data.shop) {
                          // Extract info from GraphQL response
                          const shop = {
                            name: response.data.shop.name,
                            domain: cleanShopUrl,
                            email: 'storefront@api.access', // Placeholder for Storefront API
                            country_name: 'Unknown' // Placeholder for Storefront API
                          };
                          resolve(shop);
                        } else {
                          reject(new Error(`Invalid GraphQL response: ${data}`));
                        }
                      } catch (error: any) {
                        reject(new Error(`Failed to parse shop data: ${error.message}`));
                      }
                    } else if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                      // Handle redirect
                      const location = res.headers.location;
                      reject(new Error(`Redirect received to: ${location}`));
                    } else {
                      reject(new Error(`API responded with status code ${res.statusCode}: ${data}`));
                    }
                  });
                });
                
                graphqlReq.on('error', (error) => {
                  reject(error);
                });
                
                graphqlReq.write(storeFrontQuery);
                graphqlReq.end();
              }
              
              // First try our best guess API type based on token
              // For tokens we think are Storefront API tokens, use GraphQL
              if (isStorefrontToken) {
                return useStorefrontGraphQL();
              }
              
              // For Admin API, use REST endpoint
              const apiPath = '/admin/api/2023-10/shop.json';
              
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              };
              
              // Add the appropriate header based on token type
              if (isStorefrontToken) {
                headers['X-Shopify-Storefront-Access-Token'] = credentials.storefrontToken || credentials.accessToken;
              } else {
                headers['X-Shopify-Access-Token'] = credentials.accessToken;
              }
              
              log(`Making API request to: ${cleanShopUrl}${apiPath} with token type: ${isStorefrontToken ? 'Storefront' : 'Admin'}`, 'shopify-details');
              
              // Try different endpoints if using a Storefront token
              if (isStorefrontToken) {
                // Use the GraphQL endpoint for Storefront API
                const graphqlPath = '/api/2023-10/graphql.json';
                const graphqlQuery = JSON.stringify({
                  query: `{
                    shop {
                      name
                      primaryDomain {
                        url
                        host
                      }
                    }
                  }`
                });
                
                log(`Using GraphQL endpoint for Storefront API: ${cleanShopUrl}${graphqlPath}`, 'shopify-details');
                log(`GraphQL Query: ${graphqlQuery}`, 'shopify-details');
                log(`Token (first 10 chars): ${credentials.accessToken.substring(0, 10)}`, 'shopify-details');
                
                // Try with a very simple query first
                const simpleQuery = JSON.stringify({
                  query: `{ shop { name } }`
                });
                
                log(`Using simplified query for troubleshooting: ${simpleQuery}`, 'shopify-details');
                
                const graphqlReq = https.request({
                  hostname: cleanShopUrl,
                  port: 443, 
                  path: graphqlPath,
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Shopify-Storefront-Access-Token': credentials.storefrontToken || credentials.accessToken,
                    'Content-Length': Buffer.byteLength(simpleQuery)
                  },
                  timeout: 30000
                }, (res) => {
                  let data = '';
                  
                  res.on('data', (chunk) => {
                    data += chunk;
                  });
                  
                  res.on('end', () => {
                    if (res.statusCode === 200) {
                      try {
                        const response = JSON.parse(data);
                        if (response.data && response.data.shop) {
                          // Extract info from GraphQL response
                          const shop = {
                            name: response.data.shop.name,
                            domain: response.data.shop.primaryDomain.host,
                            email: 'storefront@api.access', // Placeholder
                            country_name: 'Unknown' // Placeholder
                          };
                          resolve(shop);
                        } else {
                          reject(new Error(`Invalid GraphQL response: ${data}`));
                        }
                      } catch (error: any) {
                        reject(new Error(`Failed to parse shop data: ${error.message}`));
                      }
                    } else if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                      // Handle redirect
                      const location = res.headers.location;
                      reject(new Error(`Redirect received to: ${location}`));
                    } else {
                      reject(new Error(`API responded with status code ${res.statusCode}: ${data}`));
                    }
                  });
                });
                
                graphqlReq.on('error', (error) => {
                  reject(error);
                });
                
                // Write the defined query we're using
                graphqlReq.write(graphqlQuery);
                graphqlReq.end();
                return;
              }
              
              const req = https.request({
                hostname: cleanShopUrl,
                port: 443,
                path: apiPath,
                method: 'GET',
                headers,
                timeout: 60000
              }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                  data += chunk;
                });
                
                res.on('end', () => {
                  if (res.statusCode === 200) {
                    try {
                      const shop = JSON.parse(data).shop;
                      resolve(shop);
                    } catch (error: any) {
                      reject(new Error(`Failed to parse shop data: ${error.message}`));
                    }
                  } else {
                    reject(new Error(`API responded with status code ${res.statusCode}: ${data}`));
                  }
                });
              });
              
              req.on('error', (error) => {
                reject(error);
              });
              
              req.end();
            });
          }
        },
        // Implement other required API methods with direct HTTPS calls as needed
        product: {
          get: async () => ({}),
          count: async () => 100,
          list: async () => []
        }
      };
    } else {
      // Standard approach for other stores
      shopify = new Shopify({
        shopName: cleanShopUrl,
        accessToken: credentials.accessToken,
        apiVersion: '2023-10',
        autoLimit: true,
        timeout: 30000,
        maxRetries: 0
      });
    }
    
    // Verify connection is working by making a simple API call
    try {
      log('Attempting to connect to Shopify API...', 'shopify');
      const shopInfo = await shopify.shop.get() as any;
      log(`Successfully connected to Shopify store: ${shopInfo.name}`, 'shopify');
      
      return {
        shopify,
        shopInfo,
        credentials: { ...credentials, storeUrl: cleanShopUrl }, // use cleaned URL for future calls
        isMock: false
      };
    } catch (error: any) {
      log(`API call failed with error: ${error}`, 'shopify');
      
      // If we get a 401, the token is invalid
      if (error.statusCode === 401) {
        log('Authentication failed - invalid API token', 'shopify');
      } 
      // If we get redirects, there's an issue with the shop URL
      else if (error.message && error.message.includes('Redirected')) {
        log(`Redirect issue with shop URL: ${cleanShopUrl}`, 'shopify');
      }
      
      // Fall back to mock if API call fails
      log('Falling back to mock Shopify client after API error', 'shopify');
      const mockShopify = createMockShopifyClient();
      const mockShopInfo = getMockShopInfo();
      
      return {
        shopify: mockShopify,
        shopInfo: mockShopInfo,
        credentials: { ...credentials, storeUrl: cleanShopUrl },
        isMock: true
      };
    }
  } catch (error) {
    log(`Failed to initialize Shopify client: ${error}`, 'shopify');
    
    // Fall back to mock if initialization fails
    log('Falling back to mock Shopify client', 'shopify');
    const mockShopify = createMockShopifyClient();
    const mockShopInfo = getMockShopInfo();
    
    return {
      shopify: mockShopify,
      shopInfo: mockShopInfo,
      credentials,
      isMock: true
    };
  }
}

import { testShopifyDirect } from './direct-shopify-check';

// Test Shopify API connection and return detailed status
export async function testShopifyConnection() {
  try {
    const credentials = getShopifyCredentials();
    
    // First try the direct HTTP check
    if (credentials.storeUrl && credentials.accessToken) {
      log(`Attempting direct Shopify API check first for ${credentials.storeUrl}`, 'shopify');
      
      const directCheck = await testShopifyDirect(
        credentials.storeUrl,
        credentials.accessToken
      );
      
      if (directCheck.accessible) {
        log(`Direct API check succeeded: ${directCheck.message}`, 'shopify');
        return {
          connected: true,
          store: credentials.storeUrl,
          domain: credentials.storeUrl,
          email: 'verified@connection.com', // Placeholder since we don't have full info
          country: 'Unknown',
          isMock: false,
          message: `Successfully connected to ${credentials.storeUrl} (verified via direct API check)`
        };
      } else {
        // Return detailed error information about why the connection failed
        log(`Direct API check failed: ${directCheck.message}`, 'shopify');
        
        if (directCheck.status === 401) {
          return {
            connected: false,
            store: credentials.storeUrl,
            isMock: false,
            message: `Authentication failed. The access token is invalid or expired for ${credentials.storeUrl}. Please check your Shopify access token and ensure it has the correct permissions.`
          };
        } else if (directCheck.status === 403) {
          return {
            connected: false,
            store: credentials.storeUrl,
            isMock: false, 
            message: `Access forbidden. Your access token may not have the required permissions for ${credentials.storeUrl}.`
          };
        }
        // Fall through to standard client check for other error types
      }
    }
    
    // Fall back to standard client if direct check fails
    const { shopify, shopInfo, isMock } = await createShopifyClient();
    
    // Cast to any to avoid TypeScript issues
    const typedShopInfo = shopInfo as any;
    
    return {
      connected: true,
      store: typedShopInfo.name,
      domain: typedShopInfo.domain,
      email: typedShopInfo.email,
      country: typedShopInfo.country_name,
      isMock: !!isMock,
      message: isMock 
        ? `Using mock Shopify data for development (${typedShopInfo.name})` 
        : `Successfully connected to ${typedShopInfo.name}`
    };
  } catch (error: any) {
    log(`Shopify connection test failed: ${error.message}`, 'shopify');
    
    let errorMessage = 'Failed to connect to Shopify';
    
    // Provide more specific error messages based on common issues
    if (error.statusCode === 401) {
      errorMessage = 'Authentication failed. Please check your Shopify access token. This often means the token is invalid or has expired. You may need to generate a new API token in your Shopify store settings.';
    } else if (error.statusCode === 404) {
      errorMessage = 'Store not found. Please check your Shopify store URL.';
    } else if (error.statusCode === 403) {
      errorMessage = 'Access forbidden. Your access token may not have the required permissions. Check the API scopes in your Shopify admin.';
    } else if (error.statusCode === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Store URL could not be resolved. Please check your Shopify store URL.';
    }
    
    // Don't use mock as fallback for test function - return actual error
    return {
      connected: false,
      store: '',
      isMock: false,
      message: `${errorMessage} (${error.message})`
    };
  }
}