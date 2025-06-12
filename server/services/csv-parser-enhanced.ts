/**
 * Enhanced CSV Parser for Shopify Exports
 * Handles various Shopify export formats including malformed single-column exports
 */

export interface ParsedCsvData {
  headers: string[];
  rows: string[][];
  format: 'product' | 'inventory' | 'unknown';
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Enhanced CSV parser that handles various Shopify export formats
 */
export function parseShopifyCSV(csvContent: string): ParsedCsvData {
  try {
    // First, try to detect if this is a malformed single-column export
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      return {
        headers: [],
        rows: [],
        format: 'unknown',
        isValid: false,
        errorMessage: 'Empty CSV file'
      };
    }

    // Check if first line is a single column with export metadata
    const firstLine = lines[0];
    const isMetadataLine = firstLine.includes('export') && !firstLine.includes(',');
    
    let actualCsvStart = 0;
    
    // Skip metadata lines to find actual CSV headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(',') || (line.split('\t').length > 1)) {
        actualCsvStart = i;
        break;
      }
    }

    if (actualCsvStart >= lines.length) {
      return {
        headers: [],
        rows: [],
        format: 'unknown',
        isValid: false,
        errorMessage: 'No valid CSV data found'
      };
    }

    // Parse CSV starting from actual data
    const csvData = lines.slice(actualCsvStart).join('\n');
    const parsed = parseCSVContent(csvData);
    
    if (parsed.headers.length === 0) {
      return {
        headers: [],
        rows: [],
        format: 'unknown',
        isValid: false,
        errorMessage: 'No headers found'
      };
    }

    const format = determineShopifyFormat(parsed.headers);
    
    return {
      headers: parsed.headers,
      rows: parsed.rows,
      format,
      isValid: format !== 'unknown',
      errorMessage: format === 'unknown' ? `Unrecognized format with headers: ${parsed.headers.join(', ')}` : undefined
    };

  } catch (error) {
    return {
      headers: [],
      rows: [],
      format: 'unknown',
      isValid: false,
      errorMessage: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Parse CSV content with proper quote and comma handling
 */
function parseCSVContent(csvContent: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  const lines = csvContent.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Handle both comma and tab separators
    const separator = line.includes('\t') && !line.includes(',') ? '\t' : ',';
    const row = parseCSVLine(line, separator);
    
    if (row.length > 0) {
      rows.push(row);
    }
  }
  
  return { 
    headers: rows[0]?.map(h => h.trim()) || [],
    rows: rows.slice(1) 
  };
}

/**
 * Parse a single CSV line with proper quote handling
 */
function parseCSVLine(line: string, separator: string = ','): string[] {
  const row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        cell += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
    
    i++;
  }
  
  // Add the last cell
  row.push(cell.trim());
  
  return row.map(cell => {
    // Remove surrounding quotes if present
    if (cell.startsWith('"') && cell.endsWith('"')) {
      return cell.slice(1, -1);
    }
    return cell;
  });
}

/**
 * Determine Shopify export format based on headers
 */
function determineShopifyFormat(headers: string[]): 'product' | 'inventory' | 'unknown' {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  
  // Shopify Product Export patterns
  const productIndicators = [
    'handle', 'title', 'body (html)', 'vendor', 'product category', 'type',
    'tags', 'published', 'option1 name', 'option1 value', 'variant sku',
    'variant grams', 'variant inventory tracker', 'variant inventory qty',
    'variant inventory policy', 'variant fulfillment service',
    'variant price', 'variant compare at price', 'variant requires shipping',
    'variant taxable', 'variant barcode', 'image src', 'image position',
    'image alt text', 'gift card', 'seo title', 'seo description',
    'google shopping', 'variant image', 'variant weight unit',
    'variant tax code', 'cost per item', 'included', 'price / international',
    'compare at price / international'
  ];
  
  // Shopify Inventory Export patterns
  const inventoryIndicators = [
    'sku', 'product', 'variant', 'available', 'on hand', 'committed',
    'variant inventory qty', 'barcode', 'location'
  ];
  
  // Count matches for each format
  const productMatches = productIndicators.filter(indicator => 
    headerSet.has(indicator)
  ).length;
  
  const inventoryMatches = inventoryIndicators.filter(indicator => 
    headerSet.has(indicator)
  ).length;
  
  // Determine format based on matches
  if (productMatches >= 3) return 'product';
  if (inventoryMatches >= 2) return 'inventory';
  
  // Additional checks for common variations
  if (headerSet.has('handle') && headerSet.has('title')) return 'product';
  if (headerSet.has('sku') && (headerSet.has('available') || headerSet.has('on hand'))) return 'inventory';
  
  console.log(`CSV format detection: Product matches: ${productMatches}, Inventory matches: ${inventoryMatches}`);
  console.log(`Headers: ${headers.join(', ')}`);
  
  return 'unknown';
}

