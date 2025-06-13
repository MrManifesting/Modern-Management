/**
 * Structured category data for inventory management
 * Designed to align with Shopify store categories
 */

// Main product categories
export const MAIN_CATEGORIES = [
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

// All flower quality grades (unified system, no special exotic tier)
export const ALL_FLOWER_QUALITIES = [
  'Outdoor',
  'Indoor',
  'Greenhouse',
  'Premium',
  'Top Shelf',
  'Special Reserve',
  'Limited Edition',
  'Rare',
  'Ultra Premium'
];

// Flower quality grades (for backwards compatibility)
export const FLOWER_QUALITY_GRADES = ALL_FLOWER_QUALITIES;

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

// Standard weight options for all products
export const WEIGHT_OPTIONS = [
  'pound',
  'half pound', 
  'quarter pound',
  'ounce',
  'half ounce',
  'quarter ounce', 
  'eighth',
  'gram'
];

// Export structured category map for easier access
export const CATEGORY_MAP = {
  'Concentrates': {
    types: CONCENTRATE_TYPES
  },
  'Edibles': {
    types: EDIBLE_TYPES
  },
  'Vapes': {
    types: VAPE_TYPES
  },
  'Pre-Rolls': {
    types: PREROLL_TYPES
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