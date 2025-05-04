import { Item } from "@shared/schema";
import { MarketplaceService, MarketplaceProduct, MarketplaceTestResult, MarketplacePushResult } from "../marketplace";
import { generateSku } from '../sku-generator';
import { IStorage } from '../../storage';

// Shopify-specific interface for credentials
interface ShopifyCredentials {
  storeUrl: string;
  apiKey: string; // Access token for Shopify API
}

// Shopify-specific interface for products
interface ShopifyApiProduct {
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

/**
 * Function to get Shopify store name in correct format
 */
function formatShopifyStoreUrl(storeUrl: string): string {
  if (!storeUrl) return '';
  
  // Remove any protocol prefixes (http://, https://)
  let formattedUrl = storeUrl.replace(/^https?:\/\//, '');
  
  // Remove admin.shopify.com/store/ prefix if present
  if (formattedUrl.includes('admin.shopify.com/store/')) {
    const storeNameMatch = formattedUrl.match(/admin\.shopify\.com\/store\/([^\/]+)/);
    if (storeNameMatch && storeNameMatch[1]) {
      formattedUrl = storeNameMatch[1];
    }
  }
  
  // Remove trailing slashes if present
  formattedUrl = formattedUrl.replace(/\/+$/, '');
  
  // Ensure it ends with .myshopify.com
  if (!formattedUrl.endsWith('.myshopify.com')) {
    // Make sure we don't have store.myshopify.com/something.myshopify.com
    if (formattedUrl.includes('.myshopify.com/')) {
      formattedUrl = formattedUrl.substring(0, formattedUrl.indexOf('.myshopify.com/') + '.myshopify.com'.length);
    } 
    // If it's just a store name without any domain
    else if (!formattedUrl.includes('.')) {
      formattedUrl = `${formattedUrl}.myshopify.com`;
    }
  }
  
  return formattedUrl;
}

/**
 * Convert from generic MarketplaceProduct to Shopify's API format
 */
function convertToShopifyProduct(product: MarketplaceProduct): ShopifyApiProduct {
  return {
    id: typeof product.id === 'number' ? product.id : undefined,
    title: product.title,
    body_html: product.description,
    vendor: product.vendor || "Inventory Pro",
    product_type: product.productType || "Other",
    status: product.status,
    variants: product.variants.map(variant => ({
      price: variant.price,
      sku: variant.sku,
      inventory_quantity: variant.inventoryQuantity,
      inventory_management: "shopify",
      barcode: variant.barcode,
      option1: variant.options?.option1,
      option2: variant.options?.option2,
      option3: variant.options?.option3
    })),
    images: product.images,
    tags: product.tags?.join(', ')
  };
}

/**
 * Convert from Shopify's API format to generic MarketplaceProduct
 */
function convertFromShopifyProduct(product: ShopifyApiProduct): MarketplaceProduct {
  return {
    id: product.id,
    title: product.title,
    description: product.body_html,
    vendor: product.vendor,
    productType: product.product_type,
    status: product.status,
    variants: product.variants.map(variant => ({
      price: variant.price,
      sku: variant.sku,
      inventoryQuantity: variant.inventory_quantity,
      barcode: variant.barcode,
      options: {
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3
      }
    })),
    images: product.images,
    tags: product.tags ? product.tags.split(', ') : []
  };
}

/**
 * Shopify marketplace service implementation
 */
export const shopifyService: MarketplaceService = {
  /**
   * Test the connection to Shopify
   */
  async testConnection(credentials: ShopifyCredentials): Promise<MarketplaceTestResult> {
    try {
      const storeUrl = formatShopifyStoreUrl(credentials.storeUrl);
      const accessToken = credentials.apiKey;
      
      if (!storeUrl || !accessToken) {
        return { 
          connected: false, 
          name: '',
          message: 'Shopify API credentials are not configured correctly.' 
        };
      }
      
      // Make a simple API call to test authentication
      const apiUrl = `https://${storeUrl}/admin/api/2023-10/shop.json`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to connect to Shopify API: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { 
        connected: true, 
        name: data.shop.name,
        message: `Successfully connected to ${data.shop.name}.` 
      };
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return { 
        connected: false, 
        name: '',
        message: error instanceof Error ? error.message : 'Unknown error testing Shopify connection' 
      };
    }
  },
  
  /**
   * Prepare an item for Shopify's format
   */
  prepareItemForPush(item: Item): MarketplaceProduct {
    // Use the safer SKU generator that doesn't make API calls
    let sku = item.sku;
    
    if (!sku) {
      // Generate a SKU without making API calls
      sku = generateSku(item);
    }
    
    // Build the main product
    const product: MarketplaceProduct = {
      id: item.marketplaceIds?.shopify,
      title: item.name,
      description: item.description || '',
      vendor: item.brand || "Inventory Pro",
      productType: item.category || "Other",
      status: item.status === 'active' ? 'active' : 'draft',
      variants: [{
        price: item.basePrice.toString(),
        sku: sku,
        inventoryQuantity: item.quantity,
        barcode: item.barcode || undefined
      }],
      tags: item.tags as string[]
    };
    
    // Add image if available
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      product.images = item.images.map((img: any) => ({
        src: img.url || img,
        alt: item.name
      }));
    }
    
    // Add tags from attributes
    if (item.attributes && typeof item.attributes === 'object') {
      const attributeTags = Object.entries(item.attributes)
        .map(([key, value]) => `${key}:${value}`);
      
      if (product.tags) {
        product.tags.push(...attributeTags);
      } else {
        product.tags = attributeTags;
      }
    }
    
    return product;
  },
  
  /**
   * Push a product to Shopify
   */
  async pushItemToMarketplace(
    product: MarketplaceProduct, 
    credentials: ShopifyCredentials
  ): Promise<MarketplacePushResult> {
    try {
      const storeUrl = formatShopifyStoreUrl(credentials.storeUrl);
      const accessToken = credentials.apiKey;
      
      if (!storeUrl || !accessToken) {
        return { 
          success: false,
          message: 'Shopify API credentials are not configured correctly.'
        };
      }
      
      // Convert to Shopify's format
      const shopifyProduct = convertToShopifyProduct(product);
      
      const method = shopifyProduct.id ? 'PUT' : 'POST';
      const url = shopifyProduct.id 
        ? `https://${storeUrl}/admin/api/2023-10/products/${shopifyProduct.id}.json` 
        : `https://${storeUrl}/admin/api/2023-10/products.json`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product: shopifyProduct })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        productId: data.product.id,
        message: `Product successfully ${shopifyProduct.id ? 'updated' : 'created'} in Shopify.`
      };
    } catch (error) {
      console.error('Failed to push product to Shopify:', error);
      return { 
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error pushing to Shopify'
      };
    }
  },
  
  /**
   * Fetch products from Shopify
   */
  async fetchProducts(credentials: ShopifyCredentials): Promise<MarketplaceProduct[]> {
    try {
      const storeUrl = formatShopifyStoreUrl(credentials.storeUrl);
      const accessToken = credentials.apiKey;
      
      if (!storeUrl || !accessToken) {
        throw new Error("Shopify API credentials are not configured correctly.");
      }
      
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
      return data.products.map(convertFromShopifyProduct);
    } catch (error) {
      console.error("Error fetching products from Shopify:", error);
      throw error;
    }
  },
  
  /**
   * Sync products from Shopify to local inventory
   */
  async syncProductsFromMarketplace(
    credentials: ShopifyCredentials,
    storage: IStorage
  ): Promise<{
    imported: number;
    updated: number;
    total: number;
    errors: string[];
  }> {
    try {
      const products = await this.fetchProducts(credentials);
      const existingItems = await storage.getItems();
      
      const result = {
        imported: 0,
        updated: 0,
        total: products.length,
        errors: [] as string[]
      };
      
      for (const product of products) {
        try {
          // Check if the product already exists in our system by Shopify ID
          const existingItem = existingItems.find(item => {
            return item.marketplaceIds && 
                   item.marketplaceIds.shopify && 
                   item.marketplaceIds.shopify.toString() === product.id?.toString();
          });
          
          // Map product to our schema
          const productData = {
            name: product.title,
            description: product.description || "",
            basePrice: parseFloat(product.variants[0]?.price || "0"),
            quantity: product.variants[0]?.inventoryQuantity || 0,
            category: product.productType || "uncategorized",
            status: product.status || "draft",
            sku: product.variants[0]?.sku || "",
            barcode: product.variants[0]?.barcode || "",
            tags: product.tags || [],
            images: product.images?.map(img => img.src) || [],
            marketplaceIds: {
              shopify: product.id
            },
            syncedToMarketplaces: ["shopify"],
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
};