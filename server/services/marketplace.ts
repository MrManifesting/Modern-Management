import { Item, Marketplace } from "@shared/schema";
import { shopifyService } from './marketplaces/shopify';
import { etsyService } from './marketplaces/etsy';
import { woocommerceService } from './marketplaces/woocommerce';
import { amazonService } from './marketplaces/amazon';
import { ebayService } from './marketplaces/ebay';
import { logOperation } from './marketplace-logger';
import { IStorage } from '../storage';

export interface MarketplaceProduct {
  id?: string | number;
  title: string;
  description: string;
  vendor?: string;
  productType?: string;
  status: string;
  variants: Array<{
    price: string;
    sku: string;
    inventoryQuantity: number;
    barcode?: string;
    options?: Record<string, string>;
  }>;
  images?: Array<{
    src: string;
    alt?: string;
  }>;
  tags?: string[];
}

export interface MarketplaceTestResult {
  connected: boolean;
  name: string;
  message: string;
}

export interface MarketplacePushResult {
  success: boolean;
  productId?: string | number;
  message: string;
}

export interface MarketplaceService {
  testConnection(credentials: any): Promise<MarketplaceTestResult>;
  prepareItemForPush(item: Item): MarketplaceProduct;
  pushItemToMarketplace(product: MarketplaceProduct, credentials: any): Promise<MarketplacePushResult>;
  fetchProducts(credentials: any): Promise<MarketplaceProduct[]>;
  syncProductsFromMarketplace(credentials: any, storage: IStorage): Promise<{
    imported: number;
    updated: number;
    total: number;
    errors: string[];
  }>;
}

/**
 * Get the marketplace service for a specific marketplace type
 */
export function getMarketplaceService(type: string): MarketplaceService {
  switch (type.toLowerCase()) {
    case 'shopify':
      return shopifyService;
    case 'etsy':
      return etsyService;
    case 'woocommerce':
      return woocommerceService;
    case 'amazon':
      return amazonService;
    case 'ebay':
      return ebayService;
    default:
      throw new Error(`Unsupported marketplace type: ${type}`);
  }
}

/**
 * Check if marketplace credentials are configured
 */
export async function isMarketplaceConfigured(marketplace: Marketplace): Promise<boolean> {
  try {
    // Extract credentials
    const credentials = marketplace.credentials;
    
    if (!credentials || Object.keys(credentials).length === 0) {
      return false;
    }
    
    // Different marketplaces have different required credentials
    switch (marketplace.type) {
      case 'shopify':
        return !!(credentials.storeUrl && credentials.apiKey);
      case 'etsy':
        return !!(credentials.apiKey && credentials.apiSecret);
      case 'woocommerce':
        return !!(credentials.storeUrl && credentials.apiKey && credentials.apiSecret);
      case 'amazon':
        return !!(credentials.apiKey && credentials.apiSecret);
      case 'ebay':
        return !!(credentials.apiKey && credentials.apiSecret);
      default:
        return !!(credentials.apiKey);
    }
  } catch (error) {
    console.error(`Error checking marketplace configuration for ${marketplace.name}:`, error);
    return false;
  }
}

/**
 * Test connection to a marketplace
 */
export async function testMarketplaceConnection(marketplace: Marketplace): Promise<MarketplaceTestResult> {
  try {
    if (!isMarketplaceConfigured(marketplace)) {
      return {
        connected: false,
        name: marketplace.name,
        message: `${marketplace.name} credentials are not properly configured.`
      };
    }
    
    const service = getMarketplaceService(marketplace.type);
    return await service.testConnection(marketplace.credentials);
  } catch (error) {
    console.error(`Error testing connection to ${marketplace.name}:`, error);
    return {
      connected: false,
      name: marketplace.name,
      message: error instanceof Error ? error.message : `Unknown error testing connection to ${marketplace.name}`
    };
  }
}

/**
 * Prepare an item for pushing to a marketplace
 */
