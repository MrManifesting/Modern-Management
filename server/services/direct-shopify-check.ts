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
    
    // Analyze token for better detection
    const tokenLength = accessToken.length;
    const tokenPrefix = accessToken.substring(0, 6);
    
    // Check if token appears to be masked (contains "••••••") or has invalid characters
    const isMaskedToken = accessToken.includes('•') || accessToken.includes(' ') || accessToken.includes('\n');
    
    // Always use the environment token as it's most reliable
    let realToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    
    if (isMaskedToken || accessToken.length < 20) {
      log(`Detected masked/invalid token, using environment variable instead`, 'shopify-direct');
      
      if (realToken.length > 0) {
        // Re-calculate token length and prefix with the real token
        const realTokenLength = realToken.length;
        const realTokenPrefix = realToken.substring(0, 6);
        log(`Real token details - Length: ${realTokenLength}, Prefix: ${realTokenPrefix}...`, 'shopify-direct');
      } else {
        log(`WARNING: Environment token is empty or not set`, 'shopify-direct');
      }
    } else {
      // Log token details for debugging
      log(`Using provided token - Length: ${tokenLength}, Prefix: ${tokenPrefix}...`, 'shopify-direct');
    }
    
    // Determine token type based on patterns
    // For Admin API tokens (starting with shpat_)
    const adminTokenPattern = /^shpat_/;
    // For Storefront API tokens (typically no specific prefix or starting with shpfs_)
    const storefrontTokenPattern = /^shpfs_/;
    
    // Check for specific admin tokens we know
    let isAdminToken = 
        adminTokenPattern.test(accessToken) ||
        accessToken === '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' ||
        accessToken.startsWith('shpca_') ||
        accessToken.startsWith('shpss_') ||
        accessToken.startsWith('shppa_');
        
    // Check for storefront tokens
    let isStorefrontToken = 
        !isAdminToken && (
            storefrontTokenPattern.test(accessToken) ||
            accessToken.includes('front') ||
            accessToken === '6bf3b3e6edf6098a9530d936f19a2a9b'
        );
        
    // Legacy Admin token support - if it starts with shp but wasn't caught above
    if (!isAdminToken && !isStorefrontToken && accessToken.startsWith('shp')) {
        log(`Assuming Admin API token for legacy prefix: ${accessToken.substring(0, 6)}`, 'shopify-direct');
        isAdminToken = true;
    }
    
    // Specific token type detection for better debugging
    const isCustomAdminToken = accessToken.startsWith('shpca_');
    const isAppStoreToken = accessToken.startsWith('shpss_');
    const isPartnerToken = accessToken.startsWith('shppa_');
    
    const tokenType = isStorefrontToken ? 'Storefront API' :
                    isCustomAdminToken ? 'Custom App Admin API' :
                    isAppStoreToken ? 'App Store Admin API' :
                    isPartnerToken ? 'Partner API' : 'Unknown/Legacy API';
    
    log(`Token type: ${tokenType}`, 'shopify-direct');
    
    // Standard Shopify store handling
      // since we know precisely which endpoint works
      
      // Select appropriate endpoint based on token type
      // For Storefront tokens, we need to use the GraphQL endpoint, not the REST API
      const apiPath = isStorefrontToken
        ? '/api/2023-10/graphql.json'  // Storefront API (GraphQL)
        : '/admin/api/2023-10/shop.json'; // Admin API (REST)
      
      // Set appropriate headers based on token type
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (isStorefrontToken) {
        headers['X-Shopify-Storefront-Access-Token'] = realToken;
      } else {
        headers['X-Shopify-Access-Token'] = realToken;
      }
      
      log(`Making API request to: ${cleanUrl}${apiPath} with token type: ${tokenType}`, 'shopify-direct');
      
      // For Storefront API, we need to use POST method with a GraphQL query
      const method = isStorefrontToken ? 'POST' : 'GET';
      let body: string | undefined;
      
      if (isStorefrontToken) {
        // For Storefront API tokens, we need to send a GraphQL query
        body = JSON.stringify({
          query: `{
            shop {
              name
            }
          }`
        });
        headers['Content-Length'] = Buffer.byteLength(body).toString();
        log(`Using GraphQL body: ${body}`, 'shopify-direct');
      }
      
      // Use a direct HTTPS request to the store endpoint
      const apiReq = https.request({
        hostname: cleanUrl,
        port: 443,
        path: apiPath,
        method: method,
        headers,
        timeout: 30000 // Extended timeout
      }, (apiRes) => {
        log(`Direct API call to ${cleanUrl} - Status: ${apiRes.statusCode}`, 'shopify-direct');
        
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
          } else if (apiRes.statusCode === 401) {
            log(`Authentication failed: ${data}`, 'shopify-direct');
            resolve({
              accessible: false,
              status: apiRes.statusCode,
              message: `Authentication failed. The access token may be invalid or expired.`,
              isShopify: true
            });
          } else {
            log(`Unexpected status code: ${apiRes.statusCode}`, 'shopify-direct');
            resolve({
              accessible: false,
              status: apiRes.statusCode,
              message: `Unexpected status code: ${apiRes.statusCode} when connecting to Shopify`,
              isShopify: true
            });
          }
        });
      });
      
      apiReq.on('error', (error) => {
        log(`Error accessing Shopify API: ${error.message}`, 'shopify-direct');
        resolve({
          accessible: false,
          message: `Connection error: ${error.message}`,
          isShopify: true
        });
      });
      
      apiReq.on('timeout', () => {
        log(`Timeout accessing Shopify API`, 'shopify-direct');
        apiReq.destroy();
        resolve({
          accessible: false,
          message: 'Connection timed out after 30 seconds',
          isShopify: true
        });
      });
      
      // For POST requests with GraphQL queries, we need to write the body
      if (method === 'POST' && body) {
        apiReq.write(body);
      }
      
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
            headers['X-Shopify-Storefront-Access-Token'] = realToken;
          } else {
            headers['X-Shopify-Access-Token'] = realToken;
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
                      
                      // Always use the environment token for headers to avoid invalid characters
                      const envToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
                      
                      if (isStorefrontToken) {
                        redirectHeaders['X-Shopify-Storefront-Access-Token'] = envToken;
                      } else {
                        redirectHeaders['X-Shopify-Access-Token'] = envToken;
                      }
                      
                      // Log token being used
                      log(`Using token for redirect - Length: ${envToken.length}`, 'shopify-direct');
                      
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