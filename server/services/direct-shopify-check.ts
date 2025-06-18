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
    
    // Use the provided token if it looks valid, otherwise use environment token
    const tokenToUse = (isMaskedToken || accessToken.length < 20) ? realToken : accessToken;
    
    // Standard Shopify API endpoint
    const apiPath = '/admin/api/2023-10/shop.json';
    
    // Set appropriate headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Shopify-Access-Token': tokenToUse
    };
    
    log(`Making API request to: ${cleanUrl}${apiPath}`, 'shopify-direct');
    
    // Use a direct HTTPS request to the store endpoint
    const apiReq = https.request({
      hostname: cleanUrl,
      port: 443,
      path: apiPath,
      method: 'GET',
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
    
    apiReq.end();
  });
}