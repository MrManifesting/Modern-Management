/**
 * Advanced CSV Recovery Service
 * Handles malformed Shopify exports with filename headers and various delimiter issues
 */

export interface RecoveredCSV {
  headers: string[];
  rows: string[][];
  delimiter: string;
  success: boolean;
  skippedLines: number;
}

/**
 * Attempt to recover a properly formatted CSV from potentially malformed content
 */
export function recoverShopifyCSV(csvContent: string): RecoveredCSV {
  console.log("Starting advanced CSV recovery...");
  
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      delimiter: ',',
      success: false,
      skippedLines: 0
    };
  }
  
  // Strategy 1: Try to find the real header line by searching for Shopify patterns
  let bestHeaderIndex = -1;
  let bestDelimiter = ',';
  let bestScore = 0;
  
  const shopifyHeaderPatterns = [
    /handle/i, /title/i, /sku/i, /variant/i, /available/i, 
    /price/i, /inventory/i, /type/i, /vendor/i, /published/i,
    /body.*html/i, /tags/i, /collection/i, /image/i, /weight/i,
    /grams/i, /option/i, /barcode/i, /cost/i, /compare/i
  ];
  
  const delimiters = [',', '\t', ';', '|'];
  
  for (let lineIndex = 0; lineIndex < Math.min(15, lines.length); lineIndex++) {
    const line = lines[lineIndex];
    
    // Skip obvious filename patterns
    if (line.match(/^[^,\t;|]*export[^,\t;|]*\(\d+\)$/i)) {
      console.log(`Skipping filename pattern: ${line}`);
      continue;
    }
    
    for (const delimiter of delimiters) {
      const cells = line.split(delimiter);
      
      if (cells.length < 3) continue; // Not enough columns
      
      // Score this line based on how many Shopify headers it contains
      let score = 0;
      for (const cell of cells) {
        const cleanCell = cell.trim().replace(/['"]/g, '');
        for (const pattern of shopifyHeaderPatterns) {
          if (pattern.test(cleanCell)) {
            score += 1;
          }
        }
        
        // Additional scoring for exact Shopify column names
        const lowerCell = cleanCell.toLowerCase();
        if (['handle', 'title', 'body (html)', 'vendor', 'product type', 'tags', 'published', 'option1 name', 'option1 value', 'option2 name', 'option2 value', 'option3 name', 'option3 value', 'variant sku', 'variant grams', 'variant inventory tracker', 'variant inventory qty', 'variant inventory policy', 'variant fulfillment service', 'variant price', 'variant compare at price', 'variant requires shipping', 'variant taxable', 'variant barcode', 'image src', 'image position', 'image alt text', 'gift card', 'seo title', 'seo description', 'google shopping / google product category', 'google shopping / gender', 'google shopping / age group', 'google shopping / mpn', 'google shopping / adwords grouping', 'google shopping / adwords labels', 'google shopping / condition', 'google shopping / custom product', 'google shopping / custom label 0', 'google shopping / custom label 1', 'google shopping / custom label 2', 'google shopping / custom label 3', 'google shopping / custom label 4', 'variant image', 'variant weight unit', 'variant tax code', 'cost per item', 'status'].includes(lowerCell)) {
          score += 2; // Higher score for exact matches
        }
      }
      
      // Bonus points for having many columns (typical Shopify exports have 20+ columns)
      if (cells.length > 10) score += 2;
      if (cells.length > 20) score += 3;
      if (cells.length > 30) score += 5;
      
      if (score > bestScore) {
        bestScore = score;
        bestHeaderIndex = lineIndex;
        bestDelimiter = delimiter;
      }
    }
  }
  
  console.log(`Best header found at line ${bestHeaderIndex} with score ${bestScore} using delimiter "${bestDelimiter}"`);
  
  if (bestHeaderIndex === -1 || bestScore < 2) {
    // Strategy 2: Look for the line with the most delimiters
    let mostDelimitersIndex = 0;
    let mostDelimitersCount = 0;
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      for (const delimiter of delimiters) {
        const count = (line.match(new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (count > mostDelimitersCount) {
          mostDelimitersCount = count;
          mostDelimitersIndex = i;
          bestDelimiter = delimiter;
        }
      }
    }
    
    if (mostDelimitersCount > 5) {
      bestHeaderIndex = mostDelimitersIndex;
      console.log(`Fallback: Using line ${bestHeaderIndex} with ${mostDelimitersCount} delimiters`);
    }
  }
  
  if (bestHeaderIndex === -1) {
    console.log("Could not find valid CSV structure");
    return {
      headers: [],
      rows: [],
      delimiter: ',',
      success: false,
      skippedLines: 0
    };
  }
  
  // Parse the CSV from the identified header line
  const csvLines = lines.slice(bestHeaderIndex);
  const parsedRows: string[][] = [];
  
  for (const line of csvLines) {
    if (!line.trim()) continue;
    
    const cells = line.split(bestDelimiter).map(cell => {
      let cleaned = cell.trim();
      // Remove surrounding quotes
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned;
    });
    
    parsedRows.push(cells);
  }
  
  const headers = parsedRows[0] || [];
  const dataRows = parsedRows.slice(1);
  
  console.log(`Recovery successful: ${headers.length} headers, ${dataRows.length} data rows`);
  console.log(`Sample headers:`, headers.slice(0, 5));
  
  return {
    headers,
    rows: dataRows,
    delimiter: bestDelimiter,
    success: true,
    skippedLines: bestHeaderIndex
  };
}

/**
 * Validate that the recovered CSV has a recognizable Shopify format
 */
export function validateShopifyCSV(recovered: RecoveredCSV): 'product' | 'inventory' | 'unknown' {
  if (!recovered.success || recovered.headers.length < 3) {
    return 'unknown';
  }
  
  const headerText = recovered.headers.join(' ').toLowerCase();
  
  // Check for product export format
  const productKeywords = ['handle', 'title', 'body', 'vendor', 'type', 'tags'];
  const productMatches = productKeywords.filter(keyword => headerText.includes(keyword)).length;
  
  // Check for inventory export format
  const inventoryKeywords = ['sku', 'available', 'inventory', 'location'];
  const inventoryMatches = inventoryKeywords.filter(keyword => headerText.includes(keyword)).length;
  
  if (productMatches >= 3) {
    return 'product';
  } else if (inventoryMatches >= 2) {
    return 'inventory';
  } else {
    return 'unknown';
  }
}