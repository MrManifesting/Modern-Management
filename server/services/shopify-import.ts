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
  price: number | null;
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
      
      // Look for price in various possible column names
      const variantPriceIndex = headers.indexOf('Variant Price');
      const priceIndex = headers.indexOf('Price');
      const regularPriceIndex = headers.indexOf('Regular Price');
      
      if (handleIndex < 0 || titleIndex < 0) {
        return { 
          handle: '', title: '', quantity: 0, variant: '', price: null,
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
      
      // Extract price if available in any of the price columns
      let price: number | null = null;
      if (variantPriceIndex >= 0 && row[variantPriceIndex]) {
        const priceStr = row[variantPriceIndex].trim().replace(/[^0-9.]/g, '');
        price = !isNaN(parseFloat(priceStr)) ? parseFloat(priceStr) : null;
      } else if (priceIndex >= 0 && row[priceIndex]) {
        const priceStr = row[priceIndex].trim().replace(/[^0-9.]/g, '');
        price = !isNaN(parseFloat(priceStr)) ? parseFloat(priceStr) : null;
      } else if (regularPriceIndex >= 0 && row[regularPriceIndex]) {
        const priceStr = row[regularPriceIndex].trim().replace(/[^0-9.]/g, '');
        price = !isNaN(parseFloat(priceStr)) ? parseFloat(priceStr) : null;
      }
      
      return { handle, title, quantity, variant: optionValue, price };
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
  
  // Generate default price - more generic approach
  let price = 19.99; // Default base price
  
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
  
  try {
    const { headers, rows } = parseCSV(csvContent);
    console.log(`CSV parsed with ${headers.length} headers and ${rows.length} data rows`);
    
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
      console.log("Unrecognized CSV format - headers:", headers);
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
        
        const { handle, title, quantity, variant } = productInfo;
        
        // Skip duplicate products (only take the first variant)
        if (processedHandles.has(handle)) {
          console.log(`Skipping duplicate handle: ${handle}`);
          skipped++;
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
          name: title || 'Unnamed Product',
          description: description || 'No description available',
          basePrice: attributes.price || 0, // Set default price to 0 to prevent null violations
          sku: sku,
          quantity: quantity || 0,
          status: 'active',
          category: attributes.category || 'General',
          condition: 'New', // Default condition
          tags: ['imported', attributes.brand?.toLowerCase().replace(/\s+/g, '-') || 'no-brand', attributes.tier?.toLowerCase().replace(/\s+/g, '-') || 'standard'],
          images: [],
          marketplace: [{
            name: 'Shopify',
            isListed: true
          }],
          weight: attributes.weight || null,
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
          const updateData: Partial<Item> = {};
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