/**
 * Label Printing Service
 * Generates printable labels in standard formats with multiple labels per page
 */

import { Item } from "@shared/schema";

export interface LabelData {
  sku: string;
  name: string;
  quantity?: number;
  price?: string;
  weight?: number;
  category?: string;
  vendor?: string;
  barcode?: string;
  qrCode?: string;
  unitNumber?: number; // For numbered SKUs (1, 2, 3, etc.)
}

export interface LabelFormat {
  name: string;
  width: number;    // in inches
  height: number;   // in inches
  columns: number;  // labels per row
  rows: number;     // labels per column
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  labelSpacing: number;
}

// Standard label formats
export const LABEL_FORMATS: Record<string, LabelFormat> = {
  // Avery 5160 - Address labels
  'avery-5160': {
    name: 'Avery 5160 (30 labels)',
    width: 2.625,
    height: 1,
    columns: 3,
    rows: 10,
    marginTop: 0.5,
    marginLeft: 0.1875,
    marginRight: 0.1875,
    marginBottom: 0.5,
    labelSpacing: 0.125
  },
  // Avery 5261 - Address labels
  'avery-5261': {
    name: 'Avery 5261 (20 labels)',
    width: 4,
    height: 1,
    columns: 2,
    rows: 10,
    marginTop: 0.5,
    marginLeft: 0.1875,
    marginRight: 0.1875,
    marginBottom: 0.5,
    labelSpacing: 0.125
  },
  // Avery 5162 - Address labels
  'avery-5162': {
    name: 'Avery 5162 (14 labels)',
    width: 4,
    height: 1.33,
    columns: 2,
    rows: 7,
    marginTop: 0.83,
    marginLeft: 0.1875,
    marginRight: 0.1875,
    marginBottom: 0.5,
    labelSpacing: 0
  },
  // Avery 22805 - Square labels
  'avery-22805': {
    name: 'Avery 22805 (12 labels)',
    width: 2,
    height: 2,
    columns: 3,
    rows: 4,
    marginTop: 0.75,
    marginLeft: 0.75,
    marginRight: 0.75,
    marginBottom: 0.75,
    labelSpacing: 0.25
  },
  // Custom cannabis product labels
  'cannabis-2x1': {
    name: 'Cannabis Product (2x1 inch)',
    width: 2,
    height: 1,
    columns: 4,
    rows: 10,
    marginTop: 0.25,
    marginLeft: 0.25,
    marginRight: 0.25,
    marginBottom: 0.25,
    labelSpacing: 0.1
  },
  // DYMO LabelWriter formats
  'dymo-address': {
    name: 'DYMO Address (2.125 x 0.875)',
    width: 2.125,
    height: 0.875,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    labelSpacing: 0
  },
  'dymo-shipping': {
    name: 'DYMO Shipping (2.5 x 1.125)',
    width: 2.5,
    height: 1.125,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    labelSpacing: 0
  },
  'dymo-large': {
    name: 'DYMO Large (2.5 x 1.25)',
    width: 2.5,
    height: 1.25,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    labelSpacing: 0
  },
  'dymo-badge': {
    name: 'DYMO Badge (2.25 x 4)',
    width: 2.25,
    height: 4,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    labelSpacing: 0
  }
};

/**
 * Generate HTML for multiple labels on a single page
 */
