/**
 * Shopify Import Service
 * 
 * This service handles importing inventory data from Shopify CSV exports
 */

import { Item, InsertItem } from '@shared/schema';
import { IStorage } from '../storage';

interface ParsedCsvData {
  headers: string[];
  rows: string[][];
}

interface ImportResult {
  success: boolean;
  items: Item[];
  errors: {row: number; reason: string}[];
  message: string;
}

/**
 * Parse CSV content to structured data
 */
export function parseCSV(csvContent: string): ParsedCsvData {
  const rows: string[][] = [];
  const lines = csvContent.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim().replace(/^"(.*)"$/, '$1'));
        cell = '';
      } else {
        cell += char;
      }
    }
    
    // Add the last cell
    row.push(cell.trim().replace(/^"(.*)"$/, '$1'));
    rows.push(row);
  }
  
  return { 
    headers: rows[0]?.map(h => h.trim()) || [],
    rows: rows.slice(1) 
  };
}

/**
 * Determine CSV format based on headers
 */
export function determineCSVFormat(headers: string[]): 'product' | 'inventory' | 'unknown' {
  const isProductExport = headers.includes('Handle') && headers.includes('Title');
  const isInventoryExport = headers.includes('Product') && headers.includes('Variant Inventory Qty');
  
  if (isProductExport) return 'product';
  if (isInventoryExport) return 'inventory';
  return 'unknown';
}

/**
 * Extract product information from a row based on CSV format
 */
