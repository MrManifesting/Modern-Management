import { Request, Response } from 'express';
import { importShopifyCSV } from './services/shopify-import';
import { IStorage } from './storage';
import { generateBarcodeData, generateQRCodeDataURL } from './services/barcode';
import multer from 'multer';

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Register Shopify import routes
 */
export function registerShopifyImportRoutes(app: any, storage: IStorage) {
  // Special endpoint just for Shopify imports
  app.post("/api/items/import-shopify", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      
      // Process the CSV content
      const result = await importShopifyCSV(
        csvContent, 
        storage,
        generateBarcodeData,
        generateQRCodeDataURL
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: "Import failed",
          message: result.message,
          errors: result.errors.slice(0, 5) // Just show the first 5 errors
        });
      }
      
      res.json({ 
        success: true,
        message: result.message,
        items: result.items,
        totalErrors: result.errors.length,
        errors: result.errors.length > 0 ? result.errors.slice(0, 5) : undefined
      });
    } catch (error) {
      console.error("Failed to import Shopify CSV:", error);
      res.status(500).json({ 
        error: "Failed to import Shopify CSV", 
        message: error instanceof Error ? error.message : "Unknown server error"
      });
    }
  });
}