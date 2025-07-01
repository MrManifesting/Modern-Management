import { google } from 'googleapis';

// Google Apps Script Web App URLs for Shopify integration
const GOOGLE_SHEETS_CONFIG = {
  webAppUrl: "https://script.google.com/macros/s/AKfycbwkuyDk2hruKO0WRDOppaAJWD5TGvnt-Iky5LuTWtGBHMA4la3LapAexT9Wqw0ZQjZw/exec",
  apiExecutableUrl: "https://script.googleapis.com/v1/scripts/AKfycbwkuyDk2hruKO0WRDOppaAJWD5TGvnt-Iky5LuTWtGBHMA4la3LapAexT9Wqw0ZQjZw:run",
  spreadsheetId: "15GHzyL_C2YqEMS68l7Vy3q6MA0SP9aDrhcZ4GS7HRA0",
  sheetUrl: "https://docs.google.com/spreadsheets/d/15GHzyL_C2YqEMS68l7Vy3q6MA0SP9aDrhcZ4GS7HRA0/edit?gid=1601393294#gid=1601393294"
};

export interface ShopifyOrderData {
  orderId: string;
  customerEmail: string;
  lineItems: Array<{
    sku: string;
    title: string;
    quantity: number;
    price: string;
  }>;
  totalPrice: string;
  orderDate: string;
}

export class GoogleSheetsService {
  private auth: any;

  constructor(accessToken?: string) {
    if (accessToken) {
      this.auth = new google.auth.OAuth2();
      this.auth.setCredentials({ access_token: accessToken });
    }
  }

  async syncInventoryToSheets(inventoryData: any[]) {
    try {
      // Format inventory data for Google Sheets
      const formattedData = inventoryData.map(item => [
        item.sku || "",
        item.name,
        item.category || "",
        item.brand || "",
        item.quantity,
        item.costPrice || "0",
        item.salePrice || "0",
        item.status || "active",
        item.location || "",
        Array.isArray(item.tags) ? item.tags.join(", ") : "",
        item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
        item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ""
      ]);

      // Add headers
      const headers = [
        "SKU", "Name", "Category", "Brand", "Quantity", 
        "Cost Price", "Sale Price", "Status", "Location", 
        "Tags", "Created", "Updated"
      ];

      const sheetData = [headers, ...formattedData];

      // Send to Google Apps Script Web App
      const response = await fetch(GOOGLE_SHEETS_CONFIG.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateInventory',
          data: sheetData,
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: `Successfully synced ${inventoryData.length} items to Google Sheets`,
        sheetUrl: GOOGLE_SHEETS_CONFIG.sheetUrl,
        result
      };
    } catch (error) {
      console.error('Error syncing inventory to Google Sheets:', error);
      throw new Error(`Failed to sync inventory to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async syncSalesToSheets(salesData: any[]) {
    try {
      // Format sales data for Google Sheets
      const formattedData = salesData.map(sale => [
        sale.id,
        sale.itemId,
        sale.marketplace,
        sale.quantity,
        sale.salePrice,
        sale.fees || "0",
        sale.shippingCost || "0",
        sale.customerEmail || "",
        sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : "",
        sale.status || "completed"
      ]);

      // Add headers
      const headers = [
        "Sale ID", "Item ID", "Marketplace", "Quantity", "Sale Price",
        "Fees", "Shipping", "Customer Email", "Sale Date", "Status"
      ];

      const sheetData = [headers, ...formattedData];

      // Send to Google Apps Script Web App
      const response = await fetch(GOOGLE_SHEETS_CONFIG.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateSales',
          data: sheetData,
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: `Successfully synced ${salesData.length} sales to Google Sheets`,
        sheetUrl: GOOGLE_SHEETS_CONFIG.sheetUrl,
        result
      };
    } catch (error) {
      console.error('Error syncing sales to Google Sheets:', error);
      throw new Error(`Failed to sync sales to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processShopifyOrder(orderData: ShopifyOrderData) {
    try {
      // Send Shopify order to Google Apps Script for processing
      const response = await fetch(GOOGLE_SHEETS_CONFIG.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'processShopifyOrder',
          orderData,
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: `Successfully processed Shopify order ${orderData.orderId}`,
        result
      };
    } catch (error) {
      console.error('Error processing Shopify order:', error);
      throw new Error(`Failed to process Shopify order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSheetStatus() {
    try {
      const response = await fetch(GOOGLE_SHEETS_CONFIG.webAppUrl + '?action=status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        configured: true,
        sheetUrl: GOOGLE_SHEETS_CONFIG.sheetUrl,
        webAppUrl: GOOGLE_SHEETS_CONFIG.webAppUrl,
        ...result
      };
    } catch (error) {
      console.error('Error getting sheet status:', error);
      return {
        success: false,
        configured: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();