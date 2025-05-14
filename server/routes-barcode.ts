/**
 * Routes for barcode generation and printing
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { generateBarcodeData, generateBarcodeSVG, generateColorCodedBarcodeSVG } from "./services/barcode";
import { generateColorBarcodeHtml, getItemColorCodes, CATEGORY_COLORS } from "./services/color-code";

/**
 * Register barcode routes
 */
export function registerBarcodeRoutes(app: Express, storage: IStorage) {
  /**
   * Get a barcode by SKU
   */
  app.get("/api/barcodes/:sku", async (req: Request, res: Response) => {
    try {
      const sku = req.params.sku;
      if (!sku) {
        return res.status(400).json({ success: false, error: "SKU is required" });
      }

      const barcodeData = generateBarcodeData(sku);
      res.json({
        success: true,
        barcode: barcodeData
      });
    } catch (error) {
      console.error("Error generating barcode:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate barcode",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get a barcode for an item
   */
  app.get("/api/items/:id/barcode", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ success: false, error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ success: false, error: "Item not found" });
      }

      if (!item.sku) {
        return res.status(400).json({ success: false, error: "Item has no SKU" });
      }

      const barcodeData = generateBarcodeData(item.sku);
      res.json({
        success: true,
        barcode: barcodeData,
        sku: item.sku
      });
    } catch (error) {
      console.error("Error generating item barcode:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate barcode for item",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get a color-coded barcode for an item
   */
  app.get("/api/items/:id/color-barcode", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ success: false, error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ success: false, error: "Item not found" });
      }

      if (!item.sku) {
        return res.status(400).json({ success: false, error: "Item has no SKU" });
      }

      // Generate a color-coded barcode SVG
      const barcodeSvg = generateColorCodedBarcodeSVG(item);
      
      // Get color information for the item
      const { primaryColor, secondaryColor, colorClass } = getItemColorCodes(item);

      res.json({
        success: true,
        barcodeSvg,
        primaryColor,
        secondaryColor,
        colorClass,
        sku: item.sku,
        category: item.category
      });
    } catch (error) {
      console.error("Error generating color-coded barcode:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate color-coded barcode",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get a printable HTML page with a color-coded barcode
   */
  app.get("/api/items/:id/printable-barcode", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ success: false, error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ success: false, error: "Item not found" });
      }

      if (!item.sku) {
        return res.status(400).json({ success: false, error: "Item has no SKU" });
      }

      // Generate a standard barcode SVG
      const barcodeSvg = generateBarcodeSVG(item.sku);
      
      // Generate an HTML page with the color-coded barcode
      const printableHtml = generateColorBarcodeHtml(item, barcodeSvg);

      // Send as HTML
      res.setHeader('Content-Type', 'text/html');
      res.send(printableHtml);
    } catch (error) {
      console.error("Error generating printable barcode:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate printable barcode",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get all available category colors
   */
  app.get("/api/category-colors", (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        colors: CATEGORY_COLORS
      });
    } catch (error) {
      console.error("Error fetching category colors:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch category colors",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}