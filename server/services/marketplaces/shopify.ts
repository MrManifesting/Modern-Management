/**
 * Shopify Integration Service
 * 
 * This service handles integration with the Shopify API for inventory synchronization,
 * product management, and order tracking.
 */

import { Item, Marketplace } from "@shared/schema";
import { log } from "../../vite";

interface ShopifyCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  shopUrl: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: Array<{
    id: string;
    product_id: string;
    title: string;
    price: string;
    sku: string;
    position: number;
    inventory_quantity: number;
    inventory_management: string;
    barcode: string;
  }>;
  images: Array<{
    id: string;
    product_id: string;
    position: number;
    src: string;
  }>;
}

/**
 * Convert an MrManifestlister item to a Shopify product
 */
export function convertItemToShopifyProduct(item: Item): any {
  // Determine if this is a draft or active product
  const status = item.status === 'listed' ? 'active' : 'draft';
  
  // Create Shopify product payload
  return {
    product: {
      title: item.seoTitle || item.name,
      body_html: item.seoDescription || item.description,
      vendor: "MrManifestlister",
      product_type: item.category,
      status: status,
      variants: [
        {
          price: item.price.toString(),
          sku: item.sku,
          barcode: item.barcode || "",
          inventory_management: "shopify",
          inventory_quantity: item.quantity,
          taxable: true,
          weight: 0, // Default weight - would need to be part of the item schema
          weight_unit: "lb",
          requires_shipping: true
        }
      ],
      images: ((item.images || []) as string[]).map((imageUrl, index) => ({
        position: index + 1,
        src: imageUrl,
        alt: `${item.name} - Image ${index + 1}`
      }))
    }
  };
}

/**
 * Convert a Shopify product to MrManifestlister item format
 */
export function convertShopifyProductToItem(shopifyProduct: ShopifyProduct): Partial<Item> {
  const mainVariant = shopifyProduct.variants[0] || {};
  
  return {
    name: shopifyProduct.title,
    description: shopifyProduct.body_html.replace(/<[^>]*>?/gm, ''), // Strip HTML
    price: parseFloat(mainVariant.price || '0'),
    category: shopifyProduct.product_type || 'Uncategorized',
    condition: 'New', // Default - Shopify doesn't have a direct equivalent
    sku: mainVariant.sku,
    barcode: mainVariant.barcode || null,
    quantity: mainVariant.inventory_quantity || 0,
    status: shopifyProduct.status === 'active' ? 'listed' : 'draft',
    images: shopifyProduct.images.map(img => img.src),
    seoTitle: shopifyProduct.title,
    seoDescription: shopifyProduct.body_html.replace(/<[^>]*>?/gm, ''), // Strip HTML
  };
}

/**
 * Create or update a product in Shopify
 */
export async function syncItemToShopify(item: Item, marketplace: Marketplace): Promise<boolean> {
  try {
    const credentials = marketplace.credentials as unknown as ShopifyCredentials;
    if (!credentials || !credentials.accessToken || !credentials.shopUrl) {
      throw new Error("Missing Shopify credentials");
    }
    
    const shopUrl = credentials.shopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    const apiUrl = `https://${shopUrl}/admin/api/2023-07/products.json`;
    
    const productData = convertItemToShopifyProduct(item);
    
    // First check if the product already exists by SKU
    const existingProduct = await findProductBySku(item.sku, marketplace);
    
    if (existingProduct) {
      // Update existing product
      const updateUrl = `https://${shopUrl}/admin/api/2023-07/products/${existingProduct.id}.json`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': credentials.accessToken
        },
        body: JSON.stringify(productData)
      });
      log(`Updated product ${item.name} (${item.sku}) in Shopify`, 'shopify');
    } else {
      // Create new product
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': credentials.accessToken
        },
        body: JSON.stringify(productData)
      });
      log(`Created product ${item.name} (${item.sku}) in Shopify`, 'shopify');
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing to Shopify:', error);
    return false;
  }
}

/**
 * Find a product in Shopify by SKU
 */
