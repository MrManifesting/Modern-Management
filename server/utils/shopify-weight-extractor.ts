import { logger } from './logger.js';

const log = (message: string, context = 'weight-extractor') => logger.info(message, context);

export function extractWeightFromShopifyData(shopifyData: any): string {
  if (!shopifyData?.variants?.edges?.[0]?.node) {
    return 'Weight not specified';
  }

  const variant = shopifyData.variants.edges[0].node;
  const weight = variant.weight;
  const unit = variant.weightUnit?.toLowerCase();

  if (!weight || !unit) {
    return 'Weight not specified';
  }

  log(`Using authentic Shopify weight: ${weight} ${unit}`, 'shopify-weight');

  if (unit === 'grams' || unit === 'g') {
    if (weight >= 453.592) { // 1 pound in grams
      const pounds = Math.round(weight / 453.592 * 4) / 4; // Round to quarters
      return `${pounds} pound${pounds !== 1 ? 's' : ''}`;
    } else if (weight >= 28.3495) { // 1 ounce in grams
      const ounces = Math.round(weight / 28.3495 * 4) / 4; // Round to quarters
      return `${ounces} ounce${ounces !== 1 ? 's' : ''}`;
    } else {
      return `${weight}g`;
    }
  } else if (unit === 'pounds' || unit === 'lb') {
    return `${weight} pound${weight !== 1 ? 's' : ''}`;
  } else if (unit === 'ounces' || unit === 'oz') {
    if (weight >= 16) { // 1 pound in ounces
      const pounds = Math.round(weight / 16 * 4) / 4;
      return `${pounds} pound${pounds !== 1 ? 's' : ''}`;
    } else {
      return `${weight} ounce${weight !== 1 ? 's' : ''}`;
    }
  }

  return `${weight} ${unit}`;
}

export function extractWeightFromProductName(productName: string): string {
  if (!productName) return 'Weight not specified';
  
  const nameLower = productName.toLowerCase();
  
  // PRIORITY 1: Check for specific gram variants (most important for 2g products)
  if (nameLower.includes('2 gram') || nameLower.includes('2g')) return '2 grams';
  if (nameLower.includes('3 gram') || nameLower.includes('3g')) return '3 grams';
  if (nameLower.includes('3.5 gram') || nameLower.includes('3.5g')) return '3.5 grams';
  if (nameLower.includes('half gram') || nameLower.includes('0.5g')) return 'half gram';
  if (nameLower.includes('1 gram') || nameLower.includes('1g')) return '1 gram';
  if (nameLower.includes('4 gram') || nameLower.includes('4g')) return '4 grams';
  if (nameLower.includes('5 gram') || nameLower.includes('5g')) return '5 grams';
  if (nameLower.includes('7 gram') || nameLower.includes('7g')) return '7 grams';
  if (nameLower.includes('14 gram') || nameLower.includes('14g')) return '14 grams';
  if (nameLower.includes('28 gram') || nameLower.includes('28g')) return '28 grams';
  
  // PRIORITY 2: Check for ounce variants
  if (nameLower.includes('eighth') || nameLower.includes('1/8')) return 'eighth';
  if (nameLower.includes('quarter ounce') || nameLower.includes('1/4 ounce')) return 'quarter ounce';
  if (nameLower.includes('half ounce') || nameLower.includes('1/2 ounce')) return 'half ounce';
  if (nameLower.includes('1 ounce') || nameLower.includes('one ounce')) return '1 ounce';
  
  // PRIORITY 3: Check for pound variants - BE VERY SPECIFIC
  if (nameLower.includes('quarter pound') || nameLower.includes('1/4 pound')) return 'quarter pound';
  if (nameLower.includes('half pound') || nameLower.includes('1/2 pound')) return 'half pound';
  if (nameLower.includes('1 pound') || nameLower.includes('one pound')) return '1 pound';
  
  // PRIORITY 4: Only for bulk indicators (WITHOUT gram/ounce in name)
  if ((nameLower.includes('bulk flower') || nameLower.includes('book flower')) && 
      !nameLower.includes('gram') && !nameLower.includes('ounce')) {
    return '1 pound';
  }
  
  // PRIORITY 5: Count-based items
  if (nameLower.includes('100 count')) return '100 count';
  if (nameLower.includes('50 count')) return '50 count';
  if (nameLower.includes('25 count')) return '25 count';
  
  return 'Weight not specified';
}