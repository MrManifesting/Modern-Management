import { InsertItem, Item } from "../../shared/schema";
import { generateBarcodeData, generateSKU, generateQRCodeDataURL } from "./barcode";
import { storage } from "../storage";

export interface CannabisProduct {
  strain: string;
  amount: number;
  percentage: number;
  tier: string;
  bulk: number;
  distro: number;
  master: number;
  master2: number;
  coa: string;
  media: string;
  strainType: string;
  sku: string;
}

/**
 * Parses a price from a string, removing $ and commas
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  return parseFloat(priceStr.replace(/[$,]/g, '')) || 0;
}

/**
 * Parses a percentage from a string (e.g. "27.97%")
 */
export function parsePercentage(percentStr: string): number {
  if (!percentStr) return 0;
  return parseFloat(percentStr.replace(/%/g, '')) || 0;
}

/**
 * Creates a cannabis product from CSV row data
 */
export function createCannabisProductFromRow(row: string[]): CannabisProduct | null {
  // Ensure we have minimum required fields
  if (row.length < 10 || !row[0] || row[0] === 'Strain') return null;
  
  try {
    return {
      strain: row[0]?.trim() || '',
      amount: parseInt(row[1]?.trim() || '0'),
      percentage: parsePercentage(row[2]?.trim() || '0%'),
      tier: row[3]?.trim() || 'UNKNOWN',
      bulk: parsePrice(row[4]?.trim() || '$0'),
      distro: parsePrice(row[5]?.trim() || '$0'),
      master: parsePrice(row[6]?.trim() || '$0'),
      master2: parsePrice(row[7]?.trim() || '$0'),
      coa: row[8]?.trim() || '',
      media: row[9]?.trim() || '',
      strainType: row[10]?.trim() || 'UNKNOWN',
      sku: row[11]?.trim() || ''
    };
  } catch (error) {
    console.error('Error creating cannabis product from row:', error);
    return null;
  }
}

/**
 * Converts a cannabis product to an inventory item
 */
export function cannabisProductToInventoryItem(product: CannabisProduct): InsertItem {
  // Build a rich description based on product data
  const description = `
${product.strain} - ${product.strainType}
THC: ${product.percentage}%
Tier: ${product.tier}

Price Tiers:
- Bulk: $${product.bulk.toFixed(2)}
- Distributor (25lbs+): $${product.distro.toFixed(2)}
- Master (50lbs+): $${product.master.toFixed(2)}
- Master 2 (100lbs+): $${product.master2.toFixed(2)}

SKU: ${product.sku}
  `.trim();

  // Create tags based on properties
  const tags = [
    'cannabis',
    product.strainType.toLowerCase().replace(/\s+/g, '-'),
    `tier-${product.tier.toLowerCase().replace(/\s+/g, '-')}`
  ];

  // Add percentage range tag
  if (product.percentage >= 30) {
    tags.push('high-thc');
  } else if (product.percentage >= 25) {
    tags.push('medium-thc');
  } else {
    tags.push('moderate-thc');
  }

  // Extract product SKU or generate if not provided
  const sku = product.sku || `CBD-${product.strain.substring(0, 3).toUpperCase()}-${Math.floor(product.percentage * 100).toString().padStart(4, '0')}`;

  return {
    name: product.strain,
    description,
    price: product.bulk,
    quantity: product.amount,
    status: product.amount > 0 ? 'in_stock' : 'out_of_stock',
    category: 'cannabis',
    condition: 'new',
    sku,
    barcode: generateBarcodeData(sku),
    lowStockThreshold: 5,
    reorderPoint: 2,
    tags,
    images: [],
    marketplace: [],
    aiEnhanced: false,
    aiTags: []
  };
}

/**
 * Processes a cannabis inventory spreadsheet and imports items
 */
export async function processCannabisImport(rows: string[][]): Promise<Item[]> {
  const importedItems: Item[] = [];
  const products: CannabisProduct[] = [];
  
  // Skip header rows and empty rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5 || !row[0] || row[0].trim() === '' || 
        row[0].includes('Strain') || row[0].includes('Contact us') || 
        row[0].includes('Refresh') || row[0].includes('ALL SALES') || 
        row[0].includes('NIcksTestItemDisregard')) {
      continue;
    }
    
    const product = createCannabisProductFromRow(row);
    if (product) {
      products.push(product);
    }
  }
  
  console.log(`Found ${products.length} valid cannabis products`);
  
  // Convert products to inventory items and save them
  for (const product of products) {
    try {
      const itemData = cannabisProductToInventoryItem(product);
      const item = await storage.createItem(itemData);
      
      // Generate QR code
      const qrCodeDataURL = await generateQRCodeDataURL(item);
      const updatedItem = await storage.updateItem(item.id, { qrCode: qrCodeDataURL });
      
      if (updatedItem) {
        importedItems.push(updatedItem);
      }
    } catch (error) {
      console.error(`Error importing cannabis product ${product.strain}:`, error);
    }
  }
  
  return importedItems;
}