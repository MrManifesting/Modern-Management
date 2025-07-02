/**
 * Comprehensive weight parser for cannabis product names
 * Extracts accurate weights from product names instead of defaulting to "1 pound"
 */

export function parseWeightFromProductName(productName: string): string {
  if (!productName) return 'Not specified';
  
  const name = productName.toLowerCase().trim();
  
  // First priority: Extract specific gram amounts (2g, 3.5g, 7g, 14g, 28g, etc.)
  const gramMatches = [
    { pattern: /(\d+(?:\.\d+)?)\s*g(?:ram)?s?\b/i, extract: (match: RegExpMatchArray) => `${match[1]}g` },
    { pattern: /(\d+(?:\.\d+)?)\s*gram/i, extract: (match: RegExpMatchArray) => `${match[1]}g` }
  ];
  
  for (const { pattern, extract } of gramMatches) {
    const match = productName.match(pattern);
    if (match) {
      return extract(match);
    }
  }
  
  // Second priority: Extract ounce amounts (1oz, 2oz, half oz, quarter oz, etc.)
  if (name.includes('eighth') || name.includes('1/8') || name.includes('0.125')) {
    return '3.5g (eighth)';
  }
  if (name.includes('quarter oz') || name.includes('1/4 oz') || name.includes('0.25 oz')) {
    return 'quarter ounce';
  }
  if (name.includes('half oz') || name.includes('1/2 oz') || name.includes('0.5 oz')) {
    return 'half ounce';
  }
  
  // Match specific ounce numbers
  const ounceMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce)/);
  if (ounceMatch) {
    const amount = parseFloat(ounceMatch[1]);
    if (amount === 1) return '1 ounce';
    if (amount === 0.5) return 'half ounce';
    if (amount === 0.25) return 'quarter ounce';
    return `${amount} ounce${amount !== 1 ? 's' : ''}`;
  }
  
  // Third priority: Extract pound amounts (but only if explicitly mentioned)
  if (name.includes('quarter pound') || name.includes('1/4 pound') || name.includes('0.25 pound') || name.includes('qp')) {
    return 'quarter pound';
  }
  if (name.includes('half pound') || name.includes('1/2 pound') || name.includes('0.5 pound') || name.includes('hp')) {
    return 'half pound';
  }
  if (name.includes('1 pound') || name.includes('one pound') || name.includes('1lb') || name.match(/\b1\s*pound\b/)) {
    return '1 pound';
  }
  
  // Check for fractional numbers that indicate less than a pound
  const fractionMatch = name.match(/(1\/2|1\/4|0\.5|0\.25|0\.125)/);
  if (fractionMatch) {
    const fraction = fractionMatch[1];
    if (fraction === '1/2' || fraction === '0.5') {
      // Could be half ounce or half pound - check context
      if (name.includes('pound')) return 'half pound';
      return 'half ounce';
    }
    if (fraction === '1/4' || fraction === '0.25') {
      if (name.includes('pound')) return 'quarter pound';
      return 'quarter ounce';
    }
    if (fraction === '0.125') {
      return '3.5g (eighth)';
    }
  }
  
  // Look for any number followed by weight units in product name
  const weightPatterns = [
    { pattern: /(\d+(?:\.\d+)?)\s*(?:mg|milligram)/i, unit: 'mg' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:kg|kilogram)/i, unit: 'kg' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:lb|pound)/i, unit: 'pound' }
  ];
  
  for (const { pattern, unit } of weightPatterns) {
    const match = productName.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (unit === 'pound') {
        if (amount === 1) return '1 pound';
        if (amount === 0.5) return 'half pound';
        if (amount === 0.25) return 'quarter pound';
        return `${amount} pound${amount !== 1 ? 's' : ''}`;
      }
      return `${amount}${unit}`;
    }
  }
  
  // If no specific weight found, check product context
  // Items with "smalls", "mids", "tops" are usually bulk (pounds)
  if (name.includes('smalls') || name.includes('bulk') || name.includes('wholesale')) {
    return '1 pound'; // Default for bulk items
  }
  
  // Pre-rolls are typically individual units
  if (name.includes('preroll') || name.includes('pre-roll') || name.includes('joint')) {
    return '1g (preroll)';
  }
  
  // If we can't determine weight, don't default to pound
  return 'Not specified';
}

/**
 * Convert weight string to sortable numeric value for comparison
 */
export function getWeightSortValue(weight: string): number {
  if (!weight || weight === 'Not specified') return 0;
  
  const weightLower = weight.toLowerCase();
  
  // Convert to grams for consistent sorting
  if (weightLower.includes('pound')) {
    if (weightLower.includes('quarter')) return 113.4; // quarter pound in grams
    if (weightLower.includes('half')) return 226.8; // half pound in grams
    const poundMatch = weightLower.match(/(\d+(?:\.\d+)?)/);
    if (poundMatch) return parseFloat(poundMatch[1]) * 453.6; // pounds to grams
    return 453.6; // 1 pound default
  }
  
  if (weightLower.includes('ounce') || weightLower.includes('oz')) {
    if (weightLower.includes('quarter')) return 7.0875;
    if (weightLower.includes('half')) return 14.175;
    const ounceMatch = weightLower.match(/(\d+(?:\.\d+)?)/);
    if (ounceMatch) return parseFloat(ounceMatch[1]) * 28.35; // ounces to grams
    return 28.35; // 1 ounce default
  }
  
  if (weightLower.includes('g') && !weightLower.includes('kg')) {
    const gramMatch = weightLower.match(/(\d+(?:\.\d+)?)/);
    if (gramMatch) return parseFloat(gramMatch[1]);
    return 1; // 1 gram default
  }
  
  if (weightLower.includes('kg')) {
    const kgMatch = weightLower.match(/(\d+(?:\.\d+)?)/);
    if (kgMatch) return parseFloat(kgMatch[1]) * 1000; // kg to grams
    return 1000;
  }
  
  return 0;
}

/**
 * Format weight for display in a consistent way
 */
export function formatWeightDisplay(weight: string): string {
  if (!weight || weight === 'Not specified') return 'Weight not specified';
  
  // Clean up common variations
  const cleaned = weight.toLowerCase().trim();
  
  if (cleaned === '1 pound' || cleaned === '1lb') return '1 pound';
  if (cleaned === 'half pound' || cleaned === '0.5 pound') return 'half pound';
  if (cleaned === 'quarter pound' || cleaned === '0.25 pound') return 'quarter pound';
  if (cleaned === '1 ounce' || cleaned === '1oz') return '1 ounce';
  if (cleaned === 'half ounce' || cleaned === '0.5 ounce') return 'half ounce';
  if (cleaned === 'quarter ounce' || cleaned === '0.25 ounce') return 'quarter ounce';
  
  // Return original if it's already well-formatted
  return weight;
}