/**
 * Utility to perform a direct check on Shopify connectivity
 * This bypasses the shopify-api-node package to diagnose potential issues
 */

import https from 'https';
import { log } from '../vite';

/**
 * Test direct connectivity to a Shopify store
 */
export async function testShopifyDirect(storeUrl: string, accessToken: string): Promise<{
  accessible: boolean;
  status?: number;
  message: string;
  isShopify: boolean;
  redirectUrl?: string;
}> {
  return new Promise((resolve) => {
    log(`Testing direct connectivity to: ${storeUrl}`, 'shopify-direct');
    
    // Clean up URL - remove protocol and trailing slashes
    let cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Make sure it has myshopify.com if it's just a store name
    if (!cleanUrl.includes('.')) {
      cleanUrl = `${cleanUrl}.myshopify.com`;
    }
    
    // Check if this is a Storefront API token
    const isStorefrontToken = accessToken.startsWith('shpat_');
    log(`Token type: ${isStorefrontToken ? 'Storefront API' : 'Admin API'}`, 'shopify-direct');
    
    // Special handling for simplifiedcurations.myshopify.com
    const isSimplifiedCurations = cleanUrl.includes('simplifiedcurations.myshopify.com');
    if (isSimplifiedCurations) {
      log(`Special handling for simplifiedcurations store`, 'shopify-direct');
      // For simplifiedcurations, we'll use a direct approach that bypasses most of the checks
      // since we know precisely which endpoint works
      
      // Select appropriate endpoint based on token type
      const apiPath = isStorefrontToken
        ? '/api/2023-10/shop.json'  // Storefront API
        : '/admin/api/2023-10/shop.json'; // Admin API
      
      // Set appropriate headers based on token type
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (isStorefrontToken) {
        headers['X-Shopify-Storefront-Access-Token'] = accessToken;
      } else {
        headers['X-Shopify-Access-Token'] = accessToken;
      }
      
      log(`Making API request to: ${cleanUrl}${apiPath} with token type: ${isStorefrontToken ? 'Storefront' : 'Admin'}`, 'shopify-direct');
      
      // Use a direct HTTPS request to a known working endpoint
      const apiReq = https.request({
        hostname: 'simplifiedcurations.myshopify.com',
        port: 443,
        path: apiPath,
        method: 'GET',
        headers,
        timeout: 30000 // Extended timeout
      }, (apiRes) => {
        log(`Direct API call to simplifiedcurations - Status: ${apiRes.statusCode}`, 'shopify-direct');
        
        let data = '';
        apiRes.on('data', (chunk) => {
          data += chunk;
        });
        
        apiRes.on('end', () => {
          if (apiRes.statusCode === 200) {
            log(`Successfully connected to simplifiedcurations Shopify API`, 'shopify-direct');
            resolve({
              accessible: true,
              status: apiRes.statusCode,
              message: `Successfully connected to simplifiedcurations Shopify API`,
              isShopify: true
            });
          } else if (apiRes.statusCode === 401) {
            log(`Authentication failed for simplifiedcurations: ${data}`, 'shopify-direct');
            resolve({
              accessible: false,
              status: apiRes.statusCode,
              message: `Authentication failed. The access token may be invalid or expired.`,
              isShopify: true
            });
          } else {
            log(`Unexpected status code for simplifiedcurations: ${apiRes.statusCode}`, 'shopify-direct');
            resolve({
              accessible: false,
              status: apiRes.statusCode,
              message: `Unexpected status code: ${apiRes.statusCode} when connecting to simplifiedcurations`,
              isShopify: true
            });
          }
        });
      });
      
      apiReq.on('error', (error) => {
        log(`Error accessing simplifiedcurations API: ${error.message}`, 'shopify-direct');
        resolve({
          accessible: false,
          message: `Connection error for simplifiedcurations: ${error.message}`,
          isShopify: true
        });
      });
      
      apiReq.on('timeout', () => {
        log(`Timeout accessing simplifiedcurations API`, 'shopify-direct');
        apiReq.destroy();
        resolve({
          accessible: false,
          message: 'Connection timed out after 30 seconds for simplifiedcurations',
          isShopify: true
        });
      });
      
      apiReq.end();
      return; // Exit early after special handling
    }
    
    log(`Using cleaned URL: ${cleanUrl}`, 'shopify-direct');
    
    // First check if the store exists by accessing the root domain
    const domainCheckReq = https.request({
      hostname: cleanUrl,
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000
    }, (domainRes) => {
      log(`Store domain check ${cleanUrl} - Status Code: ${domainRes.statusCode}`, 'shopify-direct');
      
      // Check for Shopify-specific headers to confirm it's a Shopify store
      const isShopify = !!domainRes.headers['x-shopify-stage'] || 
                       !!domainRes.headers['shopify-edge-ip'] ||
                       !!domainRes.headers['x-shopify'];
      
      if (isShopify) {
        log(`Confirmed Shopify store domain`, 'shopify-direct');
        
        // Now try the API
        // Add special handling for simplifiedcurations store
        const apiUrlVariants = isSimplifiedCurations
          ? [
              // For simplifiedcurations, try more API versions
              {
                hostname: cleanUrl,
                path: '/admin/api/2023-10/shop.json'
              },
              {
                hostname: cleanUrl,
                path: '/admin/api/2023-07/shop.json'
              },
              {
                hostname: cleanUrl,
                path: '/admin/api/2023-04/shop.json'
              },
              {
                hostname: cleanUrl,
                path: '/admin/api/2023-01/shop.json'
              }
            ]
          : [
              // Standard API endpoints for other stores
              // First try the standard GraphQL admin API
              {
                hostname: cleanUrl,
                path: '/admin/api/2023-10/graphql.json'
              },
              // Then try the REST admin API
              {
                hostname: cleanUrl,
                path: '/admin/api/2023-10/shop.json'
              },
              // Try older API version
              {
                hostname: cleanUrl,
                path: '/admin/api/2023-04/shop.json'
              },
              // Try the partner API format
              {
                hostname: 'partners.shopify.com',
                path: `/api/2023-10/shops/${cleanUrl}.json`
              }
            ];
        
        // Define the recursive function to try each API endpoint variant
        const tryApiEndpoints = (variants: Array<{hostname: string, path: string}>, index: number) => {
          if (index >= variants.length) {
            // All variants failed, but we know it's a Shopify store
            resolve({
              accessible: false,
              status: 0,
              message: `Store exists but API access failed. Your API credentials may be incorrect or scoped improperly.`,
              isShopify: true
            });
            return;
          }
          
          const variant = variants[index];
          log(`Trying API endpoint: ${variant.hostname}${variant.path}`, 'shopify-direct');
          
          // Set appropriate headers based on token type
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          
          if (isStorefrontToken) {
            headers['X-Shopify-Storefront-Access-Token'] = accessToken;
          } else {
            headers['X-Shopify-Access-Token'] = accessToken;
          }
          
          const apiReq = https.request({
            hostname: variant.hostname,
            port: 443,
            path: variant.path,
            method: 'GET',
            headers,
            timeout: 10000
          }, (apiRes) => {
            log(`API endpoint ${variant.hostname}${variant.path} - Status: ${apiRes.statusCode}`, 'shopify-direct');
            
            let data = '';
            apiRes.on('data', (chunk) => {
              data += chunk;
            });
            
            apiRes.on('end', () => {
              if (apiRes.statusCode === 200) {
                log(`Successfully connected to Shopify API`, 'shopify-direct');
                resolve({
                  accessible: true,
                  status: apiRes.statusCode,
                  message: `Successfully connected to Shopify API`,
                  isShopify: true
                });
              } else if (apiRes.statusCode === 301 || apiRes.statusCode === 302 || apiRes.statusCode === 307) {
                // Handle redirects for this endpoint
                const location = apiRes.headers.location;
                log(`Received redirect to: ${location}`, 'shopify-direct');
                
                if (location) {
                  // Extract hostname and path from the redirect URL
                  try {
                    const redirectUrl = new URL(location.startsWith('http') ? location : `https://${location}`);
                    const redirectHostname = redirectUrl.hostname;
                    
                    // If we received a redirect and it's a 401, pass the redirect URL back
                    // This helps the calling code attempt a direct connection to the redirected hostname
                    if (variant.hostname !== redirectHostname && 
                        (variant.path.includes('/admin/api/') && 
                         (variant.path.includes('/shop.json') || variant.path.includes('/graphql.json')))) {
                      // Try the redirected location
                      // Set appropriate headers for redirect based on token type
                      const redirectHeaders: Record<string, string> = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      };
                      
                      if (isStorefrontToken) {
                        redirectHeaders['X-Shopify-Storefront-Access-Token'] = accessToken;
                      } else {
                        redirectHeaders['X-Shopify-Access-Token'] = accessToken;
                      }
                      
                      const redirectReq = https.request({
                        hostname: redirectUrl.hostname,
                        port: 443,
                        path: redirectUrl.pathname + redirectUrl.search,
                        method: 'GET',
                        headers: redirectHeaders,
                        timeout: 10000
                      }, (redirectRes) => {
                        log(`Redirect API call ${redirectUrl.hostname}${redirectUrl.pathname} - Status: ${redirectRes.statusCode}`, 'shopify-direct');
                        
                        let redirectData = '';
                        redirectRes.on('data', (chunk) => {
                          redirectData += chunk;
                        });
                        
                        redirectRes.on('end', () => {
                          if (redirectRes.statusCode === 200) {
                            log(`Successfully connected to Shopify API via redirect`, 'shopify-direct');
                            resolve({
                              accessible: true,
                              status: redirectRes.statusCode,
                              message: `Successfully connected to Shopify API via redirect`,
                              isShopify: true,
                              redirectUrl: redirectHostname
                            });
                          } else if (redirectRes.statusCode === 401) {
                            // If we get a 401 on the redirected URL, return it so the caller knows to try this URL
                            resolve({
                              accessible: false,
                              status: redirectRes.statusCode,
                              message: `Authentication failed when connecting to ${redirectHostname}. The access token may be invalid or expired.`,
                              isShopify: true,
                              redirectUrl: redirectHostname
                            });
                          } else {
                            // This redirect didn't work, try the next endpoint variant
                            tryApiEndpoints(variants, index + 1);
                          }
                        });
                      });
                      
                      redirectReq.on('error', () => {
                        tryApiEndpoints(variants, index + 1);
                      });
                      
                      redirectReq.end();
                      return;
                    }
                  } catch (error) {
                    log(`Failed to follow redirect: ${error}`, 'shopify-direct');
                  }
                }
                
                // If we get here, the redirect handling failed
                tryApiEndpoints(variants, index + 1);
              } else {
                // Try the next endpoint variant
                tryApiEndpoints(variants, index + 1);
              }
            });
          });
          
          apiReq.on('error', () => {
            tryApiEndpoints(variants, index + 1);
          });
          
          apiReq.end();
        };
        
        // Start checking the endpoints
        tryApiEndpoints(apiUrlVariants, 0);
      } else {
        // Not a Shopify store
        resolve({
          accessible: false,
          status: domainRes.statusCode,
          message: `The URL does not appear to be a Shopify store`,
          isShopify: false
        });
      }
    });
    
    domainCheckReq.on('error', (error) => {
      log(`Error accessing store domain ${cleanUrl}: ${error.message}`, 'shopify-direct');
      resolve({
        accessible: false,
        message: `Connection error: ${error.message}`,
        isShopify: false
      });
    });
    
    domainCheckReq.on('timeout', () => {
      log(`Timeout accessing store domain ${cleanUrl}`, 'shopify-direct');
      domainCheckReq.destroy();
      resolve({
        accessible: false,
        message: 'Connection timed out after 10 seconds',
        isShopify: false
      });
    });
    
    domainCheckReq.end();
  });
}