/**
 * Shopify Integration Service
 * Provides core Shopify functionality without mock data
 */

interface ShopifyItem {
  id: string;
  sku: string;
  title: string;
  handle: string;
  variants: any[];
}

interface PushStatus {
  enabled: boolean;
  lastSync: Date | null;
}

let pushStatus: PushStatus = {
  enabled: false,
  lastSync: null
};

export function getPushStatus(): PushStatus {
  return pushStatus;
}

export function setPushStatus(status: Partial<PushStatus>): void {
  pushStatus = { ...pushStatus, ...status };
}

export function isShopifyConfigured(): boolean {
  return !!(process.env.SHOPIFY_STORE && process.env.SHOPIFY_ACCESS_TOKEN);
}

export async function syncProductsFromShopify(): Promise<{ success: boolean; message: string; data?: any }> {
  // Check environment variables first
  const storeUrl = process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!storeUrl || !accessToken) {
    return {
      success: false,
      message: 'Shopify credentials not configured. Please check your store URL and access token.'
    };
  }
  
  try {
    // Clean the store URL
    const cleanStoreUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    const response = await fetch(`https://${cleanStoreUrl}/admin/api/2023-10/products.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        message: `Shopify API error: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    const products = data.products || [];
    
    return {
      success: true,
      message: `Successfully synchronized ${products.length} products from Shopify`,
      data: {
        products,
        total: products.length,
        synced: products.length
      }
    };
  } catch (error: any) {
    console.error('Error syncing from Shopify:', error);
    return {
      success: false,
      message: `Could not synchronize inventory from Shopify: ${error.message}`
    };
  }
}

export function getItemPushInfo(item: any): { canPush: boolean; status: string } {
  if (!item.sku) {
    return { canPush: false, status: 'No SKU' };
  }
  
  if (!item.name) {
    return { canPush: false, status: 'No name' };
  }
  
  return { canPush: true, status: 'Ready' };
}

export async function pushItemToShopify(item: any): Promise<{ success: boolean; message?: string }> {
  if (!isShopifyConfigured()) {
    return { success: false, message: 'Shopify not configured' };
  }
  
  const pushInfo = getItemPushInfo(item);
  if (!pushInfo.canPush) {
    return { success: false, message: pushInfo.status };
  }
  
  try {
    const productData = {
      product: {
        title: item.name,
        handle: item.sku?.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        product_type: item.category || 'General',
        vendor: item.brand || 'Default',
        variants: [{
          sku: item.sku,
          price: item.basePrice || '0.00',
          inventory_quantity: item.quantity || 0,
          inventory_management: 'shopify'
        }]
      }
    };
    
    const response = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/products.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: `Shopify error: ${errorData.errors || response.statusText}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, message: `Push failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export function prepareItemForShopify(item: any): any {
  return {
    ...item,
    handle: item.sku?.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    shopifyReady: getItemPushInfo(item).canPush
  };
}