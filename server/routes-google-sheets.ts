import type { Express } from "express";
import { google } from 'googleapis';
import { storage } from "./storage";
import { googleSheetsService } from "./services/google-sheets-service";

export function registerGoogleSheetsRoutes(app: Express) {
  // Google Sheets status endpoint
  app.get("/api/google/sheets/status", async (req, res) => {
    try {
      const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      const sheetStatus = await googleSheetsService.getSheetStatus();
      
      res.json({
        success: true,
        configured: isConfigured && sheetStatus.success,
        isAuthenticated: req.isAuthenticated(),
        authUrl: isConfigured ? "/api/auth/google" : null,
        requiredEnvVars: isConfigured ? [] : ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
        sheetUrl: sheetStatus.sheetUrl,
        webAppUrl: sheetStatus.webAppUrl
      });
    } catch (error) {
      console.error("Error checking Google Sheets status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check Google Sheets status"
      });
    }
  });

  // Create or connect to Google Sheet
  app.post("/api/google/sheets/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    try {
      // This would require storing OAuth tokens in the user record
      // For now, return a success message with instructions
      res.json({
        success: true,
        message: "Google Sheets integration ready. Use the sync endpoints to transfer data.",
        sheetUrl: "https://docs.google.com/spreadsheets/"
      });
    } catch (error) {
      console.error("Error creating Google Sheet:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create Google Sheet"
      });
    }
  });

  // Sync inventory to Google Sheets
  app.post("/api/google/sheets/sync/inventory", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    try {
      const items = await storage.getItems();
      const result = await googleSheetsService.syncInventoryToSheets(items);
      
      res.json(result);
    } catch (error) {
      console.error("Error syncing inventory to Google Sheets:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to sync inventory to Google Sheets"
      });
    }
  });

  // Sync sales to Google Sheets
  app.post("/api/google/sheets/sync/sales", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    try {
      const sales = await storage.getSales();
      const result = await googleSheetsService.syncSalesToSheets(sales);
      
      res.json(result);
    } catch (error) {
      console.error("Error syncing sales to Google Sheets:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to sync sales to Google Sheets"
      });
    }
  });

  // Shopify webhook handler for order processing
  app.post("/api/shopify/webhook/order", async (req, res) => {
    try {
      const orderData = req.body;
      console.log('Received Shopify order webhook:', orderData.id);

      // Process the order data
      const processedOrder = {
        orderId: orderData.id?.toString() || '',
        customerEmail: orderData.email || '',
        lineItems: orderData.line_items?.map((item: any) => ({
          sku: item.sku || '',
          title: item.title || '',
          quantity: item.quantity || 0,
          price: item.price || '0'
        })) || [],
        totalPrice: orderData.total_price || '0',
        orderDate: orderData.created_at || new Date().toISOString()
      };

      // Send to Google Sheets for processing
      const result = await googleSheetsService.processShopifyOrder(processedOrder);

      // Update local inventory based on order
      for (const lineItem of processedOrder.lineItems) {
        if (lineItem.sku) {
          try {
            const items = await storage.getItems();
            const item = items.find(i => i.sku === lineItem.sku);
            
            if (item && item.quantity >= lineItem.quantity) {
              await storage.updateItem(item.id, { 
                quantity: item.quantity - lineItem.quantity 
              });
              console.log(`Updated inventory for ${lineItem.sku}: ${item.quantity} -> ${item.quantity - lineItem.quantity}`);
            } else {
              console.warn(`Insufficient inventory for SKU ${lineItem.sku}. Available: ${item?.quantity || 0}, Required: ${lineItem.quantity}`);
            }
          } catch (error) {
            console.error(`Error updating inventory for SKU ${lineItem.sku}:`, error);
          }
        }
      }

      res.json({
        success: true,
        message: "Order processed successfully",
        orderId: processedOrder.orderId
      });
    } catch (error) {
      console.error('Error processing Shopify webhook:', error);
      res.status(500).json({
        success: false,
        message: "Failed to process order webhook"
      });
    }
  });

  // Webhook configuration helper
  app.get("/api/shopify/webhook/url", (req, res) => {
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/shopify/webhook/order`;
    res.json({
      success: true,
      webhookUrl,
      instructions: "Add this URL as a webhook in your Shopify admin for order/paid events"
    });
  });

  // Import from Google Sheets (placeholder for future OAuth implementation)
  app.post("/api/google/sheets/import", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    res.json({
      success: false,
      message: "Google Sheets import requires OAuth token storage. Please use CSV import for now.",
      alternative: "/csv-validator"
    });
  });
}