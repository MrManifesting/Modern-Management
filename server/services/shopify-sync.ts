import { Item } from '@shared/schema';
import { IStorage } from '../storage';
import { 
  isShopifyConfigured, 
  getItemPushInfo,
  pushEnabled
} from './shopify';
import { log } from '../vite';
import Shopify from 'shopify-api-node';

// Create a Shopify client instance
export async function getShopifyClient() {
  try {
    // Using environment variables for Shopify credentials
    const shopifyStore = process.env.SHOPIFY_STORE;
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
    if (!shopifyStore || !shopifyAccessToken) {
      log('Shopify credentials missing. Please check environment variables.', 'shopify');
      return null;
    }
    
    const shopify = new Shopify({
      shopName: shopifyStore,
      accessToken: shopifyAccessToken,
      apiVersion: '2023-10'
    });
    
    return shopify;
  } catch (error) {
    log(`Error creating Shopify client: ${error}`, 'shopify');
    return null;
  }
}

// Structure for Shopify product data
export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  sku: string;
  variantId?: string;
  price: number;
  quantity: number;
  weight?: string | number;
  option1?: string;
  option2?: string;
  option3?: string;
  hasImage: boolean;
  inShopify: boolean;
  updatedAt: Date;
}

// Sync preview response
export interface SyncPreviewResponse {
  shopifyProducts: ShopifyProduct[];
  message?: string;
  success: boolean;
}

