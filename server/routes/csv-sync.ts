import { Router } from 'express';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';

const router = Router();

interface ShopifyVariant {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  sku?: string;
}

interface InventoryImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

// Import flower variants from uploaded CSV
router.post('/import-flower-variants', async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Automated_Gold_Standard_online_catalog  - All_Flower_Variants_1750461034790.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found' });
    }

    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const records = await new Promise<any[]>((resolve, reject) => {
      parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        if (!record.Product_Title || !record.Variant_Title) {
          skipped++;
          continue;
        }

        const name = cleanProductName(record.Product_Title);
        const category = extractCategory(record.Product_Title);
        const weight = parseWeight(record.Variant_Title);
        const shopifyId = record.Product_ID?.replace('gid://shopify/Product/', '');
        
        // Check if item already exists by name or shopifyId
        const storage = req.app.get('storage');
        const existingItems = await storage.getItems();
        const exists = existingItems.find(item => 
          item.name === name || 
          item.shopifyId === shopifyId ||
          (item.name?.includes(name.split('-')[0]) && item.weight === weight)
        );

        if (exists) {
          skipped++;
          continue;
        }

        const newItem = {
          name,
          sku: record.SKU || generateSKU(record.Product_Title, record.Variant_Title),
          category,
          brand: 'Gold Standard',
          status: 'draft',
          weight,
          quantity: 0, // Start with 0, will be updated by inventory sync
          base_price: calculateBasePrice(category, weight),
          shopifyId,
          description: `${record.Product_Title} - ${record.Variant_Title}`,
          imageUrl: '',
          strainBannerText: '',
          thcaPercentage: extractTHCAPercentage(record.Product_Title)
        };

        await storage.createItem(newItem);
        imported++;

      } catch (error) {
        errors.push(`Error processing ${record.Product_Title}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      total: records.length,
      errors
    });

  } catch (error) {
    console.error('Error importing flower variants:', error);
    res.status(500).json({ error: 'Failed to import flower variants' });
  }
});

// Import THCa variants
router.post('/import-thca-variants', async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Automated_Gold_Standard_online_catalog  - THCa_Variants_1750461034790.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'THCa CSV file not found' });
    }

    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const records = await new Promise<any[]>((resolve, reject) => {
      parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        if (!record.Product_Title || !record.Variant_Title) {
          skipped++;
          continue;
        }

        const name = cleanProductName(record.Product_Title);
        const category = extractCategory(record.Product_Title);
        const weight = parseWeight(record.Variant_Title);
        const shopifyId = record.Product_ID?.replace('gid://shopify/Product/', '');
        
        const storage = req.app.get('storage');
        const existingItems = await storage.getItems();
        const exists = existingItems.find(item => 
          item.name === name || 
          item.shopifyId === shopifyId ||
          (item.name?.includes(name.split('-')[0]) && item.weight === weight)
        );

        if (exists) {
          skipped++;
          continue;
        }

        const newItem = {
          name,
          sku: record.SKU || generateSKU(record.Product_Title, record.Variant_Title),
          category,
          brand: 'Gold Standard',
          status: 'draft',
          weight,
          quantity: 0,
          base_price: calculateBasePrice(category, weight),
          shopifyId,
          description: `${record.Product_Title} - ${record.Variant_Title}`,
          imageUrl: '',
          strainBannerText: '',
          thcaPercentage: extractTHCAPercentage(record.Product_Title)
        };

        await storage.createItem(newItem);
        imported++;

      } catch (error) {
        errors.push(`Error processing ${record.Product_Title}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      total: records.length,
      errors
    });

  } catch (error) {
    console.error('Error importing THCa variants:', error);
    res.status(500).json({ error: 'Failed to import THCa variants' });
  }
});

