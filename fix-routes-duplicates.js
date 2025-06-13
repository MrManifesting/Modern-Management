import fs from 'fs';

// Read the routes file
const routesFile = 'server/routes.ts';
let content = fs.readFileSync(routesFile, 'utf8');

// Remove duplicate imports by replacing the second occurrence
content = content.replace(/import fs from "fs";\nimport path from "path";.*?import { promisify } from "util";/s, 'import { promisify } from "util";');

// Remove duplicate identifier issues by consolidating imports
const lines = content.split('\n');
const cleanedLines = [];
const seenImports = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip duplicate import lines
  if (line.includes('import fs from "fs"') && seenImports.has('fs')) {
    continue;
  }
  if (line.includes('import path from "path"') && seenImports.has('path')) {
    continue;
  }
  if (line.includes('generateSKU') && seenImports.has('generateSKU')) {
    continue;
  }
  if (line.includes('generateBarcodeData') && seenImports.has('generateBarcodeData')) {
    continue;
  }
  if (line.includes('generateQRCodeDataURL') && seenImports.has('generateQRCodeDataURL')) {
    continue;
  }
  if (line.includes('registerGoogleSheetsRoutes') && seenImports.has('registerGoogleSheetsRoutes')) {
    continue;
  }
  
  // Track what we've seen
  if (line.includes('import fs from "fs"')) seenImports.add('fs');
  if (line.includes('import path from "path"')) seenImports.add('path');
  if (line.includes('generateSKU')) seenImports.add('generateSKU');
  if (line.includes('generateBarcodeData')) seenImports.add('generateBarcodeData');
  if (line.includes('generateQRCodeDataURL')) seenImports.add('generateQRCodeDataURL');
  if (line.includes('registerGoogleSheetsRoutes')) seenImports.add('registerGoogleSheetsRoutes');
  
  cleanedLines.push(line);
}

// Write the cleaned content
fs.writeFileSync(routesFile, cleanedLines.join('\n'));
console.log('Fixed duplicate imports in routes.ts');