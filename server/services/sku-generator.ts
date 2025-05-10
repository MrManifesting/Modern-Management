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
 * @returns A unique SKU string
 */
export function generateSKU(item: Partial<InsertItem> | Item): string {
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
  
  // Combine all parts
  return `${categoryPrefix}-${brandPrefix}-${namePart}-${timestamp}`;
}

/**
 * Generate SKUs in batch for multiple items
 * 
 * @param items Array of items to generate SKUs for
 * @returns Map of item IDs to generated SKUs
 */
export function generateSKUBatch(items: Item[]): Map<number, string> {
  const skuMap = new Map<number, string>();
  
  for (const item of items) {
    if (item.id) {
      skuMap.set(item.id, generateSKU(item));
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
    'Misc': 'MSC'
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