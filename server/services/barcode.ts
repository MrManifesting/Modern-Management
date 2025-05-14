/**
 * Barcode generation service
 */
import * as bwipjs from 'bwip-js';
import { Item } from '@shared/schema';
import { getItemColorCodes, getCategoryColor } from './color-code';

/**
 * Generate a barcode as a data URL
 */
export function generateBarcodeData(text: string): string {
  try {
    // For server-side environments, return a placeholder barcode URL
    // This is a workaround as we can't directly generate image data in the test environment
    // In a real production environment, you would use bwip-js to generate the actual barcode
    
    // If we're in a real environment, generate an actual barcode
    if (process.env.NODE_ENV === 'production') {
      // Try to generate a barcode using bwip-js
      try {
        const png = bwipjs.toBuffer({
          bcid: 'code128',       // Barcode type
          text: text,            // Text to encode
          scale: 3,              // 3x scaling factor
          height: 10,            // Bar height, in millimeters
          includetext: true,     // Show human-readable text
          textxalign: 'center',  // Always good to set this
        });
        
        // Convert to base64 data URL
        return `data:image/png;base64,${png.toString('base64')}`;
      } catch (e) {
        console.error('BWIP-JS error:', e);
        // Fall back to placeholder if BWIP-JS fails
        return generatePlaceholderBarcode(text);
      }
    } else {
      // In development or test environment, use a placeholder
      return generatePlaceholderBarcode(text);
    }
  } catch (error) {
    console.error('Error generating barcode:', error);
    return generatePlaceholderBarcode(text);
  }
}

/**
 * Generate a simple placeholder SVG barcode
 * @param text The text to encode in the barcode
 * @param primaryColor Optional primary color (category color)
 * @param secondaryColor Optional secondary color (subcategory color)
 */
function generatePlaceholderBarcode(text: string, primaryColor: string = '#000000', secondaryColor: string = '#757575'): string {
  // Create a very basic SVG that just displays the text with color-coding
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="100">
      <!-- Color-coded border frame -->
      <rect width="220" height="100" fill="white" stroke-width="0"/>
      
      <!-- Left and right colored bars -->
      <rect x="0" y="0" width="10" height="100" fill="${primaryColor}" />
      <rect x="210" y="0" width="10" height="100" fill="${secondaryColor}" />
      
      <!-- Light background gradient -->
      <rect x="10" y="0" width="200" height="100" fill="white" stroke="black" stroke-width="1" 
            style="fill: linear-gradient(90deg, ${primaryColor}10 0%, white 50%, ${secondaryColor}10 100%)" />
      
      <!-- Text content -->
      <text x="15" y="20" font-family="Arial" font-size="12" font-weight="bold" fill="${primaryColor}">Barcode</text>
      <text x="15" y="40" font-family="monospace" font-size="12" fill="#000000">${text}</text>
      
      <!-- Barcode lines -->
      <g>
        ${generateSimpleBarcodeLines(text)}
      </g>
      
      <!-- Color legend -->
      <circle cx="190" cy="15" r="8" fill="${primaryColor}" />
      <circle cx="205" cy="15" r="8" fill="${secondaryColor}" />
    </svg>
  `;
  
  const encoded = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Generate a simple visual representation of barcode lines
 */
function generateSimpleBarcodeLines(text: string): string {
  let lines = '';
  let x = 10;
  
  // Generate some vertical lines based on the text characters
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const width = (charCode % 3) + 1; // Vary width between 1-3px
    const height = 30;
    const gap = 2;
    
    lines += `<rect x="${x}" y="45" width="${width}" height="${height}" fill="black"/>`;
    x += width + gap;
  }
  
  return lines;
}

/**
 * Generate a barcode as an SVG string
 */
export function generateBarcodeSVG(text: string): string {
  try {
    // Extract the SVG content from the data URL
    const dataUrl = generateBarcodeData(text);
    if (dataUrl.startsWith('data:image/svg+xml;base64,')) {
      const base64 = dataUrl.replace('data:image/svg+xml;base64,', '');
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
    
    // If it's not an SVG data URL, generate a placeholder SVG
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="80">
        <rect width="200" height="80" fill="white" stroke="black" stroke-width="1"/>
        <text x="10" y="20" font-family="Arial" font-size="12">Barcode Placeholder</text>
        <text x="10" y="40" font-family="monospace" font-size="12">${text}</text>
      </svg>
    `;
  } catch (error) {
    console.error('Error generating barcode SVG:', error);
    return '';
  }
}

/**
 * Generate a barcode for an item
 */
export function generateBarcodeForItem(item: Item): string {
  if (!item.sku) {
    return '';
  }
  
  // Get the color codes based on item category
  const { primaryColor, secondaryColor } = getItemColorCodes(item);
  
  // If using placeholder barcodes, pass along color information
  if (process.env.NODE_ENV !== 'production') {
    return generatePlaceholderBarcode(item.sku, primaryColor, secondaryColor);
  }
  
  // In production, use standard barcode generator (currently doesn't support color coding)
  return generateBarcodeData(item.sku);
}

/**
 * Generate a color-coded barcode SVG for an item
 */
export function generateColorCodedBarcodeSVG(item: Item): string {
  if (!item.sku) {
    return '';
  }
  
  // Get the color codes based on item category
  const { primaryColor, secondaryColor } = getItemColorCodes(item);
  
  // Extract the barcode SVG
  let barcodeSvg = generateBarcodeSVG(item.sku);
  
  // Add color coding to the SVG
  const coloredBarcodeSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="120">
      <!-- Color-coded border frame -->
      <rect width="220" height="120" fill="white" stroke-width="0"/>
      
      <!-- Left and right colored bars -->
      <rect x="0" y="0" width="10" height="120" fill="${primaryColor}" />
      <rect x="210" y="0" width="10" height="120" fill="${secondaryColor}" />
      
      <!-- Light background gradient -->
      <rect x="10" y="0" width="200" height="120" fill="white" stroke="black" stroke-width="1" 
            style="fill: linear-gradient(90deg, ${primaryColor}10 0%, white 50%, ${secondaryColor}10 100%)" />
      
      <!-- Title with category -->
      <text x="15" y="20" font-family="Arial" font-size="12" font-weight="bold" fill="${primaryColor}">
        ${item.category || 'Item'} - ${item.subcategory || ''}
      </text>
      
      <!-- Embedded barcode - using a foreignObject to embed the barcode SVG -->
      <foreignObject x="10" y="30" width="200" height="60">
        ${barcodeSvg}
      </foreignObject>
      
      <!-- SKU Text -->
      <text x="110" y="110" font-family="monospace" font-size="12" fill="#000000" text-anchor="middle">
        ${item.sku}
      </text>
      
      <!-- Color legend -->
      <circle cx="190" cy="15" r="8" fill="${primaryColor}" />
      <circle cx="205" cy="15" r="8" fill="${secondaryColor}" />
    </svg>
  `;
  
  return coloredBarcodeSvg;
}

/**
 * Generate a QR code data URL for various data objects
 */
export async function generateQRCodeDataURL(data: { id: string | number, name: string, customUrl?: string } | any): Promise<string> {
  try {
    // Dynamically import QRCode library
    const QRCode = await import('qrcode');
    
    // Format the data - either use custom URL or create encoded data
    const qrData = data.customUrl || JSON.stringify({
      id: data.id,
      name: data.name,
      generatedAt: new Date().toISOString()
    });
    
    // Generate QR code as data URL
    return await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}