/**
 * QR Code generation service
 */
import QRCode from 'qrcode';
import { Item } from '@shared/schema';

/**
 * Generate a QR code as a data URL for an item
 */
export async function generateQRCodeDataURL(item: Item): Promise<string> {
  try {
    // Generate URL with product details
    const url = `${process.env.PUBLIC_URL || ''}/items/${item.id}`;
    
    // Generate QR code as data URL
    const dataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

/**
 * Generate a QR code for a specific URL
 */
export async function generateQRCodeForURL(url: string): Promise<string> {
  try {
    // Generate QR code as data URL
    const dataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

/**
 * Generate a QR code as an SVG string for an item
 */
export async function generateQRCodeSVG(item: Item): Promise<string> {
  try {
    // Generate URL with product details
    const url = `${process.env.PUBLIC_URL || ''}/items/${item.id}`;
    
    // Generate QR code as SVG string
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    return svg;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    return '';
  }
}