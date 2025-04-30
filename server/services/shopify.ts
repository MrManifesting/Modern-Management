import { Item } from "@shared/schema";

interface ShopifyProduct {
  id?: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: Array<{
    price: string;
    sku: string;
    inventory_quantity: number;
    inventory_management: string;
    option1?: string;
    option2?: string;
    option3?: string;
    barcode?: string;
  }>;
  options?: Array<{
    name: string;
    values: string[];
  }>;
  images?: Array<{
    src: string;
    alt?: string;
  }>;
  tags?: string;
}

let pushToShopifyEnabled = false;
// Using fixed credentials from the user input for Shopify
const SHOPIFY_STORE = 'gold-standard-cbd.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = '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';

// Log the credentials for debugging
console.log("Using Shopify credentials:", SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN ? "[TOKEN PRESENT]" : "[TOKEN MISSING]");

/**
 * Checks if the Shopify integration is properly configured with API credentials
 */
export async function isShopifyConfigured(): Promise<boolean> {
  return !!(SHOPIFY_STORE && SHOPIFY_ACCESS_TOKEN);
}

/**
 * Sets the status of whether inventory changes should be pushed to Shopify
 */
export function setPushStatus(enabled: boolean): { pushEnabled: boolean, message: string } {
  pushToShopifyEnabled = enabled;
  return {
    pushEnabled: pushToShopifyEnabled,
    message: pushToShopifyEnabled 
      ? 'Shopify push is enabled. Inventory changes will be synchronized with Shopify.' 
      : 'Shopify push is disabled. Changes will NOT be pushed to Shopify.',
  };
}

/**
 * Gets the current status of whether inventory changes are pushed to Shopify
 */
export function getPushStatus(): { pushEnabled: boolean, message: string } {
  return {
    pushEnabled: pushToShopifyEnabled,
    message: pushToShopifyEnabled 
      ? 'Shopify push is enabled. Inventory changes will be synchronized with Shopify.' 
      : 'Shopify push is disabled. Changes will NOT be pushed to Shopify.',
  };
}

/**
 * Tests the connection to the Shopify API
 */
export async function testConnection(): Promise<{ connected: boolean, store: string, message: string }> {
  try {
    if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
      return { 
        connected: false, 
        store: '',
        message: 'Shopify API credentials are not configured. Check your environment variables.' 
      };
    }
    
    // Make a simple API call to test authentication
    // Ensure the store URL doesn't include the protocol
    const storeUrl = SHOPIFY_STORE.replace(/^https?:\/\//, '');
    
    // Debug output
    console.log("Connecting to Shopify with:");
    console.log(`Store URL: ${storeUrl}`);
    console.log(`Access Token: ${SHOPIFY_ACCESS_TOKEN.substring(0, 4)}...`);
    
    // Construct the API URL, ensuring it's properly formatted
    const apiUrl = `https://${storeUrl}/admin/api/2023-10/shop.json`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to connect to Shopify API: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { 
      connected: true, 
      store: data.shop.name,
      message: `Successfully connected to ${data.shop.name}.` 
    };
  } catch (error) {
    console.error('Shopify connection test failed:', error);
    return { 
      connected: false, 
      store: '',
      message: error instanceof Error ? error.message : 'Unknown error testing Shopify connection' 
    };
  }
}

/**
 * Transforms inventory item to Shopify product format
 */
export function prepareItemForShopify(item: Item): ShopifyProduct {
  // Generate SKU according to pattern based on the item's CBD/THC content
  let sku = item.sku;
  
  if (!sku && item.category?.toLowerCase().includes('thca flower')) {
    // SKU Pattern: INITIALS-TIER-THCVALUE
    // Example: IS-AAA-28
    const initials = (item.name.split(' ').map(word => word[0]).join('')).slice(0, 2).toUpperCase();
    const attributes = item.attributes || {};
    const percentage = attributes["percentage"] || '0';
    const tier = attributes["tier"] || 'A';
    
    // Extract THC percentage, remove any % signs and round to nearest whole number
    const thcValue = percentage.toString().replace('%', '').trim();
    sku = `${initials}-${tier}-${thcValue}`;
  }

  // Build the main product 
  const product: ShopifyProduct = {
    title: item.name,
    body_html: `<p>${item.description || ''}</p>`,
    vendor: "Gold Standard CBD",
    product_type: item.category || "Other",
    status: item.status === 'active' ? 'active' : 'draft',
    variants: [{
      price: item.price.toString(),
      sku: sku,
      inventory_quantity: item.quantity,
      inventory_management: "shopify",
      barcode: item.barcode
    }],
    options: []
  };

  // Add image if available
  if (item.images && item.images.length > 0) {
    product.images = item.images.map(img => ({
      src: img.url,
      alt: item.name
    }));
  }

  // Add tags
  const tags = [item.category];
  if (item.attributes) {
    const attributesList = Object.entries(item.attributes)
      .map(([key, value]) => `${key}:${value}`)
      .join(', ');
    tags.push(attributesList);
  }
  product.tags = tags.filter(Boolean).join(', ');

  return product;
}

