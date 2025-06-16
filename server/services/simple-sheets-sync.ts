/**
 * Simple Google Sheets Inventory Sync Service
 * Fetches thumbnails from column AB (ProductExport) and quantities from columns P & Q (InventoryExport)
 */

import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import type { DatabaseStorage } from '../storage.js';

interface ProductSheetItem {
  handle: string; // Column A
  weight: string; // Column J
  sku: string; // Column R
  inventoryQty: number; // Column U
  price: string; // Column X
  imageSrc: string; // Column AC
  strainBannerText: string; // Column AW
  thcaPercentage: string; // Column AX
  coasLink: string; // Column BA
  costPerItem: string; // Column BJ
}

export class SimpleSheetsSync {
  private storage: DatabaseStorage;
  private auth: any;
  private spreadsheetId = '1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s';

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  private async initializeAuth() {
    if (this.auth) return;

    try {
      // Parse the full credentials JSON if available, otherwise use individual env vars
      const credsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
      let credentials;
      
      if (credsJson) {
        credentials = JSON.parse(credsJson);
      } else {
        credentials = {
          type: 'service_account',
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLIENT_ID,
        };
      }

      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        credentials
      });
    } catch (error) {
      console.error('Google Sheets auth initialization failed:', error);
      throw error;
    }
  }

  /**
   * Fetch enhanced inventory data with thumbnails and quantities
   */
  async getEnhancedInventory(): Promise<any[]> {
    try {
      console.log('Starting enhanced inventory fetch from Google Sheets Products sheet...');
      await this.initializeAuth();
      console.log('Google Sheets auth initialized successfully');
      
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log(`Attempting to access spreadsheet: ${this.spreadsheetId}`);

      // First, get sheet metadata to understand the structure
      console.log('Getting sheet metadata...');
      const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'sheets.properties'
      });
      
      console.log('Available sheets:', sheetInfo.data.sheets?.map(s => s.properties?.title));
      
      // Fetch Product sheet data with extended range to include all required columns
      console.log('Fetching Product sheet data...');
      const productResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Product!A1:CZ1000', // Extended range to cover column BJ (index 61)
      });

      const productRows = productResponse.data.values || [];
      console.log(`Retrieved ${productRows.length} product rows from Products sheet`);

      // Process Product sheet data with correct column mapping
      const productData: Record<string, ProductSheetItem> = {};
      console.log('Processing product rows - checking row lengths and content:');
      productRows.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index}: Length=${row.length}, Handle=${row[0]}, Weight=${row[9]}, SKU=${row[17]}, Qty=${row[20]}, Price=${row[23]}`);
      });
      
      productRows.forEach((row, index) => {
        if (row[0] && row[0] !== 'Handle' && row[0].trim()) { // Skip header and empty rows
          const handle = row[0].trim();
          
          productData[handle] = {
            handle: handle, // Column A
            weight: row[9] || '', // Column J
            sku: row[17] || '', // Column R 
            inventoryQty: parseInt(row[20]) || 0, // Column U
            price: row[23] || '0', // Column X
            imageSrc: (row.length > 28 ? row[28] : '') || '', // Column AC if available
            strainBannerText: (row.length > 48 ? row[48] : '') || '', // Column AW if available
            thcaPercentage: (row.length > 49 ? row[49] : '') || '', // Column AX if available
            coasLink: (row.length > 52 ? row[52] : '') || '', // Column BA if available
            costPerItem: (row.length > 61 ? row[61] : '') || '0', // Column BJ if available
          };
        }
      });
      
      console.log(`Processed ${Object.keys(productData).length} products from sheet`);

      // Get database items
      const dbItems = await this.storage.getItems();
      console.log(`Found ${dbItems.length} items in database`);

      // If no database items, create enhanced items directly from Google Sheets data
      if (dbItems.length === 0) {
        console.log('No database items found, creating items from Google Sheets data');
        return Object.values(productData).slice(0, 50).map((productInfo, index) => ({
          id: index + 1,
          name: productInfo.handle.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          sku: productInfo.sku || '',
          handle: productInfo.handle,
          imageUrl: productInfo.imageSrc || '',
          basePrice: productInfo.price || '0',
          costPrice: productInfo.costPerItem || '0',
          quantity: productInfo.inventoryQty || 0,
          weight: productInfo.weight || '',
          brand: 'Gold Standard',
          category: 'Flower',
          status: 'active',
          description: `${productInfo.strainBannerText} - ${productInfo.thcaPercentage} THCa`,
          shopifyId: null,
          strainBannerText: productInfo.strainBannerText || '',
          thcaPercentage: productInfo.thcaPercentage || '',
          coasLink: productInfo.coasLink || '',
        }));
      }

      // Merge data and return enhanced items with Products sheet data
      return dbItems.map(item => {
        const handle = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const productInfo = productData[handle] || {};

        return {
          id: item.id,
          name: item.name,
          sku: item.sku || productInfo.sku || '',
          handle: handle,
          imageUrl: productInfo.imageSrc || item.imageUrl || '',
          basePrice: item.basePrice || productInfo.price || '0',
          costPrice: item.costPrice || productInfo.costPerItem || '0',
          quantity: item.quantity || productInfo.inventoryQty || 0,
          weight: productInfo.weight || item.weight || '',
          brand: item.brand || '',
          category: item.category || '',
          status: item.status || 'active',
          description: item.description || '',
          shopifyId: item.shopifyId || null,
          strainBannerText: productInfo.strainBannerText || '',
          thcaPercentage: productInfo.thcaPercentage || '',
          coasLink: productInfo.coasLink || '',
        };
      });

    } catch (error) {
      console.error('Error fetching enhanced inventory from Google Sheets:', error);
      // Return database items with basic data if sheets fail
      const dbItems = await this.storage.getItems();
      return dbItems.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku || '',
        handle: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        imageUrl: item.imageUrl || '',
        basePrice: item.basePrice || '0',
        quantity: item.quantity || 0,
        available: item.quantity || 0,
        onHand: item.quantity || 0,
        weight: item.weight || '',
        brand: item.brand || '',
        category: item.category || '',
        status: item.status || 'active',
        description: item.description || '',
        shopifyId: item.shopifyId || null,
      }));
    }
  }

  /**
   * Sync inventory quantities from Google Sheets
   */
  async syncQuantities(): Promise<{ updated: number; errors: string[] }> {
    try {
      await this.initializeAuth();
      const sheets = google.sheets({ version: 'v4', auth: this.auth });

      // Fetch inventory quantities
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'InventoryExport!A2:Q1000',
      });

      const rows = response.data.values || [];
      let updated = 0;
      const errors: string[] = [];

      for (const row of rows) {
        if (!row[0]) continue; // Skip empty handles

        const handle = row[0];
        const available = parseInt(row[15]) || 0; // Column P
        const onHand = parseInt(row[16]) || 0; // Column Q

        try {
          // Find item by handle-based matching
          const items = await this.storage.getItems();
          const matchingItem = items.find(item => 
            item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === handle
          );

          if (matchingItem) {
            await this.storage.updateItem(matchingItem.id, {
              quantity: onHand > 0 ? onHand : available
            });
            updated++;
          }
        } catch (error) {
          errors.push(`Failed to update ${handle}: ${error}`);
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('Error syncing quantities from Google Sheets:', error);
      return { updated: 0, errors: [String(error)] };
    }
  }
}