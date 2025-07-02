/**
 * Accurate Weight Extractor - Fixes incorrect weight display issues
 * 
 * Issues being fixed:
 * - "100 count (no tube)" showing as "1 pound" should show "100 count"
 * - "2 GRAMS" products showing as "1 pound" should show "2 grams"
 * - Products with "poundm" showing malformed weights
 */

export interface AccurateWeightResult {
  weight: string;
  category: 'gram' | 'ounce' | 'pound' | 'count' | 'not_specified';
  source: 'product_name' | 'shopify_data' | 'fallback';
}

export class AccurateWeightExtractor {
  
  /**
   * Extract accurate weight from product name with strict parsing rules
   */
  static extractAccurateWeight(productName: string, shopifyData?: any): AccurateWeightResult {
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

    // PRIORITY 2: Gram products (explicit gram mentions)
    if (name.includes('gram') || name.includes(' g ') || name.includes('2g') || name.includes('3g')) {
      // Handle specific gram amounts
      if (name.includes('half gram')) {
        return { weight: 'half gram', category: 'gram', source: 'product_name' };
      }
      
      // Extract specific gram numbers
      const gramMatch = name.match(/(\d+(?:\.\d+)?)\s*grams?|(\d+)g(?:\s|$)/i);
      if (gramMatch) {
        const grams = gramMatch[1] || gramMatch[2];
        return {
          weight: `${grams} grams`,
          category: 'gram',
          source: 'product_name'
        };
      }
      
      // Handle generic "grams" without number
      if (name.includes('grams') && !name.includes('pound')) {
        return { weight: 'grams', category: 'gram', source: 'product_name' };
      }
    }

    // PRIORITY 3: Ounce products
    if (name.includes('ounce') || name.includes(' oz')) {
      if (name.includes('half ounce') || name.includes('1/2 ounce')) {
        return { weight: 'half ounce', category: 'ounce', source: 'product_name' };
      }
      if (name.includes('quarter ounce') || name.includes('1/4 ounce')) {
        return { weight: 'quarter ounce', category: 'ounce', source: 'product_name' };
      }
      if (name.includes('eighth')) {
        return { weight: 'eighth', category: 'ounce', source: 'product_name' };
      }
      return { weight: '1 ounce', category: 'ounce', source: 'product_name' };
    }

    // PRIORITY 4: Pound products (ONLY explicit pound mentions)
    if (name.includes('pound') || name.includes(' lb')) {
      if (name.includes('half pound') || name.includes('1/2 pound')) {
        return { weight: 'half pound', category: 'pound', source: 'product_name' };
      }
      if (name.includes('quarter pound') || name.includes('1/4 pound')) {
        return { weight: 'quarter pound', category: 'pound', source: 'product_name' };
      }
      if (name.includes('1 pound') || name.includes('one pound')) {
        return { weight: '1 pound', category: 'pound', source: 'product_name' };
      }
      // Generic pound reference
      return { weight: '1 pound', category: 'pound', source: 'product_name' };
    }

    // PRIORITY 5: Bulk flower indicators (ONLY if no other weight indicators)
    if ((name.includes('bulk flower') || name.includes('book flower')) && 
        !name.includes('gram') && !name.includes('ounce') && !name.includes('count')) {
      return { weight: '1 pound', category: 'pound', source: 'product_name' };
    }

    // PRIORITY 6: Use Shopify data if available
    if (shopifyData?.weight && shopifyData?.weightUnit) {
      const weight = shopifyData.weight;
      const unit = shopifyData.weightUnit.toLowerCase();
      
      return {
        weight: `${weight} ${unit}`,
        category: unit.includes('pound') ? 'pound' : unit.includes('ounce') ? 'ounce' : 'gram',
        source: 'shopify_data'
      };
    }

    // NO DEFAULT ASSUMPTIONS - return weight not specified
    return {
      weight: 'Weight not specified',
      category: 'not_specified',
      source: 'fallback'
    };
  }

  /**
   * Format weight for display in inventory
   */
  static formatWeightForDisplay(weightResult: AccurateWeightResult): string {
    // Clean up any malformed weights like "poundm"
    let weight = weightResult.weight;
    
    // Fix common formatting issues
    weight = weight.replace(/poundm/g, 'pound');
    weight = weight.replace(/poundg/g, 'pound'); 
    weight = weight.replace(/\s+/g, ' ').trim();
    
    return weight;
  }

  /**
   * Validate that weight makes sense for the product type
   */
  static validateWeight(productName: string, extractedWeight: string): boolean {
    const name = productName.toLowerCase();
    const weight = extractedWeight.toLowerCase();
    
    // Count products should not have pound weights
    if (name.includes('count') && weight.includes('pound')) {
      return false;
    }
    
    // Gram products should not have pound weights
    if (name.includes('gram') && weight.includes('pound') && !name.includes('bulk')) {
      return false;
    }
    
    return true;
  }
}