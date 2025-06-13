/**
 * Final robust CSV parser that properly handles Shopify CSV exports
 * This parser is specifically designed to handle quoted fields with commas
 */

interface CSVResult {
  headers: string[];
  rows: string[][];
}

/**
 * Parse CSV content using a state machine that properly handles RFC 4180 compliance
 */
export function parseShopifyCSV(csvContent: string): CSVResult {
  console.log('Starting final robust CSV parsing...');
  
  // Normalize line endings
  const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const result = parseCSVWithStateMachine(normalizedContent);
  
  console.log(`Final CSV parsing complete: ${result.headers.length} headers, ${result.rows.length} rows`);
  
  return result;
}

/**
 * State machine CSV parser that handles all edge cases
 */
function parseCSVWithStateMachine(content: string): CSVResult {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let position = 0;
  
  while (position < content.length) {
    const char = content[position];
    const nextChar = content[position + 1];
    
    switch (char) {
      case '"':
        if (inQuotes) {
          if (nextChar === '"') {
            // Escaped quote - add one quote to the cell
            currentCell += '"';
            position += 2;
          } else {
            // End of quoted field
            inQuotes = false;
            position++;
          }
        } else {
          // Start of quoted field
          inQuotes = true;
          position++;
        }
        break;
        
      case ',':
        if (inQuotes) {
          // Comma inside quotes - part of the field
          currentCell += char;
        } else {
          // Field separator
          currentRow.push(currentCell);
          currentCell = '';
        }
        position++;
        break;
        
      case '\n':
        if (inQuotes) {
          // Newline inside quotes - part of the field
          currentCell += char;
        } else {
          // End of row
          currentRow.push(currentCell);
          if (currentRow.some(cell => cell.trim().length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        }
        position++;
        break;
        
      default:
        currentCell += char;
        position++;
        break;
    }
  }
  
  // Handle the last cell and row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some(cell => cell.trim().length > 0)) {
      rows.push(currentRow);
    }
  }
  
  // Clean up the data
  const cleanedRows = rows.map(row => 
    row.map(cell => cell.trim())
  );
  
  // Find the header row
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(3, cleanedRows.length); i++) {
    const row = cleanedRows[i];
    const isHeaderRow = row.some(cell => {
      const lower = cell.toLowerCase();
      return lower.includes('handle') || lower.includes('title') || 
             lower.includes('variant') || lower.includes('sku');
    });
    
    if (isHeaderRow && row.length > 10) {
      headerRowIndex = i;
      console.log(`Found header row at index ${i} with ${row.length} columns`);
      break;
    }
  }
  
  const headers = cleanedRows[headerRowIndex] || [];
  const dataRows = cleanedRows.slice(headerRowIndex + 1);
  
  // Ensure all rows have the same number of columns as headers
  const normalizedRows = dataRows.map(row => {
    const normalizedRow = [...row];
    while (normalizedRow.length < headers.length) {
      normalizedRow.push('');
    }
    return normalizedRow.slice(0, headers.length);
  });
  
  console.log(`Final parsing: ${headers.length} headers, ${normalizedRows.length} data rows`);
  console.log(`Sample headers: ${headers.slice(0, 6).join(', ')}`);
  
  return {
    headers,
    rows: normalizedRows
  };
}