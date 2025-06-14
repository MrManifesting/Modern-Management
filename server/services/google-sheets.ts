/**
 * Google Sheets integration service for automated inventory tracking
 * Provides real-time sync of inventory data to Google Sheets
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4, google } from 'googleapis';

export interface SheetConfig {
  spreadsheetId: string;
  worksheetName: string;
  credentialsPath?: string;
  range?: string;
}

export interface InventoryRow {
  sku: string;
  name: string;
  category: string;
  vendor: string;
  quantity: number;
  weight: number;
  price: string;
  cost: string;
  status: string;
  lastUpdated: string;
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private auth: GoogleAuth | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize Google Sheets authentication
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Check if credentials are available
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('Google Sheets: Missing credentials - sync disabled');
        return;
      }

      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        credentials: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          type: 'authorized_user'
        }
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isInitialized = true;
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.isInitialized && !!this.sheets;
  }

  /**
   * Create or update inventory worksheet with headers
   */
  async setupInventorySheet(config: SheetConfig): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      const headers = [
        'SKU',
        'Item Name',
        'Category',
        'Vendor',
        'Quantity',
        'Weight (g)',
        'Price',
        'Cost',
        'Status',
        'Last Updated',
        'Created Date',
        'Notes'
      ];

      // Check if worksheet exists
      const spreadsheet = await this.sheets!.spreadsheets.get({
        spreadsheetId: config.spreadsheetId
      });

      const worksheetExists = spreadsheet.data.sheets?.some(
        sheet => sheet.properties?.title === config.worksheetName
      );

      if (!worksheetExists) {
        // Create new worksheet
        await this.sheets!.spreadsheets.batchUpdate({
          spreadsheetId: config.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: config.worksheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: headers.length
                  }
                }
              }
            }]
          }
        });
      }

      // Add headers
      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${config.worksheetName}!A1:${this.getColumnLetter(headers.length)}1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      // Format headers
      await this.sheets!.spreadsheets.batchUpdate({
        spreadsheetId: config.spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: await this.getSheetId(config.spreadsheetId, config.worksheetName),
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          }]
        }
      });

      console.log(`Inventory worksheet "${config.worksheetName}" setup completed`);
      return true;
    } catch (error) {
      console.error('Error setting up inventory sheet:', error);
      return false;
    }
  }

  /**
   * Sync inventory data to Google Sheets
   */
  async syncInventoryData(items: any[], config: SheetConfig): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Google Sheets sync skipped - service not configured');
      return false;
    }

    try {
      const inventoryRows: InventoryRow[] = items.map(item => ({
        sku: item.sku || '',
        name: item.name || '',
        category: item.category || '',
        vendor: item.brand || '',
        quantity: item.quantity || 0,
        weight: item.weight || 0,
        price: item.basePrice || '0',
        cost: item.costPrice?.toString() || '0',
        status: item.status || 'active',
        lastUpdated: new Date().toISOString()
      }));

      // Clear existing data (except headers)
      await this.clearSheetData(config);

      // Prepare data for batch update
      const values = inventoryRows.map(row => [
        row.sku,
        row.name,
        row.category,
        row.vendor,
        row.quantity,
        row.weight,
        row.price,
        row.cost,
        row.status,
        row.lastUpdated,
        new Date().toISOString(),
        '' // Notes column
      ]);

      if (values.length === 0) {
        console.log('No inventory data to sync');
        return true;
      }

      // Update sheet with new data
      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${config.worksheetName}!A2:L${values.length + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: values
        }
      });

      console.log(`Synced ${values.length} inventory items to Google Sheets`);
      return true;
    } catch (error) {
      console.error('Error syncing inventory data:', error);
      return false;
    }
  }

  /**
   * Add or update a single inventory item
   */
  async updateInventoryItem(item: any, config: SheetConfig): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Find existing row by SKU
      const existingData = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${config.worksheetName}!A:A`
      });

      const skuColumn = existingData.data.values || [];
      const rowIndex = skuColumn.findIndex((row, index) => 
        index > 0 && row[0] === item.sku
      );

      const rowData = [
        item.sku || '',
        item.name || '',
        item.category || '',
        item.brand || '',
        item.quantity || 0,
        item.weight || 0,
        item.basePrice || '0',
        item.costPrice?.toString() || '0',
        item.status || 'active',
        new Date().toISOString(),
        rowIndex === -1 ? new Date().toISOString() : '', // Created date only for new items
        '' // Notes
      ];

      if (rowIndex === -1) {
        // Add new row
        await this.sheets!.spreadsheets.values.append({
          spreadsheetId: config.spreadsheetId,
          range: `${config.worksheetName}!A:L`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [rowData]
          }
        });
        console.log(`Added new item to Google Sheets: ${item.sku}`);
      } else {
        // Update existing row
        const actualRowIndex = rowIndex + 1; // Convert to 1-based index
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: config.spreadsheetId,
          range: `${config.worksheetName}!A${actualRowIndex}:L${actualRowIndex}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [rowData]
          }
        });
        console.log(`Updated item in Google Sheets: ${item.sku}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating inventory item in Google Sheets:', error);
      return false;
    }
  }

  /**
   * Track inventory changes for analytics
   */
  async logInventoryChange(change: {
    sku: string;
    action: string;
    quantity: number;
    previousQuantity: number;
    timestamp: Date;
    source: string;
  }, config: SheetConfig): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const logSheetName = `${config.worksheetName}_Log`;
      
      // Ensure log sheet exists
      await this.ensureLogSheetExists(config.spreadsheetId, logSheetName);

      const logRow = [
        change.sku,
        change.action,
        change.quantity,
        change.previousQuantity,
        change.quantity - change.previousQuantity, // Net change
        change.timestamp.toISOString(),
        change.source,
        new Date().toLocaleDateString() // Date for easier filtering
      ];

      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: `${logSheetName}!A:H`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [logRow]
        }
      });

      return true;
    } catch (error) {
      console.error('Error logging inventory change:', error);
      return false;
    }
  }

  /**
   * Get inventory data from Google Sheets
   */
  async getInventoryFromSheet(config: SheetConfig): Promise<InventoryRow[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${config.worksheetName}!A2:L1000` // Skip header row
      });

      const rows = response.data.values || [];
      return rows.map(row => ({
        sku: row[0] || '',
        name: row[1] || '',
        category: row[2] || '',
        vendor: row[3] || '',
        quantity: parseInt(row[4]) || 0,
        weight: parseFloat(row[5]) || 0,
        price: row[6] || '0',
        cost: row[7] || '0',
        status: row[8] || 'active',
        lastUpdated: row[9] || ''
      }));
    } catch (error) {
      console.error('Error getting inventory from sheet:', error);
      return [];
    }
  }

  /**
   * Log order data to Google Sheets for webhook processing
   */
  async logOrderToSheet(orderData: any, config: SheetConfig): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const orderLogSheetName = `${config.worksheetName}_Orders`;
      
      // Ensure order log sheet exists
      await this.ensureOrderLogSheetExists(config.spreadsheetId, orderLogSheetName);

      const orderRow = [
        orderData.id || '',
        orderData.order_number || orderData.name || '',
        orderData.email || '',
        orderData.total_price || '0',
        orderData.financial_status || '',
        orderData.fulfillment_status || '',
        new Date().toISOString(),
        JSON.stringify(orderData.line_items || []),
        orderData.customer?.first_name || '',
        orderData.customer?.last_name || ''
      ];

      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: `${orderLogSheetName}!A:J`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [orderRow]
        }
      });

      return true;
    } catch (error) {
      console.error('Error logging order to sheet:', error);
      return false;
    }
  }

  /**
   * Helper methods
   */
  private async clearSheetData(config: SheetConfig): Promise<void> {
    await this.sheets!.spreadsheets.values.clear({
      spreadsheetId: config.spreadsheetId,
      range: `${config.worksheetName}!A2:L1000`
    });
  }

  private async getSheetId(spreadsheetId: string, worksheetName: string): Promise<number> {
    const spreadsheet = await this.sheets!.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    const sheet = spreadsheet.data.sheets?.find(
      s => s.properties?.title === worksheetName
    );

    return sheet?.properties?.sheetId || 0;
  }

  private getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  private async ensureLogSheetExists(spreadsheetId: string, logSheetName: string): Promise<void> {
    try {
      const spreadsheet = await this.sheets!.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });

      const logSheetExists = spreadsheet.data.sheets?.some(
        sheet => sheet.properties?.title === logSheetName
      );

      if (!logSheetExists) {
        await this.sheets!.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: logSheetName,
                  gridProperties: {
                    rowCount: 5000,
                    columnCount: 8
                  }
                }
              }
            }]
          }
        });

        // Add headers to log sheet
        const headers = ['SKU', 'Action', 'New Quantity', 'Previous Quantity', 'Change', 'Timestamp', 'Source', 'Date'];
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: `${logSheetName}!A1:H1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers]
          }
        });
      }
    } catch (error) {
      console.error('Error ensuring log sheet exists:', error);
    }
  }

  private async ensureOrderLogSheetExists(spreadsheetId: string, orderLogSheetName: string): Promise<void> {
    try {
      const spreadsheet = await this.sheets!.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });

      const orderLogSheetExists = spreadsheet.data.sheets?.some(
        sheet => sheet.properties?.title === orderLogSheetName
      );

      if (!orderLogSheetExists) {
        await this.sheets!.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: orderLogSheetName,
                  gridProperties: {
                    rowCount: 5000,
                    columnCount: 10
                  }
                }
              }
            }]
          }
        });

        // Add headers to order log sheet
        const headers = ['Order ID', 'Order Number', 'Customer Email', 'Total', 'Payment Status', 'Fulfillment Status', 'Timestamp', 'Line Items', 'First Name', 'Last Name'];
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: `${orderLogSheetName}!A1:J1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers]
          }
        });
      }
    } catch (error) {
      console.error('Error ensuring order log sheet exists:', error);
    }
  }
}

export default GoogleSheetsService;