/**
 * Enhanced CSV Parser for Shopify inventory exports
 * Handles various CSV formats and data validation
 */

import { InsertItem } from "@shared/schema";

export interface CSVParseResult {
  success: boolean;
  items: InsertItem[];
  errors: string[];
  skipped: number;
  processed: number;
}

export function parseShopifyCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const result: CSVParseResult = {
    success: false,
    items: [],
    errors: [],
    skipped: 0,
    processed: 0
  };

  if (lines.length < 2) {
    result.errors.push('CSV file must contain at least a header and one data row');
    return result;
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log('CSV Headers detected:', headers);

  // Detect CSV format based on headers
  const format = detectCSVFormat(headers);
  console.log('Detected CSV format:', format);

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVRow(lines[i]);
      if (row.length === 0) {
        result.skipped++;
        continue;
      }

      const item = convertCSVRowToItem(headers, row, format);
      if (item) {
        result.items.push(item);
        result.processed++;
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      result.skipped++;
    }
  }

  result.success = result.items.length > 0;
  return result;
}

function detectCSVFormat(headers: string[]): 'shopify_inventory' | 'shopify_products' | 'generic' {
  const headerStr = headers.join(',').toLowerCase();
  
  if (headerStr.includes('handle') && headerStr.includes('variant sku')) {
    return 'shopify_products';
  } else if (headerStr.includes('sku') && headerStr.includes('available')) {
    return 'shopify_inventory';
  }
  
  return 'generic';
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

export function convertCSVRowToItem(headers: string[], row: string[], format: string): InsertItem | null {
  try {
    // Create a map for easy field access
    const data: Record<string, string> = {};
    headers.forEach((header, index) => {
      data[header.toLowerCase().trim()] = row[index] || '';
    });

    // Common field mappings
    const name = data['title'] || data['product title'] || data['name'] || data['handle'] || 'Unnamed Product';
    const sku = data['variant sku'] || data['sku'] || data['id'] || '';
    const price = parseFloat(data['variant price'] || data['price'] || data['cost'] || '0') || 0;
    const quantity = parseInt(data['variant inventory qty'] || data['available'] || data['quantity'] || '0') || 0;

    // Skip if no essential data
    if (!name && !sku) {
      console.log('Skipping row - no name or SKU');
      return null;
    }

    // Generate SKU if missing
    const finalSku = sku || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const item: InsertItem = {
      name: name.substring(0, 255), // Ensure length limit
      sku: finalSku.substring(0, 100),
      basePrice: price,
      quantity: quantity,
      description: (data['body html'] || data['description'] || '').substring(0, 1000),
      category: (data['product type'] || data['type'] || data['category'] || 'General').substring(0, 100),
      brand: (data['vendor'] || data['brand'] || 'Unknown').substring(0, 100),
      tags: parseTagsFromCSV(data['tags'] || ''),
      weight: parseFloat(data['variant weight'] || data['weight'] || '0') || 0,
      weightUnit: (data['variant weight unit'] || 'lb').substring(0, 10),
      cost: parseFloat(data['variant compare at price'] || data['compare_price'] || '0') || 0,
      barcode: (data['variant barcode'] || data['barcode'] || '').substring(0, 50),
      images: parseImagesFromCSV(data['image src'] || data['images'] || ''),
      condition: 'new',
      notes: '',
      isActive: true,
      isBulk: false,
      isStandard: true,
      location: 'warehouse',
      shelf: '',
      bin: '',
      lowStockThreshold: 5,
      metadata: {
        importSource: 'csv',
        importDate: new Date().toISOString(),
        originalData: format === 'shopify_products' ? {
          handle: data['handle'] || '',
          productId: data['id'] || '',
          variantId: data['variant id'] || ''
        } : {}
      }
    };

    return item;
  } catch (error) {
    console.error('Error converting CSV row to item:', error);
    return null;
  }
}

function parseTagsFromCSV(tagsString: string): string[] {
  if (!tagsString) return [];
  
  return tagsString
    .split(',')
    .map(tag => tag.trim().replace(/"/g, ''))
    .filter(tag => tag.length > 0)
    .slice(0, 10); // Limit number of tags
}

function parseImagesFromCSV(imagesString: string): string[] {
  if (!imagesString) return [];
  
  const urls = imagesString
    .split(',')
    .map(url => url.trim().replace(/"/g, ''))
    .filter(url => url.startsWith('http'))
    .slice(0, 5); // Limit number of images
  
  return urls;
}

export function validateCSVImportData(items: InsertItem[]): { valid: InsertItem[], invalid: { item: any, errors: string[] }[] } {
  const valid: InsertItem[] = [];
  const invalid: { item: any, errors: string[] }[] = [];

  for (const item of items) {
    const errors: string[] = [];

    // Required field validation
    if (!item.name || item.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!item.sku || item.sku.trim().length === 0) {
      errors.push('SKU is required');
    }

    if (item.basePrice < 0) {
      errors.push('Base price cannot be negative');
    }

    if (item.quantity < 0) {
      errors.push('Quantity cannot be negative');
    }

    // Length validation
    if (item.name && item.name.length > 255) {
      errors.push('Name too long (max 255 characters)');
    }

    if (item.sku && item.sku.length > 100) {
      errors.push('SKU too long (max 100 characters)');
    }

    if (errors.length === 0) {
      valid.push(item);
    } else {
      invalid.push({ item, errors });
    }
  }

  return { valid, invalid };
}