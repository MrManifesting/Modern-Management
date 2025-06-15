/**
 * Shopify Import Service
 * 
 * This service handles importing inventory data from Shopify CSV exports or API responses
 */

import { Item, InsertItem, ItemType, ProcessingStatus, BreakdownStatus, ItemCondition } from '@shared/schema';
import { IStorage } from '../storage';
import { storage } from '../storage';
import { log } from '../vite';
import { generateBarcodeData } from './barcode';
import { generateQRCodeDataURL } from './qrcode';
// CSV parsing functionality is implemented in this file

/**
 * Import products from Shopify API data
 * 
 * @param shopifyProducts - Products from Shopify API
 * @returns Object with import statistics
 */
export async function importShopifyProducts(shopifyProducts: any[]): Promise<{
  imported: number;
  updated: number;
  failed: number;
  message: string;
}> {
  log(`Starting to import ${shopifyProducts.length} products from Shopify API`, 'shopify-import');
  
  let imported = 0;
  let updated = 0;
  let failed = 0;
  
  for (const shopifyProduct of shopifyProducts) {
    try {
      // Convert Shopify product to our Item format
      const itemData = convertShopifyProductToItem(shopifyProduct);
      
      // Check if product already exists by SKU
      let existingItem: Item | undefined;
      
      // Try to find by Shopify ID in marketplace data
      const shopifyId = shopifyProduct.id.toString();
      const existingItems = await storage.getItems();
      existingItem = existingItems.find(item => {
        if (!item.marketplace || !Array.isArray(item.marketplace)) return false;
        
        return item.marketplace.some(mp => 
          mp.type === 'shopify' && mp.externalId === shopifyId
        );
      });
      
      // If not found by Shopify ID, try by SKU
      if (!existingItem && itemData.sku) {
        existingItem = await storage.getItemBySku(itemData.sku);
      }
      
      // Update or create the item
      if (existingItem) {
        // Preserve existing item data that shouldn't be overwritten
        const updateData: Partial<InsertItem> = {
          ...itemData,
          // Don't overwrite these fields if they exist
          barcode: existingItem.barcode || itemData.barcode,
          qrCode: existingItem.qrCode || itemData.qrCode,
        };
        
        const updatedItem = await storage.updateItem(existingItem.id, updateData);
        if (updatedItem) {
          log(`Updated existing item: ${updatedItem.name} (ID: ${updatedItem.id})`, 'shopify-import');
          updated++;
        } else {
          log(`Failed to update item: ${existingItem.name} (ID: ${existingItem.id})`, 'shopify-import-error');
          failed++;
        }
      } else {
        // Create new item
        const createdItem = await storage.createItem(itemData);
        if (createdItem) {
          log(`Created new item: ${createdItem.name} (ID: ${createdItem.id})`, 'shopify-import');
          imported++;
          
          // Generate barcode and QR code
          try {
            const barcode = generateBarcodeData(createdItem.sku);
            const qrCode = await generateQRCodeDataURL(createdItem);
            
            if (barcode || qrCode) {
              const updateData: Partial<InsertItem> = {};
              if (barcode) updateData.barcode = barcode;
              if (qrCode) updateData.qrCode = qrCode;
              
              await storage.updateItem(createdItem.id, updateData);
            }
          } catch (codeErr) {
            log(`Generated item but barcode/QR code generation failed: ${codeErr instanceof Error ? codeErr.message : 'Unknown error'}`, 'shopify-import-warning');
          }
        } else {
          log(`Failed to create item: ${itemData.name}`, 'shopify-import-error');
          failed++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error processing Shopify product: ${errorMessage}`, 'shopify-import-error');
      failed++;
    }
  }
  
  const message = `Completed Shopify import: ${imported} imported, ${updated} updated, ${failed} failed`;
  log(message, 'shopify-import');
  
  return {
    imported,
    updated,
    failed,
    message
  };
}

/**
 * Convert a Shopify product to our item format
 */
function convertShopifyProductToItem(shopifyProduct: any): InsertItem {
  // Extract the primary variant (first one)
  const variant = Array.isArray(shopifyProduct.variants) && shopifyProduct.variants.length > 0 
    ? shopifyProduct.variants[0] 
    : { price: '0', sku: '', inventory_quantity: 0 };
  
  // Extract images
  const images = Array.isArray(shopifyProduct.images) 
    ? shopifyProduct.images.map((img: any) => ({ url: img.src, alt: img.alt || '' }))
    : [];
  
  // Extract tags
  const tags = shopifyProduct.tags ? shopifyProduct.tags.split(', ') : [];
  
  // Create marketplace data
  const marketplaceData = [{
    type: 'shopify',
    externalId: shopifyProduct.id.toString(),
    externalUrl: shopifyProduct.admin_url || '',
    lastSynced: new Date()
  }];
  
  // Convert to our Item format
  return {
    name: shopifyProduct.title || 'Untitled Product',
    description: shopifyProduct.body_html || '',
    sku: variant.sku || `SHOP-${shopifyProduct.id}`,
    barcode: variant.barcode || '',
    brand: shopifyProduct.vendor || null,
    costPrice: parseFloat(variant.cost) || 0,
    basePrice: parseFloat(variant.price) || 0,
    salePrice: parseFloat(variant.compare_at_price) || null,
    wholesalePrice: null,
    category: shopifyProduct.product_type || 'General',
    subcategory: '',
    quantity: parseInt(variant.inventory_quantity) || 0,
    weight: parseFloat(variant.weight) || 0,
    weightUnit: 'g',
    dimensions: JSON.stringify({}),
    status: shopifyProduct.status === 'active' ? 'active' : 'draft',
    tags,
    attributes: JSON.stringify({}),
    images,
    videos: JSON.stringify([]),
    documents: JSON.stringify([]),
    marketplace: marketplaceData,
    syncedToMarketplaces: ['shopify'],
    marketplaceIds: JSON.stringify({}),
    lowStockThreshold: 5,
    reorderPoint: 3,
    reorderQuantity: 10,
    stockAlerts: true,
    itemType: ItemType.REGULAR,
    processingStatus: ProcessingStatus.NONE,
    breakdownStatus: BreakdownStatus.NONE,
    visibility: 'visible',
    featured: false,
    condition: ItemCondition.NEW,
    bundlePlan: JSON.stringify([]),
    parentItemId: null
  };
}

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
 * Properly parse a CSV line with quoted fields (RFC 4180 compliant)
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes (double quote)
        current += '"';
        i += 2;
      } else if (inQuotes && (nextChar === delimiter || nextChar === undefined || nextChar === '\r' || nextChar === '\n')) {
        // End of quoted field
        inQuotes = false;
        i++;
      } else if (!inQuotes && (current.trim() === '' || current.length === 0)) {
        // Start of quoted field (only if current field is empty)
        inQuotes = true;
        i++;
      } else {
        // Quote in middle of unquoted field - treat as literal
        current += char;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field delimiter outside quotes
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  // Clean up quoted content
  return result.map(field => {
    // Remove outer quotes if present and handle escaped quotes
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1).replace(/""/g, '"');
    }
    return field;
  });
}

/**
 * Parse CSV content with a specific delimiter
 */
function parseCSVWithDelimiter(csvContent: string, delimiter: string): ParsedCsvData {
  const rows: string[][] = [];
  let lines = csvContent.split(/\r?\n/);
  
  // Skip metadata lines for this delimiter test
  while (lines.length > 0 && (
    lines[0].includes('export_') || 
    lines[0].match(/^\w+_export_\d+\s*\(\d+\)$/) ||
    lines[0].trim().length < 10 ||
    (!lines[0].includes(delimiter) && lines[0].split(delimiter).length < 2)
  )) {
    lines = lines.slice(1);
  }
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Properly parse CSV line with quoted fields
    const cells = parseCSVLine(line, delimiter);
    rows.push(cells);
  }
  
  const headers = rows[0]?.map(h => h.trim()) || [];
  const dataRows = rows.slice(1);
  
  return { headers, rows: dataRows };
}

/**
 * Parse CSV content to structured data using state machine approach
 */
export function parseCSV(csvContent: string): ParsedCsvData {
  console.log('Starting bulletproof CSV parsing...');
  
  // Use the bulletproof CSV parser
  const result = parseBulletproofCSV(csvContent);
  
  console.log(`CSV parsing complete: ${result.headers.length} headers, ${result.rows.length} rows`);
  
  return result;
}

/**
 * Robust CSV parser with format detection
 */
export function parseRobustCSV(csvContent: string): {
  success: boolean;
  headers: string[];
  rows: string[][];
  format: 'product' | 'inventory' | 'unknown';
  errors: string[];
} {
  try {
    console.log('Starting robust CSV parsing...');
    
    // Parse the CSV content
    const parsed = parseCSVContent(csvContent);
    
    // Determine the format
    const format = determineCSVFormat(parsed.headers);
    
    console.log(`CSV parsed successfully: ${parsed.headers.length} headers, ${parsed.rows.length} rows, format: ${format}`);
    
    return {
      success: true,
      headers: parsed.headers,
      rows: parsed.rows,
      format,
      errors: []
    };
  } catch (error) {
    console.error('CSV parsing failed:', error);
    return {
      success: false,
      headers: [],
      rows: [],
      format: 'unknown',
      errors: [error instanceof Error ? error.message : 'Unknown parsing error']
    };
  }
}

/**
 * Extract product data from a row - unified function for both product and inventory formats
 */
export function extractProductFromRow(headers: string[], row: string[], format: 'product' | 'inventory' = 'product'): any {
  const productInfo = extractProductInfo(row, headers, format, 0);
  if (!productInfo) return null;
  
  return {
    name: productInfo.title,
    sku: productInfo.sku || `IMPORT-${Date.now()}`,
    basePrice: productInfo.price > 0 ? productInfo.price.toFixed(2) : '0.00',
    costPrice: productInfo.costPrice > 0 ? productInfo.costPrice.toFixed(2) : '0.00',
    salePrice: productInfo.compareAtPrice > 0 ? productInfo.compareAtPrice.toFixed(2) : '0.00',
    wholesalePrice: productInfo.price > 0 ? (productInfo.price * 0.8).toFixed(2) : '0.00',
    description: productInfo.description || '',
    category: productInfo.productType || (format === 'inventory' ? 'Cannabis' : 'Imported'),
    vendor: productInfo.vendor || 'Unknown',
    quantity: productInfo.quantity || 0,
    weight: productInfo.weight || '1 pound',
    status: productInfo.published ? 'active' : 'inactive',
    imageUrl: productInfo.imageUrl || '',
    images: productInfo.imageUrl ? [productInfo.imageUrl] : [],
    tags: productInfo.tags || ''
  };
}

/**
 * @deprecated Use extractProductFromRow with format parameter instead
 */
export function extractInventoryFromRow(headers: string[], row: string[]): any {
  return extractProductFromRow(headers, row, 'inventory');
}

/**
 * Bulletproof CSV parser that handles RFC 4180 compliance correctly
 */
function parseBulletproofCSV(csvContent: string): ParsedCsvData {
  // Normalize line endings
  const content = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  
  while (i < content.length) {
    const currentChar = content[i];
    const nextChar = content[i + 1];
    
    if (currentChar === '"') {
      if (insideQuotes) {
        if (nextChar === '"') {
          // Double quote - this is an escaped quote
          currentField += '"';
          i += 2; // Skip both quotes
          continue;
        } else {
          // Single quote - end of quoted field
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        // Start of quoted field
        insideQuotes = true;
        i++;
        continue;
      }
    }
    
    if (currentChar === ',' && !insideQuotes) {
      // Field separator - end current field
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }
    
    if (currentChar === '\n' && !insideQuotes) {
      // End of row
      currentRow.push(currentField);
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }
    
    // Regular character or quoted content
    currentField += currentChar;
    i++;
  }
  
  // Handle the last field if we ended without a newline
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
  }
  
  // Filter out empty rows
  const validRows = rows.filter(row => row.some(cell => cell.trim().length > 0));
  
  if (validRows.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // The first row should be headers
  const headers = validRows[0].map(h => h.trim());
  const dataRows = validRows.slice(1);
  
  // Ensure all data rows have the same number of fields as headers
  const normalizedDataRows = dataRows.map(row => {
    const normalizedRow = [...row];
    
    // Pad with empty strings if row is shorter than headers
    while (normalizedRow.length < headers.length) {
      normalizedRow.push('');
    }
    
    // Truncate if row is longer than headers
    return normalizedRow.slice(0, headers.length).map(cell => cell.trim());
  });
  
  console.log(`Bulletproof parsing complete: ${headers.length} headers, ${normalizedDataRows.length} data rows`);
  console.log(`First few headers: ${headers.slice(0, 6).join(', ')}`);
  
  if (normalizedDataRows.length > 0) {
    console.log(`First row field count: ${normalizedDataRows[0].length}`);
    console.log(`First few values: ${normalizedDataRows[0].slice(0, 6).join(' | ')}`);
  }
  
  return {
    headers,
    rows: normalizedDataRows
  };
}



/**
 * Parse a single CSV row, handling multi-line quoted fields
 */
function parseCSVRow(lines: string[], startIndex: number): { row: string[]; linesConsumed: number } {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let lineIndex = startIndex;
  let charIndex = 0;
  
  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    
    while (charIndex < line.length) {
      const char = line[charIndex];
      const nextChar = line[charIndex + 1];
      
      if (char === '"') {
        if (inQuotes) {
          if (nextChar === '"') {
            // Escaped quote - add single quote to field
            currentField += '"';
            charIndex += 2;
            continue;
          } else {
            // End of quoted field
            inQuotes = false;
            charIndex++;
            continue;
          }
        } else {
          // Start of quoted field
          inQuotes = true;
          charIndex++;
          continue;
        }
      }
      
      if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = '';
        charIndex++;
        continue;
      }
      
      // Regular character or quoted comma
      currentField += char;
      charIndex++;
    }
    
    if (inQuotes) {
      // Multi-line quoted field - add newline and continue to next line
      currentField += '\n';
      lineIndex++;
      charIndex = 0;
    } else {
      // End of row
      fields.push(currentField);
      break;
    }
  }
  
  // Clean up fields - remove outer quotes and trim
  const cleanFields = fields.map(field => {
    let cleaned = field.trim();
    // Remove outer quotes if they wrap the entire field
    if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 1) {
      cleaned = cleaned.slice(1, -1);
      // Handle escaped quotes within the field
      cleaned = cleaned.replace(/""/g, '"');
    }
    return cleaned;
  });
  
  return {
    row: cleanFields,
    linesConsumed: Math.max(1, lineIndex - startIndex + 1)
  };
}

/**
 * Determine CSV format based on headers
 */
export function determineCSVFormat(headers: string[]): 'product' | 'inventory' | 'unknown' {
  console.log(`Analyzing CSV format with headers: ${JSON.stringify(headers)}`);
  
  // Handle single-column cases (likely parsing issues)
  if (headers.length === 1) {
    const singleHeader = headers[0]?.toLowerCase() || '';
    console.log(`Single column detected: "${singleHeader}"`);
    
    // If the single header contains multiple field names separated by spaces or other characters,
    // it might be a parsing issue where the entire first row became one header
    if (singleHeader.includes('handle') || singleHeader.includes('title') || singleHeader.includes('sku')) {
      console.log('Single header contains Shopify field names, treating as malformed product export');
      return 'product';
    }
    
    return 'unknown';
  }
  
  // Standard Shopify product export format
  const isProductExport = headers.includes('Handle') && headers.includes('Title');
  const isInventoryExport = headers.includes('Product') && headers.includes('Variant Inventory Qty');
  
  // Check for common Shopify export patterns (case-insensitive)
  const headerLower = headers.map(h => h.toLowerCase());
  
  const hasShopifyProductFields = headerLower.some(h => 
    ['handle', 'title', 'body (html)', 'vendor', 'product category', 'type', 'variant sku'].includes(h)
  );
  
  const hasShopifyInventoryFields = headerLower.some(h => 
    ['sku', 'barcode', 'available', 'on hand', 'variant inventory qty', 'inventory tracked'].includes(h)
  );
  
  if (isProductExport || hasShopifyProductFields) {
    console.log('Detected product export format');
    return 'product';
  }
  
  if (isInventoryExport || hasShopifyInventoryFields) {
    console.log('Detected inventory export format');
    return 'inventory';
  }
  
  console.log(`Unrecognized CSV format - headers: ${JSON.stringify(headers)}`);
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
  sku: string;
  quantity: number; 
  price: number;
  weight: number | null;
  description: string;
  productType: string;
  vendor: string;
  published: boolean;
  tags: string;
  error?: string;
} | null {
  try {
    console.log(`Extracting product info for row ${rowIndex}, format: ${format}`);
    console.log(`Headers count: ${headers.length}, Row data count: ${row.length}`);
    console.log(`First 6 headers: ${JSON.stringify(headers.slice(0, 6))}`);
    console.log(`First 6 row values: ${JSON.stringify(row.slice(0, 6))}`);
    
    // Check if the row has the expected number of fields
    if (row.length !== headers.length) {
      console.log(`WARNING: Header/row field count mismatch - Headers: ${headers.length}, Row: ${row.length}`);
    }
    
    if (format === 'product') {
      // Map headers to indices (case-insensitive) with better matching
      const headerMap: {[key: string]: number} = {};
      headers.forEach((header, index) => {
        const cleanHeader = header.toLowerCase().trim().replace(/['"]/g, '');
        headerMap[cleanHeader] = index;
      });
      
      // Log first few mappings for debugging
      console.log('Sample header mappings:', Object.keys(headerMap).slice(0, 10));
      
      // Enhanced field extraction with safe array access
      const getField = (fieldName: string): string => {
        const index = headerMap[fieldName];
        return (index !== undefined && row[index] !== undefined) ? String(row[index]).trim() : '';
      };

      const handle = getField('handle');
      const title = getField('title');
      
      // Try multiple SKU field variations with proper field names from export
      const sku = getField('sku') || 
                  getField('variant sku') || 
                  getField('variant inventory item id') || 
                  getField('shopify variant id') ||
                  `SKU-${Date.now()}-${rowIndex}`;
      
      // Try multiple description field variations  
      const description = getField('body (html)') || 
                         getField('description') || 
                         getField('body') || '';
      
      // Try multiple product type variations
      const productType = getField('product type') || 
                         getField('type') || 
                         getField('product category') || '';
      
      const vendor = getField('vendor');
      const publishedField = getField('published') || getField('status');
      const published = publishedField.toLowerCase() === 'true';
      const tags = getField('tags');
      
      // Extract quantity with multiple field options using safe access
      let quantity = 0;
      const qtyStr = getField('variant inventory qty') || 
                     getField('available') || 
                     getField('on hand') ||
                     getField('inventory qty') || 
                     getField('quantity') || '0';
      quantity = parseInt(String(qtyStr).replace(/[^0-9]/g, '')) || 0;
      
      // Extract price with comprehensive field options matching CSV format
      let price = 0;
      const priceStr = getField('variant price') || 
                       getField('price') || 
                       getField('cost per item') || 
                       getField('variant cost') ||
                       '0';
      
      // Enhanced price parsing to handle currency symbols and formatting
      const cleanPriceStr = String(priceStr).replace(/[$,\s]/g, '').replace(/[^0-9.]/g, '');
      price = parseFloat(cleanPriceStr) || 0;
      
      console.log(`Price extraction: raw="${priceStr}", cleaned="${cleanPriceStr}", parsed=${price}`);
      
      // Extract weight using safe access
      let weight: number | null = null;
      const weightStr = getField('variant grams') || 
                        getField('weight') || 
                        getField('variant weight') || '';
      if (weightStr) {
        weight = parseFloat(String(weightStr).replace(/[^0-9.]/g, '')) || null;
      }
      
      // Extract image URL using safe access with exact column name from CSV
      const imageUrl = getField('image src') || 
                      getField('image') || 
                      getField('variant image') || 
                      getField('image url') || 
                      getField('product image') || '';
      
      console.log(`Image URL extraction: raw="${imageUrl}"`);
      
      // Debug: Check if we're getting the wrong field due to column mismatch
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('//')) {
        console.log(`WARNING: Image URL doesn't look like a URL: "${imageUrl}"`);
        console.log(`Image Src field index: ${headerMap['image src']}`);
        console.log(`Row length: ${row.length}, Headers length: ${headers.length}`);
      }
      
      // Extract additional pricing fields for comprehensive pricing data
      const compareAtPriceStr = getField('variant compare at price') || 
                               getField('compare at price') || '';
      const compareAtPrice = parseFloat(String(compareAtPriceStr).replace(/[$,\s]/g, '').replace(/[^0-9.]/g, '')) || 0;
      
      const costPriceStr = getField('variant cost') || 
                          getField('cost per item') || '';
      const costPrice = parseFloat(String(costPriceStr).replace(/[$,\s]/g, '').replace(/[^0-9.]/g, '')) || 0;
      
      console.log(`Extracted data for row ${rowIndex}:`, { 
        handle: handle.substring(0, 30), 
        title: title.substring(0, 30), 
        sku: sku.substring(0, 20), 
        quantity, 
        price, 
        weight,
        productType: productType.substring(0, 20),
        vendor: vendor.substring(0, 20)
      });
      
      // Skip rows with no meaningful data
      if (!title && !handle && !sku) {
        console.log(`Skipping row ${rowIndex} - no meaningful data found`);
        return null;
      }
      
      // Use handle as title if title is missing but handle exists
      const finalTitle = title || handle || `Product ${rowIndex}`;
      const finalHandle = handle || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `product-${rowIndex}`;
      
      // Skip if we still don't have a valid title
      if (!finalTitle || finalTitle.length < 2) {
        console.log(`Skipping row ${rowIndex} - invalid title: "${finalTitle}"`);
        return null;
      }
      
      return {
        handle: finalHandle.trim(),
        title: finalTitle.trim(),
        sku: sku.trim(),
        quantity,
        price,
        weight,
        description: description.trim(),
        productType: productType.trim(),
        vendor: vendor.trim(),
        published,
        tags: tags.trim(),
        imageUrl: imageUrl.trim(),
        compareAtPrice,
        costPrice
      };
    } 
    else if (format === 'inventory') {
      // Map headers to indices (case-insensitive)  
      const headerMap: {[key: string]: number} = {};
      headers.forEach((header, index) => {
        headerMap[header.toLowerCase().trim()] = index;
      });
      
      const title = row[headerMap['product']] || '';
      const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const sku = row[headerMap['sku']] || '';
      const variant = row[headerMap['variant']] || '';
      
      // Extract quantity
      let quantity = 0;
      const qtyStr = row[headerMap['variant inventory qty']] || '0';
      quantity = parseInt(qtyStr) || 0;
      
      // Extract price
      let price = 0;
      const priceStr = row[headerMap['price']] || row[headerMap['cost price']] || '0';
      price = parseFloat(priceStr) || 0;
      
      if (!title) {
        console.log('Skipping inventory row - no title found');
        return null;
      }
      
      return {
        handle: handle.trim(),
        title: title.trim(),
        sku: sku.trim(),
        quantity,
        price,
        weight: null,
        description: '',
        productType: 'Cannabis',
        vendor: '',
        published: true,
        tags: ''
      };
    }
    
    console.log('Unknown CSV format');
    return null;
  } catch (error) {
    console.log(`Error processing row ${rowIndex}:`, error);
    return null;
  }
}

/**
 * Determine product attributes based on title, variant, and price
 */
export function determineProductAttributes(title: string, variant: string, extractedPrice: number | null = null): {
  brand: string;
  prefix: string;
  category: string;
  tier: string;
  weight: number | null;
  packageSize: string;
  price: number;
} {
  // Extract Brand if present in title format "BrandName - Product Name"
  let brand = 'Default Brand';
  let prefix = 'INV'; // Default SKU prefix for Inventory Pro
  
  // Try to extract brand from title pattern like "BrandName - Product"
  const brandMatch = title.match(/^([^-]+)\s*-\s*/);
  if (brandMatch && brandMatch[1]) {
    brand = brandMatch[1].trim();
    // Generate prefix from first letters of brand words
    prefix = brand.split(/\s+/).map(word => word.charAt(0).toUpperCase()).join('');
  }
  
  // Determine tier/quality based on keywords in title
  let tier = 'Standard';
  let category = 'General';
  
  // Look for quality indicators
  if (title.toUpperCase().includes('PREMIUM') || title.toUpperCase().includes('DELUXE')) {
    tier = 'Premium';
  } else if (title.toUpperCase().includes('LUXURY') || title.toUpperCase().includes('HIGH END')) {
    tier = 'Luxury';
  } else if (title.toUpperCase().includes('BASIC') || title.toUpperCase().includes('ECONOMY')) {
    tier = 'Basic';
  } else if (title.toUpperCase().includes('VALUE') || title.toUpperCase().includes('BUDGET')) {
    tier = 'Value';
  }
  
  // Try to determine category based on keywords
  const categoryKeywords = [
    { keywords: ['ELECTRONICS', 'DEVICE', 'GADGET'], category: 'Electronics' },
    { keywords: ['APPAREL', 'CLOTHING', 'SHIRT', 'PANTS', 'DRESS'], category: 'Apparel' },
    { keywords: ['FURNITURE', 'CHAIR', 'TABLE', 'DESK'], category: 'Furniture' },
    { keywords: ['FOOD', 'DRINK', 'BEVERAGE', 'SNACK'], category: 'Food & Beverage' },
    { keywords: ['TOOL', 'HARDWARE', 'EQUIPMENT'], category: 'Tools & Hardware' },
    { keywords: ['TOY', 'GAME', 'PLAY'], category: 'Toys & Games' },
    { keywords: ['BEAUTY', 'COSMETIC', 'MAKEUP', 'SKIN', 'HAIR'], category: 'Beauty' },
    { keywords: ['BOOK', 'MAGAZINE', 'PUBLICATION'], category: 'Books & Media' },
    { keywords: ['ACCESSORY', 'JEWELRY', 'WATCH'], category: 'Accessories' }
  ];
  
  const titleUpper = title.toUpperCase();
  for (const { keywords, category: cat } of categoryKeywords) {
    if (keywords.some(keyword => titleUpper.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // Determine weight/size from variant if applicable
  let weight: number | null = null;
  let packageSize = variant || '';
  
  // Extract weight/size information from variant text
  const weightMatch = variant.match(/(\d+(?:\.\d+)?)\s*(g|grams|kg|lb|lbs|oz|ounce)/i);
  if (weightMatch) {
    const value = parseFloat(weightMatch[1]);
    const unit = weightMatch[2].toLowerCase();
    
    // Convert to a standard unit (grams)
    if (unit.startsWith('kg')) {
      weight = value * 1000;
    } else if (unit.startsWith('lb') || unit.startsWith('lbs')) {
      weight = value * 453.59;
    } else if (unit.startsWith('oz') || unit.startsWith('ounce')) {
      weight = value * 28.35;
    } else {
      // Assume grams
      weight = value;
    }
  }
  
  // Use extracted price if available, otherwise use a default
  let price: number;
  
  if (extractedPrice !== null && extractedPrice > 0) {
    // Use the actual price from the CSV
    price = extractedPrice;
    
    console.log(`Using extracted price from CSV: $${price.toFixed(2)}`);
  } else {
    // Generate default price - more generic approach when CSV doesn't have price
    price = 19.99; // Default base price
    
    // Adjust price based on tier
    const tierMultipliers: {[key: string]: number} = {
      'Value': 0.7,
      'Basic': 0.9,
      'Standard': 1.0,
      'Premium': 1.5,
      'Luxury': 2.5
    };
    
    // Apply tier multiplier
    price = price * (tierMultipliers[tier] || 1.0);
    
    // If we have weight/size info, adjust price accordingly
    if (weight) {
      // Simple linear price scaling based on weight
      const baseWeight = 100; // reference weight in grams
      const weightFactor = Math.max(0.5, Math.min(10, weight / baseWeight)); // limit the factor between 0.5 and 10
      price = price * weightFactor;
    }
    
    console.log(`No price in CSV, using calculated default: $${price.toFixed(2)}`);
  }
  
  // Round price to two decimal places
  price = Math.round(price * 100) / 100;
  
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
  let productName = title;
  
  // If title has a format like "Brand - Product", extract the product part
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts.length > 1) {
      productName = parts[1]; // Use the part after the brand
    }
  }
  
  return `${productName} - ${tier} Quality Product. This product was imported from Shopify.`;
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
  console.log("Starting Shopify CSV import process...");
  
  // Debug: Show first few lines of raw content
  const debugLines = csvContent.split('\n').slice(0, 5);
  console.log(`First 5 lines of raw CSV:`, debugLines);
  
  try {
    // Use bulletproof CSV parser directly
    console.log("Using bulletproof CSV parser...");
    const { headers, rows } = parseCSV(csvContent);
    console.log(`Bulletproof CSV parsed with ${headers.length} headers and ${rows.length} data rows`);
    
    if (headers.length > 0 && rows.length > 0) {
      const format = determineCSVFormat(headers);
      console.log(`Detected CSV format: ${format}`);
      
      if (format !== 'unknown') {
        // Use the parsed data
        
        const importedItems: Item[] = [];
        const errors: {row: number; reason: string}[] = [];
        const processedHandles = new Set<string>();
        
        // Process the recovered CSV data
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < headers.length / 2) continue; // Skip incomplete rows
          
          try {
            const productInfo = extractProductInfo(row, headers, format, i + 1);
            if (!productInfo) continue;
            
            const { title, handle, sku, price, weight, quantity, description, productType, vendor, published, tags, imageUrl } = productInfo;
            
            // Skip if already processed this handle
            if (processedHandles.has(handle)) continue;
            processedHandles.add(handle);
            
            // Ensure arrays are properly formatted for database
            const tagsArray = tags && typeof tags === 'string' ? 
              tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : 
              (Array.isArray(tags) ? tags : []);

            const itemData: InsertItem = {
              name: title,
              sku: sku || `AUTO-${handle}`,
              description: description || createDescription(title, 'Standard'),
              category: productType || 'Cannabis',
              basePrice: price > 0 ? price.toString() : '0',
              costPrice: '0',
              salePrice: price > 0 ? (price * 0.9).toFixed(2) : '0',
              wholesalePrice: price > 0 ? (price * 0.8).toFixed(2) : '0',
              weight: weight ? weight.toString() : '1 pound',
              quantity: quantity,
              status: published ? 'active' : 'inactive',
              tags: tagsArray,
              images: imageUrl ? [imageUrl] : [], // Include image URL if available
              marketplace: [], // Empty marketplace array
              metadata: {}, // Empty metadata object
              itemType: 'standard',
              visibility: 'visible',
              processingStatus: 'completed',
              publishStatus: 'published',
              condition: 'new',
              brand: vendor || 'Shopify Import',
              location: 'Import Storage'
            };
            
            const createdItem = await storage.createItem(itemData);
            if (createdItem) {
              createdItem.qrCodeDataURL = await generateQRCodeDataURL(createdItem);
              importedItems.push(createdItem);
            }
          } catch (error) {
            console.error(`Error processing row ${i + 1}:`, error);
            errors.push({ row: i + 1, reason: error instanceof Error ? error.message : 'Processing error' });
          }
        }
        
        return {
          success: true,
          items: importedItems,
          errors,
          message: `Successfully imported ${importedItems.length} items from Shopify CSV. ${errors.length} errors encountered.`
        };
      }
    }
    
    console.log("No valid CSV format detected");
    return {
      success: false,
      items: [],
      errors: [{ row: 0, reason: 'No valid CSV format detected' }],
      message: 'Could not parse CSV file: No valid format detected'
    };
  } catch (error) {
    console.error('CSV import error:', error);
    return {
      success: false,
      items: [],
      errors: [{ row: 0, reason: error instanceof Error ? error.message : 'Unknown error' }],
      message: 'Failed to import CSV file due to an error'
    };
  }
}