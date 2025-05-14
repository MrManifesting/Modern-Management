/**
 * Structured category data for inventory management
 * Designed to align with Shopify store categories
 */

// Main product categories
export const MAIN_CATEGORIES = [
  'Flower',
  'Concentrates',
  'Edibles',
  'Vapes',
  'Pre-Rolls',
  'Topicals',
  'Accessories',
  'CBD',
  'Delta-8',
  'Delta-9',
  'HHC',
  'Bulk',
  'Other'
];

// Flower subcategories by strain type
export const FLOWER_STRAIN_TYPES = [
  'Indica',
  'Sativa',
  'Hybrid',
  'CBD',
  'CBG',
  'Delta-8',
  'Delta-9',
  'HHC'
];

// Flower quality grades
export const FLOWER_QUALITY_GRADES = [
  'THCA EXOTIC INDOOR',
  'THCAAA INDOOR',
  'THCA AA INDOOR SMALLS',
  'THCA TOP SHELF',
  'THCA CLASSIC RESERVE',
  'THCA DISCOUNTED FLOWER'
];

// Concentrates subcategories
export const CONCENTRATE_TYPES = [
  'Live Resin',
  'Shatter',
  'Wax',
  'Budder',
  'Diamonds',
  'Sauce',
  'Crumble',
  'Rosin',
  'Hash',
  'Kief',
  'Distillate'
];

// Edible subcategories
export const EDIBLE_TYPES = [
  'Gummies',
  'Chocolates',
  'Baked Goods',
  'Beverages',
  'Capsules',
  'Tinctures',
  'Hard Candy',
  'Mints'
];

// Vape subcategories
export const VAPE_TYPES = [
  'Cartridges',
  'Disposables',
  'Pod Systems',
  'Batteries',
  'Accessories'
];

// Pre-roll subcategories
export const PREROLL_TYPES = [
  'Singles',
  'Multi-packs',
  'Infused',
  'Premium'
];

// Bulk subcategories
export const BULK_SIZES = [
  'Pound',
  'Half Pound',
  'Quarter Pound',
  'Ounce',
  'Multi-Pound',
  'Wholesale',
  'Distribution'
];

// Package sizes for different product types (common weights)
export const WEIGHT_OPTIONS = {
  flower: ['1g', '3.5g (Eighth)', '7g (Quarter)', '14g (Half)', '28g (Ounce)', '113g (QP)', '226g (HP)', '453g (Pound)'],
  concentrates: ['0.5g', '1g', '2g', '3.5g', '7g', '14g', '28g'],
  prerolls: ['0.5g', '0.75g', '1g', '1.5g', '2g']
};

// Exotic product quality grades
export const EXOTIC_CATEGORIES = [
  'Premium',
  'Top Shelf',
  'Limited Edition',
  'Rare',
  'Ultra Premium',
  'Special Reserve'
];

// Export structured category map for easier access
export const CATEGORY_MAP = {
  'Flower': {
    strains: FLOWER_STRAIN_TYPES,
    qualities: FLOWER_QUALITY_GRADES,
    weights: WEIGHT_OPTIONS.flower
  },
  'Concentrates': {
    types: CONCENTRATE_TYPES,
    weights: WEIGHT_OPTIONS.concentrates
  },
  'Edibles': {
    types: EDIBLE_TYPES
  },
  'Vapes': {
    types: VAPE_TYPES
  },
  'Pre-Rolls': {
    types: PREROLL_TYPES,
    weights: WEIGHT_OPTIONS.prerolls
  },
  'Bulk': {
    sizes: BULK_SIZES
  }
};

// Helper function to get subcategories based on main category
export function getSubcategoriesForCategory(category: string): string[] {
  if (!category) return [];
  
  const categoryKey = Object.keys(CATEGORY_MAP).find(
    key => key.toLowerCase() === category.toLowerCase()
  );
  
  if (!categoryKey) return [];
  
  const categoryData = CATEGORY_MAP[categoryKey as keyof typeof CATEGORY_MAP];
  
  // Return the first array found in the category data
  for (const key in categoryData) {
    if (Array.isArray(categoryData[key as keyof typeof categoryData])) {
      return categoryData[key as keyof typeof categoryData] as string[];
    }
  }
  
  return [];
}