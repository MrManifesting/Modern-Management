/**
 * Utility for handling Shopify API authorization
 * This helps ensure consistent API token management across the application
 */

import Shopify from 'shopify-api-node';
import { log } from '../vite';

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
  
  log(`Final cleaned store name: "${storeName}"`, 'shopify-details');
  return storeName;
}

// Cached credentials to avoid repeated environment variable access
let cachedCredentials: any = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getShopifyCredentials() {
  const now = Date.now();
  
  // Return cached credentials if still valid
  if (cachedCredentials && (now - cachedCredentials.timestamp) < CACHE_DURATION) {
    return {
      storeUrl: cachedCredentials.storeUrl,
      accessToken: cachedCredentials.accessToken,
      storefrontToken: cachedCredentials.storefrontToken
    };
  }
  
  try {
    // We directly use environment variables which contain the actual values
    // without masking, which avoids issues with API calls
    
    // Get tokens directly from environment
    const adminToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
    const storeUrl = process.env.SHOPIFY_STORE || getShopifyStoreName();
    
    // Log token debugging info (safely)
    log(`Admin token length: ${adminToken.length}`, 'shopify-debug');
    if (adminToken.length > 0) {
      log(`Admin token starts with: ${adminToken.substring(0, 5)}...`, 'shopify-debug');
    }
    log(`Storefront token length: ${storefrontToken.length}`, 'shopify-debug');
      
    // Cache the credentials
    cachedCredentials = {
      storeUrl,
      accessToken: adminToken,
      storefrontToken,
      timestamp: now
    };
    
    // Return the credentials
    return {
      storeUrl,
      accessToken: adminToken,
      storefrontToken
    };
  } catch (error) {
    log(`Error getting Shopify credentials: ${error}`, 'shopify-debug');
    
    // Fallback to environment variables
    const adminToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
    const storeUrl = getShopifyStoreName();
    
    // Log token debugging info
    log(`Fallback token - Admin token length: ${adminToken.length}`, 'shopify-debug');
    log(`Fallback token - Storefront token length: ${storefrontToken.length}`, 'shopify-debug');
    
    return {
      storeUrl,
      accessToken: adminToken,
      storefrontToken
    };
  }
}

export async function createShopifyClient() {
  const credentials = await getShopifyCredentials();
  
  // Check if credentials are missing
  if (!credentials.storeUrl || !credentials.accessToken) {
    throw new Error('Shopify credentials not configured. Please set SHOPIFY_STORE and SHOPIFY_ACCESS_TOKEN environment variables.');
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
    
    // Create standard Shopify client
    log(`Attempting to connect to Shopify API...`, 'shopify');
    
    const shopify = new Shopify({
      shopName: cleanShopUrl,
      accessToken: credentials.accessToken,
      apiVersion: '2023-10'
    });

    return shopify;
  } catch (error) {
    log(`Failed to create Shopify client: ${error}`, 'shopify');
    throw error;
  }
}

export async function testShopifyConnection() {
  try {
    const shopify = await createShopifyClient();
    
    // Test connection by getting shop info
    const shop = await shopify.shop.get();
    
    log(`Successfully connected to Shopify store: ${shop.name}`, 'shopify');
    
    return {
      success: true,
      shop: {
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        country: shop.country_name
      }
    };
  } catch (error: any) {
    log(`Failed to connect to Shopify: ${error.message}`, 'shopify');
    return {
      success: false,
      error: error.message
    };
  }
}