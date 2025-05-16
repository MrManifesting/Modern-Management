/**
 * Barcode Generator Service
 * 
 * This service provides functions for generating barcodes and QR codes
 */

import { Item } from "@shared/schema";
import QRCode from "qrcode";

/**
 * Generate barcode data for an inventory item
 * @param sku The SKU to encode in the barcode
 * @returns A string representation of the barcode data
 */
export function generateBarcodeData(sku: string): string {
  // For simplicity, we'll just use the SKU directly
  // In a real system, we might use a more sophisticated encoding
  return sku;
}

/**
 * Generate a QR code data URL for an item
 * @param item The item to generate a QR code for
 * @returns A data URL containing the QR code image
 */
export async function generateQRCodeDataURL(item: Item): Promise<string> {
  try {
    // Create a data object with essential item information
    const qrData = {
      id: item.id,
      name: item.name,
      sku: item.sku || '',
      price: item.basePrice || 0,
      category: item.category || '',
      createdAt: new Date().toISOString()
    };
    
    // Convert the data to JSON string
    const qrContent = JSON.stringify(qrData);
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw error;
  }
}

/**
 * Generate a color-coded barcode based on item categories
 * @param item The item to generate a color-coded barcode for
 * @returns A data object with barcode information and colors
 */
export function generateColoredBarcode(item: Item): {
  barcode: string;
  primaryColor: string;
  secondaryColor: string;
} {
  // Generate base barcode from SKU
  const barcode = generateBarcodeData(item.sku || '');
  
  // Default colors
  let primaryColor = '#00A3E0';   // Default blue
  let secondaryColor = '#FFFFFF'; // Default white
  
  // Map category to primary color
  if (item.category) {
    const category = item.category.toLowerCase();
    
    if (category.includes('flower')) {
      primaryColor = '#4CAF50'; // Green for flower
    } else if (category.includes('concentrate')) {
      primaryColor = '#FFC107'; // Amber for concentrates
    } else if (category.includes('edible')) {
      primaryColor = '#FF5722'; // Deep orange for edibles
    } else if (category.includes('topical')) {
      primaryColor = '#9C27B0'; // Purple for topicals
    } else if (category.includes('accessory')) {
      primaryColor = '#607D8B'; // Blue grey for accessories
    } else if (category.includes('bulk')) {
      primaryColor = '#795548'; // Brown for bulk items
    }
  }
  
  // Map quality tier to secondary color
  if (item.tier) {
    const tier = item.tier.toLowerCase();
    
    if (tier.includes('exotic') || tier.includes('premium')) {
      secondaryColor = '#FFD700'; // Gold for exotic/premium
    } else if (tier.includes('top shelf')) {
      secondaryColor = '#C0C0C0'; // Silver for top shelf
    } else if (tier.includes('smalls')) {
      secondaryColor = '#CD7F32'; // Bronze for smalls
    }
  }
  
  return { barcode, primaryColor, secondaryColor };
}