// Fetch all products from Shopify for sync preview
export async function getShopifyProducts(): Promise<SyncPreviewResponse> {
  try {
    // Check if Shopify is configured
    if (!await isShopifyConfigured()) {
      log('Shopify not configured properly for sync preview', 'shopify-details');
      return {
        shopifyProducts: [],
        message: 'Shopify is not properly configured. Please check your API credentials.',
        success: false
      };
    }
    
    // Get Shopify client
    const shopify = await getShopifyClient();
    if (!shopify) {
      log('Failed to initialize Shopify client for sync preview', 'shopify-details');
      return {
        shopifyProducts: [],
        message: 'Failed to initialize Shopify client',
        success: false
      };
    }
    
    log('Attempting to fetch products from Shopify for sync preview', 'shopify-details');
    
    // Add timeout handling for the Shopify API request
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Shopify API request timed out after 20 seconds')), 20000);
    });
    
    // Fetch products from Shopify with timeout protection
    const responsePromise = shopify.product.list({ limit: 250 });
    
    // Race the API call against the timeout
    const response = await Promise.race([responsePromise, timeoutPromise])
      .catch(error => {
        log(`Shopify API request failed: ${error.message}`, 'shopify-details');
        return null;
      });
    
    if (!response) {
      log('No response or timeout from Shopify API for sync preview', 'shopify-details');
      return {
        shopifyProducts: [],
        message: 'No response from Shopify API. The request may have timed out or failed.',
        success: false
      };
    }
    
    // Extract product data
    const shopifyProducts: ShopifyProduct[] = [];
    
    for (const product of response) {
      // Only include products with variants
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          shopifyProducts.push({
            id: product.id.toString(),
            handle: product.handle,
            title: product.title + (variant.title !== 'Default Title' ? ` - ${variant.title}` : ''),
            sku: variant.sku || '',
            variantId: variant.id.toString(),
            price: parseFloat(variant.price),
            quantity: variant.inventory_quantity,
            weight: variant.weight,
            option1: variant.option1 === null ? undefined : variant.option1,
            option2: variant.option2 === null ? undefined : variant.option2,
            option3: variant.option3 === null ? undefined : variant.option3,
            hasImage: product.images && product.images.length > 0,
            inShopify: true,
            updatedAt: new Date(product.updated_at)
          });
        }
      } else {
        // Handle products without variants
        shopifyProducts.push({
          id: product.id.toString(),
          handle: product.handle,
          title: product.title,
          sku: '',
          price: 0,
          quantity: 0,
          hasImage: product.images && product.images.length > 0,
          inShopify: true,
          updatedAt: new Date(product.updated_at)
        });
      }
    }
    
    return {
      shopifyProducts,
      success: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error fetching Shopify products: ${errorMessage}`, 'shopify');
    
    // Determine if it's a connection error
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                              errorMessage.includes('ETIMEDOUT') ||
                              errorMessage.includes('timed out') ||
                              errorMessage.includes('connect');
    
    return {
      shopifyProducts: [],
      message: isConnectionError 
        ? `Failed to connect to Shopify. Please check your internet connection and Shopify store status.` 
        : `Error fetching Shopify products: ${errorMessage}`,
      success: false
    };
  }
}

// Update a product in Shopify
export async function updateShopifyProduct(
  shopifyId: string, 
  inventoryItem: Item, 
  options: { 
    updateStock: boolean; 
    updatePrice: boolean; 
    updateImages: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if push is enabled
    if (!pushEnabled()) {
      return {
        success: false,
        message: 'Shopify push is currently disabled. Enable it in settings to push products.'
      };
    }
    
    // Check if Shopify is configured
    if (!await isShopifyConfigured()) {
      return {
        success: false,
        message: 'Shopify is not properly configured. Please check your API credentials.'
      };
    }
    
    // Get Shopify client
    const shopify = await getShopifyClient();
    if (!shopify) {
      return {
        success: false,
        message: 'Failed to initialize Shopify client'
      };
    }
    
    // Get the Shopify product
    const product = await shopify.product.get(parseInt(shopifyId));
    if (!product) {
      return {
        success: false,
        message: `Product not found in Shopify: ${shopifyId}`
      };
    }
    
    // Get push info to find the matching variant if needed
    const pushInfo = await getItemPushInfo(inventoryItem);
    
    // Find the appropriate variant to update (matching by SKU if possible)
    const variants = product.variants || [];
    let variantToUpdate = variants.find(v => v.sku === inventoryItem.sku);
    
    // If no variant with matching SKU, use the first one
    if (!variantToUpdate && variants.length > 0) {
      variantToUpdate = variants[0];
    }
    
    // If there's a variant to update
    if (variantToUpdate) {
      const variantId = variantToUpdate.id;
      const updateData: any = {};
      
      // Update price if requested
      if (options.updatePrice) {
        // Use salePrice if available, otherwise basePrice
        const priceToUse = inventoryItem.salePrice !== null ? 
          inventoryItem.salePrice : inventoryItem.basePrice;
        updateData.price = priceToUse.toString();
      }
      
      // Update inventory if requested
      if (options.updateStock) {
        // Determine the inventory item ID
        const inventoryItemId = variantToUpdate.inventory_item_id;
        
        if (inventoryItemId) {
          // Update inventory level
          try {
            const locations = await shopify.location.list();
            if (locations && locations.length > 0) {
              const locationId = locations[0].id;
              
              await shopify.inventoryLevel.set({
                inventory_item_id: inventoryItemId,
                location_id: locationId,
                available: inventoryItem.quantity
              });
              
              log(`Updated inventory for ${inventoryItem.name} to ${inventoryItem.quantity}`, 'shopify');
            }
          } catch (inventoryError) {
            log(`Error updating inventory: ${inventoryError}`, 'shopify');
            return {
              success: false,
              message: `Error updating inventory: ${inventoryError}`
            };
          }
        }
      }
      
      // Only update variant if we have changes
      if (Object.keys(updateData).length > 0) {
        await shopify.productVariant.update(variantId, updateData);
        log(`Updated variant ${variantId} for product ${shopifyId}`, 'shopify');
      }
      
      // Update images if requested and if inventory item has images
      if (options.updateImages && inventoryItem.images && Array.isArray(inventoryItem.images) && inventoryItem.images.length > 0) {
        // In a real implementation, we'd upload the images to Shopify
        // For now, we'll just log this
        log(`Would update images for product ${shopifyId}`, 'shopify');
      }
      
      return {
        success: true,
        message: `Successfully updated product: ${inventoryItem.name}`
      };
    } else {
      return {
        success: false,
        message: `No variant found for product: ${shopifyId}`
      };
    }
  } catch (error) {
    log(`Error updating Shopify product: ${error}`, 'shopify');
    return {
      success: false,
      message: `Error updating Shopify product: ${error}`
    };
  }
}

// Create a new product in Shopify
export async function createShopifyProduct(
  inventoryItem: Item, 
  customSku?: string
): Promise<{ success: boolean; message: string; productId?: string }> {
  try {
    // Check if push is enabled
    if (!pushEnabled()) {
      return {
        success: false,
        message: 'Shopify push is currently disabled. Enable it in settings to push products.'
      };
    }
    
    // Check if Shopify is configured
    if (!await isShopifyConfigured()) {
      return {
        success: false,
        message: 'Shopify is not properly configured. Please check your API credentials.'
      };
    }
    
    // Get Shopify client
    const shopify = await getShopifyClient();
    if (!shopify) {
      return {
        success: false,
        message: 'Failed to initialize Shopify client'
      };
    }
    
    // Prepare product data
    const productData = {
      title: inventoryItem.name,
      body_html: inventoryItem.description || '',
      vendor: 'MrListerscurations',
      product_type: inventoryItem.category || 'CBD',
      variants: [
        {
          price: (inventoryItem.salePrice !== null ? inventoryItem.salePrice : inventoryItem.basePrice).toString(),
          sku: customSku || inventoryItem.sku,
          inventory_management: 'shopify',
          inventory_quantity: inventoryItem.quantity,
          requires_shipping: true
        }
      ]
    };
    
    // Create the product
    const newProduct = await shopify.product.create(productData);
    
    if (!newProduct) {
      return {
        success: false,
        message: 'Failed to create product in Shopify'
      };
    }
    
    // Set inventory for the new product
    if (newProduct.variants && newProduct.variants.length > 0) {
      const variant = newProduct.variants[0];
      const inventoryItemId = variant.inventory_item_id;
      
      if (inventoryItemId) {
        try {
          const locations = await shopify.location.list();
          if (locations && locations.length > 0) {
            const locationId = locations[0].id;
            
            await shopify.inventoryLevel.set({
              inventory_item_id: inventoryItemId,
              location_id: locationId,
              available: inventoryItem.quantity
            });
          }
        } catch (inventoryError) {
          log(`Error setting inventory for new product: ${inventoryError}`, 'shopify');
          // Continue even if inventory setting fails
        }
      }
    }
    
    // In a real implementation, we would also upload images here
    
    return {
      success: true,
      message: `Successfully created product: ${inventoryItem.name}`,
      productId: newProduct.id.toString()
    };
  } catch (error) {
    log(`Error creating Shopify product: ${error}`, 'shopify');
    return {
      success: false,
      message: `Error creating Shopify product: ${error}`
    };
  }
}

