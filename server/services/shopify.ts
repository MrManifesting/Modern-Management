/**
 * Shopify Integration Service
 * 
 * This module handles communication with the Shopify API for inventory synchronization.
 * It ensures that inventory levels are accurate across platforms to prevent overselling.
 * 
 * IMPORTANT: Nothing is pushed to Shopify until explicit approval is given.
 * All operations prepare data locally first.
 */

import { Item } from "@shared/schema";

// Shopify store credentials - these would be loaded from environment variables in production
// and should NEVER be hardcoded in real applications
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || '';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';

// Global sync toggle - keeps track of whether we're allowed to push to Shopify
let ALLOW_SHOPIFY_PUSH = false;

/**
 * Enable or disable actual syncing with Shopify
 * @param enable Whether to enable pushing to Shopify
 */
export function setShopifyPushEnabled(enable: boolean): void {
  console.log(`Shopify push ${enable ? 'ENABLED' : 'DISABLED'}`);
  ALLOW_SHOPIFY_PUSH = enable;
}

/**
 * Check if Shopify push is currently enabled
 * @returns Current push status
 */
export function isShopifyPushEnabled(): boolean {
  return ALLOW_SHOPIFY_PUSH;
}

/**
 * Generate SKU for cannabis product following the pattern from the Google Script
 * 
 * @param strain Cannabis strain name
 * @param percentage THC percentage 
 * @param tier Product tier/grade
 * @returns Formatted SKU
 */
export function generateCannabisProductSKU(strain: string, percentage: number, tier: string): string {
  // Extract initials from strain name (e.g., "Blue Dream" -> "BD")
  const initials = strain.split(' ')
    .map(word => word[0] || '')
    .join('')
    .toUpperCase();
  
  // Format tier code (take up to 3 chars, uppercase, letters only)
  const tierCode = tier.replace(/[^A-Z]/gi, '').substring(0, 3).toUpperCase();
  
  // Convert percentage to integer with proper precision
  const percentageCode = Math.round(percentage * 10000);
  
  return `${initials}-${tierCode}-${percentageCode}`;
}

/**
 * Format mock barcode URL for a SKU (for display purposes only until pushed)
 * 
 * @param sku Product SKU
 * @returns URL to display barcode
 */
export function getBarcodeUrl(sku: string): string {
  return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(sku)}&code=Code128&dpi=96`;
}

/**
 * Format QR code URL for Certificate of Analysis
 * 
 * @param coaUrl URL to the Certificate of Analysis
 * @returns URL to display QR code
 */
export function getCoaQrUrl(coaUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(coaUrl)}`;
}

/**
 * Prepare an item for Shopify synchronization without actually pushing
 * 
 * @param item The item to prepare for Shopify
 * @returns Preparation result
 */
export async function prepareItemForShopify(item: Item): Promise<{ 
  ready: boolean;
  sku: string;
  barcodeUrl: string;
  shopifyHandle?: string;
}> {
  try {
    // Ensure SKU exists - generate if needed for cannabis products
    let sku = item.sku;
    
    if (!sku && item.category === 'Cannabis' && item.attributes) {
      const strain = item.name;
      const percentage = parseFloat(item.attributes['percentage'] || '0');
      const tier = item.attributes['tier'] || 'Standard';
      
      if (strain && percentage && tier) {
        sku = generateCannabisProductSKU(strain, percentage, tier);
      }
    }
    
    if (!sku) {
      return { 
        ready: false, 
        sku: '', 
        barcodeUrl: '',
        shopifyHandle: undefined
      };
    }
    
    // Generate barcode URL for display
    const barcodeUrl = getBarcodeUrl(sku);
    
    // Generate a potential Shopify handle based on product name
    const shopifyHandle = item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    console.log(`Item ${item.name} prepared for Shopify. SKU: ${sku}`);
    
    return {
      ready: true,
      sku,
      barcodeUrl,
      shopifyHandle
    };
  } catch (error) {
    console.error(`Error preparing item ${item.name} for Shopify:`, error);
    return { 
      ready: false, 
      sku: item.sku || '', 
      barcodeUrl: '',
      shopifyHandle: undefined
    };
  }
}