// Import preroll variants
router.post('/import-preroll-variants', async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Automated_Gold_Standard_online_catalog  - THCa Preroll_Variants_1750461034790.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Preroll CSV file not found' });
    }

    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const records = await new Promise<any[]>((resolve, reject) => {
      parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        if (!record.Product_Title || !record.Variant_Title) {
          skipped++;
          continue;
        }

        const name = cleanProductName(record.Product_Title);
        const shopifyId = record.Product_ID?.replace('gid://shopify/Product/', '');
        
        const storage = req.app.get('storage');
        const existingItems = await storage.getItems();
        const exists = existingItems.find(item => 
          item.name === name || 
          item.shopifyId === shopifyId
        );

        if (exists) {
          skipped++;
          continue;
        }

        const newItem = {
          name,
          sku: record.SKU || generateSKU(record.Product_Title, record.Variant_Title),
          category: 'Prerolls',
          brand: 'Gold Standard',
          status: 'draft',
          weight: '1.5g',
          quantity: 0,
          base_price: calculatePrerollPrice(record.Variant_Title),
          shopifyId,
          description: `${record.Product_Title} - ${record.Variant_Title}`,
          imageUrl: '',
          strainBannerText: '',
          thcaPercentage: extractTHCAPercentage(record.Product_Title)
        };

        await storage.createItem(newItem);
        imported++;

      } catch (error) {
        errors.push(`Error processing ${record.Product_Title}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      total: records.length,
      errors
    });

  } catch (error) {
    console.error('Error importing preroll variants:', error);
    res.status(500).json({ error: 'Failed to import preroll variants' });
  }
});

// Utility functions
function cleanProductName(productTitle: string): string {
  return productTitle
    .replace(/- THCA.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function extractCategory(productTitle: string): string {
  const title = productTitle.toUpperCase();
  
  if (title.includes('EXOTIC INDOOR')) return 'Exotic Indoor';
  if (title.includes('AAA INDOOR')) return 'AAA Indoor';
  if (title.includes('AA INDOOR')) return 'AA Indoor';
  if (title.includes('TOP SHELF')) return 'Top Shelf';
  if (title.includes('CLASSIC RESERVE')) return 'Classic Reserve';
  if (title.includes('SMALLS')) return 'Top Shelf - Smalls';
  if (title.includes('PREROLL')) return 'Prerolls';
  
  return 'Bulk Flower';
}

function parseWeight(variantTitle: string): string {
  const title = variantTitle.toLowerCase();
  
  if (title.includes('pound') || title.includes('lb')) {
    if (title.includes('1/4') || title.includes('quarter')) return '1/4 pound';
    if (title.includes('1/2') || title.includes('half')) return '1/2 pound';
    return '1 pound';
  }
  
  if (title.includes('28 gram') || title.includes('ounce') || title.includes('oz')) return '1 ounce';
  if (title.includes('14 gram') || title.includes('half ounce')) return '1/2 ounce';
  if (title.includes('7 gram') || title.includes('quarter')) return '1/4 ounce';
  if (title.includes('3.5 gram') || title.includes('eighth')) return '1/8 ounce';
  if (title.includes('1 gram')) return '1 gram';
  if (title.includes('1.5g')) return '1.5 gram';
  
  return variantTitle;
}

function calculateBasePrice(category: string, weight: string): number {
  const categoryMultipliers = {
    'Exotic Indoor': 1450,
    'AAA Indoor': 1250,
    'AA Indoor': 950,
    'Top Shelf': 850,
    'Classic Reserve': 550,
    'Top Shelf - Smalls': 575
  };

  const weightMultipliers = {
    '1 pound': 1.0,
    '1/2 pound': 0.5,
    '1/4 pound': 0.25,
    '1 ounce': 0.0625,
    '1/2 ounce': 0.03125,
    '1/4 ounce': 0.015625,
    '1/8 ounce': 0.0078125,
    '1 gram': 0.00220462
  };

  const basePrice = categoryMultipliers[category] || 650;
  const weightMultiplier = weightMultipliers[weight] || 1.0;
  
  return Math.round(basePrice * weightMultiplier);
}

function calculatePrerollPrice(variantTitle: string): number {
  const title = variantTitle.toLowerCase();
  
  if (title.includes('5000')) return 5000;
  if (title.includes('1000')) return 2500;
  if (title.includes('100')) return 350;
  if (title.includes('50')) return 200;
  
  return 100;
}

function extractTHCAPercentage(productTitle: string): string {
  const match = productTitle.match(/(\d+(?:\.\d+)?)\s*%?\s*thca/i);
  return match ? `${match[1]}%` : '';
}

function generateSKU(productTitle: string, variantTitle: string): string {
  const productSlug = productTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(' ')
    .slice(0, 3)
    .join('')
    .toUpperCase()
    .substring(0, 8);
  
  const variantSlug = variantTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(' ')
    .slice(0, 2)
    .join('')
    .toUpperCase()
    .substring(0, 6);
  
  return `${productSlug}-${variantSlug}-${Date.now().toString().slice(-4)}`;
}

export default router;