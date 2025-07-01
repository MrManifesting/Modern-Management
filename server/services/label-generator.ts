/**
 * Label generation service for creating printable inventory labels
 * Supports various label formats with barcodes, QR codes, and item information
 */

import { generateBarcodeSVG } from './barcode';
import QRCode from 'qrcode';

export interface LabelOptions {
  format: 'standard' | 'compact' | 'detailed' | 'thermal';
  size: 'small' | 'medium' | 'large';
  includeBarcode: boolean;
  includeQRCode: boolean;
  includePrice: boolean;
  includeWeight: boolean;
  includeDate: boolean;
  copies: number;
}

export interface LabelData {
  sku: string;
  name: string;
  quantity: number;
  price?: string;
  weight?: number;
  category?: string;
  vendor?: string;
  barcode?: string;
  qrCode?: string;
}

/**
 * Generate a single label HTML for printing
 */
export async function generateLabelHTML(data: LabelData, options: LabelOptions): Promise<string> {
  const barcodeSVG = options.includeBarcode ? generateBarcodeSVG(data.sku) : '';
  const qrCodeDataURL = options.includeQRCode ? await generateQRCodeForLabel(data.sku) : '';
  
  const labelClass = `label-${options.format}-${options.size}`;
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <div class="${labelClass}">
      <div class="label-header">
        <div class="label-title">${truncateText(data.name, options.size === 'small' ? 20 : 30)}</div>
        <div class="label-sku">SKU: ${data.sku}</div>
      </div>
      
      ${options.includeBarcode ? `
        <div class="label-barcode">
          ${barcodeSVG}
        </div>
      ` : ''}
      
      <div class="label-info">
        <div class="label-quantity">Qty: ${data.quantity}</div>
        ${options.includePrice && data.price ? `<div class="label-price">$${data.price}</div>` : ''}
        ${options.includeWeight && data.weight ? `<div class="label-weight">${data.weight}g</div>` : ''}
        ${data.category ? `<div class="label-category">${data.category}</div>` : ''}
      </div>
      
      ${options.includeQRCode ? `
        <div class="label-qr">
          <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code" />
        </div>
      ` : ''}
      
      ${options.includeDate ? `
        <div class="label-date">${currentDate}</div>
      ` : ''}
      
      ${data.vendor ? `
        <div class="label-vendor">${data.vendor}</div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate multiple labels for batch printing
 */
export async function generateBatchLabels(items: LabelData[], options: LabelOptions): Promise<string> {
  const labelPromises = items.flatMap(item => 
    Array(options.copies).fill(null).map(() => generateLabelHTML(item, options))
  );
  
  const labels = await Promise.all(labelPromises);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Inventory Labels</title>
      <style>
        ${getLabelCSS(options)}
      </style>
    </head>
    <body>
      <div class="labels-container">
        ${labels.join('\n')}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate QR code for label
 */
async function generateQRCodeForLabel(sku: string): Promise<string> {
  try {
    return await QRCode.toDataURL(sku, {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 4,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR code for label:', error);
    return '';
  }
}

/**
 * Get CSS styles for different label formats
 */
function getLabelCSS(options: LabelOptions): string {
  const baseCSS = `
    @page {
      margin: 0;
      size: auto;
    }
    
    body {
      margin: 0;
      padding: 10px;
      font-family: 'Arial', sans-serif;
      background: white;
    }
    
    .labels-container {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    
    .label-header {
      margin-bottom: 8px;
    }
    
    .label-title {
      font-weight: bold;
      font-size: 14px;
      line-height: 1.2;
      margin-bottom: 4px;
    }
    
    .label-sku {
      font-size: 11px;
      color: #666;
      font-family: monospace;
    }
    
    .label-barcode {
      margin: 8px 0;
      text-align: center;
    }
    
    .label-barcode svg {
      max-width: 100%;
      height: auto;
    }
    
    .label-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 6px 0;
      font-size: 12px;
    }
    
    .label-quantity {
      font-weight: bold;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
    }
    
    .label-price {
      font-weight: bold;
      color: #2563eb;
    }
    
    .label-weight {
      color: #7c3aed;
      font-size: 11px;
    }
    
    .label-category {
      background: #10b981;
      color: white;
      padding: 1px 4px;
      border-radius: 2px;
      font-size: 10px;
    }
    
    .label-qr {
      text-align: center;
      margin: 6px 0;
    }
    
    .qr-code {
      width: 40px;
      height: 40px;
    }
    
    .label-date {
      font-size: 10px;
      color: #999;
      text-align: right;
      margin-top: 4px;
    }
    
    .label-vendor {
      font-size: 10px;
      color: #666;
      text-align: center;
      margin-top: 4px;
    }
  `;

  // Size-specific styles
  const sizeStyles = {
    small: `
      [class*="label-"][class*="-small"] {
        width: 2.25in;
        height: 1.25in;
        border: 1px solid #ddd;
        padding: 8px;
        page-break-inside: avoid;
      }
      
      .label-small .label-title { font-size: 12px; }
      .label-small .label-info { font-size: 10px; }
      .label-small .qr-code { width: 30px; height: 30px; }
    `,
    medium: `
      [class*="label-"][class*="-medium"] {
        width: 3in;
        height: 2in;
        border: 1px solid #ddd;
        padding: 12px;
        page-break-inside: avoid;
      }
    `,
    large: `
      [class*="label-"][class*="-large"] {
        width: 4in;
        height: 3in;
        border: 1px solid #ddd;
        padding: 16px;
        page-break-inside: avoid;
      }
      
      .label-large .label-title { font-size: 16px; }
      .label-large .label-info { font-size: 14px; }
      .label-large .qr-code { width: 60px; height: 60px; }
    `
  };

  // Format-specific styles
  const formatStyles = {
    standard: `
      .label-standard {
        background: white;
        border-radius: 4px;
      }
    `,
    compact: `
      .label-compact {
        background: white;
        border-radius: 2px;
      }
      
      .label-compact .label-barcode {
        margin: 4px 0;
      }
      
      .label-compact .label-info {
        margin: 3px 0;
      }
    `,
    detailed: `
      .label-detailed {
        background: #fafafa;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
      }
      
      .label-detailed .label-header {
        background: #f3f4f6;
        margin: -16px -16px 12px -16px;
        padding: 8px 16px;
        border-radius: 4px 4px 0 0;
      }
    `,
    thermal: `
      .label-thermal {
        background: white;
        border: none;
        font-family: 'Courier New', monospace;
      }
      
      .label-thermal * {
        color: black !important;
        background: white !important;
      }
      
      .label-thermal .label-category {
        background: black !important;
        color: white !important;
      }
    `
  };

  return baseCSS + sizeStyles[options.size] + formatStyles[options.format];
}

/**
 * Truncate text to fit label constraints
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validate label options
 */
export function validateLabelOptions(options: Partial<LabelOptions>): LabelOptions {
  return {
    format: options.format || 'standard',
    size: options.size || 'medium',
    includeBarcode: options.includeBarcode !== false,
    includeQRCode: options.includeQRCode || false,
    includePrice: options.includePrice || false,
    includeWeight: options.includeWeight || false,
    includeDate: options.includeDate || false,
    copies: Math.max(1, Math.min(10, options.copies || 1))
  };
}

export default {
  generateLabelHTML,
  generateBatchLabels,
  validateLabelOptions
};