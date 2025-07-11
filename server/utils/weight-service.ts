/**
 * Unified Weight Service - Consolidates all weight parsing and extraction logic
 * Combines functionality from weight-parser, weight-fix, targeted-weight-fix, 
 * accurate-weight-extractor, and shopify-weight-extractor
 */

import { logger } from './logger.js';

const log = (message: string, context = 'weight-service') => logger.info(message, context);

export interface WeightResult {
  weight: string;
  category: 'gram' | 'ounce' | 'pound' | 'count' | 'not_specified';
  source: 'product_name' | 'shopify_data' | 'fallback';
}

export class WeightService {
  
  /**
   * Main entry point - extracts weight from all available sources
   */
  static extractWeight(productName: string, shopifyData?: any): WeightResult {
    // First try Shopify data if available
    if (shopifyData) {
      const shopifyWeight = this.extractFromShopifyData(shopifyData);
      if (shopifyWeight.weight !== 'Weight not specified') {
        return shopifyWeight;
      }
    }
    
    // Then try product name
    return this.extractFromProductName(productName);
  }

  /**
   * Extract weight from Shopify variant data
   */
  static extractFromShopifyData(shopifyData: any): WeightResult {
    if (!shopifyData?.variants?.edges?.[0]?.node) {
      return { weight: 'Weight not specified', category: 'not_specified', source: 'fallback' };
    }

    const variant = shopifyData.variants.edges[0].node;
    const weight = variant.weight;
    const unit = variant.weightUnit?.toLowerCase();

    if (!weight || !unit) {
      return { weight: 'Weight not specified', category: 'not_specified', source: 'fallback' };
    }

    log(`Using authentic Shopify weight: ${weight} ${unit}`, 'shopify-weight');

    if (unit === 'grams' || unit === 'g') {
      if (weight >= 453.592) { // 1 pound in grams
        const pounds = Math.round(weight / 453.592 * 4) / 4; // Round to quarters
        return {
          weight: `${pounds} pound${pounds !== 1 ? 's' : ''}`,
          category: 'pound',
          source: 'shopify_data'
        };
      } else if (weight >= 28.3495) { // 1 ounce in grams
        const ounces = Math.round(weight / 28.3495 * 4) / 4; // Round to quarters
        return {
          weight: `${ounces} ounce${ounces !== 1 ? 's' : ''}`,
          category: 'ounce',
          source: 'shopify_data'
        };
      } else {
        return {
          weight: `${weight}g`,
          category: 'gram',
          source: 'shopify_data'
        };
      }
    } else if (unit === 'pounds' || unit === 'lb') {
      return {
        weight: `${weight} pound${weight !== 1 ? 's' : ''}`,
        category: 'pound',
        source: 'shopify_data'
      };
    } else if (unit === 'ounces' || unit === 'oz') {
      if (weight >= 16) { // 1 pound in ounces
        const pounds = Math.round(weight / 16 * 4) / 4;
        return {
          weight: `${pounds} pound${pounds !== 1 ? 's' : ''}`,
          category: 'pound',
          source: 'shopify_data'
        };
      } else {
        return {
          weight: `${weight} ounce${weight !== 1 ? 's' : ''}`,
          category: 'ounce',
          source: 'shopify_data'
        };
      }
    }

    return {
      weight: `${weight} ${unit}`,
      category: 'not_specified',
      source: 'shopify_data'
    };
  }

