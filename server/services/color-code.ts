/**
 * Color Code Service
 * 
 * This service provides functionality for associating colors with product categories
 * to enhance warehouse visibility.
 */

import { Item } from "@shared/schema";

/**
 * Category Color Map - defines standardized colors for different product categories
 * Using hex color codes that are visually distinct
 */
export const CATEGORY_COLORS: Record<string, string> = {
  // Main product categories
  'Flower': '#4CAF50',     // Green
  'Concentrates': '#FFA000', // Amber
  'Edibles': '#E91E63',    // Pink
  'Vapes': '#2196F3',      // Blue
  'Pre-Rolls': '#9C27B0',  // Purple
  'Tinctures': '#FF5722',  // Deep Orange
  'Topicals': '#00BCD4',   // Cyan
  'Accessories': '#607D8B', // Blue Grey
  'Seeds': '#795548',      // Brown
  'Bulk': '#F44336',       // Red
  
  // Flower quality grades
  'THCA EXOTIC INDOOR': '#8BC34A',      // Light Green
  'THCA AA INDOOR SMALLS': '#CDDC39',   // Lime
  'THCA TOP SHELF': '#4CAF50',          // Green
  'THCAAA INDOOR': '#009688',           // Teal
  'THCA CLASSIC RESERVE': '#3F51B5',    // Indigo
  'THCA DISCOUNTED FLOWER': '#FF9800',  // Orange
  
  // Strain types
  'Indica': '#3F51B5',     // Indigo
  'Sativa': '#F44336',     // Red
  'Hybrid': '#673AB7',     // Deep Purple
  
  // Default color
  'Default': '#757575'     // Grey
};

/**
 * Get the color code for a specific category
 * 
 * @param category The category name to get a color for
 * @returns Hex color code for the category
 */
export function getCategoryColor(category: string): string {
  const normalizedCategory = category.trim();
  
  // Check if we have an exact match for this category
  if (CATEGORY_COLORS[normalizedCategory]) {
    return CATEGORY_COLORS[normalizedCategory];
  }
  
  // Check for partial matches by looking for keywords
  for (const [key, value] of Object.entries(CATEGORY_COLORS)) {
    if (normalizedCategory.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Return default color if no match found
  return CATEGORY_COLORS.Default;
}

/**
 * Generate the color barcode bands for an item
 * 
 * @param item The item to generate color bands for
 * @returns An object with primary and secondary color codes
 */
export function getItemColorCodes(item: Item): { 
  primaryColor: string; 
  secondaryColor: string;
  colorClass: string;
} {
  let primaryColor = getCategoryColor(item.category || 'Default');
  let secondaryColor = '#FFFFFF'; // Default to white as secondary
  
  // If item has a subcategory or attribute, use that for secondary color
  if (item.subcategory) {
    secondaryColor = getCategoryColor(item.subcategory);
  } else if (item.attributes) {
    const attrs = item.attributes as Record<string, any>;
    
    // Check for flower quality or category
    if (attrs.flowerQuality) {
      secondaryColor = getCategoryColor(attrs.flowerQuality);
    } else if (attrs.flowerCategory) {
      secondaryColor = getCategoryColor(attrs.flowerCategory);
    } else if (attrs.exoticCategory) {
      secondaryColor = getCategoryColor(attrs.exoticCategory);
    }
  }
  
  // Generate a CSS class name based on the colors
  // Remove # and take first 3 chars of each color
  const primaryColorClass = primaryColor.replace('#', '').substring(0, 3);
  const secondaryColorClass = secondaryColor.replace('#', '').substring(0, 3);
  const colorClass = `cc-${primaryColorClass}-${secondaryColorClass}`;
  
  return {
    primaryColor,
    secondaryColor,
    colorClass
  };
}

/**
 * Get a color-specific barcode style for an item
 * 
 * @param item The item to generate the colored barcode for
 * @returns CSS styles to be applied to the barcode
 */
export function getColoredBarcodeStyle(item: Item): string {
  const { primaryColor, secondaryColor } = getItemColorCodes(item);
  
  // Create a CSS style string for the barcode
  return `
    .barcode-container {
      border-left: 6px solid ${primaryColor};
      border-right: 6px solid ${secondaryColor};
      padding: 8px;
      background: linear-gradient(90deg, ${primaryColor}33 0%, white 50%, ${secondaryColor}33 100%);
    }
    .sku-label {
      color: ${primaryColor};
      font-weight: bold;
    }
    .category-label {
      color: ${secondaryColor};
      font-weight: bold;
    }
  `;
}

/**
 * Generate HTML for a color-banded barcode tag
 * 
 * @param item The item to generate the tag for
 * @param barcodeSvg The SVG string of the barcode
 * @returns HTML string for the printable tag
 */
export function generateColorBarcodeHtml(item: Item, barcodeSvg: string): string {
  const { primaryColor, secondaryColor } = getItemColorCodes(item);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .tag-container { 
          width: 4in; 
          padding: 0.25in; 
          border: 1px solid #ccc;
          border-left: 10px solid ${primaryColor}; 
          border-right: 10px solid ${secondaryColor};
          margin: 20px auto;
          page-break-inside: avoid;
          position: relative;
          background: linear-gradient(90deg, ${primaryColor}15 0%, white 50%, ${secondaryColor}15 100%);
        }
        .brand { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
        .item-name { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .barcode-container { text-align: center; margin: 10px 0; }
        .sku { font-size: 12px; font-weight: bold; text-align: center; margin-top: 5px; }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 5px; 
          font-size: 12px;
          margin-top: 10px;
        }
        .info-item { padding: 3px 0; }
        .info-label { font-weight: bold; color: ${primaryColor}; }
        .color-indicator {
          position: absolute;
          top: 0.1in;
          right: 0.1in;
          width: 0.3in;
          height: 0.3in;
          border-radius: 50%;
          background: ${primaryColor};
          border: 2px solid ${secondaryColor};
        }
      </style>
    </head>
    <body>
      <div class="tag-container">
        <div class="color-indicator"></div>
        <div class="brand">Gold Standard CBD</div>
        <div class="item-name">${item.name || 'Unnamed Product'}</div>
        <div class="barcode-container">
          ${barcodeSvg}
        </div>
        <div class="sku">SKU: ${item.sku || 'N/A'}</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Category:</span> ${item.category || 'N/A'}</div>
          <div class="info-item"><span class="info-label">Weight:</span> ${item.weight || '0'}${item.weightUnit || 'g'}</div>
          <div class="info-item"><span class="info-label">Price:</span> $${item.basePrice?.toFixed(2) || '0.00'}</div>
          <div class="info-item"><span class="info-label">Quantity:</span> ${item.quantity || '0'}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}