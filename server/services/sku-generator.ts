/**
 * SKU Generator Service
 * 
 * This service provides functions for generating SKUs for inventory items
 */

import { InsertItem, Item } from "@shared/schema";

/**
 * Generate a SKU (Stock Keeping Unit) for an item
 * 
 * @param item The item data to generate a SKU for
 * @param options Optional configuration for SKU generation
 * @returns A unique SKU string
 */
export function generateSKU(
  item: Partial<InsertItem> | Item, 
  options?: { 
    quantity?: number, 
    weight?: number, 
    weightUnit?: string,
    parentSku?: string,
    unitIndex?: number // For generating unique SKUs per unit
  }
): string {
  // Start with a category prefix (max 3 chars)
  const categoryPrefix = getCategoryPrefix(item.category || 'MISC');
  
  // Add a brand prefix if available (max 3 chars)
  const brandPrefix = item.brand 
    ? item.brand.substring(0, 3).toUpperCase() 
    : 'GEN';
  
  // Add a name part (max 4 chars)
  const namePart = (item.name || 'ITEM')
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars
    .substring(0, 4)
    .toUpperCase();
  
  // Add a timestamp for uniqueness
  const timestamp = Date.now().toString().substring(7);
  
  // Base SKU
  let sku = `${categoryPrefix}-${brandPrefix}-${namePart}-${timestamp}`;
  
  // If we have options for quantity or weight, incorporate them into the SKU
  if (options) {
    // If this is a breakdown or derived item with quantity/weight
    if (options.parentSku) {
      // Use parent SKU as base
      sku = options.parentSku;
      
      // Add a weight suffix if provided
      if (options.weight && options.weightUnit) {
        sku = `${sku}-${options.weight}${options.weightUnit}`;
      }
      
      // Add unit index for individual tracking
      if (options.unitIndex !== undefined) {
        sku = `${sku}-U${String(options.unitIndex).padStart(3, '0')}`;
      }
    }
    // If this is a standalone item with quantity variations
    else if (options.quantity && options.quantity > 1) {
      sku = `${sku}-QTY${options.quantity}`;
    }
    
    // Add unit index for individual tracking
    if (options.unitIndex !== undefined) {
      sku = `${sku}-U${String(options.unitIndex).padStart(3, '0')}`;
    }
  }
  
  return sku;
}

/**
 * Generate multiple SKUs for items with quantities > 1
 * Each unit gets its own unique SKU and barcode for individual tracking
 */
export function generateMultipleSkus(
  item: Partial<InsertItem> | Item,
  quantity: number
): string[] {
  const skus: string[] = [];
  
  for (let i = 1; i <= quantity; i++) {
    const sku = generateSKU(item, { unitIndex: i });
    skus.push(sku);
  }
  
  return skus;
}

/**
 * Generate SKUs in batch for multiple items
 * 
 * @param items Array of items to generate SKUs for
 * @param options Optional configuration for SKU generation, keyed by item ID
 * @returns Map of item IDs to generated SKUs
 */
export function generateSKUBatch(
  items: Item[], 
  options?: Record<number, { 
    quantity?: number, 
    weight?: number, 
    weightUnit?: string,
    parentSku?: string
  }>
): Record<number, string> {
  const skuMap: Record<number, string> = {};
  
  for (const item of items) {
    if (item.id) {
      const itemOptions = options?.[item.id];
      skuMap[item.id] = generateSKU(item, itemOptions);
    }
  }
  
  return skuMap;
}

/**
 * Generate a quantity-specific SKU for an item
 * 
 * @param item The base item
 * @param quantity The specific quantity
 * @returns A quantity-specific SKU
 */
export function generateQuantitySKU(item: Item, quantity: number): string {
  // Generate a SKU that includes the quantity
  return generateSKU(item, { quantity });
}

/**
 * Generate SKUs for a breakdown of an item
 * 
 * @param parentItem The parent/bulk item
 * @param weights Array of weight breakdowns (e.g., [7, 14, 28])
 * @param weightUnit The unit of weight (e.g., 'g')
 * @returns Map of weights to generated SKUs
 */
export function generateBreakdownSKUs(
  parentItem: Item, 
  weights: number[], 
  weightUnit: string
): Record<number, string> {
  const skuMap: Record<number, string> = {};
  
  if (!parentItem.sku) {
    // Generate a parent SKU if it doesn't exist
    const parentSku = generateSKU(parentItem);
    
    for (const weight of weights) {
      const sku = generateSKU(parentItem, {
        weight,
        weightUnit,
        parentSku
      });
      skuMap[weight] = sku;
    }
  } else {
    // Use the existing parent SKU
    for (const weight of weights) {
      const sku = generateSKU(parentItem, {
        weight,
        weightUnit,
        parentSku: parentItem.sku
      });
      skuMap[weight] = sku;
    }
  }
  
  return skuMap;
}

/**
 * Get a prefix for a category
 * 
 * @param category The category name
 * @returns A 3-character prefix for the category
 */
function getCategoryPrefix(category: string): string {
  // Standard category prefixes
  const categoryPrefixes: Record<string, string> = {
    'Electronics': 'ELC',
    'Clothing': 'CLO',
    'Accessories': 'ACC',
    'Food': 'FOD',
    'Beverage': 'BEV',
    'General': 'GEN',
    'Software': 'SFT',
    'Hardware': 'HRD',
    'Toys': 'TOY',
    'Kitchen': 'KIT',
    'Office': 'OFF',
    'Books': 'BOK',
    'Health': 'HLT',
    'Beauty': 'BTY',
    'Sports': 'SPT',
    'Outdoor': 'OUT',
    'Automotive': 'AUT',
    'Home': 'HOM',
    'Furniture': 'FRN',
    'Art': 'ART',
    'Craft': 'CRF',
    'Tools': 'TLS',
    'Garden': 'GRD',
    'Pet': 'PET',
    'Baby': 'BBY',
    'Medicine': 'MED',
    'Supplements': 'SUP',
    'Misc': 'MSC',
    'Flower': 'FLW',
    'Concentrate': 'CON',
    'Edible': 'EDB',
    'Topical': 'TOP',
    'Accessory': 'ACS',
    'Bulk': 'BLK',
    'Exotic': 'EXO',
    'Indoor': 'IND',
    'Outdoor': 'ODR',
    'THCA': 'THA'
  };
  
  // Normalize the category name
  const normalizedCategory = category.trim();
  
  // Return the predefined prefix or derive one from the category name
  if (categoryPrefixes[normalizedCategory]) {
    return categoryPrefixes[normalizedCategory];
  }
  
  // Generate a prefix from the category name
  return normalizedCategory
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 3)
    .toUpperCase()
    || 'MSC'; // Default to 'MSC' if no valid characters
}