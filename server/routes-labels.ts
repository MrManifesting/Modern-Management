/**
 * Routes for label generation and printing
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { generateLabelHTML, generateBatchLabels, validateLabelOptions, LabelData, LabelOptions } from "./services/label-generator";

/**
 * Register label generation routes
 */
export function registerLabelRoutes(app: Express, storage: IStorage) {
  
  /**
   * Generate a single label for an item
   */
  app.post("/api/items/:id/label", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const options = validateLabelOptions(req.body);
      
      const labelData: LabelData = {
        sku: item.sku || '',
        name: item.name,
        quantity: item.quantity || 0,
        price: item.basePrice || undefined,
        weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight || undefined,
        category: item.category || undefined,
        vendor: item.brand || undefined,
        barcode: item.barcode || undefined,
        qrCode: item.qrCode || undefined
      };

      const labelHTML = await generateLabelHTML(labelData, options);
      
      // Return complete HTML page for printing
      const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Label - ${item.name}</title>
          <style>
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .print-container { display: flex; justify-content: center; }
            @media print { 
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Print Label</button>
          </div>
          <div class="print-container">
            ${labelHTML}
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(fullHTML);
    } catch (error) {
      console.error("Error generating label:", error);
      res.status(500).json({ error: "Failed to generate label" });
    }
  });

  /**
   * Generate batch labels for multiple items
   */
  app.post("/api/labels/batch", async (req: Request, res: Response) => {
    try {
      const { itemIds, options: labelOptions } = req.body;
      
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ error: "Item IDs array is required" });
      }

      const options = validateLabelOptions(labelOptions || {});
      const labelDataArray: LabelData[] = [];

      // Fetch all items
      for (const itemId of itemIds) {
        const id = parseInt(itemId);
        if (isNaN(id)) continue;
        
        const item = await storage.getItem(id);
        if (item) {
          labelDataArray.push({
            sku: item.sku || '',
            name: item.name,
            quantity: item.quantity || 0,
            price: item.basePrice || undefined,
            weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight || undefined,
            category: item.category || undefined,
            vendor: item.brand || undefined,
            barcode: item.barcode || undefined,
            qrCode: item.qrCode || undefined
          });
        }
      }

      if (labelDataArray.length === 0) {
        return res.status(404).json({ error: "No valid items found" });
      }

      const batchHTML = await generateBatchLabels(labelDataArray, options);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(batchHTML);
    } catch (error) {
      console.error("Error generating batch labels:", error);
      res.status(500).json({ error: "Failed to generate batch labels" });
    }
  });

  /**
   * Generate labels for items by SKU list
   */
  app.post("/api/labels/by-sku", async (req: Request, res: Response) => {
    try {
      const { skus, options: labelOptions } = req.body;
      
      if (!Array.isArray(skus) || skus.length === 0) {
        return res.status(400).json({ error: "SKUs array is required" });
      }

      const options = validateLabelOptions(labelOptions || {});
      const items = await storage.getItems();
      const labelDataArray: LabelData[] = [];

      // Find items by SKU
      for (const sku of skus) {
        const item = items.find(i => i.sku === sku);
        if (item) {
          labelDataArray.push({
            sku: item.sku || '',
            name: item.name,
            quantity: item.quantity || 0,
            price: item.basePrice || undefined,
            weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight || undefined,
            category: item.category || undefined,
            vendor: item.brand || undefined,
            barcode: item.barcode || undefined,
            qrCode: item.qrCode || undefined
          });
        }
      }

      if (labelDataArray.length === 0) {
        return res.status(404).json({ error: "No valid items found for provided SKUs" });
      }

      const batchHTML = await generateBatchLabels(labelDataArray, options);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(batchHTML);
    } catch (error) {
      console.error("Error generating labels by SKU:", error);
      res.status(500).json({ error: "Failed to generate labels" });
    }
  });

  /**
   * Generate labels for low stock items
   */
  app.post("/api/labels/low-stock", async (req: Request, res: Response) => {
    try {
      const { threshold = 5, options: labelOptions } = req.body;
      const options = validateLabelOptions(labelOptions || {});
      
      const items = await storage.getItems();
      const lowStockItems = items.filter(item => (item.quantity || 0) <= threshold);
      
      if (lowStockItems.length === 0) {
        return res.status(404).json({ error: "No low stock items found" });
      }

      const labelDataArray: LabelData[] = lowStockItems.map(item => ({
        sku: item.sku || '',
        name: item.name,
        quantity: item.quantity || 0,
        price: item.basePrice || undefined,
        weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight || undefined,
        category: item.category || undefined,
        vendor: item.brand || undefined,
        barcode: item.barcode || undefined,
        qrCode: item.qrCode || undefined
      }));

      const batchHTML = await generateBatchLabels(labelDataArray, options);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(batchHTML);
    } catch (error) {
      console.error("Error generating low stock labels:", error);
      res.status(500).json({ error: "Failed to generate low stock labels" });
    }
  });

  /**
   * Get label preview (JSON format for UI preview)
   */
  app.get("/api/items/:id/label-preview", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const previewData = {
        sku: item.sku,
        name: item.name,
        quantity: item.quantity || 0,
        price: item.basePrice || null,
        weight: item.weight || null,
        category: item.category || null,
        vendor: item.brand || null,
        hasBarcode: !!item.barcode,
        hasQRCode: !!item.qrCode
      };

      res.json(previewData);
    } catch (error) {
      console.error("Error generating label preview:", error);
      res.status(500).json({ error: "Failed to generate label preview" });
    }
  });

  /**
   * Get available label formats and options
   */
  app.get("/api/labels/formats", (_req: Request, res: Response) => {
    try {
      const formats = {
        formats: [
          { value: 'standard', label: 'Standard Label', description: 'Clean, professional look with rounded corners' },
          { value: 'compact', label: 'Compact Label', description: 'Minimal spacing for small labels' },
          { value: 'detailed', label: 'Detailed Label', description: 'Enhanced design with header section' },
          { value: 'thermal', label: 'Thermal Printer', description: 'Optimized for thermal printers' }
        ],
        sizes: [
          { value: 'small', label: 'Small (2.25" x 1.25")', description: 'Address label size' },
          { value: 'medium', label: 'Medium (3" x 2")', description: 'Standard shipping label' },
          { value: 'large', label: 'Large (4" x 3")', description: 'Product label with detailed info' }
        ],
        options: [
          { key: 'includeBarcode', label: 'Include Barcode', default: true },
          { key: 'includeQRCode', label: 'Include QR Code', default: false },
          { key: 'includePrice', label: 'Include Price', default: false },
          { key: 'includeWeight', label: 'Include Weight', default: false },
          { key: 'includeDate', label: 'Include Date', default: false }
        ]
      };

      res.json(formats);
    } catch (error) {
      console.error("Error fetching label formats:", error);
      res.status(500).json({ error: "Failed to fetch label formats" });
    }
  });
}