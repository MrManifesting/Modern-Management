const fs = require('fs');

// Simple test of CSV parsing logic
function testCSVParser() {
  console.log('Testing CSV parser with problematic Shopify file...');
  
  try {
    const csvContent = fs.readFileSync('test-shopify-upload.csv', 'utf8');
    console.log(`CSV file loaded: ${csvContent.length} characters`);
    
    // Simple state machine parser similar to the robust one
    function parseCSV(content) {
      const rows = [];
      let currentRow = [];
      let currentField = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < content.length) {
        const char = content[i];
        const nextChar = i + 1 < content.length ? content[i + 1] : null;
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i += 2;
            continue;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\n' && !inQuotes) {
          currentRow.push(currentField);
          if (currentRow.length > 0) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        } else if (char !== '\r') {
          currentField += char;
        }
        
        i++;
      }
      
      // Handle final field and row
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
      }
      
      return rows;
    }
    
    const rows = parseCSV(csvContent);
    console.log(`Parsed ${rows.length} rows`);
    
    if (rows.length > 0) {
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      console.log(`Headers: ${headers.length}`);
      console.log(`Data rows: ${dataRows.length}`);
      console.log('Sample headers:', headers.slice(0, 5));
      
      // Check first few data rows for consistency
      for (let i = 0; i < Math.min(3, dataRows.length); i++) {
        const row = dataRows[i];
        console.log(`Row ${i + 1}: ${row.length} fields (expected ${headers.length})`);
        if (row.length !== headers.length) {
          console.log(`  MISMATCH: Row has ${row.length} fields, expected ${headers.length}`);
        }
      }
      
      // Check for problematic fields
      const problemRows = dataRows.filter(row => row.length !== headers.length);
      console.log(`Problem rows: ${problemRows.length} out of ${dataRows.length}`);
      
      if (problemRows.length > 0) {
        console.log('First problem row lengths:', problemRows.slice(0, 3).map(r => r.length));
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testCSVParser();