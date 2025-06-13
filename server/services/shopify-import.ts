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
import { parseShopifyCSV, convertCSVRowToItem } from './csv-parser-enhanced';
import { recoverShopifyCSV, validateShopifyCSV } from './csv-recovery';

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
    
    // Split by the specified delimiter and clean up quotes
    const cells = line.split(delimiter).map(cell => {
      let cleaned = cell.trim();
      // Remove surrounding quotes if present
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned;
    });
    
    rows.push(cells);
  }
  
  const headers = rows[0]?.map(h => h.trim()) || [];
  const dataRows = rows.slice(1);
  
  return { headers, rows: dataRows };
}

/**
 * Parse CSV content to structured data
 */
export function parseCSV(csvContent: string): ParsedCsvData {
  const rows: string[][] = [];
  let lines = csvContent.split(/\r?\n/);
  
  // Skip any initial lines that look like filenames or metadata
  let skippedLines = 0;
  while (lines.length > 0 && skippedLines < 10) { // Limit skipping to prevent infinite loops
    const line = lines[0];
    const shouldSkip = (
      line.includes('export_') || 
      line.match(/^\w+_export_\d+\s*\(\d+\)$/) ||
      line.trim().length < 10 ||
      (!line.includes(',') && !line.includes('\t') && !line.includes(';')) ||
      line.match(/^[^,\t;]*$/) // Single word/phrase without delimiters
    );
    
    if (shouldSkip) {
      console.log(`Skipping potential filename/metadata line ${skippedLines + 1}: "${line}"`);
      lines = lines.slice(1);
      skippedLines++;
    } else {
      break;
    }
  }
  
  // Try to find a line that looks like proper CSV headers
  let headerLineIndex = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    const delimiters = (line.match(/[,\t;]/g) || []).length;
    
    // Look for lines with common Shopify CSV headers
    if (delimiters > 5 && (
      line.toLowerCase().includes('handle') ||
      line.toLowerCase().includes('title') ||
      line.toLowerCase().includes('sku') ||
      line.toLowerCase().includes('variant') ||
      line.toLowerCase().includes('available') ||
      line.toLowerCase().includes('price')
    )) {
      console.log(`Found proper CSV header line at index ${i}: "${line}"`);
      headerLineIndex = i;
      break;
    }
  }
  
  // Skip to the header line if we found one
  if (headerLineIndex > 0) {
    lines = lines.slice(headerLineIndex);
    console.log(`Adjusted to start from header line, remaining lines: ${lines.length}`);
  }
  
  if (lines.length === 0) {
    console.log("No valid CSV data found after skipping metadata lines");
    return { headers: [], rows: [] };
  }
  
  // Detect delimiter by checking first few real data lines
  let delimiter = ',';
  if (lines.length > 0) {
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    // Choose the most frequent delimiter
    if (tabCount > commaCount && tabCount > semicolonCount) {
      delimiter = '\t';
    } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
      delimiter = ';';
    }
    
    console.log(`Detected CSV delimiter: "${delimiter}" (commas: ${commaCount}, tabs: ${tabCount}, semicolons: ${semicolonCount})`);
  }
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
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
    console.log(`Headers: ${JSON.stringify(headers)}`);
    console.log(`Row data: ${JSON.stringify(row.slice(0, 10))}...`); // Show first 10 fields
    
    if (format === 'product') {
      // Map headers to indices (case-insensitive)
      const headerMap: {[key: string]: number} = {};
      headers.forEach((header, index) => {
        headerMap[header.toLowerCase().trim()] = index;
      });
      
      console.log('Header mapping:', Object.keys(headerMap));
      
      const handle = row[headerMap['handle']] || '';
      const title = row[headerMap['title']] || '';
      const sku = row[headerMap['variant sku']] || row[headerMap['sku']] || '';
      const description = row[headerMap['body (html)']] || row[headerMap['description']] || '';
      const productType = row[headerMap['product type']] || row[headerMap['type']] || '';
      const vendor = row[headerMap['vendor']] || '';
      const published = (row[headerMap['published']] || '').toLowerCase() === 'true';
      const tags = row[headerMap['tags']] || '';
      
      // Extract quantity
      let quantity = 0;
      const qtyStr = row[headerMap['variant inventory qty']] || row[headerMap['available']] || '0';
      quantity = parseInt(qtyStr) || 0;
      
      // Extract price
      let price = 0;
      const priceStr = row[headerMap['variant price']] || row[headerMap['price']] || '0';
      price = parseFloat(priceStr) || 0;
      
      // Extract weight
      let weight: number | null = null;
      const weightStr = row[headerMap['variant grams']] || row[headerMap['weight']] || '';
      if (weightStr) {
        weight = parseFloat(weightStr) || null;
      }
      
      console.log(`Extracted data:`, { 
        handle, title, sku, quantity, price, weight, 
        productType, vendor, published, tags: tags.substring(0, 50) 
      });
      
      if (!title) {
        console.log('Skipping row - no title found');
        return null;
      }
      
      return {
        handle: handle.trim(),
        title: title.trim(),
        sku: sku.trim(),
        quantity,
        price,
        weight,
        description: description.trim(),
        productType: productType.trim(),
        vendor: vendor.trim(),
        published,
        tags: tags.trim()
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
    // First attempt: Try advanced CSV recovery
    const recovered = recoverShopifyCSV(csvContent);
    
    if (recovered.success) {
      console.log(`CSV recovery successful: ${recovered.headers.length} headers, ${recovered.rows.length} rows`);
      console.log(`Skipped ${recovered.skippedLines} metadata lines`);
      console.log(`Using delimiter: "${recovered.delimiter}"`);
      
      const format = validateShopifyCSV(recovered);
      console.log(`Recovered CSV format: ${format}`);
      
      if (format !== 'unknown') {
        // Use the recovered data
        const { headers, rows } = recovered;
        
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
            
            const { title, handle, sku, price, weight, quantity, description, productType, vendor, published, tags } = productInfo;
            
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
              basePrice: price,
              weight: weight,
              quantity: quantity,
              status: published ? 'active' : 'inactive',
              tags: tagsArray,
              images: [], // Start with empty array for images
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
    
    // Fallback: Use original parsing method
    console.log("CSV recovery failed, falling back to standard parsing...");
    const { headers, rows } = parseCSV(csvContent);
    console.log(`Standard CSV parsed with ${headers.length} headers and ${rows.length} data rows`);
    console.log(`Headers found:`, headers);
    
    if (headers.length === 0 || rows.length === 0) {
      console.log("Empty or invalid CSV file");
      return {
        success: false,
        items: [],
        errors: [{ row: 0, reason: "Empty or invalid CSV file" }],
        message: "The uploaded file is empty or has an invalid format"
      };
    }
    
    const format = determineCSVFormat(headers);
    console.log(`CSV format determined as: ${format}`);
    
    if (format === 'unknown') {
      console.log("Initial format detection failed. Attempting advanced recovery...");
      
      // Try to recover from various CSV formatting issues
      if (headers.length <= 2) {
        console.log("Attempting to recover from malformed CSV...");
        
        // Strategy 1: Try different delimiters with the original content
        const alternativeDelimiters = ['\t', ';', '|'];
        for (const delimiter of alternativeDelimiters) {
          try {
            console.log(`Testing delimiter: "${delimiter}"`);
            const testParsed = parseCSVWithDelimiter(csvContent, delimiter);
            
            if (testParsed.headers.length > 5) {
              console.log(`Found better delimiter: "${delimiter}" with ${testParsed.headers.length} columns`);
              console.log(`Sample headers:`, testParsed.headers.slice(0, 5));
              
              const recoveredFormat = determineCSVFormat(testParsed.headers);
              if (recoveredFormat !== 'unknown') {
                console.log(`Successfully recovered CSV with format: ${recoveredFormat}`);
                // Recursively call with the properly parsed data
                const recoveredCSV = [testParsed.headers, ...testParsed.rows]
                  .map(row => row.map(cell => cell.includes(',') ? `"${cell}"` : cell).join(','))
                  .join('\n');
                return importShopifyCSV(recoveredCSV, storage, generateBarcodeData, generateQRCodeDataURL);
              }
            }
          } catch (error) {
            console.log(`Failed to parse with delimiter "${delimiter}":`, error);
          }
        }
        
        // Strategy 2: Try to find the real header line in the content
        const lines = csvContent.split(/\r?\n/);
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i];
          if (line.includes('Handle') || line.includes('SKU') || line.includes('Title') || 
              line.includes('Variant') || line.includes('Available')) {
            console.log(`Found potential header line at index ${i}: "${line}"`);
            
            // Try parsing from this line
            const remainingLines = lines.slice(i);
            const testCSV = remainingLines.join('\n');
            const testParsed = parseCSV(testCSV);
            
            if (testParsed.headers.length > 5) {
              console.log(`Header recovery successful with ${testParsed.headers.length} columns`);
              const recoveredFormat = determineCSVFormat(testParsed.headers);
              if (recoveredFormat !== 'unknown') {
                console.log(`Successfully recovered CSV with format: ${recoveredFormat}`);
                return importShopifyCSV(testCSV, storage, generateBarcodeData, generateQRCodeDataURL);
              }
            }
          }
        }
      }
      
      console.log("All recovery attempts failed. Headers found:", headers);
      console.log("First few lines of content:", csvContent.split('\n').slice(0, 3));
      
      return {
        success: false,
        items: [],
        errors: [{ row: 0, reason: "Unrecognized CSV format after recovery attempts" }],
        message: `The CSV format is not recognized as a valid Shopify export. Headers found: [${headers.join(', ')}]. Please ensure you're uploading a properly formatted Shopify 'Products' or 'Inventory' export CSV file.`
      };
    }
    
    const importedItems: Item[] = [];
    const errors: {row: number; reason: string}[] = [];
    const processedHandles = new Set<string>();
    let processed = 0;
    let skipped = 0;
    let succeeded = 0;
    let failed = 0;
    
    console.log(`Processing ${rows.length} rows from Shopify CSV...`);
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      processed++;
      
      try {
        // Skip rows with insufficient data
        if (row.length < 5) {
          errors.push({row: rowIndex + 2, reason: "Row has insufficient columns"});
          skipped++;
          continue;
        }
        
        // Skip items marked as unavailable, but allow normal items to be imported
        // We've removed the Printify-specific filter as it's no longer needed
        if (row.some((cell: string) => {
          // Only skip if we find very specific "not stocked" or "unavailable" messages
          if (cell) {
            const lowerCell = cell.toLowerCase();
            return lowerCell === 'not stocked' || 
                   lowerCell === 'unavailable' || 
                   lowerCell === 'out of stock'; 
          }
          return false;
        })) {
          errors.push({row: rowIndex + 2, reason: "Out of stock/unavailable items are skipped"});
          skipped++;
          continue;
        }
        
        // Extract basic product info
        const productInfo = extractProductInfo(row, headers, format, rowIndex + 2);
        
        if (productInfo.error) {
          errors.push({row: rowIndex + 2, reason: productInfo.error});
          failed++;
          continue;
        }
        
        const { handle, title, quantity, variant, price: extractedPrice } = productInfo;
        
        // Skip duplicate products (only take the first variant)
        if (processedHandles.has(handle)) {
          console.log(`Skipping duplicate handle: ${handle}`);
          skipped++;
          continue;
        }
        processedHandles.add(handle);
        
        // Determine product attributes with extracted price if available
        const attributes = determineProductAttributes(title, variant, extractedPrice);
        
        // Generate SKU
        const sku = generateSKU(attributes.prefix, handle);
        
        // Create description
        const description = createDescription(title, attributes.tier);
        
        // Create item data with proper JSON structure
        const itemData: InsertItem = {
          name: title || 'Unnamed Product',
          description: description || 'No description available',
          basePrice: (attributes.price || 0).toString(), // Ensure string format for numeric
          sku: sku,
          quantity: quantity || 0,
          status: 'active',
          category: attributes.category || 'General',
          condition: 'New', // Default condition
          tags: ['imported', attributes.brand?.toLowerCase().replace(/\s+/g, '-') || 'no-brand', attributes.tier?.toLowerCase().replace(/\s+/g, '-') || 'standard'],
          images: [],
          marketplace: [], // Use empty array instead of object to prevent JSON errors
          metadata: {}, // Ensure empty object for metadata
          weight: attributes.weight ? attributes.weight.toString() : null,
        };
        
        console.log(`Creating item (${rowIndex + 1}/${rows.length}): ${itemData.name} (${itemData.sku}), Qty: ${itemData.quantity}`);
        
        // Check if the item already exists by SKU
        const existingItem = await storage.getItemBySku(sku);
        if (existingItem) {
          console.log(`Item with SKU ${sku} already exists, updating instead of creating`);
          // Update existing item
          const updatedItem = await storage.updateItem(existingItem.id, {
            ...itemData,
            quantity: existingItem.quantity + (itemData.quantity || 0) // Add quantities
          });
          
          if (updatedItem) {
            importedItems.push(updatedItem);
            succeeded++;
          } else {
            errors.push({row: rowIndex + 2, reason: "Failed to update existing item"});
            failed++;
          }
          continue;
        }
        
        // Create item in storage
        const createdItem = await storage.createItem(itemData);
        if (!createdItem) {
          console.error(`Failed to create item: ${itemData.name} (${itemData.sku})`);
          errors.push({row: rowIndex + 2, reason: "Failed to create item in database"});
          failed++;
          continue;
        }
        
        // Generate barcode and QR code
        let barcode = "";
        let qrCode = "";
        
        try {
          barcode = generateBarcodeData(itemData.sku);
          qrCode = await generateQRCodeDataURL(createdItem);
        } catch (codeErr) {
          console.error("Error generating barcode/QR code:", codeErr);
          // Don't fail the import just because of barcode generation
          errors.push({
            row: rowIndex + 2, 
            reason: `Item created but barcode/QR generation failed: ${codeErr instanceof Error ? codeErr.message : "Unknown error"}`
          });
        }
        
        // Update with barcode and QR code if we have them
        if (barcode || qrCode) {
          const updateData: Partial<InsertItem> = {};
          if (barcode) updateData.barcode = barcode;
          if (qrCode) updateData.qrCode = qrCode;
          
          try {
            const updatedItem = await storage.updateItem(createdItem.id, updateData);
            if (updatedItem) {
              importedItems.push(updatedItem);
              succeeded++;
            } else {
              // Item was created but update failed
              importedItems.push(createdItem);
              errors.push({row: rowIndex + 2, reason: "Item created but failed to update with barcode/QR code"});
              succeeded++;
            }
          } catch (updateErr) {
            // Item was created but update failed
            importedItems.push(createdItem);
            errors.push({
              row: rowIndex + 2, 
              reason: `Item created but failed to update with barcode/QR code: ${updateErr instanceof Error ? updateErr.message : "Unknown error"}`
            });
            succeeded++;
          }
        } else {
          // No barcode/QR codes, but item was created successfully
          importedItems.push(createdItem);
          succeeded++;
        }
        
      } catch (importErr) {
        console.error(`Error importing row ${rowIndex + 2}:`, importErr);
        errors.push({
          row: rowIndex + 2, 
          reason: importErr instanceof Error ? importErr.message : "Unknown error"
        });
        failed++;
      }
    }
    
    console.log(`Import complete - Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}, Skipped: ${skipped}`);
    
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
      message: `Successfully imported ${importedItems.length} items from Shopify. Processed ${processed} rows (${skipped} skipped, ${failed} failed).`
    };
  } catch (error) {
    console.error("Critical error in importShopifyCSV:", error);
    return {
      success: false,
      items: [],
      errors: [{ row: 0, reason: `Critical import error: ${error instanceof Error ? error.message : "Unknown error"}` }],
      message: `CSV import failed with a critical error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}