import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { 
  insertItemSchema, 
  insertMarketplaceSchema, 
  insertSaleSchema,
  csvExportSchema, 
  aiAnalysisSchema,
  reportSchema
} from "@shared/schema";
import { analyzeImage } from "./services/vision";
import { generateSEOContent } from "./services/openai";
import { generateSKU, generateBarcodeData, generateQRCodeDataURL } from "./services/barcode";
import { Parser } from "@json2csv/plainjs";
import { syncWithShopify, syncItemWithShopify } from "./services/shopify";
import fs from "fs";
import { promisify } from "util";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Item Routes
  app.get("/api/items", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", upload.array("files", 5), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const fileUrls = files?.map((file, index) => {
        // In a real application, we would upload files to cloud storage
        // For now, we'll create dummy URLs
        return `https://storage.example.com/item-${Date.now()}-${index}.jpg`;
      }) || [];
      
      // Prepare the item data
      const itemData = {
        ...req.body,
        images: fileUrls,
        price: parseFloat(req.body.price),
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        marketplace: req.body.marketplace ? JSON.parse(req.body.marketplace) : [],
        aiEnhanced: req.body.aiEnhanced === "true",
        aiTags: req.body.aiTags ? JSON.parse(req.body.aiTags) : [],
      };
      
      // Generate SKU if not provided
      if (!itemData.sku) {
        itemData.sku = generateSKU(itemData);
      }
      
      // Generate barcode data
      itemData.barcode = generateBarcodeData(itemData.sku);
      
      // Parse the data through Zod schema
      const parsedData = insertItemSchema.parse(itemData);
      
      // Create the item in storage
      const item = await storage.createItem(parsedData);
      
      // Generate QR code (requires the item ID, so we do this after creation)
      const qrCodeDataURL = await generateQRCodeDataURL(item);
      
      // Update the item with the QR code data
      const updatedItem = await storage.updateItem(item.id, { qrCode: qrCodeDataURL });
      
      res.status(201).json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.patch("/api/items/:id", upload.array("files", 5), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const files = req.files as Express.Multer.File[];
      const fileUrls = files?.map((file, index) => {
        return `https://storage.example.com/item-${Date.now()}-${index}.jpg`;
      }) || [];
      
      const existingItem = await storage.getItem(id);
      
      if (!existingItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Parse form data for update
      const updateData: any = { ...req.body };
      
      // Handle numeric values
      if (updateData.price) {
        updateData.price = parseFloat(updateData.price);
      }
      
      // Handle JSON fields
      ["tags", "marketplace", "aiTags", "images"].forEach(field => {
        if (updateData[field]) {
          try {
            updateData[field] = JSON.parse(updateData[field]);
          } catch (e) {
            // If not valid JSON, leave as is
          }
        }
      });
      
      // Handle boolean fields
      if (updateData.aiEnhanced !== undefined) {
        updateData.aiEnhanced = updateData.aiEnhanced === "true";
      }
      
      // Add new images if any
      if (fileUrls.length > 0) {
        updateData.images = [...(existingItem.images || []), ...fileUrls];
      }
      
      const updatedItem = await storage.updateItem(id, updateData);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteItem(id);
      
      if (!success) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Marketplace Routes
  app.get("/api/marketplaces", async (_req: Request, res: Response) => {
    try {
      const marketplaces = await storage.getMarketplaces();
      res.json(marketplaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch marketplaces" });
    }
  });

  app.post("/api/marketplaces", async (req: Request, res: Response) => {
    try {
      const parsedData = insertMarketplaceSchema.parse(req.body);
      const marketplace = await storage.createMarketplace(parsedData);
      res.status(201).json(marketplace);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create marketplace" });
    }
  });

  app.post("/api/marketplaces/:id/connect", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedMarketplace = await storage.connectMarketplace(id);
      
      if (!updatedMarketplace) {
        return res.status(404).json({ error: "Marketplace not found" });
      }
      
      res.json(updatedMarketplace);
    } catch (error) {
      res.status(500).json({ error: "Failed to connect marketplace" });
    }
  });

  // AI Analysis Route
  app.post("/api/analyze-image", upload.single("image"), async (req: Request, res: Response) => {
    try {
      console.log("Analyze image request received");
      console.log("Request headers:", req.headers);
      console.log("Request file:", req.file ? "File exists" : "No file");
      console.log("File details:", req.file);
      
      if (!req.file) {
        console.log("No file found in request");
        return res.status(400).json({ error: "No image provided" });
      }

      // Import the OpenAI Vision service
      const { analyzeImageWithOpenAI } = await import("./services/vision-openai");
      
      const imageBuffer = req.file.buffer;
      console.log("Image buffer size:", imageBuffer.length);
      
      const analysisResult = await analyzeImageWithOpenAI(imageBuffer);
      console.log("Analysis completed successfully");
      
      res.json(analysisResult);
    } catch (error) {
      console.error("Image analysis error:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // SEO Content Generation Route
  app.post("/api/generate-seo", async (req: Request, res: Response) => {
    try {
      const { itemDescription, category } = req.body;
      
      if (!itemDescription) {
        return res.status(400).json({ error: "Item description is required" });
      }
      
      const seoContent = await generateSEOContent(itemDescription, category);
      res.json(seoContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate SEO content" });
    }
  });

  // CSV Export Route
  app.post("/api/export-csv", async (req: Request, res: Response) => {
    try {
      const validatedData = csvExportSchema.parse(req.body);
      const { items: itemIds, marketplaces: marketplaceNames } = validatedData;
      
      // Get items
      const allItems = await storage.getItems();
      const selectedItems = allItems.filter(item => itemIds.includes(item.id));
      
      // Transform data for CSV format based on marketplace requirements
      const csvData = selectedItems.map(item => ({
        Title: item.seoTitle || item.name,
        Description: item.seoDescription || item.description,
        Price: item.price.toString(),
        Category: item.category,
        Condition: item.condition,
        Images: (item.images as string[]).join("|"),
        Tags: (item.tags as string[]).join("|"),
        Marketplaces: marketplaceNames.join("|"),
      }));
      
      // Generate CSV
      const parser = new Parser({
        fields: ["Title", "Description", "Price", "Category", "Condition", "Images", "Tags", "Marketplaces"]
      });
      const csv = parser.parse(csvData);
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=marketplace-listings-${Date.now()}.csv`);
      res.status(200).send(csv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to generate CSV export" });
    }
  });

  // Barcode and QR code route for printing
  app.get("/api/items/:id/codes", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Regenerate QR code data URL if it doesn't exist
      if (!item.qrCode) {
        const qrCodeDataURL = await generateQRCodeDataURL(item);
        const updatedItem = await storage.updateItem(id, { qrCode: qrCodeDataURL });
        res.json({
          sku: updatedItem.sku,
          barcode: updatedItem.barcode,
          qrCode: updatedItem.qrCode,
          name: updatedItem.name,
          price: updatedItem.price,
          category: updatedItem.category,
          quantity: updatedItem.quantity
        });
      } else {
        res.json({
          sku: item.sku,
          barcode: item.barcode,
          qrCode: item.qrCode,
          name: item.name,
          price: item.price,
          category: item.category,
          quantity: item.quantity
        });
      }
    } catch (error) {
      console.error("Failed to generate codes:", error);
      res.status(500).json({ error: "Failed to generate barcode/QR code" });
    }
  });
  
  // Route for scanning a barcode/QR code and updating inventory
  app.post("/api/scan", async (req: Request, res: Response) => {
    try {
      const { sku, action, quantity = 1 } = req.body;
      
      if (!sku) {
        return res.status(400).json({ error: "SKU is required" });
      }
      
      if (!action || !["add", "remove", "check"].includes(action)) {
        return res.status(400).json({ error: "Valid action is required (add, remove, or check)" });
      }
      
      // Find the item by SKU
      const items = await storage.getItems();
      const item = items.find(item => item.sku === sku);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found with the provided SKU" });
      }
      
      let updatedItem = item;
      let shopifySyncResult = { status: 'not_required' };
      
      // Perform the requested action
      if (action === "add") {
        const newQuantity = item.quantity + quantity;
        updatedItem = await storage.updateItem(item.id, { quantity: newQuantity });
        
        // Sync with Shopify if inventory was modified
        if (updatedItem && item.marketplace && (item.marketplace as string[]).includes('shopify')) {
          console.log(`Syncing inventory add to Shopify for ${updatedItem.name}`);
          const syncSuccess = await syncItemWithShopify(updatedItem);
          shopifySyncResult = { status: syncSuccess ? 'success' : 'failed', action: 'add' };
        }
      } else if (action === "remove") {
        // Prevent negative inventory
        const newQuantity = Math.max(0, item.quantity - quantity);
        updatedItem = await storage.updateItem(item.id, { quantity: newQuantity });
        
        // Sync with Shopify if inventory was modified
        if (updatedItem && item.marketplace && (item.marketplace as string[]).includes('shopify')) {
          console.log(`Syncing inventory removal to Shopify for ${updatedItem.name}`);
          const syncSuccess = await syncItemWithShopify(updatedItem);
          shopifySyncResult = { status: syncSuccess ? 'success' : 'failed', action: 'remove' };
        }
      }
      
      res.json({
        id: updatedItem.id,
        name: updatedItem.name,
        sku: updatedItem.sku,
        quantity: updatedItem.quantity,
        price: updatedItem.price,
        action: action,
        shopifySyncResult
      });
    } catch (error) {
      console.error("Error during scan operation:", error);
      res.status(500).json({ error: "Failed to process scan" });
    }
  });

  // Stats for dashboard
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const marketplaces = await storage.getMarketplaces();
      
      const totalItems = items.length;
      const listedItems = items.filter(item => item.status === "listed").length;
      const aiEnhancedItems = items.filter(item => item.aiEnhanced).length;
      
      // Calculate estimated revenue (sum of all listed item prices)
      const revenue = items
        .filter(item => item.status === "listed")
        .reduce((sum, item) => sum + item.price, 0);
      
      res.json({
        inventory: {
          total: totalItems,
          listed: listedItems,
          aiEnhanced: aiEnhancedItems,
          revenue: revenue
        },
        marketplaces: {
          total: marketplaces.length,
          connected: marketplaces.filter(m => m.isConnected).length
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Image optimization route
  app.post("/api/optimize-image", upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Import image optimization service
      const { optimizeImage, generateAltText } = await import('./services/image-optimization');

      // Parse optimization options from request
      const quality = req.body.quality ? parseInt(req.body.quality) : 80;
      const format = req.body.format as 'jpeg' | 'png' | 'webp' | 'avif' || 'webp';
      const width = req.body.width ? parseInt(req.body.width) : undefined;
      const height = req.body.height ? parseInt(req.body.height) : undefined;
      const generateAltTextParam = req.body.generateAltText === 'true';
      const maintainAspectRatio = req.body.maintainAspectRatio !== 'false';

      // Optimize the image
      const result = await optimizeImage(req.file.buffer, {
        quality,
        format,
        width,
        height,
        fit: maintainAspectRatio ? 'contain' : 'fill',
        generateAltText: generateAltTextParam,
      });

      // For demo purposes, we're returning a Base64 data URL
      // In production, you would save to cloud storage and return a URL
      const base64Image = result.buffer.toString('base64');
      const dataUrl = `data:image/${result.format};base64,${base64Image}`;

      res.json({
        url: dataUrl,
        size: result.size,
        width: result.width,
        height: result.height,
        format: result.format,
        altText: result.altText,
        originalSize: result.originalSize,
        compressionRatio: result.compressionRatio,
      });
    } catch (error) {
      console.error('Error optimizing image:', error);
      res.status(500).json({ error: "Failed to optimize image" });
    }
  });

  // Bulk image optimization route
  app.post("/api/optimize-images/bulk", upload.array("images", 20), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      // Import image optimization service
      const { optimizeImage } = await import('./services/image-optimization');

      // Parse optimization options from request
      const quality = req.body.quality ? parseInt(req.body.quality) : 80;
      const format = req.body.format as 'jpeg' | 'png' | 'webp' | 'avif' || 'webp';
      const width = req.body.width ? parseInt(req.body.width) : undefined;
      const height = req.body.height ? parseInt(req.body.height) : undefined;
      const generateAltTextParam = req.body.generateAltText === 'true';

      // Process each image
      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const result = await optimizeImage(file.buffer, {
              quality,
              format,
              width,
              height,
              generateAltText: generateAltTextParam,
            });

            // For demo purposes, return as base64
            // In production, save to cloud storage
            const base64Image = result.buffer.toString('base64');
            const dataUrl = `data:image/${result.format};base64,${base64Image}`;

            return {
              originalName: file.originalname,
              url: dataUrl,
              size: result.size,
              width: result.width,
              height: result.height,
              format: result.format,
              altText: result.altText,
              originalSize: result.originalSize,
              compressionRatio: result.compressionRatio,
              status: 'success',
            };
          } catch (error) {
            console.error(`Error optimizing image ${file.originalname}:`, error);
            return {
              originalName: file.originalname,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      // Calculate overall stats
      const successful = results.filter(r => r.status === 'success');
      const originalTotalSize = successful.reduce((sum, img) => sum + (img.originalSize || 0), 0);
      const optimizedTotalSize = successful.reduce((sum, img) => sum + (img.size || 0), 0);
      const totalSavings = originalTotalSize - optimizedTotalSize;
      const savingsPercent = originalTotalSize > 0 ? Math.round((totalSavings / originalTotalSize) * 100) : 0;

      res.json({
        results,
        stats: {
          totalProcessed: files.length,
          successful: successful.length,
          failed: results.length - successful.length,
          originalTotalSize,
          optimizedTotalSize,
          totalSavings,
          savingsPercent,
        },
      });
    } catch (error) {
      console.error('Error in bulk image optimization:', error);
      res.status(500).json({ error: "Failed to optimize images" });
    }
  });

  // Analyze image optimization potential
  app.post("/api/analyze-image-seo", upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Import image analysis function
      const { analyzeSEOPotential, generateAltText } = await import('./services/image-optimization');

      // Analyze SEO potential
      const analysis = await analyzeSEOPotential(req.file.buffer);
      
      // Generate alt text if requested
      if (req.body.generateAltText === 'true') {
        analysis.suggestedAltText = await generateAltText(req.file.buffer);
      }

      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing image SEO:', error);
      res.status(500).json({ error: "Failed to analyze image SEO potential" });
    }
  });

  // CSV Import route with Shopify synchronization
  app.post("/api/items/import-csv", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file provided" });
      }
      
      // Parse CSV file
      const fileContent = req.file.buffer.toString('utf8');
      const rows = fileContent.split('\\n').map(row => row.split(',').map(cell => cell.trim()));
      const headers = rows[0];
      
      // Map CSV headers to schema fields
      const fieldMap: Record<string, string> = {
        'name': 'name',
        'title': 'name',
        'product name': 'name',
        'description': 'description',
        'price': 'price',
        'cost': 'price',
        'quantity': 'quantity',
        'qty': 'quantity',
        'stock': 'quantity',
        'sku': 'sku',
        'item number': 'sku',
        'product id': 'sku',
        'category': 'category',
        'condition': 'condition',
        'status': 'status'
      };
      
      // Find index for each field
      const fieldIndices: Record<string, number> = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase();
        for (const [csvField, schemaField] of Object.entries(fieldMap)) {
          if (normalizedHeader === csvField) {
            fieldIndices[schemaField] = index;
          }
        }
      });
      
      // Verify required fields
      const requiredFields = ['name', 'price', 'quantity'];
      const missingFields = requiredFields.filter(field => fieldIndices[field] === undefined);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: "Missing required fields in CSV", 
          missingFields 
        });
      }
      
      // Process data rows (skip header)
      const dataRows = rows.slice(1).filter(row => row.length >= headers.length);
      const importedItems: any[] = [];
      
      for (const row of dataRows) {
        try {
          // Extract data from row
          const itemData: Record<string, any> = {
            name: row[fieldIndices['name']],
            description: fieldIndices['description'] !== undefined ? row[fieldIndices['description']] : '',
            price: parseFloat(row[fieldIndices['price']]),
            quantity: parseInt(row[fieldIndices['quantity']]),
            status: fieldIndices['status'] !== undefined ? row[fieldIndices['status']] : 'draft',
            category: fieldIndices['category'] !== undefined ? row[fieldIndices['category']] : 'uncategorized',
            condition: fieldIndices['condition'] !== undefined ? row[fieldIndices['condition']] : 'used',
            tags: [],
            images: [],
            marketplace: [],
            aiEnhanced: false,
            aiTags: []
          };
          
          // Generate SKU if not provided
          if (fieldIndices['sku'] !== undefined && row[fieldIndices['sku']]) {
            itemData.sku = row[fieldIndices['sku']];
          } else {
            itemData.sku = generateSKU(itemData);
          }
          
          // Generate barcode data
          itemData.barcode = generateBarcodeData(itemData.sku);
          
          // Validate and create item
          const parsedData = insertItemSchema.parse(itemData);
          const item = await storage.createItem(parsedData);
          
          // Generate QR code
          const qrCodeDataURL = await generateQRCodeDataURL(item);
          const updatedItem = await storage.updateItem(item.id, { qrCode: qrCodeDataURL });
          
          if (updatedItem) {
            importedItems.push(updatedItem);
          }
        } catch (error) {
          console.error('Error processing row:', error);
          // Continue with next row
        }
      }
      
      // Synchronize with Shopify if requested
      const syncToShopify = req.body.syncToShopify === 'true';
      let syncResults = null;
      
      if (syncToShopify && importedItems.length > 0) {
        syncResults = await syncWithShopify(importedItems);
      }
      
      res.status(201).json({
        success: true,
        importedCount: importedItems.length,
        totalRows: dataRows.length,
        syncResults
      });
    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ 
        error: "Failed to import items from CSV",
        details: error.message
      });
    }
  });

  // Sales API Routes
  app.get("/api/sales", async (_req: Request, res: Response) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales data" });
    }
  });

  app.get("/api/sales/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const sale = await storage.getSale(id);
      
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sale data" });
    }
  });

  app.post("/api/sales", async (req: Request, res: Response) => {
    try {
      // Validate using the sale schema
      const parsedData = insertSaleSchema.parse(req.body);
      
      // If itemSku is provided instead of itemId, look up the item
      if (req.body.itemSku && !parsedData.itemId) {
        const items = await storage.getItems();
        const item = items.find(item => item.sku === req.body.itemSku);
        
        if (!item) {
          return res.status(404).json({ error: "Item not found with provided SKU" });
        }
        
        parsedData.itemId = item.id;
      }
      
      const sale = await storage.createSale(parsedData);
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create sale:", error);
      res.status(500).json({ error: "Failed to record sale" });
    }
  });

  app.patch("/api/sales/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Check if sale exists
      const existingSale = await storage.getSale(id);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      
      const updatedSale = await storage.updateSale(id, updateData);
      res.json(updatedSale);
    } catch (error) {
      console.error("Failed to update sale:", error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  app.delete("/api/sales/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSale(id);
      
      if (!success) {
        return res.status(404).json({ error: "Sale not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete sale" });
    }
  });

  // Analytics API Routes
  app.post("/api/analytics/report", async (req: Request, res: Response) => {
    try {
      const params = reportSchema.parse(req.body);
      const report = await storage.getSalesReport(params);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to generate report:", error);
      res.status(500).json({ error: "Failed to generate sales report" });
    }
  });

  app.post("/api/analytics/time-series", async (req: Request, res: Response) => {
    try {
      const params = reportSchema.parse(req.body);
      const timeSeries = await storage.getSalesTimeSeries(params);
      res.json(timeSeries);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to generate time series:", error);
      res.status(500).json({ error: "Failed to generate time series data" });
    }
  });

  app.get("/api/analytics/top-items", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const topItems = await storage.getTopSellingItems(limit);
      res.json(topItems);
    } catch (error) {
      console.error("Failed to fetch top items:", error);
      res.status(500).json({ error: "Failed to fetch top selling items" });
    }
  });

  app.get("/api/analytics/sales-by-marketplace", async (_req: Request, res: Response) => {
    try {
      const salesByMarketplace = await storage.getSalesByMarketplace();
      res.json(salesByMarketplace);
    } catch (error) {
      console.error("Failed to fetch marketplace sales:", error);
      res.status(500).json({ error: "Failed to fetch sales by marketplace" });
    }
  });

  app.get("/api/analytics/sales-by-category", async (_req: Request, res: Response) => {
    try {
      const salesByCategory = await storage.getSalesByCategory();
      res.json(salesByCategory);
    } catch (error) {
      console.error("Failed to fetch category sales:", error);
      res.status(500).json({ error: "Failed to fetch sales by category" });
    }
  });

  // Stats API route update to include sales data
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const marketplaces = await storage.getMarketplaces();
      const sales = await storage.getSales();
      
      // Calculate revenue
      const revenue = sales.reduce((total, sale) => 
        total + (sale.salePrice * sale.quantity), 0);
      
      // Count listed items
      const listedItems = items.filter(item => item.status === "listed").length;
      
      // Count AI-enhanced items
      const aiEnhancedItems = items.filter(item => item.aiEnhanced).length;
      
      // Count connected marketplaces
      const connectedMarketplaces = marketplaces.filter(m => m.isConnected).length;
      
      res.json({
        inventory: {
          total: items.length,
          listed: listedItems,
          aiEnhanced: aiEnhancedItems,
          revenue: revenue
        },
        marketplaces: {
          total: marketplaces.length,
          connected: connectedMarketplaces
        },
        sales: {
          total: sales.length,
          revenue: revenue,
          lastWeek: sales.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            return saleDate >= lastWeek;
          }).length
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