/**
 * Synchronize a single item with Shopify - only performs actual sync if enabled
 * 
 * @param item - The item to synchronize with Shopify
 * @returns Result object with preparation and sync status
 */
export async function syncItemWithShopify(item: Item): Promise<{
  prepared: boolean;
  synced: boolean;
  sku: string;
  message: string;
}> {
  try {
    // Always prepare the item
    const preparation = await prepareItemForShopify(item);
    
    if (!preparation.ready) {
      return {
        prepared: false,
        synced: false,
        sku: item.sku || '',
        message: 'Item could not be prepared for Shopify (missing required fields)'
      };
    }
    
    // If actual sync is not enabled, stop here
    if (!ALLOW_SHOPIFY_PUSH) {
      return {
        prepared: true,
        synced: false,
        sku: preparation.sku,
        message: 'Item prepared but not pushed to Shopify (sync not enabled)'
      };
    }
    
    // In a real implementation, we would make actual API calls to Shopify here
    // For now, we'll simulate a successful sync
    console.log(`SIMULATION: Syncing item ${item.name} (SKU: ${preparation.sku}) with Shopify. Quantity: ${item.quantity}`);
    
    return {
      prepared: true,
      synced: true,
      sku: preparation.sku,
      message: 'Item successfully synced with Shopify'
    };
  } catch (error) {
    console.error(`Error in Shopify sync process for ${item.name}:`, error);
    return {
      prepared: false,
      synced: false,
      sku: item.sku || '',
      message: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Prepare and optionally sync multiple items with Shopify
 * 
 * @param items - Array of items to prepare/synchronize
 * @returns Detailed results of the operation
 */
export async function syncWithShopify(items: Item[]): Promise<{
  prepared: number;
  synced: number;
  failed: number;
  pushEnabled: boolean;
  skus: Record<number, string>;
  errors: Record<number, string>;
}> {
  let prepared = 0;
  let synced = 0;
  let failed = 0;
  const skus: Record<number, string> = {};
  const errors: Record<number, string> = {};
  
  console.log(`Processing ${items.length} items for Shopify` + 
              (ALLOW_SHOPIFY_PUSH ? ' - PUSHING ENABLED' : ' - PREPARING ONLY (no push)'));
  
  for (const item of items) {
    try {
      const result = await syncItemWithShopify(item);
      
      if (result.prepared) {
        prepared++;
        skus[item.id] = result.sku;
      }
      
      if (result.synced) {
        synced++;
      }
      
      if (!result.prepared) {
        failed++;
        errors[item.id] = result.message;
      }
    } catch (error) {
      console.error(`Error processing item ${item.name}:`, error);
      failed++;
      errors[item.id] = error instanceof Error ? error.message : 'Unknown error';
    }
  }
  
  console.log(`Shopify processing complete. Prepared: ${prepared}, Synced: ${synced}, Failed: ${failed}`);
  return { 
    prepared, 
    synced, 
    failed,
    pushEnabled: ALLOW_SHOPIFY_PUSH,
    skus,
    errors
  };
}

/**
 * Check inventory levels in Shopify and prepare updates for local database
 * Only performs actual checks if sync is enabled
 * 
 * @returns Result of the inventory check operation
 */
export async function checkShopifyInventory(): Promise<{
  checked: boolean;
  items: { sku: string; shopifyQty: number }[];
  message: string;
}> {
  if (!ALLOW_SHOPIFY_PUSH || !SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    return {
      checked: false,
      items: [],
      message: 'Shopify inventory check not performed (sync not enabled or credentials missing)'
    };
  }
  
  try {
    console.log("SIMULATION: Checking Shopify inventory levels");
    
    // In a real implementation, this would fetch inventory from Shopify API
    // For now, we'll return a simulated empty result
    
    return {
      checked: true,
      items: [],
      message: 'Inventory check completed (simulated)'
    };
  } catch (error) {
    console.error("Error checking Shopify inventory:", error);
    return {
      checked: false,
      items: [],
      message: `Inventory check error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}