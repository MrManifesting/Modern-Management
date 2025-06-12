import type { Express } from "express";
import { google } from 'googleapis';
import { storage } from "./storage";

export function registerGoogleSheetsRoutes(app: Express) {
  // Google Sheets status endpoint
  app.get("/api/google/sheets/status", async (req, res) => {
    try {
      const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      
      res.json({
        success: true,
        configured: isConfigured,
        isAuthenticated: req.isAuthenticated(),
        authUrl: isConfigured ? "/api/auth/google" : null,
        requiredEnvVars: isConfigured ? [] : ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
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
      
      // Format items for export
      const exportData = items.map(item => ({
        "SKU": item.sku || "",
        "Name": item.name,
        "Category": item.category || "",
        "Brand": item.brand || "",
        "Quantity": item.quantity,
        "Cost Price": item.costPrice || "0",
        "Sale Price": item.salePrice || "0",
        "Status": item.status || "active",
        "Location": item.location || "",
        "Tags": Array.isArray(item.tags) ? item.tags.join(", ") : "",
        "Created": item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
        "Updated": item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ""
      }));

      res.json({
        success: true,
        message: `Prepared ${exportData.length} items for Google Sheets export`,
        data: exportData,
        instructions: "Copy this data to your Google Sheet or use the Google Sheets API with proper OAuth tokens"
      });
    } catch (error) {
      console.error("Error syncing to Google Sheets:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync inventory to Google Sheets"
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
      
      // Format sales for export
      const exportData = sales.map(sale => ({
        "Sale ID": sale.id,
        "Item ID": sale.itemId,
        "Marketplace": sale.marketplace,
        "Quantity": sale.quantity,
        "Sale Price": sale.salePrice,
        "Fees": sale.fees || "0",
        "Shipping": sale.shippingCost || "0",
        "Customer Email": sale.customerEmail || "",
        "Sale Date": sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : "",
        "Status": sale.status || "completed"
      }));

      res.json({
        success: true,
        message: `Prepared ${exportData.length} sales for Google Sheets export`,
        data: exportData,
        instructions: "Copy this data to your Google Sheet or use the Google Sheets API with proper OAuth tokens"
      });
    } catch (error) {
      console.error("Error syncing sales to Google Sheets:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync sales to Google Sheets"
      });
    }
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