/**
 * Creates or updates a product in Shopify
 */
export async function pushItemToShopify(product: ShopifyProduct): Promise<{ success: boolean, productId?: number, message: string }> {
  if (!pushToShopifyEnabled) {
    return { 
      success: false,
      message: 'Shopify push is currently disabled. Enable it in settings to push products.'
    };
  }
  
  try {
    if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
      return { 
        success: false,
        message: 'Shopify API credentials are not configured.'
      };
    }

    const method = product.id ? 'PUT' : 'POST';
    // Ensure the store URL doesn't include the protocol
    const storeUrl = SHOPIFY_STORE.replace(/^https?:\/\//, '');
    const url = product.id 
      ? `https://${storeUrl}/admin/api/2023-10/products/${product.id}.json` 
      : `https://${storeUrl}/admin/api/2023-10/products.json`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ product })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      productId: data.product.id,
      message: `Product successfully ${product.id ? 'updated' : 'created'} in Shopify.`
    };
  } catch (error) {
    console.error('Failed to push product to Shopify:', error);
    return { 
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error pushing to Shopify'
    };
  }
}

/**
 * Gets information about pushing an item to Shopify
 * including status, preview information and errors
 */
export async function getItemPushInfo(item: Item): Promise<{
  item: Item;
  shopifyProduct: ShopifyProduct;
  canPush: boolean;
  errors: string[];
  shopifyProductUrl?: string;
}> {
  const shopifyProduct = prepareItemForShopify(item);
  const errors: string[] = [];
  
  // Validate required fields
  if (!item.name) errors.push('Item name is required');
  if (!item.price) errors.push('Item price is required');
  if (item.quantity === undefined) errors.push('Item quantity is required');
  
  // Validate product requirements for Shopify
  if (!shopifyProduct.variants[0].sku) errors.push('SKU is missing and could not be generated');
  
  return {
    item,
    shopifyProduct,
    canPush: errors.length === 0 && pushToShopifyEnabled,
    errors,
    shopifyProductUrl: item.shopifyId ? `https://${SHOPIFY_STORE.replace(/^https?:\/\//, '')}/admin/products/${item.shopifyId}` : undefined
  };
}

export const pushEnabled = () => pushToShopifyEnabled;

/**
 * Fetches products from Shopify and returns them
 */
export async function fetchShopifyProducts(): Promise<ShopifyProduct[]> {
  if (!isShopifyConfigured()) {
    throw new Error("Shopify integration is not properly configured");
  }

  try {
    // Ensure the store URL doesn't include the protocol
    const storeUrl = SHOPIFY_STORE.replace(/^https?:\/\//, '');
    const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products from Shopify: ${response.statusText}`);
    }

    const data = await response.json();
    return data.products as ShopifyProduct[];
  } catch (error) {
    console.error("Error fetching products from Shopify:", error);
    throw error;
  }
}

/**
 * Syncs products from Shopify to our local inventory
 */
export async function syncProductsFromShopify(storage: any): Promise<{
  imported: number;
  updated: number;
  total: number;
  errors: string[];
}> {
  try {
    const products = await fetchShopifyProducts();
    const existingItems = await storage.getItems();
    
    const result = {
      imported: 0,
      updated: 0,
      total: products.length,
      errors: [] as string[]
    };
    
    for (const product of products) {
      try {
        // Check if the product already exists in our system by shopifyId
        const existingItem = existingItems.find(
          item => item.shopifyId === product.id?.toString()
        );
        
        // Map Shopify product to our schema
        const productData = {
          name: product.title,
          description: product.body_html || "",
          price: parseFloat(product.variants[0]?.price || "0"),
          quantity: parseInt(product.variants[0]?.inventory_quantity?.toString() || "0"),
          category: product.product_type || "uncategorized",
          condition: "new",
          status: product.status || "draft",
          sku: product.variants[0]?.sku || "",
          barcode: product.variants[0]?.barcode || "",
          shopifyId: product.id?.toString(),
          tags: product.tags ? product.tags.split(", ") : [],
          images: product.images?.map(img => img.src) || [],
          marketplace: ["shopify"],
          attributes: {
            vendor: product.vendor
          }
        };
        
        if (existingItem) {
          // Update existing item
          await storage.updateItem(existingItem.id, productData);
          result.updated++;
        } else {
          // Create new item
          await storage.createItem(productData);
          result.imported++;
        }
      } catch (error) {
        console.error(`Error processing Shopify product ${product.title}:`, error);
        result.errors.push(`Failed to process "${product.title}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Failed to sync products from Shopify:", error);
    throw error;
  }
}