  /**
   * Extract weight from product name with comprehensive parsing
   */
  static extractFromProductName(productName: string): WeightResult {
    if (!productName) {
      return { weight: 'Weight not specified', category: 'not_specified', source: 'fallback' };
    }

    const name = productName.toLowerCase().trim();

    // PRIORITY 1: Count-based products (highest priority)
    if (name.includes('count')) {
      const countMatch = name.match(/(\d+)\s*count/i);
      if (countMatch) {
        return {
          weight: `${countMatch[1]} count`,
          category: 'count',
          source: 'product_name'
        };
      }
    }

    // PRIORITY 2: Specific gram amounts
    const gramPatterns = [
      { pattern: /(\d+(?:\.\d+)?)\s*g(?:ram)?s?\b/i, extract: (match: RegExpMatchArray) => `${match[1]} grams` },
      { pattern: /half\s*gram/i, extract: () => 'half gram' },
      { pattern: /2\s*grams?|2g\b/i, extract: () => '2 grams' },
      { pattern: /3\.5\s*grams?|3\.5g\b|eighth/i, extract: () => '3.5 grams' },
      { pattern: /7\s*grams?|7g\b|quarter/i, extract: () => '7 grams' },
      { pattern: /14\s*grams?|14g\b|half\s*o(?:unce)?z/i, extract: () => '14 grams' },
      { pattern: /28\s*grams?|28g\b|o(?:unce)?z/i, extract: () => '28 grams' }
    ];

    for (const { pattern, extract } of gramPatterns) {
      const match = productName.match(pattern);
      if (match) {
        return {
          weight: extract(match),
          category: 'gram',
          source: 'product_name'
        };
      }
    }

    // PRIORITY 3: Ounce amounts
    if (name.includes('eighth') || name.includes('1/8')) {
      return { weight: '3.5 grams', category: 'gram', source: 'product_name' };
    }
    if (name.includes('quarter oz') || name.includes('1/4 oz') || name.includes('0.25 oz')) {
      return { weight: 'quarter ounce', category: 'ounce', source: 'product_name' };
    }
    if (name.includes('half oz') || name.includes('1/2 oz') || name.includes('0.5 oz')) {
      return { weight: 'half ounce', category: 'ounce', source: 'product_name' };
    }

    const ounceMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce)/);
    if (ounceMatch) {
      const amount = parseFloat(ounceMatch[1]);
      return {
        weight: `${amount} ounce${amount !== 1 ? 's' : ''}`,
        category: 'ounce',
        source: 'product_name'
      };
    }

    // PRIORITY 4: Pound amounts (only if explicitly mentioned)
    if (name.includes('quarter pound') || name.includes('1/4 pound') || name.includes('0.25 pound') || name.includes('qp')) {
      return { weight: 'quarter pound', category: 'pound', source: 'product_name' };
    }
    if (name.includes('half pound') || name.includes('1/2 pound') || name.includes('0.5 pound') || name.includes('hp')) {
      return { weight: 'half pound', category: 'pound', source: 'product_name' };
    }
    
    // Check for pound in parentheses
    const poundMatch = name.match(/\(([^)]*pound[^)]*)\)/i);
    if (poundMatch) {
      const weightText = poundMatch[1].toLowerCase().trim();
      if (weightText.includes('1 pound') || weightText === 'pound') {
        return { weight: '1 pound', category: 'pound', source: 'product_name' };
      } else if (weightText.includes('half pound')) {
        return { weight: 'half pound', category: 'pound', source: 'product_name' };
      } else if (weightText.includes('quarter pound')) {
        return { weight: 'quarter pound', category: 'pound', source: 'product_name' };
      }
    }
    
    // Explicit pound mentions
    if (name.includes('1 pound') || name.includes('one pound') || name.includes('1lb')) {
      return { weight: '1 pound', category: 'pound', source: 'product_name' };
    }

    // PRIORITY 5: Category-based defaults
    if (name.includes('pre-roll') || name.includes('preroll') || name.includes('joint')) {
      return { weight: '1 gram', category: 'gram', source: 'product_name' };
    }
    
    if (name.includes('edible') || name.includes('gummy') || name.includes('chocolate')) {
      return { weight: '10mg', category: 'not_specified', source: 'product_name' };
    }
    
    if (name.includes('cartridge') || name.includes('cart') || name.includes('vape')) {
      return { weight: '1 gram', category: 'gram', source: 'product_name' };
    }

    // PRIORITY 6: Bulk flower indicators (only as last resort)
    if ((name.includes('bulk flower') || name.includes('book flower')) && 
        !name.includes('gram') && !name.includes('ounce')) {
      return { weight: '1 pound', category: 'pound', source: 'product_name' };
    }

    return { weight: 'Weight not specified', category: 'not_specified', source: 'fallback' };
  }

  /**
   * Fix weight for a single item based on its name
   */
  static getCorrectWeight(itemName: string, currentWeight?: string): string {
    const result = this.extractFromProductName(itemName);
    
    // If we found a valid weight and it's different from current, return it
    if (result.category !== 'not_specified' && result.weight !== currentWeight) {
      return result.weight;
    }
    
    // Otherwise keep current weight or use the extracted one
    return currentWeight || result.weight;
  }
}

// Export convenience functions for backward compatibility
export function parseWeightFromProductName(productName: string): string {
  return WeightService.extractFromProductName(productName).weight;
}

export function extractWeightFromShopifyData(shopifyData: any): string {
  return WeightService.extractFromShopifyData(shopifyData).weight;
}

export function extractAccurateWeight(productName: string, shopifyData?: any): WeightResult {
  return WeightService.extractWeight(productName, shopifyData);
}