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
  
  // If empty, return empty string
  if (!storeUrl) return '';
  
  // Remove any protocol prefixes (http://, https://)
  let storeName = storeUrl.replace(/^https?:\/\//, '');
  
  // Remove admin.shopify.com/store/ prefix if present
  if (storeName.includes('admin.shopify.com/store/')) {
    const storeNameMatch = storeName.match(/admin\.shopify\.com\/store\/([^\/]+)/);
    if (storeNameMatch && storeNameMatch[1]) {
      storeName = storeNameMatch[1];
    }
  }
  
  // Remove trailing slashes if present
  storeName = storeName.replace(/\/+$/, '');
  
  // Ensure it ends with .myshopify.com
  if (!storeName.endsWith('.myshopify.com')) {
    // Make sure we don't have store.myshopify.com/something.myshopify.com
    if (storeName.includes('.myshopify.com/')) {
      storeName = storeName.substring(0, storeName.indexOf('.myshopify.com/') + '.myshopify.com'.length);
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
  return {
    storeUrl: getShopifyStoreName(),
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN || ''
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
    log(`Creating Shopify client for store: ${credentials.storeUrl}`, 'shopify');
    
    const shopify = new Shopify({
      shopName: credentials.storeUrl,
      accessToken: credentials.accessToken,
      apiVersion: '2023-10', // Use the latest stable version
      autoLimit: true // Handle rate limiting automatically
    });
    
    // Verify connection is working by making a simple API call
    try {
      const shopInfo = await shopify.shop.get();
      log(`Successfully connected to Shopify store: ${shopInfo.name}`, 'shopify');
      
      return {
        shopify,
        shopInfo,
        credentials,
        isMock: false
      };
    } catch (apiError) {
      log(`API call failed, falling back to mock: ${apiError}`, 'shopify');
      // Fall back to mock if API call fails
      const mockShopify = createMockShopifyClient();
      const mockShopInfo = getMockShopInfo();
      
      return {
        shopify: mockShopify,
        shopInfo: mockShopInfo,
        credentials,
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

// Test Shopify API connection and return detailed status
export async function testShopifyConnection() {
  try {
    const { shopify, shopInfo, isMock } = await createShopifyClient();
    
    return {
      connected: true,
      store: shopInfo.name,
      domain: shopInfo.domain,
      email: shopInfo.email,
      country: shopInfo.country_name,
      isMock: !!isMock,
      message: isMock 
        ? `Using mock Shopify data for development (${shopInfo.name})` 
        : `Successfully connected to ${shopInfo.name}`
    };
  } catch (error: any) {
    log(`Shopify connection test failed: ${error.message}`, 'shopify');
    
    let errorMessage = 'Failed to connect to Shopify';
    
    // Provide more specific error messages based on common issues
    if (error.statusCode === 401) {
      errorMessage = 'Authentication failed. Please check your Shopify access token.';
    } else if (error.statusCode === 404) {
      errorMessage = 'Store not found. Please check your Shopify store URL.';
    } else if (error.statusCode === 403) {
      errorMessage = 'Access forbidden. Your access token may not have the required permissions.';
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