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
        return res.status(400).json({ error: "SKU is required" });
      }
      
      // Generate barcode data URL
      const barcodeData = generateBarcodeData(sku);
      
      // Return the barcode image
      res.json({ 
        success: true,
        barcode: barcodeData 
      });
    } catch (error) {
      console.error("Error generating barcode:", error);
      res.status(500).json({ 
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
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      
      // Get the item
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (!item.sku) {
        return res.status(400).json({ error: "Item does not have a SKU" });
      }
      
      // Generate barcode data URL
      const barcodeData = generateBarcodeData(item.sku);
      
      // Return the barcode image
      res.json({ 
        success: true,
        barcode: barcodeData,
        sku: item.sku,
        item: {
          id: item.id,
          name: item.name,
          category: item.category
        }
      });
    } catch (error) {
      console.error("Error generating barcode for item:", error);
      res.status(500).json({ 
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
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      
      // Get the item
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (!item.sku) {
        return res.status(400).json({ error: "Item does not have a SKU" });
      }
      
      // Generate color-coded barcode SVG
      const svgBarcode = generateColorCodedBarcodeSVG(item);
      
      // Get the color codes
      const { primaryColor, secondaryColor, colorClass } = getItemColorCodes(item);
      
      // Return the barcode SVG and color information
      res.json({ 
        success: true,
        barcodeSvg: svgBarcode,
        sku: item.sku,
        primaryColor,
        secondaryColor,
        colorClass,
        item: {
          id: item.id,
          name: item.name,
          category: item.category,
          subcategory: item.subcategory
        }
      });
    } catch (error) {
      console.error("Error generating color-coded barcode:", error);
      res.status(500).json({ 
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
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      
      // Get the item
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (!item.sku) {
        return res.status(400).json({ error: "Item does not have a SKU" });
      }
      
      // Generate barcode SVG
      const barcodeSvg = generateBarcodeSVG(item.sku);
      
      // Generate printable HTML
      const html = generateColorBarcodeHtml(item, barcodeSvg);
      
      // Return HTML content
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error generating printable barcode:", error);
      res.status(500).json({ 
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
      console.error("Error getting category colors:", error);
      res.status(500).json({ 
        error: "Failed to get category colors",
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}