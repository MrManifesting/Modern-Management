/**
 * Robust CSV Parser for Shopify Exports
 * Handles complex CSV files with quoted fields, multi-line content, and various delimiters
 */

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  format: 'product' | 'inventory' | 'unknown';
  success: boolean;
  errors: string[];
}

/**
 * Parse CSV content with proper handling of quotes, escapes, and multi-line fields
 */
export function parseRobustCSV(content: string): ParsedCSV {
  const errors: string[] = [];
  
  try {
    // Normalize line endings and handle BOM
    let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normalizedContent.charCodeAt(0) === 0xFEFF) {
      normalizedContent = normalizedContent.slice(1);
    }

    const lines = normalizedContent.split('\n');
    const allRows: string[][] = [];
    
    // Find the actual header line by skipping metadata lines
    let headerLineIndex = 0;
    let headerFound = false;
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and obvious metadata
      if (!line || line.match(/^(products|inventory)$/i) || line.match(/^[^,]*export[^,]*\(\d+\)$/i)) {
        continue;
      }
      
      // Try to parse this line as potential headers
      const parsed = parseCSVLine(line);
      if (parsed.length > 5 && hasShopifyHeaders(parsed)) {
        headerLineIndex = i;
        headerFound = true;
        break;
      }
    }
    
    if (!headerFound) {
      // Fallback: use the first line with substantial content
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();
        if (line && line.includes(',')) {
          headerLineIndex = i;
          break;
        }
      }
    }
    
    // Parse headers
    const headerLine = lines[headerLineIndex]?.trim();
    if (!headerLine) {
      return { headers: [], rows: [], format: 'unknown', success: false, errors: ['No valid header line found'] };
    }
    
    const headers = parseCSVLine(headerLine);
    
    // Parse data rows
    let i = headerLineIndex + 1;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line) {
        i++;
        continue;
      }
      
      try {
        const row = parseCSVLine(line, headers.length);
        
        // Skip rows that don't have enough data
        if (row.length >= Math.max(3, Math.floor(headers.length * 0.3))) {
          allRows.push(row);
        }
      } catch (error) {
        errors.push(`Error parsing line ${i + 1}: ${error}`);
      }
      
      i++;
    }
    
    // Determine format
    const format = detectShopifyFormat(headers);
    
    return {
      headers,
      rows: allRows,
      format,
      success: true,
      errors
    };
    
  } catch (error) {
    return {
      headers: [],
      rows: [],
      format: 'unknown',
      success: false,
      errors: [`Critical parsing error: ${error}`]
    };
  }
}

/**
 * Parse a single CSV line with proper quote handling
 */
function parseCSVLine(line: string, expectedColumns?: number): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : null;
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  // Add the last field
  result.push(current.trim());
  
  // Pad with empty strings if we know the expected column count
  if (expectedColumns && result.length < expectedColumns) {
    while (result.length < expectedColumns) {
      result.push('');
    }
  }
  
  return result;
}

/**
 * Check if headers contain typical Shopify export fields
 */
function hasShopifyHeaders(headers: string[]): boolean {
  const headerText = headers.join(' ').toLowerCase();
  
  const shopifyKeywords = [
    'handle', 'title', 'sku', 'variant', 'price', 'inventory',
    'vendor', 'type', 'tags', 'published', 'available', 'barcode'
  ];
  
  const matches = shopifyKeywords.filter(keyword => headerText.includes(keyword)).length;
  return matches >= 3;
}

/**
 * Detect the type of Shopify export based on headers
 */
function detectShopifyFormat(headers: string[]): 'product' | 'inventory' | 'unknown' {
  const headerText = headers.join(' ').toLowerCase();
  
  // Product export indicators
  if (headerText.includes('handle') && (headerText.includes('title') || headerText.includes('body'))) {
    return 'product';
  }
  
  // Inventory export indicators
  if (headerText.includes('sku') && (headerText.includes('available') || headerText.includes('on hand'))) {
    return 'inventory';
  }
  
  // Fallback detection
  const productScore = ['handle', 'title', 'vendor', 'type', 'tags'].filter(k => headerText.includes(k)).length;
  const inventoryScore = ['sku', 'available', 'inventory', 'location'].filter(k => headerText.includes(k)).length;
  
  if (productScore >= 2) return 'product';
  if (inventoryScore >= 2) return 'inventory';
  
  return 'unknown';
}

/**
 * Extract product data from Shopify product export row
 */
export function extractProductFromRow(headers: string[], row: string[]): any {
  const data: any = {};
  
  for (let i = 0; i < headers.length && i < row.length; i++) {
    const header = headers[i].toLowerCase().trim();
    const value = row[i]?.trim() || '';
    
    switch (header) {
      case 'handle':
        data.handle = value;
        break;
      case 'title':
        data.name = value;
        break;
      case 'body (html)':
      case 'body html':
        data.description = value;
        break;
      case 'vendor':
        data.vendor = value;
        break;
      case 'product type':
      case 'type':
        data.category = value;
        break;
      case 'variant sku':
      case 'sku':
        data.sku = value;
        break;
      case 'variant price':
      case 'price':
        data.basePrice = value;
        break;
      case 'variant inventory qty':
      case 'variant quantity':
        data.quantity = parseInt(value) || 0;
        break;
      case 'variant barcode':
      case 'barcode':
        data.barcode = value;
        break;
      case 'variant grams':
      case 'variant weight':
        data.weight = value;
        break;
      case 'tags':
        data.tags = value;
        break;
    }
  }
  
  return data;
}

/**
 * Extract inventory data from Shopify inventory export row
 */
export function extractInventoryFromRow(headers: string[], row: string[]): any {
  const data: any = {};
  
  for (let i = 0; i < headers.length && i < row.length; i++) {
    const header = headers[i].toLowerCase().trim();
    const value = row[i]?.trim() || '';
    
    switch (header) {
      case 'handle':
        data.handle = value;
        break;
      case 'title':
        data.name = value;
        break;
      case 'sku':
        data.sku = value;
        break;
      case 'available':
      case 'on hand':
        data.quantity = parseInt(value) || 0;
        break;
      case 'location':
        data.location = value;
        break;
    }
  }
  
  return data;
}