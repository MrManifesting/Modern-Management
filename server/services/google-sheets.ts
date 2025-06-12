import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface ShopifyOrder {
  id: string;
  orderNumber: string;
  lineItems: Array<{
    productId: string;
    variantId: string;
    sku: string;
    name: string;
    quantity: number;
    price: string;
  }>;
  customerName: string;
  customerEmail: string;
  totalPrice: string;
  createdAt: string;
  fulfillmentStatus: string;
}

interface InventoryUpdate {
  sku: string;
  name: string;
  quantityOrdered: number;
  remainingStock: number;
  orderNumber: string;
  timestamp: string;
}

export class GoogleSheetsService {
  private sheets: any;
  private auth: JWT | null = null;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Check if we have the required environment variables
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.warn('Google Sheets integration not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.');
        return;
      }

      // Create JWT authentication
      this.auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Initialize Google Sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets authentication:', error);
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.auth && this.spreadsheetId);
  }

  async setupInventorySheet(): Promise<boolean> {
    if (!await this.isConfigured()) {
      return false;
    }

    try {
      // Create or update the main inventory tracking sheet
      const sheetName = 'Inventory_Tracking';
      
      // Check if sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheetExists = spreadsheet.data.sheets.some(
        (sheet: any) => sheet.properties.title === sheetName
      );

      if (!sheetExists) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 10
                  }
                }
              }
            }]
          }
        });
      }

      // Set up headers for inventory tracking
      const headers = [
        'SKU',
        'Product Name',
        'Current Stock',
        'Reserved Stock',
        'Available Stock',
        'Last Order Date',
        'Last Order Number',
        'Quantity Ordered',
        'Status',
        'Last Updated'
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:J1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      // Format headers
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 10
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.8, green: 0.8, blue: 0.8 },
                  textFormat: { bold: true }
                }
              },
              fields: 'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold'
            }
          }]
        }
      });

      return true;
    } catch (error) {
      console.error('Error setting up inventory sheet:', error);
      return false;
    }
  }

  async setupOrderLogSheet(): Promise<boolean> {
    if (!await this.isConfigured()) {
      return false;
    }

    try {
      const sheetName = 'Order_Log';
      
      // Check if sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheetExists = spreadsheet.data.sheets.some(
        (sheet: any) => sheet.properties.title === sheetName
      );

      if (!sheetExists) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 10000,
                    columnCount: 12
                  }
                }
              }
            }]
          }
        });
      }

      // Set up headers for order log
      const headers = [
        'Timestamp',
        'Order Number',
        'Shopify Order ID',
        'Customer Name',
        'Customer Email',
        'SKU',
        'Product Name',
        'Quantity Ordered',
        'Unit Price',
        'Total Price',
        'Fulfillment Status',
        'Stock After Order'
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:L1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      return true;
    } catch (error) {
      console.error('Error setting up order log sheet:', error);
      return false;
    }
  }

  async logOrderToSheet(order: ShopifyOrder, inventoryUpdates: InventoryUpdate[]): Promise<boolean> {
    if (!await this.isConfigured()) {
      return false;
    }

    try {
      const sheetName = 'Order_Log';
      const timestamp = new Date().toISOString();

      // Prepare rows for each line item
      const rows = order.lineItems.map((item, index) => {
        const inventoryUpdate = inventoryUpdates.find(update => update.sku === item.sku);
        
        return [
          timestamp,
          order.orderNumber,
          order.id,
          order.customerName,
          order.customerEmail,
          item.sku,
          item.name,
          item.quantity,
          item.price,
          (parseFloat(item.price) * item.quantity).toFixed(2),
          order.fulfillmentStatus,
          inventoryUpdate ? inventoryUpdate.remainingStock : 'N/A'
        ];
      });

      // Append rows to the sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:L`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: rows
        }
      });

      console.log(`Logged order ${order.orderNumber} to Google Sheets`);
      return true;
    } catch (error) {
      console.error('Error logging order to Google Sheets:', error);
      return false;
    }
  }

  async updateInventoryInSheet(updates: InventoryUpdate[]): Promise<boolean> {
    if (!await this.isConfigured()) {
      return false;
    }

    try {
      const sheetName = 'Inventory_Tracking';
      
      // Get current sheet data to find existing rows
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:J`,
      });

      const rows = response.data.values || [];
      const headerRow = rows[0] || [];
      const dataRows = rows.slice(1);

      // Process each inventory update
      for (const update of updates) {
        let rowIndex = -1;
        
        // Find existing row for this SKU
        for (let i = 0; i < dataRows.length; i++) {
          if (dataRows[i][0] === update.sku) {
            rowIndex = i + 2; // +2 because sheets are 1-indexed and we skip header
            break;
          }
        }

        const currentStock = update.remainingStock + update.quantityOrdered;
        const reservedStock = 0; // You can implement reserved stock logic
        const availableStock = update.remainingStock;

        const rowData = [
          update.sku,
          update.name,
          currentStock,
          reservedStock,
          availableStock,
          update.timestamp,
          update.orderNumber,
          update.quantityOrdered,
          availableStock <= 0 ? 'OUT OF STOCK' : availableStock <= 5 ? 'LOW STOCK' : 'IN STOCK',
          new Date().toISOString()
        ];

        if (rowIndex > 0) {
          // Update existing row
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A${rowIndex}:J${rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [rowData]
            }
          });
        } else {
          // Add new row
          await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A:J`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [rowData]
            }
          });
        }
      }

      console.log(`Updated ${updates.length} inventory items in Google Sheets`);
      return true;
    } catch (error) {
      console.error('Error updating inventory in Google Sheets:', error);
      return false;
    }
  }

  async syncAllInventoryToSheet(items: Array<{
    sku: string;
    name: string;
    quantity: number;
    basePrice: number;
  }>): Promise<boolean> {
    if (!await this.isConfigured()) {
      return false;
    }

    try {
      const sheetName = 'Inventory_Tracking';
      
      // Clear existing data (except headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:J`,
      });

      // Prepare data rows
      const rows = items.map(item => [
        item.sku,
        item.name,
        item.quantity,
        0, // reserved stock
        item.quantity, // available stock
        '', // last order date
        '', // last order number
        0, // quantity ordered
        item.quantity <= 0 ? 'OUT OF STOCK' : item.quantity <= 5 ? 'LOW STOCK' : 'IN STOCK',
        new Date().toISOString()
      ]);

      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:J`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: rows
          }
        });
      }

      console.log(`Synced ${items.length} inventory items to Google Sheets`);
      return true;
    } catch (error) {
      console.error('Error syncing inventory to Google Sheets:', error);
      return false;
    }
  }

  async createLowStockAlert(): Promise<boolean> {
    if (!await this.isConfigured()) {
      return false;
    }

    try {
      const sheetName = 'Low_Stock_Alerts';
      
      // Check if sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheetExists = spreadsheet.data.sheets.some(
        (sheet: any) => sheet.properties.title === sheetName
      );

      if (!sheetExists) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 8
                  }
                }
              }
            }]
          }
        });

        // Set up headers
        const headers = [
          'SKU',
          'Product Name',
          'Current Stock',
          'Threshold',
          'Alert Level',
          'Last Restock Date',
          'Suggested Reorder Quantity',
          'Status'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:H1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers]
          }
        });

        // Add conditional formatting for low stock alerts
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addConditionalFormatRule: {
                rule: {
                  ranges: [{
                    sheetId: spreadsheet.data.sheets.find((s: any) => s.properties.title === sheetName)?.properties.sheetId,
                    startRowIndex: 1,
                    endRowIndex: 1000,
                    startColumnIndex: 4,
                    endColumnIndex: 5
                  }],
                  booleanRule: {
                    condition: {
                      type: 'TEXT_EQ',
                      values: [{ userEnteredValue: 'CRITICAL' }]
                    },
                    format: {
                      backgroundColor: { red: 1, green: 0.4, blue: 0.4 }
                    }
                  }
                }
              }
            }]
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error creating low stock alert sheet:', error);
      return false;
    }
  }
}