export function extractProductInfo(
  row: string[], 
  headers: string[], 
  format: 'product' | 'inventory',
  rowIndex: number
): { 
  handle: string; 
  title: string; 
  quantity: number; 
  variant: string;
  error?: string;
} {
  try {
    if (format === 'product') {
      const handleIndex = headers.indexOf('Handle');
      const titleIndex = headers.indexOf('Title');
      const option1NameIndex = headers.indexOf('Option1 Name');
      const option1ValueIndex = headers.indexOf('Option1 Value');
      const availableIndex = headers.indexOf('Available');
      const variantInventoryIndex = headers.indexOf('Variant Inventory Qty');
      
      if (handleIndex < 0 || titleIndex < 0) {
        return { 
          handle: '', title: '', quantity: 0, variant: '',
          error: 'Missing required Handle or Title columns'
        };
      }
      
      const handle = row[handleIndex]?.trim() || '';
      const title = row[titleIndex]?.trim() || '';
      const optionName = option1NameIndex >= 0 && row[option1NameIndex] 
        ? row[option1NameIndex].trim() 
        : '';
      const optionValue = option1ValueIndex >= 0 && row[option1ValueIndex]
        ? row[option1ValueIndex].trim()
        : '';
      
      // Find quantity from either Available or Variant Inventory column
      let quantity = 0;
      if (availableIndex >= 0 && row[availableIndex]) {
        const qtyStr = row[availableIndex].trim();
        quantity = !isNaN(parseInt(qtyStr)) ? parseInt(qtyStr) : 0;
      } else if (variantInventoryIndex >= 0 && row[variantInventoryIndex]) {
        const qtyStr = row[variantInventoryIndex].trim();
        quantity = !isNaN(parseInt(qtyStr)) ? parseInt(qtyStr) : 0;
      }
      
      return { handle, title, quantity, variant: optionValue };
    } 
    else if (format === 'inventory') {
      const productIndex = headers.indexOf('Product');
      const variantIndex = headers.indexOf('Variant');
      const qtyIndex = headers.indexOf('Variant Inventory Qty');
      
      if (productIndex < 0) {
        return { 
          handle: '', title: '', quantity: 0, variant: '',
          error: 'Missing required Product column'
        };
      }
      
      const title = row[productIndex]?.trim() || '';
      // Generate a handle from the title (simplified version of what Shopify does)
      const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const variant = variantIndex >= 0 && row[variantIndex]
        ? row[variantIndex]?.trim() || ''
        : '';
      
      let quantity = 0;
      if (qtyIndex >= 0 && row[qtyIndex]) {
        const qtyStr = row[qtyIndex].trim();
        quantity = !isNaN(parseInt(qtyStr)) ? parseInt(qtyStr) : 0;
      }
      
      return { handle, title, quantity, variant };
    }
    
    return { 
      handle: '', title: '', quantity: 0, variant: '',
      error: 'Unknown CSV format'
    };
  } catch (error) {
    return { 
      handle: '', title: '', quantity: 0, variant: '',
      error: `Error processing row ${rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Determine product attributes based on title and variant
 */
export function determineProductAttributes(title: string, variant: string): {
  brand: string;
  prefix: string;
  category: string;
  tier: string;
  weight: number | null;
  packageSize: string;
  price: number;
} {
  // Determine brand from the title
  let brand = 'Gold Standard';
  let prefix = 'GS'; // Default SKU prefix
  
  if (title.toUpperCase().includes('TREE MASON')) {
    brand = 'Tree Mason';
    prefix = 'TM';
  } else if (title.toUpperCase().includes('THCA')) {
    brand = 'THCA Flower';
    prefix = 'THCA';
  }
  
  // Determine tier/category based on title
  let tier = 'Standard';
  let category = 'Cannabis';
  
  if (title.toUpperCase().includes('TOP SHELF')) {
    tier = 'Top Shelf';
  } else if (title.toUpperCase().includes('EXOTIC')) {
    tier = 'Exotic';
  } else if (title.toUpperCase().includes('CLASSIC RESERVE')) { 
    tier = 'Classic Reserve';
  } else if (title.toUpperCase().includes('AAA')) {
    tier = 'AAA Indoor';
  } else if (title.toUpperCase().includes('AA')) {
    tier = 'AA Indoor';
  }
  
  if (title.toUpperCase().includes('THCA')) {
    category = 'THCA Flower';
  } else if (title.toUpperCase().includes('TREE MASON')) {
    category = 'Tree Mason';
  } else if (title.toUpperCase().includes('GOLD STANDARD')) {
    category = 'Gold Standard CBD';
  }
  
  // Determine weight from variant
  let weight: number | null = null;
  let packageSize = variant || '';
  
  if (variant) {
    if (variant.toLowerCase().includes('pound')) {
      weight = 453.59; // 1 pound in grams
    } else if (variant.toLowerCase().includes('1/2')) {
      weight = 226.8; // Half pound in grams
    } else if (variant.toLowerCase().includes('1/4')) {
      weight = 113.4; // Quarter pound in grams
    } else if (variant.match(/\b28\s*g/i) || variant.includes('28g') || variant.includes('28 g') || variant.includes('1 oz')) {
      weight = 28; // 28 grams / 1 oz
    } else if (variant.match(/\b14\s*g/i) || variant.includes('14g') || variant.includes('14 g') || variant.includes('1/2 oz')) {
      weight = 14; // 14 grams / half oz
    } else if (variant.match(/\b7\s*g/i) || variant.includes('7g') || variant.includes('7 g') || variant.includes('1/4 oz')) {
      weight = 7; // 7 grams / quarter oz
    } else if (variant.match(/\b3.5\s*g/i) || variant.includes('3.5g') || variant.includes('3.5 g') || variant.includes('1/8 oz')) {
      weight = 3.5; // 3.5 grams / eighth oz
    }
  }
  
  // Generate default price based on tier and weight
  let price = 39.99;
  
  if (weight && weight >= 400) { // ~ 1 pound
    price = 500;
  } else if (weight && weight >= 200) { // ~ half pound
    price = 275;
  } else if (weight && weight >= 100) { // ~ quarter pound
    price = 150;
  } else if (weight && weight >= 25) { // ~ 1 oz
    price = 120;
  } else if (weight && weight >= 12) { // ~ half oz
    price = 75;
  } else if (weight && weight >= 6) { // ~ quarter oz
    price = 40;
  } else if (weight && weight >= 3) { // ~ eighth oz
    price = 25;
  }
  
  return {
    brand,
    prefix,
    category,
    tier,
    weight,
    packageSize,
    price
  };
}

/**
 * Generate a SKU for the product
 */
export function generateSKU(prefix: string, handle: string): string {
  // Remove special characters and create a cleaner handle
  const cleanHandle = handle.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
  const uniqueId = Date.now().toString().substring(9); // Use timestamp for uniqueness
  return `${prefix}-${cleanHandle}-${uniqueId}`;
}

/**
 * Create a product description
 */
export function createDescription(title: string, tier: string): string {
  let strain = title;
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    strain = parts[0];
  }
  
  return `${strain} - Premium Quality Cannabis - ${tier}`;
}

/**
 * Import Shopify CSV data into the inventory
 */
export async function importShopifyCSV(
  csvContent: string,
  storage: IStorage,
  generateBarcodeData: (sku: string) => string,
  generateQRCodeDataURL: (item: Item) => Promise<string>
): Promise<ImportResult> {
  const { headers, rows } = parseCSV(csvContent);
  
  if (headers.length === 0 || rows.length === 0) {
    return {
      success: false,
      items: [],
      errors: [{ row: 0, reason: "Empty or invalid CSV file" }],
      message: "The uploaded file is empty or has an invalid format"
    };
  }
  
  const format = determineCSVFormat(headers);
  
  if (format === 'unknown') {
    return {
      success: false,
      items: [],
      errors: [{ row: 0, reason: "Unrecognized CSV format" }],
      message: "The CSV format is not recognized as a valid Shopify export. Please use the 'Products' or 'Inventory' export from Shopify."
    };
  }
  
  const importedItems: Item[] = [];
  const errors: {row: number; reason: string}[] = [];
  const processedHandles = new Set<string>();
  
  for (const [rowIndex, row] of rows.entries()) {
    try {
      // Skip rows with insufficient data
      if (row.length < 5) {
        errors.push({row: rowIndex + 2, reason: "Row has insufficient columns"});
        continue;
      }
      
      // Skip Printify items
      if (row.some(cell => cell.includes('Printify') || cell.includes('not stocked'))) {
        errors.push({row: rowIndex + 2, reason: "Printify or not stocked items are skipped"});
        continue;
      }
      
      // Extract basic product info
      const productInfo = extractProductInfo(row, headers, format, rowIndex + 2);
      
      if (productInfo.error) {
        errors.push({row: rowIndex + 2, reason: productInfo.error});
        continue;
      }
      
      const { handle, title, quantity, variant } = productInfo;
      
      // Skip duplicate products (only take the first variant)
      if (processedHandles.has(handle)) {
        console.log(`Skipping duplicate handle: ${handle}`);
        continue;
      }
      processedHandles.add(handle);
      
      // Determine product attributes
      const attributes = determineProductAttributes(title, variant);
      
      // Generate SKU
      const sku = generateSKU(attributes.prefix, handle);
      
      // Create description
      const description = createDescription(title, attributes.tier);
      
      // Create item data
      const itemData: InsertItem = {
        name: title,
        description: description,
        price: attributes.price,
        sku: sku,
        quantity: quantity,
        status: 'active',
        category: attributes.category,
        condition: 'Hybrid', // Use condition field for strain type
        tags: ['cannabis', attributes.brand.toLowerCase().replace(/\s+/g, '-'), attributes.tier.toLowerCase().replace(/\s+/g, '-')],
        images: [],
        marketplace: [{
          name: 'Shopify',
          isListed: true
        }],
        aiEnhanced: false,
        aiTags: [],
        weight: attributes.weight,
      };
      
      console.log(`Creating item: ${itemData.name} (${itemData.sku}), Qty: ${itemData.quantity}`);
      
      // Create item in storage
      const createdItem = await storage.createItem(itemData);
      
      // Generate barcode and QR code
      const barcode = generateBarcodeData(itemData.sku);
      const qrCode = await generateQRCodeDataURL(createdItem);
      
      // Update with barcode and QR code
      const updatedItem = await storage.updateItem(createdItem.id, { 
        barcode, 
        qrCode 
      });
      
      if (updatedItem) {
        importedItems.push(updatedItem);
      }
    } catch (importErr) {
      console.error(`Error importing row ${rowIndex + 2}:`, importErr);
      errors.push({
        row: rowIndex + 2, 
        reason: importErr instanceof Error ? importErr.message : "Unknown error"
      });
    }
  }
  
  if (importedItems.length === 0 && errors.length > 0) {
    return {
      success: false,
      items: [],
      errors: errors,
      message: `Failed to import any items. All ${errors.length} rows had errors.`
    };
  }
  
  return {
    success: true,
    items: importedItems,
    errors: errors,
    message: `Successfully imported ${importedItems.length} items from Shopify.`
  };
}