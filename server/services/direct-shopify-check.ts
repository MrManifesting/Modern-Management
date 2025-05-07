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
}> {
  return new Promise((resolve) => {
    log(`Testing direct connectivity to: ${storeUrl}`, 'shopify-direct');
    
    // Clean up URL - remove protocol and trailing slashes
    let cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Make sure it has myshopify.com if it's just a store name
    if (!cleanUrl.includes('.')) {
      cleanUrl = `${cleanUrl}.myshopify.com`;
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
        const apiUrlVariants = [
          // First try the standard GraphQL admin API
          {
            hostname: cleanUrl,
            path: '/admin/api/2023-04/graphql.json'
          },
          // Then try the REST admin API
          {
            hostname: cleanUrl,
            path: '/admin/api/2023-04/shop.json'
          },
          // Try the partner API format
          {
            hostname: 'partners.shopify.com',
            path: `/api/2023-04/shops/${cleanUrl}.json`
          }
        ];
        
        // Try each API endpoint variant
        tryApiEndpoints(apiUrlVariants, 0);
        
        function tryApiEndpoints(variants: Array<{hostname: string, path: string}>, index: number) {
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
          
          const apiReq = https.request({
            hostname: variant.hostname,
            port: 443,
            path: variant.path,
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
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
                    
                    // Try the redirected location
                    const redirectReq = https.request({
                      hostname: redirectUrl.hostname,
                      port: 443,
                      path: redirectUrl.pathname + redirectUrl.search,
                      method: 'GET',
                      headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
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
                            isShopify: true
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
        }
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