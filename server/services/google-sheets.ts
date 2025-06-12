/**
 * Google Sheets Integration Service
 * 
 * This service provides comprehensive Google Sheets connectivity for inventory management:
 * - Real-time inventory synchronization
 * - Automated data export/import
 * - Two-way data binding with conflict resolution
 * - Batch operations for performance
 */

import { google } from 'googleapis';
import { Item, InsertItem } from '@shared/schema';
import { IStorage } from '../storage';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  worksheetName: string;
  credentialsPath?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors: string[];
  conflicts: Array<{
    itemId: number;
    field: string;
    localValue: any;
    sheetValue: any;
  }>;
}

export interface SheetColumn {
  header: string;
  field: keyof Item;
  type: 'string' | 'number' | 'array' | 'boolean';
  required?: boolean;
}

export class GoogleSheetsService {
  private sheets: any;
  private auth: any;
  private config: GoogleSheetsConfig;
  private storage: IStorage;

  // Default column mapping for inventory data
  private readonly SHEET_COLUMNS: SheetColumn[] = [
    { header: 'ID', field: 'id', type: 'number' },
    { header: 'Name', field: 'name', type: 'string', required: true },
    { header: 'SKU', field: 'sku', type: 'string', required: true },
    { header: 'Description', field: 'description', type: 'string' },
    { header: 'Category', field: 'category', type: 'string' },
    { header: 'Brand', field: 'brand', type: 'string' },
    { header: 'Base Price', field: 'basePrice', type: 'string' },
    { header: 'Sale Price', field: 'salePrice', type: 'string' },
    { header: 'Quantity', field: 'quantity', type: 'number' },
    { header: 'Status', field: 'status', type: 'string' },
    { header: 'Weight', field: 'weight', type: 'string' },
    { header: 'Condition', field: 'condition', type: 'string' },
    { header: 'Location', field: 'location', type: 'string' },
    { header: 'Tags', field: 'tags', type: 'array' },
    { header: 'Last Updated', field: 'updatedAt', type: 'string' }
  ];

  constructor(config: GoogleSheetsConfig, storage: IStorage) {
    this.config = config;
    this.storage = storage;
  }