/**
 * Convert parsed CSV data to standardized item format
 */
export function convertCSVRowToItem(
  row: string[], 
  headers: string[], 
  format: 'product' | 'inventory',
  rowIndex: number
): {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  category: string;
  description?: string;
  vendor?: string;
  tags?: string[];
  barcode?: string;
  weight?: number;
  error?: string;
} | null {
  try {
    const headerMap = new Map(headers.map((h, i) => [h.toLowerCase(), i]));
    
    if (format === 'product') {
      return convertProductRow(row, headerMap, rowIndex);
    } else if (format === 'inventory') {
      return convertInventoryRow(row, headerMap, rowIndex);
    }
    
    return null;
  } catch (error) {
    return {
      name: '',
      sku: '',
      quantity: 0,
      price: 0,
      category: 'general',
      error: `Row ${rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function convertProductRow(row: string[], headerMap: Map<string, number>, rowIndex: number) {
  const getCell = (header: string) => {
    const index = headerMap.get(header.toLowerCase());
    return index !== undefined ? (row[index] || '').trim() : '';
  };
  
  const name = getCell('title') || getCell('product');
  const sku = getCell('variant sku') || getCell('sku');
  const handle = getCell('handle');
  
  if (!name) {
    return {
      name: '',
      sku: sku || `unknown-${rowIndex}`,
      quantity: 0,
      price: 0,
      category: 'general',
      error: `Row ${rowIndex}: Missing product title`
    };
  }
  
  // Parse quantity
  let quantity = 0;
  const qtyStr = getCell('variant inventory qty') || getCell('available') || '0';
  const parsedQty = parseInt(qtyStr);
  if (!isNaN(parsedQty)) {
    quantity = Math.max(0, parsedQty);
  }
  
  // Parse price
  let price = 0;
  const priceStr = getCell('variant price') || getCell('price') || '0';
  const cleanPriceStr = priceStr.replace(/[$,]/g, '');
  const parsedPrice = parseFloat(cleanPriceStr);
  if (!isNaN(parsedPrice)) {
    price = Math.max(0, parsedPrice);
  }
  
  return {
    name,
    sku: sku || handle || `product-${rowIndex}`,
    quantity,
    price,
    category: getCell('type') || getCell('product category') || 'general',
    description: getCell('body (html)') || undefined,
    vendor: getCell('vendor') || undefined,
    tags: getCell('tags') ? getCell('tags').split(',').map(t => t.trim()) : undefined,
    barcode: getCell('variant barcode') || getCell('barcode') || undefined,
    weight: parseFloat(getCell('variant grams')) || undefined
  };
}

function convertInventoryRow(row: string[], headerMap: Map<string, number>, rowIndex: number) {
  const getCell = (header: string) => {
    const index = headerMap.get(header.toLowerCase());
    return index !== undefined ? (row[index] || '').trim() : '';
  };
  
  const name = getCell('product') || getCell('variant');
  const sku = getCell('sku');
  
  if (!name && !sku) {
    return {
      name: '',
      sku: `unknown-${rowIndex}`,
      quantity: 0,
      price: 0,
      category: 'general',
      error: `Row ${rowIndex}: Missing product name and SKU`
    };
  }
  
  // Parse quantity
  let quantity = 0;
  const qtyStr = getCell('available') || getCell('on hand') || getCell('variant inventory qty') || '0';
  const parsedQty = parseInt(qtyStr);
  if (!isNaN(parsedQty)) {
    quantity = Math.max(0, parsedQty);
  }
  
  return {
    name: name || `Product ${sku}`,
    sku: sku || `inv-${rowIndex}`,
    quantity,
    price: 0, // Inventory exports typically don't include price
    category: 'general',
    barcode: getCell('barcode') || undefined
  };
}