export function prepareItemForMarketplace(item: Item, marketplace: Marketplace): MarketplaceProduct {
  try {
    const service = getMarketplaceService(marketplace.type);
    return service.prepareItemForPush(item);
  } catch (error) {
    console.error(`Error preparing item ${item.name} for ${marketplace.name}:`, error);
    throw error;
  }
}

/**
 * Push an item to a marketplace
 */
export async function pushItemToMarketplace(
  item: Item, 
  marketplace: Marketplace, 
  pushEnabled: boolean = true
): Promise<MarketplacePushResult> {
  // Check if push is enabled
  if (!pushEnabled) {
    logOperation(
      marketplace.id,
      'pushItemRejected',
      { 
        itemId: item.id,
        itemName: item.name,
        reason: 'push disabled' 
      },
      false,
      'Marketplace push is disabled'
    );
    
    return { 
      success: false,
      message: `${marketplace.name} push is currently disabled. Enable it in settings to push products.`
    };
  }
  
  try {
    // Check if marketplace is configured
    if (!await isMarketplaceConfigured(marketplace)) {
      logOperation(
        marketplace.id,
        'pushItemRejected',
        { 
          itemId: item.id,
          itemName: item.name,
          reason: 'credentials missing' 
        },
        false,
        `${marketplace.name} credentials are not properly configured`
      );
      
      return { 
        success: false,
        message: `${marketplace.name} credentials are not properly configured.`
      };
    }
    
    // Prepare the item for the marketplace
    const service = getMarketplaceService(marketplace.type);
    const product = service.prepareItemForPush(item);
    
    // Push to the marketplace
    const result = await service.pushItemToMarketplace(product, marketplace.credentials);
    
    // Log the operation
    logOperation(
      marketplace.id,
      result.success ? 'pushItemSuccess' : 'pushItemFailed',
      { 
        itemId: item.id,
        itemName: item.name,
        productId: result.productId 
      },
      result.success,
      result.message
    );
    
    return result;
  } catch (error) {
    console.error(`Error pushing item ${item.name} to ${marketplace.name}:`, error);
    
    // Log the error
    logOperation(
      marketplace.id,
      'pushItemFailed',
      { 
        itemId: item.id,
        itemName: item.name,
        error: error instanceof Error ? error.message : String(error) 
      },
      false,
      error instanceof Error ? error.message : `Unknown error pushing to ${marketplace.name}`
    );
    
    return {
      success: false,
      message: error instanceof Error ? error.message : `Unknown error pushing to ${marketplace.name}`
    };
  }
}

/**
 * Sync products from a marketplace
 */
export async function syncProductsFromMarketplace(
  marketplace: Marketplace,
  storage: IStorage
): Promise<{
  imported: number;
  updated: number;
  total: number;
  errors: string[];
}> {
  try {
    // Check if marketplace is configured
    if (!await isMarketplaceConfigured(marketplace)) {
      throw new Error(`${marketplace.name} credentials are not properly configured.`);
    }
    
    // Get the marketplace service
    const service = getMarketplaceService(marketplace.type);
    
    // Sync the products
    const result = await service.syncProductsFromMarketplace(marketplace.credentials, storage);
    
    // Log the operation
    logOperation(
      marketplace.id,
      'syncProducts',
      { 
        imported: result.imported,
        updated: result.updated,
        total: result.total,
        errors: result.errors
      },
      result.errors.length === 0,
      `Synced ${result.imported} new and ${result.updated} existing products from ${marketplace.name}.`
    );
    
    // Update the marketplace last sync date
    await storage.updateMarketplace(marketplace.id, {
      lastSyncDate: new Date()
    });
    
    return result;
  } catch (error) {
    console.error(`Error syncing products from ${marketplace.name}:`, error);
    
    // Log the error
    logOperation(
      marketplace.id,
      'syncProductsFailed',
      { 
        error: error instanceof Error ? error.message : String(error) 
      },
      false,
      error instanceof Error ? error.message : `Unknown error syncing from ${marketplace.name}`
    );
    
    return {
      imported: 0,
      updated: 0,
      total: 0,
      errors: [error instanceof Error ? error.message : `Unknown error syncing from ${marketplace.name}`]
    };
  }
}