export async function findProductBySku(sku: string, marketplace: Marketplace): Promise<ShopifyProduct | null> {
  try {
    const credentials = marketplace.credentials as unknown as ShopifyCredentials;
    if (!credentials || !credentials.accessToken || !credentials.shopUrl) {
      throw new Error("Missing Shopify credentials");
    }
    
    const shopUrl = credentials.shopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    const apiUrl = `https://${shopUrl}/admin/api/2023-07/products.json?query=sku:${sku}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': credentials.accessToken
      }
    });
    
    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
      return data.products[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error finding product in Shopify:', error);
    return null;
  }
}

/**
 * Delete a product from Shopify
 */
export async function deleteProductFromShopify(item: Item, marketplace: Marketplace): Promise<boolean> {
  try {
    const credentials = marketplace.credentials as unknown as ShopifyCredentials;
    if (!credentials || !credentials.accessToken || !credentials.shopUrl) {
      throw new Error("Missing Shopify credentials");
    }
    
    // First find the product by SKU to get the Shopify product ID
    const existingProduct = await findProductBySku(item.sku, marketplace);
    
    if (!existingProduct) {
      return false; // Product doesn't exist in Shopify
    }
    
    const shopUrl = credentials.shopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    const apiUrl = `https://${shopUrl}/admin/api/2023-07/products/${existingProduct.id}.json`;
    
    await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken
      }
    });
    
    log(`Deleted product ${item.name} (${item.sku}) from Shopify`, 'shopify');
    return true;
  } catch (error) {
    console.error('Error deleting product from Shopify:', error);
    return false;
  }
}

/**
 * Sync inventory quantity from MrManifestlister to Shopify
 */
export async function syncInventoryToShopify(item: Item, marketplace: Marketplace): Promise<boolean> {
  try {
    const existingProduct = await findProductBySku(item.sku, marketplace);
    
    if (!existingProduct || !existingProduct.variants || existingProduct.variants.length === 0) {
      return false;
    }
    
    const credentials = marketplace.credentials as unknown as ShopifyCredentials;
    const shopUrl = credentials.shopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    
    // Get the inventory item ID for the variant
    const variantId = existingProduct.variants[0].id;
    const inventoryItemResponse = await fetch(`https://${shopUrl}/admin/api/2023-07/variants/${variantId}.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': credentials.accessToken
      }
    });
    
    const variantData = await inventoryItemResponse.json();
    const inventoryItemId = variantData.variant.inventory_item_id;
    
    // Update inventory level
    const inventoryLevelUrl = `https://${shopUrl}/admin/api/2023-07/inventory_levels/set.json`;
    await fetch(inventoryLevelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': credentials.accessToken
      },
      body: JSON.stringify({
        location_id: await getFirstLocationId(marketplace),
        inventory_item_id: inventoryItemId,
        available: item.quantity
      })
    });
    
    log(`Updated inventory for ${item.name} (${item.sku}) in Shopify to ${item.quantity}`, 'shopify');
    return true;
  } catch (error) {
    console.error('Error syncing inventory to Shopify:', error);
    return false;
  }
}

/**
 * Get the first location ID from the Shopify store
 */
async function getFirstLocationId(marketplace: Marketplace): Promise<string> {
  try {
    const credentials = marketplace.credentials as unknown as ShopifyCredentials;
    const shopUrl = credentials.shopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    
    const response = await fetch(`https://${shopUrl}/admin/api/2023-07/locations.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': credentials.accessToken
      }
    });
    
    const data = await response.json();
    
    if (data.locations && data.locations.length > 0) {
      return data.locations[0].id;
    }
    
    throw new Error('No locations found in Shopify store');
  } catch (error) {
    console.error('Error getting Shopify location ID:', error);
    throw error;
  }
}

/**
 * Test the Shopify connection
 */
export async function testShopifyConnection(marketplace: Marketplace): Promise<boolean> {
  try {
    const credentials = marketplace.credentials as unknown as ShopifyCredentials;
    if (!credentials || !credentials.accessToken || !credentials.shopUrl) {
      return false;
    }
    
    const shopUrl = credentials.shopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    const apiUrl = `https://${shopUrl}/admin/api/2023-07/shop.json`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': credentials.accessToken
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error testing Shopify connection:', error);
    return false;
  }
}

/**
 * Import products from Shopify
 */
export async function importProductsFromShopify(marketplace: Marketplace): Promise<Partial<Item>[]> {
  try {
    const credentials = marketplace.credentials as unknown as ShopifyCredentials;
    if (!credentials || !credentials.accessToken || !credentials.shopUrl) {
      throw new Error("Missing Shopify credentials");
    }
    
    const shopUrl = credentials.shopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    const apiUrl = `https://${shopUrl}/admin/api/2023-07/products.json?limit=50`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': credentials.accessToken
      }
    });
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      return [];
    }
    
    return data.products.map((product: ShopifyProduct) => convertShopifyProductToItem(product));
  } catch (error) {
    console.error('Error importing products from Shopify:', error);
    return [];
  }
}