  /**
   * Initialize Google Sheets authentication
   */
  async initialize(): Promise<void> {
    try {
      // Use service account authentication
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else {
        // Fallback to OAuth2 with client credentials
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw new Error('Google Sheets authentication failed. Please check your credentials.');
    }
  }

  /**
   * Create a new spreadsheet for inventory tracking
   */
  async createInventorySheet(title: string): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: title
          },
          sheets: [{
            properties: {
              title: 'Inventory',
              gridProperties: {
                rowCount: 1000,
                columnCount: this.SHEET_COLUMNS.length
              }
            }
          }]
        }
      });

      const spreadsheetId = response.data.spreadsheetId;
      console.log(`Created new spreadsheet: ${spreadsheetId}`);

      // Set up headers
      await this.setupHeaders(spreadsheetId, 'Inventory');
      
      return spreadsheetId;
    } catch (error) {
      console.error('Failed to create spreadsheet:', error);
      throw new Error('Could not create Google Sheets spreadsheet');
    }
  }

  /**
   * Set up column headers in the sheet
   */
  private async setupHeaders(spreadsheetId: string, sheetName: string): Promise<void> {
    const headers = this.SHEET_COLUMNS.map(col => col.header);
    
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers]
      }
    });

    // Format headers
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headers.length
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                textFormat: { bold: true }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        }]
      }
    });
  }

  /**
   * Export all inventory items to Google Sheets
   */
  async exportToSheets(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedItems: 0,
      errors: [],
      conflicts: []
    };

    try {
      await this.initialize();
      
      const items = await this.storage.getItems();
      console.log(`Exporting ${items.length} items to Google Sheets`);

      // Convert items to sheet rows
      const rows = items.map(item => this.itemToSheetRow(item));
      
      // Clear existing data (except headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A2:Z`
      });

      // Insert new data
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.worksheetName}!A2`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: rows
          }
        });
      }

      result.success = true;
      result.syncedItems = items.length;
      console.log(`Successfully exported ${items.length} items to Google Sheets`);
      
    } catch (error) {
      console.error('Export to Google Sheets failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown export error');
    }

    return result;
  }

  /**
   * Import data from Google Sheets and sync with inventory
   */
  async importFromSheets(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedItems: 0,
      errors: [],
      conflicts: []
    };

    try {
      await this.initialize();

      // Get data from sheets
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A:Z`
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        result.errors.push('No data found in spreadsheet');
        return result;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log(`Importing ${dataRows.length} rows from Google Sheets`);

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        try {
          const row = dataRows[i];
          if (this.isEmptyRow(row)) continue;

          const itemData = this.sheetRowToItem(headers, row);
          
          if (!itemData.name || !itemData.sku) {
            result.errors.push(`Row ${i + 2}: Missing required fields (name or sku)`);
            continue;
          }

          // Check if item exists
          const existingItem = await this.storage.getItemBySku(itemData.sku);
          
          if (existingItem) {
            // Update existing item with conflict detection
            const conflicts = this.detectConflicts(existingItem, itemData);
            result.conflicts.push(...conflicts);
            
            // Use sheet data as source of truth for now
            await this.storage.updateItem(existingItem.id, itemData);
          } else {
            // Create new item
            await this.storage.createItem(itemData);
          }

          result.syncedItems++;

        } catch (error) {
          console.error(`Error processing row ${i + 2}:`, error);
          result.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Processing error'}`);
        }
      }

      result.success = true;
      console.log(`Successfully imported ${result.syncedItems} items from Google Sheets`);

    } catch (error) {
      console.error('Import from Google Sheets failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown import error');
    }

    return result;
  }

  /**
   * Perform two-way synchronization
   */
  async syncBidirectional(): Promise<SyncResult> {
    console.log('Starting bidirectional sync with Google Sheets');
    
    // First import from sheets to get latest changes
    const importResult = await this.importFromSheets();
    
    // Then export current state back to sheets
    const exportResult = await this.exportToSheets();

    return {
      success: importResult.success && exportResult.success,
      syncedItems: importResult.syncedItems + exportResult.syncedItems,
      errors: [...importResult.errors, ...exportResult.errors],
      conflicts: importResult.conflicts
    };
  }

  /**
   * Convert inventory item to sheet row
   */
  private itemToSheetRow(item: Item): any[] {
    return this.SHEET_COLUMNS.map(col => {
      const value = item[col.field];
      
      if (col.type === 'array' && Array.isArray(value)) {
        return value.join(', ');
      }
      
      if (col.type === 'number') {
        return value || 0;
      }
      
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      return value || '';
    });
  }

  /**
   * Convert sheet row to inventory item
   */
  private sheetRowToItem(headers: string[], row: any[]): InsertItem {
    const item: any = {};
    
    this.SHEET_COLUMNS.forEach((col, index) => {
      const headerIndex = headers.findIndex(h => h === col.header);
      if (headerIndex === -1 || !row[headerIndex]) return;
      
      const value = row[headerIndex];
      
      if (col.type === 'array') {
        item[col.field] = typeof value === 'string' ? value.split(',').map(s => s.trim()) : [];
      } else if (col.type === 'number') {
        item[col.field] = parseFloat(value) || 0;
      } else if (col.type === 'boolean') {
        item[col.field] = value === 'TRUE' || value === 'true' || value === '1';
      } else {
        item[col.field] = value.toString();
      }
    });

    // Ensure required fields
    item.tags = item.tags || [];
    item.images = item.images || [];
    item.marketplace = item.marketplace || [];
    item.metadata = item.metadata || {};

    return item as InsertItem;
  }

  /**
   * Check if a row is empty
   */
  private isEmptyRow(row: any[]): boolean {
    return !row || row.every(cell => !cell || cell.toString().trim() === '');
  }

  /**
   * Detect conflicts between existing item and sheet data
   */
  private detectConflicts(existingItem: Item, sheetItem: InsertItem): Array<{
    itemId: number;
    field: string;
    localValue: any;
    sheetValue: any;
  }> {
    const conflicts = [];
    const fieldsToCheck = ['name', 'basePrice', 'quantity', 'status'];
    
    for (const field of fieldsToCheck) {
      const localValue = existingItem[field as keyof Item];
      const sheetValue = sheetItem[field as keyof InsertItem];
      
      if (localValue !== sheetValue && sheetValue !== undefined) {
        conflicts.push({
          itemId: existingItem.id,
          field,
          localValue,
          sheetValue
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Get spreadsheet information
   */
  async getSpreadsheetInfo(): Promise<any> {
    try {
      await this.initialize();
      
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId
      });
      
      return {
        title: response.data.properties?.title,
        sheets: response.data.sheets?.map(sheet => ({
          title: sheet.properties?.title,
          id: sheet.properties?.sheetId
        }))
      };
    } catch (error) {
      console.error('Failed to get spreadsheet info:', error);
      throw new Error('Could not access spreadsheet. Please check the spreadsheet ID and permissions.');
    }
  }
}

/**
 * Factory function to create Google Sheets service
 */
export function createGoogleSheetsService(config: GoogleSheetsConfig, storage: IStorage): GoogleSheetsService {
  return new GoogleSheetsService(config, storage);
}