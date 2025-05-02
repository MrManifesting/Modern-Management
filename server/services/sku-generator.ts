/**
 * SKU Generator Service
 * 
 * This service handles generation of SKUs for inventory items
 * without requiring Shopify API calls
 */

import { Item } from '@shared/schema';
import { log } from '../vite';

// SKU patterns
const DEFAULT_SKU_PATTERN = 'GSC-{CATEGORY}-{ID}';
const THCA_SKU_PATTERN = '{INITIALS}-{TIER}-{THC}';

/**
 * Generates a SKU for an item based on its properties
 * without making any API calls or requiring Shopify integration
 */
export function generateSku(item: Item): string {
  if (item.sku) {
    return item.sku; // Don't overwrite existing SKUs
  }
  
  try {
    // For THCA flower, use special pattern
    if (item.category?.toLowerCase().includes('thca flower')) {
      return generateThcaSku(item);
    }
    
    // For other items, use standard pattern
    return generateStandardSku(item);
  } catch (error) {
    log(`Error generating SKU: ${error}`, 'sku-generator');
    // Fallback to a basic SKU format that ensures uniqueness
    return `GSC-${item.id || Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Generate a SKU for THCA flower products
 * Format: INITIALS-TIER-THCVALUE
 * Example: IS-AAA-28
 */
function generateThcaSku(item: Item): string {
  // Extract initials from name (up to 2 characters)
  const initials = (item.name.split(' ')
    .map(word => word[0])
    .join('')
  ).slice(0, 2).toUpperCase();
  
  // Extract tier and THC percentage from attributes
  const attributes = item.attributes || {};
  const tier = attributes["tier"] || 'A';
  
  // Extract THC percentage, remove any % signs and round to nearest whole number
  const percentage = attributes["percentage"] || '0';
  const thcValue = percentage.toString().replace('%', '').trim();
  
  // Construct the SKU
  return `${initials}-${tier}-${thcValue}`;
}

/**
 * Generate a standard SKU for general products
 * Format: GSC-CATEGORY-ID
 * Example: GSC-OIL-123
 */
function generateStandardSku(item: Item): string {
  // Get short category code
  const category = item.category || 'ITEM';
  const categoryCode = getCategoryCode(category);
  
  // Get unique identifier
  const id = item.id || Math.floor(Math.random() * 10000);
  
  // Construct the SKU
  return `GSC-${categoryCode}-${id}`;
}

/**
 * Get a short code (3-4 chars) for a category
 */
function getCategoryCode(category: string): string {
  // Map of common categories to short codes
  const categoryMap: Record<string, string> = {
    'flower': 'FLW',
    'oil': 'OIL',
    'tincture': 'TNC',
    'edible': 'EDB',
    'topical': 'TOP',
    'concentrate': 'CNT',
    'vaporizer': 'VAP',
    'accessory': 'ACC',
    'merchandise': 'MER',
    'pet': 'PET',
    'thca flower': 'THCA',
    'cbd flower': 'CBD',
    'delta 8': 'D8',
    'delta 9': 'D9'
  };
  
  // Try to find a match in our map
  for (const [key, code] of Object.entries(categoryMap)) {
    if (category.toLowerCase().includes(key)) {
      return code;
    }
  }
  
  // If no match, just take the first 3 characters of the category
  return category.substring(0, 3).toUpperCase();
}

/**
 * Generate SKUs for multiple items at once
 */
export function generateSkuBatch(items: Item[]): Record<number, string> {
  const skuMap: Record<number, string> = {};
  
  for (const item of items) {
    if (!item.id) continue;
    skuMap[item.id] = generateSku(item);
  }
  
  return skuMap;
}

/**
 * Validate a SKU format
 */
export function validateSku(sku: string): boolean {
  // Basic validation - SKU should be at least 3 characters,
  // no more than 20, and contain alphanumeric characters and dashes
  const skuRegex = /^[A-Za-z0-9-]{3,20}$/;
  return skuRegex.test(sku);
}