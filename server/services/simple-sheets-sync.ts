/**
 * Simple Google Sheets Inventory Sync Service
 * Fetches thumbnails from column AB (ProductExport) and quantities from columns P & Q (InventoryExport)
 */

import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import type { DatabaseStorage } from '../storage.js';

interface SheetItem {
  handle: string;
  title: string;
  imageUrl: string;
  sku: string;
  price: string;
  weight: string;
  available: number;
  onHand: number;
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
      console.log('Starting enhanced inventory fetch from Google Sheets...');
      await this.initializeAuth();
      console.log('Google Sheets auth initialized successfully');
      
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log(`Attempting to access spreadsheet: ${this.spreadsheetId}`);

      // Fetch ProductExport data (thumbnails in column AB)
      console.log('Fetching ProductExport sheet data...');
      const productResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'ProductExport!A2:AB1000',
      });

      // Fetch InventoryExport data (quantities in columns P & Q, weight in column D)
      console.log('Fetching InventoryExport sheet data...');
      const inventoryResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'InventoryExport!A2:Q1000',
      });

      const productRows = productResponse.data.values || [];
      const inventoryRows = inventoryResponse.data.values || [];
      
      console.log(`Retrieved ${productRows.length} product rows and ${inventoryRows.length} inventory rows`);

      // Process ProductExport data
      const productData: Record<string, any> = {};
      productRows.forEach(row => {
        if (row[0]) { // Handle in column A
          productData[row[0]] = {
            handle: row[0],
            title: row[1] || '',
            imageUrl: row[27] || '', // Column AB (index 27)
            sku: row[11] || '', // SKU column
            price: row[14] || '0', // Price column
          };
        }
      });

      // Process InventoryExport data
      const inventoryData: Record<string, any> = {};
      inventoryRows.forEach(row => {
        if (row[0]) { // Handle in column A
          inventoryData[row[0]] = {
            handle: row[0],
            weight: row[3] || '', // Column D (index 3)
            available: parseInt(row[15]) || 0, // Column P (index 15)
            onHand: parseInt(row[16]) || 0, // Column Q (index 16)
          };
        }
      });

      // Get database items
      const dbItems = await this.storage.getItems();

      // Merge data and return enhanced items
      return dbItems.map(item => {
        const handle = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const productInfo = productData[handle] || {};
        const inventoryInfo = inventoryData[handle] || {};

        return {
          id: item.id,
          name: item.name,
          sku: item.sku || productInfo.sku || '',
          handle: handle,
          imageUrl: productInfo.imageUrl || item.imageUrl || '',
          basePrice: item.basePrice || productInfo.price || '0',
          quantity: item.quantity || 0,
          available: inventoryInfo.available || item.quantity || 0,
          onHand: inventoryInfo.onHand || item.quantity || 0,
          weight: inventoryInfo.weight || item.weight || '',
          brand: item.brand || '',
          category: item.category || '',
          status: item.status || 'active',
          description: item.description || '',
          shopifyId: item.shopifyId || null,
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