export function generateMultiLabelPage(
  labelData: LabelData[],
  format: LabelFormat = LABEL_FORMATS['avery-5160']
): string {
  const totalLabelsPerPage = format.columns * format.rows;
  
  // Split into pages if we have more labels than fit on one page
  const pages: LabelData[][] = [];
  for (let i = 0; i < labelData.length; i += totalLabelsPerPage) {
    pages.push(labelData.slice(i, i + totalLabelsPerPage));
  }

  const pagesHtml = pages.map(pageLabels => 
    generateSinglePage(pageLabels, format)
  ).join('<div style="page-break-after: always;"></div>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Product Labels - ${format.name}</title>
      <style>
        @page {
          size: 8.5in 11in;
          margin: ${format.marginTop}in ${format.marginRight}in ${format.marginBottom}in ${format.marginLeft}in;
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          font-size: 8pt;
        }
        
        .page {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(${format.columns}, 1fr);
          grid-template-rows: repeat(${format.rows}, 1fr);
          gap: ${format.labelSpacing}in;
        }
        
        .label {
          width: ${format.width}in;
          height: ${format.height}in;
          border: 1px solid #ddd;
          padding: 2px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          break-inside: avoid;
        }
        
        .label-header {
          font-weight: bold;
          font-size: 7pt;
          text-align: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 1px;
          margin-bottom: 2px;
        }
        
        .label-sku {
          font-family: 'Courier New', monospace;
          font-size: 6pt;
          font-weight: bold;
          text-align: center;
          background: #f0f0f0;
          padding: 1px;
          margin: 1px 0;
        }
        
        .label-name {
          font-size: 6pt;
          text-align: center;
          line-height: 1.1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .label-details {
          font-size: 5pt;
          text-align: center;
          color: #666;
        }
        
        .label-barcode {
          text-align: center;
          margin: 1px 0;
        }
        
        .barcode-image {
          max-width: 100%;
          height: 12px;
          object-fit: contain;
        }
        
        .unit-number {
          background: #007acc;
          color: white;
          font-weight: bold;
          font-size: 8pt;
          padding: 1px 3px;
          border-radius: 2px;
          display: inline-block;
          margin-bottom: 2px;
        }
        
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .label { border: 1px solid #000; }
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;
}

/**
 * Generate HTML for a single page of labels
 */
function generateSinglePage(labels: LabelData[], format: LabelFormat): string {
  const totalSlots = format.columns * format.rows;
  
  // Pad with empty labels if needed
  const paddedLabels = [...labels];
  while (paddedLabels.length < totalSlots) {
    paddedLabels.push({
      sku: '',
      name: '',
      quantity: 0
    });
  }

  const labelElements = paddedLabels.map(label => 
    label.sku ? generateSingleLabel(label) : '<div class="label"></div>'
  ).join('');

  return `
    <div class="page">
      ${labelElements}
    </div>
  `;
}

/**
 * Generate HTML for a single label
 */
function generateSingleLabel(label: LabelData): string {
  const unitDisplay = label.unitNumber ? `<div class="unit-number">#${label.unitNumber}</div>` : '';
  const priceDisplay = label.price ? `$${label.price}` : '';
  const weightDisplay = label.weight ? `${label.weight}g` : '';
  const categoryDisplay = label.category || '';
  
  // Generate barcode URL (using free barcode service)
  const cleanSku = label.sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const barcodeUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(cleanSku)}`;
  
  const detailsLine = [priceDisplay, weightDisplay, categoryDisplay]
    .filter(Boolean)
    .join(' • ');

  return `
    <div class="label">
      <div class="label-header">${label.vendor || 'Product'}</div>
      ${unitDisplay}
      <div class="label-sku">${label.sku}</div>
      <div class="label-name">${label.name}</div>
      ${detailsLine ? `<div class="label-details">${detailsLine}</div>` : ''}
      <div class="label-barcode">
        <img src="${barcodeUrl}" alt="${label.sku}" class="barcode-image" />
      </div>
    </div>
  `;
}

/**
 * Generate labels for numbered SKUs
 * Creates individual labels for each unit (SKU-1, SKU-2, SKU-3, etc.)
 */
export function generateNumberedLabels(
  item: Item,
  quantity: number,
  format: string = 'avery-5160'
): string {
  const baseSku = item.sku || '';
  const baseSkuWithoutNumber = baseSku.replace(/-\d+$/, '');
  
  const labelData: LabelData[] = [];
  
  for (let i = 1; i <= quantity; i++) {
    const numberedSku = `${baseSkuWithoutNumber}-${i}`;
    
    labelData.push({
      sku: numberedSku,
      name: item.name,
      price: item.basePrice || undefined,
      weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight || undefined,
      category: item.category || undefined,
      vendor: item.brand || undefined,
      unitNumber: i,
      quantity: 1
    });
  }
  
  const labelFormat = LABEL_FORMATS[format] || LABEL_FORMATS['avery-5160'];
  return generateMultiLabelPage(labelData, labelFormat);
}

/**
 * Generate bulk labels from a list of items
 */
export function generateBulkLabels(
  items: Item[],
  format: string = 'avery-5160',
  includeQuantities: boolean = false
): string {
  const labelData: LabelData[] = [];
  
  items.forEach(item => {
    const quantity = includeQuantities ? Math.max(item.quantity || 1, 1) : 1;
    
    if (includeQuantities && quantity > 1) {
      // Generate numbered labels for each unit
      const baseSku = item.sku || '';
      const baseSkuWithoutNumber = baseSku.replace(/-\d+$/, '');
      
      for (let i = 1; i <= quantity; i++) {
        labelData.push({
          sku: `${baseSkuWithoutNumber}-${i}`,
          name: item.name,
          price: item.basePrice || undefined,
          weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight || undefined,
          category: item.category || undefined,
          vendor: item.brand || undefined,
          unitNumber: i,
          quantity: 1
        });
      }
    } else {
      // Single label per item (master record)
      labelData.push({
        sku: item.sku || '',
        name: item.name,
        price: item.basePrice || undefined,
        weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight || undefined,
        category: item.category || undefined,
        vendor: item.brand || undefined,
        quantity: item.quantity || 1,
        unitNumber: 0 // Master record
      });
    }
  });
  
  const labelFormat = LABEL_FORMATS[format] || LABEL_FORMATS['avery-5160'];
  return generateMultiLabelPage(labelData, labelFormat);
}