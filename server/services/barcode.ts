import QRCode from 'qrcode';
import { Item } from '@shared/schema';

/**
 * Generate a SKU (Stock Keeping Unit) based on item details
 * Format: CAT-COND-RANDOM where:
 * - CAT: First 3 letters of category
 * - COND: First letter of condition
 * - RANDOM: Random 6-digit number
 */
export function generateSKU(item: Partial<Item>): string {
  const category = (item.category || 'MISC').substring(0, 3).toUpperCase();
  const condition = (item.condition || 'N').substring(0, 1).toUpperCase();
  const randomPart = Math.floor(100000 + Math.random() * 900000); // 6-digit number
  
  return `${category}-${condition}-${randomPart}`;
}

/**
 * Generate barcode data in Code128 format
 * Returns the value to be encoded (the SKU)
 */
export function generateBarcodeData(sku: string): string {
  return sku;
}

/**
 * Generate QR code data URL
 * Contains JSON with item details
 */
export async function generateQRCodeDataURL(item: Item): Promise<string> {
  // Create a simplified version of the item data for the QR code
  const qrData = {
    id: item.id,
    sku: item.sku,
    name: item.name,
    price: item.price,
    category: item.category,
    quantity: item.quantity
  };
  
  try {
    // Generate QR code as data URL
    const dataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
    
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer
 */
export async function generateQRCodeBuffer(item: Item): Promise<Buffer> {
  const qrData = {
    id: item.id,
    sku: item.sku,
    name: item.name,
    price: item.price,
    category: item.category,
    quantity: item.quantity
  };
  
  try {
    // Generate QR code as buffer
    const buffer = await QRCode.toBuffer(JSON.stringify(qrData), {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
    
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}