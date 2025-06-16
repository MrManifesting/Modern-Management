import { GoogleSheetsService } from './google-sheets.js';
import { db } from '../db.js';
import { items } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class ThcaInventorySyncService {
  private googleSheets: GoogleSheetsService;
  private spreadsheetId: string;

  constructor() {
    this.googleSheets = new GoogleSheetsService();
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU';
  }

  /**
   * Process order and update THCa sheet inventory
   */
  async processOrderInventoryUpdate(order: any) {
    console.log('Processing order for THCa inventory update:', order.orderId || order.id);

    try {
      // Get THCa Flower sheet data to find the correct row
      const thcaData = await this.getThcaSheetData();
      
      if (!thcaData || thcaData.length === 0) {
        console.log('No THCa sheet data found');
        return { success: false, message: 'No THCa sheet data available' };
      }

      const results = {
        ordersProcessed: 0,
        inventoryUpdated: 0,
        errors: [] as string[]
      };

      // Process each line item in the order
      const lineItems = order.line_items || [order];
      
      for (const lineItem of lineItems) {
        try {
          const sku = lineItem.sku || lineItem.variant_sku;
          const quantity = lineItem.quantity || 1;

          if (!sku) {
            results.errors.push(`No SKU found for line item`);
            continue;
          }

          // Find matching row in THCa sheet using KEY-ID (column G)
          const matchingRowIndex = this.findThcaRowByKeyId(thcaData, sku);
          
          if (matchingRowIndex === -1) {
            results.errors.push(`No THCa sheet match found for SKU: ${sku}`);
            continue;
          }

          // Get current amount from column B
          const currentAmount = this.parseAmount(thcaData[matchingRowIndex][1]); // Column B (index 1)
          
          if (currentAmount === null || currentAmount < quantity) {
            results.errors.push(`Insufficient stock for ${sku}: ${currentAmount} available, ${quantity} requested`);
            continue;
          }

          // Calculate new amount
          const newAmount = currentAmount - quantity;
          
          // Update THCa sheet column B
          await this.updateThcaSheetAmount(matchingRowIndex + 2, newAmount); // +2 for 1-based index and header
          
          console.log(`Updated THCa inventory for ${sku}: ${currentAmount} → ${newAmount}`);
          results.inventoryUpdated++;

        } catch (error) {
          results.errors.push(`Error processing line item: ${error}`);
        }
      }

      results.ordersProcessed = 1;
      console.log(`THCa inventory update completed: ${results.inventoryUpdated} items updated`);
      
      return {
        success: true,
        message: `Updated ${results.inventoryUpdated} THCa inventory items`,
        results
      };

    } catch (error) {
      console.error('Error processing THCa inventory update:', error);
      return {
        success: false,
        message: `Failed to update THCa inventory: ${error}`,
        error: String(error)
      };
    }
  }

  /**
   * Get THCa Flower sheet data
   */
  private async getThcaSheetData(): Promise<any[][]> {
    if (!this.googleSheets.isConfigured()) {
      throw new Error('Google Sheets not configured');
    }

    try {
      const response = await this.googleSheets.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'THCa Flower!A:G', // Get columns A through G (including KEY-ID)
      });

      if (!response.data.values || response.data.values.length < 2) {
        return [];
      }

      // Return data without headers
      return response.data.values.slice(1);
    } catch (error) {
      console.error('Error getting THCa sheet data:', error);
      throw error;
    }
  }

  /**
   * Find THCa sheet row by KEY-ID (column G)
   */
  private findThcaRowByKeyId(thcaData: any[][], keyId: string): number {
    return thcaData.findIndex(row => {
      const rowKeyId = row[6] ? String(row[6]).trim() : ''; // Column G (index 6)
      return rowKeyId === keyId.trim();
    });
  }

  /**
   * Parse amount from column B (handles various formats)
   */
  private parseAmount(amountStr: string): number | null {
    if (!amountStr) return null;
    
    // Remove common non-numeric characters and parse
    const cleanAmount = String(amountStr).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleanAmount);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Update THCa sheet amount in column B
   */
  private async updateThcaSheetAmount(rowNumber: number, newAmount: number): Promise<void> {
    if (!this.googleSheets.isConfigured()) {
      throw new Error('Google Sheets not configured');
    }

    try {
      await this.googleSheets.sheets!.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `THCa Flower!B${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[newAmount]]
        }
      });

      console.log(`Updated THCa sheet row ${rowNumber}, column B to: ${newAmount}`);
    } catch (error) {
      console.error('Error updating THCa sheet:', error);
      throw error;
    }
  }

  /**
   * Get current THCa inventory status
   */
  async getThcaInventoryStatus(): Promise<any[]> {
    try {
      const thcaData = await this.getThcaSheetData();
      
      return thcaData.map((row, index) => ({
        rowNumber: index + 2, // +2 for 1-based index and header
        strain: row[0] || '', // Column A - Strain
        amount: row[1] || '', // Column B - Amount
        percentage: row[2] || '', // Column C - Percentage
        tier: row[3] || '', // Column D - Tier
        keyId: row[6] || '', // Column G - KEY-ID
        parsedAmount: this.parseAmount(row[1])
      }));
    } catch (error) {
      console.error('Error getting THCa inventory status:', error);
      return [];
    }
  }

  /**
   * Manually adjust THCa inventory amount
   */
  async adjustThcaInventory(keyId: string, newAmount: number): Promise<boolean> {
    try {
      const thcaData = await this.getThcaSheetData();
      const rowIndex = this.findThcaRowByKeyId(thcaData, keyId);
      
      if (rowIndex === -1) {
        throw new Error(`No THCa item found with KEY-ID: ${keyId}`);
      }

      await this.updateThcaSheetAmount(rowIndex + 2, newAmount);
      
      console.log(`Manually adjusted THCa inventory for ${keyId} to ${newAmount}`);
      return true;
    } catch (error) {
      console.error('Error adjusting THCa inventory:', error);
      throw error;
    }
  }

  /**
   * Bulk update THCa inventory from order batch
   */
  async processBatchOrders(orders: any[]): Promise<any> {
    const results = {
      totalOrders: orders.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const order of orders) {
      try {
        const result = await this.processOrderInventoryUpdate(order);
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`Order ${order.orderId}: ${result.message}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Order ${order.orderId}: ${error}`);
      }
    }

    return results;
  }
}