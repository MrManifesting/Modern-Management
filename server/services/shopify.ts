import { Item } from "@shared/schema";
import { 
  logShopifyOperation, 
  isOperationAllowed, 
  isConfirmationValid 
} from './shopify-safety';
import { generateSku } from './sku-generator';

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

// Function to get Shopify store name in correct format
function getShopifyStoreName() {
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

// Function to get the current shopify credentials
function getShopifyCredentials() {
  // Get fresh values from environment variables
  const storeUrl = getShopifyStoreName(); 
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  
  return {
    storeUrl,
    accessToken
  };
}

// Initial log of credentials for debugging
const initialCredentials = getShopifyCredentials();
console.log("Shopify store connection:", initialCredentials.storeUrl, 
  initialCredentials.accessToken ? "[TOKEN PRESENT]" : "[TOKEN MISSING]");

/**
 * Checks if the Shopify integration is properly configured with API credentials
 */
export async function isShopifyConfigured(): Promise<boolean> {
  const credentials = getShopifyCredentials();
  return !!(credentials.storeUrl && credentials.accessToken);
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
    // Get fresh credentials
    const credentials = getShopifyCredentials();
    
    if (!credentials.storeUrl || !credentials.accessToken) {
      return { 
        connected: false, 
        store: '',
        message: 'Shopify API credentials are not configured. Check your environment variables.' 
      };
    }
    
    // Make a simple API call to test authentication
    // Ensure the store URL doesn't include the protocol
    const storeUrl = credentials.storeUrl.replace(/^https?:\/\//, '');
    
    // Debug output
    console.log("Connecting to Shopify with:");
    console.log(`Store URL: ${storeUrl}`);
    console.log(`Access Token: ${credentials.accessToken.substring(0, 4)}...`);
    
    // Construct the API URL, ensuring it's properly formatted
    const apiUrl = `https://${storeUrl}/admin/api/2023-10/shop.json`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
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
  // Use the safer SKU generator that doesn't make API calls
  let sku = item.sku;
  
  if (!sku) {
    // Generate a SKU without making API calls
    sku = generateSku(item);
    // Log the SKU generation
    logShopifyOperation(
      'generateSku',
      { item, generatedSku: sku },
      true
    );
  }

  // Build the main product 
  const product: ShopifyProduct = {
    title: item.name,
    body_html: `<p>${item.description || ''}</p>`,
    vendor: "Inventory Pro",
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
  // Check if push is enabled
  if (!pushToShopifyEnabled) {
    logShopifyOperation(
      'pushItemRejected',
      { product, reason: 'push disabled' },
      false,
      'Shopify push is disabled'
    );
    
    return { 
      success: false,
      message: 'Shopify push is currently disabled. Enable it in settings to push products.'
    };
  }
  
  // Check if the operation is allowed by safety settings
  if (!isOperationAllowed(product.id ? 'update' : 'create')) {
    logShopifyOperation(
      'pushItemRejected',
      { product, reason: 'operation not allowed by safety settings' },
      false,
      'Operation not allowed by current safety settings'
    );
    
    return {
      success: false,
      message: 'Operation not allowed by current safety settings'
    };
  }
  
  // Check if confirmation is required and valid
  if (!isConfirmationValid()) {
    logShopifyOperation(
      'pushItemRejected',
      { product, reason: 'confirmation required or expired' },
      false,
      'Operation confirmation required or has expired'
    );
    
    return {
      success: false,
      message: 'Operation confirmation required or has expired. Please confirm the operation before proceeding.'
    };
  }
  
  try {
    const storeUrl = getShopifyStoreName();
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    if (!storeUrl || !accessToken) {
      logShopifyOperation(
        'pushItemRejected',
        { product, reason: 'credentials missing' },
        false,
        'Shopify API credentials are not configured'
      );
      
      return { 
        success: false,
        message: 'Shopify API credentials are not configured.'
      };
    }

    const method = product.id ? 'PUT' : 'POST';
    const url = product.id 
      ? `https://${storeUrl}/admin/api/2023-10/products/${product.id}.json` 
      : `https://${storeUrl}/admin/api/2023-10/products.json`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ product })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Log successful operation
    logShopifyOperation(
      product.id ? 'updateItem' : 'createItem',
      { 
        product, 
        productId: data.product.id,
        method
      },
      true
    );
    
    return {
      success: true,
      productId: data.product.id,
      message: `Product successfully ${product.id ? 'updated' : 'created'} in Shopify.`
    };
  } catch (error) {
    // Log failed operation
    logShopifyOperation(
      product.id ? 'updateItemFailed' : 'createItemFailed',
      { 
        product, 
        error: error instanceof Error ? error.message : String(error)
      },
      false,
      error instanceof Error ? error.message : 'Unknown error pushing to Shopify'
    );
    
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
  safetyStatus: {
    pushEnabled: boolean;
    operationAllowed: boolean;
    confirmationValid: boolean;
  };
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
  
  // Check all safety conditions
  const operationAllowed = isOperationAllowed(item.shopifyId ? 'update' : 'create');
  const confirmationValid = isConfirmationValid();
  
  return {
    item,
    shopifyProduct,
    canPush: errors.length === 0 && pushToShopifyEnabled && operationAllowed && confirmationValid,
    errors,
    safetyStatus: {
      pushEnabled: pushToShopifyEnabled,
      operationAllowed,
      confirmationValid
    },
    shopifyProductUrl: item.shopifyId ? `https://${getShopifyStoreName()}/admin/products/${item.shopifyId}` : undefined
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
    // Get fresh credentials
    const storeUrl = getShopifyStoreName();
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    
    const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
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