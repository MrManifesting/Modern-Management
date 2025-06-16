/**
 * Google Sheets Inventory Sync Service
 * Integrates data from ProductExport and InventoryExport sheets to provide
 * complete inventory information with images, quantities, and pricing
 */

import { google } from 'googleapis';
import { DatabaseStorage } from '../storage';

interface ProductExportData {
  handle: string;
  title: string;
  imageUrl: string; // Column AB
  sku: string;
  price: string;
  compareAtPrice: string;
  vendor: string;
  productType: string;
  tags: string;
}

interface InventoryExportData {
  handle: string;
  weight: string; // Column D
  available: number; // Column P
  onHand: number; // Column Q
  sku: string;
}

interface EnhancedInventoryItem {
  id: number;
  name: string;
  sku: string;
  handle: string;
  imageUrl: string;
  basePrice: string;
  compareAtPrice: string;
  quantity: number;
  available: number;
  onHand: number;
  weight: string;
  vendor: string;
  category: string;
  tags: string;
  status: string;
}

export class SheetsInventorySync {
  private storage: DatabaseStorage;
  private auth: any;
  private spreadsheetId: string;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.spreadsheetId = '1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s';
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Use service account authentication
      const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
    } catch (error) {
      console.error('Failed to initialize Google Sheets auth:', error);
    }
  }

  /**
   * Fetch product export data from the ProductExport sheet
   */
  private async fetchProductExportData(): Promise<ProductExportData[]> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Fetch data from ProductExport sheet including column AB (Image Src)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'ProductExport!A:AB', // Include up to column AB for images
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Find column indices
      const handleIndex = headers.indexOf('Handle');
      const titleIndex = headers.indexOf('Title');
      const imageIndex = 27; // Column AB (0-indexed: A=0, B=1, ..., AB=27)
      const skuIndex = headers.indexOf('Variant SKU');
      const priceIndex = headers.indexOf('Variant Price');
      const compareAtPriceIndex = headers.indexOf('Variant Compare At Price');
      const vendorIndex = headers.indexOf('Vendor');
      const typeIndex = headers.indexOf('Type');
      const tagsIndex = headers.indexOf('Tags');

      console.log(`ProductExport: Found ${dataRows.length} rows with image column at index ${imageIndex}`);

      return dataRows.map(row => ({
        handle: row[handleIndex] || '',
        title: row[titleIndex] || '',
        imageUrl: row[imageIndex] || '', // Column AB
        sku: row[skuIndex] || '',
        price: row[priceIndex] || '0',
        compareAtPrice: row[compareAtPriceIndex] || '0',
        vendor: row[vendorIndex] || '',
        productType: row[typeIndex] || '',
        tags: row[tagsIndex] || ''
      })).filter(item => item.handle && item.title);

    } catch (error) {
      console.error('Error fetching ProductExport data:', error);
      return [];
    }
  }

  /**
   * Fetch inventory export data from the InventoryExport sheet
   */
  private async fetchInventoryExportData(): Promise<InventoryExportData[]> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Fetch data from InventoryExport sheet focusing on columns D, P, Q
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'InventoryExport!A:Q', // Include up to column Q for On Hand
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Find column indices
      const handleIndex = headers.indexOf('Handle');
      const skuIndex = headers.indexOf('SKU');
      const weightIndex = 3; // Column D (0-indexed)
      const availableIndex = 15; // Column P (0-indexed)
      const onHandIndex = 16; // Column Q (0-indexed)

      console.log(`InventoryExport: Found ${dataRows.length} rows with weight at column D, available at P, onHand at Q`);

      return dataRows.map(row => ({
        handle: row[handleIndex] || '',
        sku: row[skuIndex] || '',
        weight: row[weightIndex] || '',
        available: parseInt(row[availableIndex]) || 0,
        onHand: parseInt(row[onHandIndex]) || 0
      })).filter(item => item.handle);

    } catch (error) {
      console.error('Error fetching InventoryExport data:', error);
      return [];
    }
  }

  /**
   * Merge product and inventory data by handle
   */
  private mergeSheetData(productData: ProductExportData[], inventoryData: InventoryExportData[]): any[] {
    const inventoryMap = new Map<string, InventoryExportData>();
    inventoryData.forEach(item => {
      inventoryMap.set(item.handle, item);
    });

    return productData.map(product => {
      const inventory = inventoryMap.get(product.handle);
      
      return {
        handle: product.handle,
        name: product.title,
        sku: product.sku || inventory?.sku || '',
        imageUrl: product.imageUrl,
        basePrice: product.price,
        compareAtPrice: product.compareAtPrice,
        quantity: inventory?.onHand || 0,
        available: inventory?.available || 0,
        onHand: inventory?.onHand || 0,
        weight: inventory?.weight || '',
        vendor: product.vendor,
        category: product.productType,
        tags: product.tags,
        status: 'active'
      };
    });
  }

  /**
   * Sync database items with enhanced data from Google Sheets
   */
  async syncInventoryWithSheets(): Promise<{ updated: number; errors: string[] }> {
    try {
      console.log('Starting inventory sync with Google Sheets...');
      
      // Fetch data from both sheets
      const [productData, inventoryData] = await Promise.all([
        this.fetchProductExportData(),
        this.fetchInventoryExportData()
      ]);

      console.log(`Fetched ${productData.length} products and ${inventoryData.length} inventory records`);

      // Merge the data
      const mergedData = this.mergeSheetData(productData, inventoryData);
      console.log(`Merged data for ${mergedData.length} items`);

      // Get existing items from database
      const existingItems = await this.storage.getItems();
      const existingItemsMap = new Map();
      existingItems.forEach(item => {
        // Map by multiple possible identifiers
        if (item.sku) existingItemsMap.set(`sku:${item.sku}`, item);
        if (item.name) existingItemsMap.set(`name:${item.name.toLowerCase()}`, item);
      });

      let updated = 0;
      const errors: string[] = [];

      // Update existing items with enhanced data
      for (const sheetItem of mergedData) {
        try {
          // Find matching item by SKU or name
          let existingItem = existingItemsMap.get(`sku:${sheetItem.sku}`);
          if (!existingItem) {
            existingItem = existingItemsMap.get(`name:${sheetItem.name.toLowerCase()}`);
          }

          if (existingItem) {
            // Update item with enhanced data
            const updateData: any = {};

            // Update image URL if available
            if (sheetItem.imageUrl && sheetItem.imageUrl.trim()) {
              updateData.imageUrl = sheetItem.imageUrl;
            }

            // Update pricing if available
            if (sheetItem.basePrice && parseFloat(sheetItem.basePrice) > 0) {
              updateData.basePrice = sheetItem.basePrice;
            }
            if (sheetItem.compareAtPrice && parseFloat(sheetItem.compareAtPrice) > 0) {
              updateData.salePrice = sheetItem.compareAtPrice;
            }

            // Update quantities
            if (sheetItem.quantity >= 0) {
              updateData.quantity = sheetItem.quantity;
            }

            // Update weight if available
            if (sheetItem.weight && sheetItem.weight.trim()) {
              updateData.weight = sheetItem.weight;
            }

            // Update vendor and category
            if (sheetItem.vendor && sheetItem.vendor.trim()) {
              updateData.vendor = sheetItem.vendor;
            }
            if (sheetItem.category && sheetItem.category.trim()) {
              updateData.category = sheetItem.category;
            }

            // Update tags
            if (sheetItem.tags && sheetItem.tags.trim()) {
              updateData.tags = sheetItem.tags;
            }

            // Only update if we have meaningful changes
            if (Object.keys(updateData).length > 0) {
              await this.storage.updateItem(existingItem.id, updateData);
              updated++;
              console.log(`Updated item: ${existingItem.name} with enhanced data`);
            }
          }
        } catch (error) {
          errors.push(`Failed to update item ${sheetItem.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`Inventory sync completed: ${updated} items updated, ${errors.length} errors`);
      return { updated, errors };

    } catch (error) {
      console.error('Error syncing inventory with sheets:', error);
      return { updated: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Get enhanced inventory items with sheet data
   */
  async getEnhancedInventoryItems(): Promise<EnhancedInventoryItem[]> {
    try {
      // First sync with latest sheet data
      await this.syncInventoryWithSheets();
      
      // Then return enhanced items from database
      const items = await this.storage.getItems();
      
      return items.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku || '',
        handle: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        imageUrl: item.imageUrl || '',
        basePrice: item.basePrice || '0',
        compareAtPrice: item.salePrice || '0',
        quantity: item.quantity || 0,
        available: item.quantity || 0,
        onHand: item.quantity || 0,
        weight: item.weight || '',
        vendor: item.vendor || '',
        category: item.category || '',
        tags: item.tags || '',
        status: item.status || 'active'
      }));

    } catch (error) {
      console.error('Error getting enhanced inventory items:', error);
      return [];
    }
  }
}