import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import OpenAI from "openai";
import { 
  insertItemSchema, 
  insertMarketplaceSchema, 
  insertSaleSchema,
  csvExportSchema, 
  aiAnalysisSchema,
  reportSchema,
  insertEmployeeSchema,
  insertInventoryActionSchema
} from "@shared/schema";
import { analyzeImage } from "./services/vision";
import { generateSEOContent } from "./services/openai";
import { generateSKU, generateBarcodeData, generateQRCodeDataURL } from "./services/barcode";
import { Parser } from "@json2csv/plainjs";
import { prepareItemForShopify, getPushStatus, setPushStatus, testConnection, pushItemToShopify, getItemPushInfo } from "./services/shopify";
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
  
  // Get item by barcode
  app.get("/api/items/barcode/:barcode", async (req: Request, res: Response) => {
    try {
      const barcode = req.params.barcode;
      const items = await storage.getItems();
      const item = items.find(item => item.barcode === barcode);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found with the provided barcode" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error getting item by barcode:", error);
      res.status(500).json({ error: "Failed to get item by barcode" });
    }
  });
  
  // Get item by SKU
  app.get("/api/items/sku/:sku", async (req: Request, res: Response) => {
    try {
      const sku = req.params.sku;
      const items = await storage.getItems();
      const item = items.find(item => item.sku === sku);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found with the provided SKU" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error getting item by SKU:", error);
      res.status(500).json({ error: "Failed to get item by SKU" });
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
  
  // Shopify Integration Routes
  
  // Get current Shopify push status
  app.get("/api/shopify/status", async (_req: Request, res: Response) => {
    try {
      const status = getPushStatus();
      res.json(status);
    } catch (error) {
      console.error("Failed to get Shopify status:", error);
      res.status(500).json({ error: "Failed to get Shopify integration status" });
    }
  });
  
  // Enable/disable Shopify push
  app.post("/api/shopify/set-push-status", async (req: Request, res: Response) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Invalid request. 'enabled' must be a boolean value." });
      }
      
      const status = setPushStatus(enabled);
      res.json(status);
    } catch (error) {
      console.error("Failed to set Shopify push status:", error);
      res.status(500).json({ error: "Failed to update Shopify integration status" });
    }
  });
  
  // Test Shopify connection
  app.get("/api/shopify/test-connection", async (_req: Request, res: Response) => {
    try {
      const connectionStatus = await testConnection();
      res.json(connectionStatus);
    } catch (error) {
      console.error("Failed to test Shopify connection:", error);
      res.status(500).json({ 
        connected: false,
        store: "",
        message: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
  });
  
  // Synchronize inventory from Shopify to our local database
  app.post("/api/shopify/sync-inventory", async (_req: Request, res: Response) => {
    try {
      // Check if Shopify is configured
      const isConfigured = await isShopifyConfigured();
      if (!isConfigured) {
        return res.status(400).json({
          success: false,
          message: "Shopify integration is not properly configured. Please check your API credentials."
        });
      }
      
      // Perform the synchronization
      const result = await syncProductsFromShopify(storage);
      
      res.json({
        success: true,
        ...result,
        message: `Successfully synced ${result.total} products from Shopify. Imported: ${result.imported}, Updated: ${result.updated}.`
      });
    } catch (error) {
      console.error("Failed to sync inventory from Shopify:", error);
      res.status(500).json({
        success: false,
        message: `Failed to sync inventory from Shopify: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Prepare an item for Shopify without pushing
  app.get("/api/shopify/prepare-item/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      const pushInfo = await getItemPushInfo(item);
      
      res.json({
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          quantity: item.quantity,
          price: item.price
        },
        shopifyProduct: pushInfo.shopifyProduct,
        canPush: pushInfo.canPush,
        errors: pushInfo.errors,
        shopifyProductUrl: pushInfo.shopifyProductUrl
      });
    } catch (error) {
      console.error("Failed to prepare item for Shopify:", error);
      res.status(500).json({ error: "Failed to prepare item for Shopify" });
    }
  });
  
  // Prepare and optionally sync multiple items
  app.post("/api/shopify/prepare-items", async (req: Request, res: Response) => {
    try {
      const { itemIds } = req.body;
      
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ error: "Invalid request. 'itemIds' must be a non-empty array." });
      }
      
      const items = await storage.getItems();
      const selectedItems = items.filter(item => itemIds.includes(item.id));
      
      if (selectedItems.length === 0) {
        return res.status(404).json({ error: "No valid items found with the provided IDs" });
      }
      
      const results = await Promise.all(selectedItems.map(async (item) => {
        const pushInfo = await getItemPushInfo(item);
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          canPush: pushInfo.canPush,
          errors: pushInfo.errors
        };
      }));
      
      const pushStatus = getPushStatus();
      const readyItems = results.filter(item => item.canPush);
      
      res.json({
        success: true,
        items: results,
        readyCount: readyItems.length,
        totalCount: results.length,
        pushEnabled: pushStatus.pushEnabled,
        message: pushStatus.pushEnabled 
          ? `${readyItems.length} of ${results.length} items are ready to sync with Shopify.` 
          : `${readyItems.length} of ${results.length} items prepared for Shopify. Push to Shopify is currently disabled.`
      });
    } catch (error) {
      console.error("Failed to prepare items for Shopify:", error);
      res.status(500).json({ error: "Failed to prepare items for Shopify" });
    }
  });
  
  // Generate barcode and QR code for an item based on Shopify pattern
  app.get("/api/shopify/codes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Prepare the item to ensure it has a valid SKU
      const shopifyProduct = prepareItemForShopify(item);
      const pushInfo = await getItemPushInfo(item);
      
      if (!pushInfo.canPush) {
        return res.status(400).json({ 
          error: "Unable to generate codes", 
          message: "Item is missing required fields to generate a Shopify-compatible SKU",
          errors: pushInfo.errors
        });
      }
      
      // Generate barcode from SKU
      const barcodeDataURL = await generateBarcodeData(item.sku);
      
      // Generate QR code for Certificate of Analysis if available
      let coaQrDataURL = null;
      const attributes = item.attributes || {};
      
      if (typeof attributes === 'object' && 'coa' in attributes) {
        const coaUrl = (attributes as any).coa;
        if (coaUrl) {
          coaQrDataURL = await generateQRCodeDataURL({ 
            id: item.id, 
            name: item.name, 
            customUrl: coaUrl 
          });
        }
      } else if (item.externalUrl) {
        coaQrDataURL = await generateQRCodeDataURL({ 
          id: item.id, 
          name: item.name, 
          customUrl: item.externalUrl 
        });
      }
      
      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku
        },
        codes: {
          barcode: barcodeDataURL,
          coaQr: coaQrDataURL
        }
      });
    } catch (error) {
      console.error("Failed to generate codes for Shopify:", error);
      res.status(500).json({ error: "Failed to generate Shopify compatible codes" });
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
  
  // Inventory scan and universal barcode lookup
  app.post("/api/scan", async (req: Request, res: Response) => {
    try {
      const { barcode, sku, action, quantity = 1 } = req.body;
      
      // For inventory actions (updating stock)
      if (sku && action) {
        if (!["add", "remove", "check"].includes(action)) {
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
            const pushInfo = await getItemPushInfo(updatedItem);
            
            if (pushInfo.canPush) {
              const result = await pushItemToShopify(pushInfo.shopifyProduct);
              shopifySyncResult = { 
                status: result.success ? 'success' : 'failed', 
                message: result.message 
              };
            } else {
              shopifySyncResult = { 
                status: 'failed', 
                message: 'Item not ready for Shopify push' 
              };
            }
          }
        } else if (action === "remove") {
          // Prevent negative inventory
          const newQuantity = Math.max(0, item.quantity - quantity);
          updatedItem = await storage.updateItem(item.id, { quantity: newQuantity });
          
          // Sync with Shopify if inventory was modified
          if (updatedItem && item.marketplace && (item.marketplace as string[]).includes('shopify')) {
            console.log(`Syncing inventory removal to Shopify for ${updatedItem.name}`);
            const pushInfo = await getItemPushInfo(updatedItem);
            
            if (pushInfo.canPush) {
              const result = await pushItemToShopify(pushInfo.shopifyProduct);
              shopifySyncResult = { 
                status: result.success ? 'success' : 'failed', 
                message: result.message 
              };
            } else {
              shopifySyncResult = { 
                status: 'failed', 
                message: 'Item not ready for Shopify push' 
              };
            }
          }
        }
        
        return res.json({
          id: updatedItem.id,
          name: updatedItem.name,
          sku: updatedItem.sku,
          quantity: updatedItem.quantity,
          price: updatedItem.price,
          action: action,
          shopifySyncResult
        });
      }
      
      // Universal barcode lookup if not updating inventory
      if (barcode) {
        // First check if the barcode exists in our database
        const items = await storage.getItems();
        const existingItem = items.find(item => item.barcode === barcode);
        
        if (existingItem) {
          return res.json(existingItem);
        }
        
        // If not found in our database, perform an external lookup
        try {
          // Use OpenAI to simulate a product database lookup
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          
          // The newest OpenAI model is "gpt-4o" which was released May 13, 2024
          // do not change this unless explicitly requested by the user
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a product database API. When provided with a barcode or UPC code, return realistic product information in JSON format. Include: name, description, category, condition, price, manufacturer, sku, and a price range showing estimated minimum and maximum market prices."
              },
              {
                role: "user",
                content: `Lookup product information for barcode: ${barcode}`
              }
            ],
            response_format: { type: "json_object" }
          });
          
          // Parse the response and return structured product data
          const productInfo = JSON.parse(completion.choices[0].message.content);
          
          // Add the source barcode to the response
          productInfo.barcode = barcode;
          
          return res.json(productInfo);
        } catch (aiError) {
          console.error("Error with external API lookup:", aiError);
          
          // Fallback to providing a basic response
          return res.status(404).json({ 
            error: "Product not found in external database",
            message: "The barcode could not be found in any connected database."
          });
        }
      }
      
      // If neither SKU nor barcode provided
      return res.status(400).json({ error: "Either barcode or SKU is required" });
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

  // No duplicate endpoint needed - universal barcode scanning is now handled by the main /api/scan endpoint
  
  // Generate QR code for employee mobile scanning
  app.post("/api/qrcode/generate", async (req: Request, res: Response) => {
    try {
      const { data, type } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: "QR code data is required" });
      }
      
      // Use qrcode library to generate a QR code
      const QRCode = await import('qrcode');
      
      // For employee QR codes, we can add additional metadata
      let qrData = data;
      
      if (type === 'employee') {
        // Add timestamp and expiration for security
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 7); // 7 day expiration
        
        qrData = JSON.stringify({
          url: data,
          type: 'employee_scanner',
          generated: new Date().toISOString(),
          expires: expiration.toISOString(),
        });
      }
      
      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      
      // Create formatted expiration date for response
      let expirationDate = null;
      if (type === 'employee') {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 7);
        expirationDate = expDate.toISOString();
      }
      
      res.json({
        qrCodeUrl: qrCodeDataURL,
        expires: expirationDate,
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // CSV Import route with support for different product types
  app.post("/api/items/import-csv", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file provided" });
      }
      
      // Parse CSV file handling quotes properly
      const fileContent = req.file.buffer.toString('utf8');
      const rawRows = fileContent.split('\n').filter(row => row.trim() !== '');
      const rows: string[][] = [];
      
      for (const row of rawRows) {
        const parsedRow: string[] = [];
        let currentCell = '';
        let insideQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          if (row[i] === '"' && (i === 0 || row[i-1] !== '\\')) {
            insideQuotes = !insideQuotes;
          } else if (row[i] === ',' && !insideQuotes) {
            parsedRow.push(currentCell.trim().replace(/^"(.*)"$/, '$1'));
            currentCell = '';
          } else if (row[i] === '\t' && !insideQuotes) {
            // Handle tab-delimited files
            parsedRow.push(currentCell.trim().replace(/^"(.*)"$/, '$1'));
            currentCell = '';
          } else {
            currentCell += row[i];
          }
        }
        
        if (currentCell) {
          parsedRow.push(currentCell.trim().replace(/^"(.*)"$/, '$1'));
        }
        
        rows.push(parsedRow);
      }
      
      if (rows.length === 0) {
        return res.status(400).json({ error: "Empty CSV file" });
      }
      
      const headers = rows[0];
      const isStampImport = req.body.isStampImport === 'true';
      const isCannabisImport = req.body.isCannabisImport === 'true' || 
                               (headers.some(h => h.includes('Strain')) && 
                                headers.some(h => h.includes('Tier')));
      
      console.log("CSV Import - Headers:", headers);
      console.log("Import Type:", isStampImport ? "Stamp Collection" : 
                                isCannabisImport ? "Cannabis Inventory" : "Standard Inventory");
      
      // For cannabis import, use the specialized processing function
      if (isCannabisImport) {
        const { processCannabisImport } = await import('./services/cannabis-import');
        const importedItems = await processCannabisImport(rows);
        
        // Synchronize with Shopify if requested
        const syncToShopify = req.body.syncToShopify === 'true';
        let syncResults = null;
        
        if (syncToShopify && importedItems.length > 0) {
          const pushStatus = getPushStatus();
          if (pushStatus.pushEnabled) {
            // Process each item through Shopify push pipeline
            const results = await Promise.all(importedItems.map(async (item) => {
              const pushInfo = await getItemPushInfo(item);
              if (pushInfo.canPush) {
                return await pushItemToShopify(pushInfo.shopifyProduct);
              }
              return { 
                success: false, 
                message: 'Item not ready for Shopify push',
                productId: undefined 
              };
            }));
            
            // Count successful pushes
            const successful = results.filter(r => r.success).length;
            
            syncResults = {
              pushEnabled: true,
              synced: successful,
              failed: importedItems.length - successful,
              totalProcessed: importedItems.length
            };
          } else {
            syncResults = {
              pushEnabled: false,
              message: 'Shopify push is disabled. Enable it in settings to push items.'
            };
          }
        }
        
        return res.status(201).json({
          success: true,
          importedCount: importedItems.length,
          totalRows: rows.length,
          type: 'cannabis_inventory',
          syncResults
        });
      }
      
      // Map CSV headers to schema fields with stamp collection support
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
        'image_filename': 'image',
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
      
      console.log("Field indices:", fieldIndices);
      
      // Different required fields based on import type
      const requiredFields = isStampImport 
        ? ['name', 'price'] 
        : ['name', 'price', 'quantity'];
      
      const missingFields = requiredFields.filter(field => fieldIndices[field] === undefined);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: "Missing required fields in CSV", 
          missingFields 
        });
      }
      
      // Process data rows (skip header)
      const dataRows = rows.slice(1);
      const importedItems: any[] = [];
      
      for (const row of dataRows) {
        try {
          if (row.length < 2) continue; // Skip empty rows
          
          // Extract data from row
          const itemData: Record<string, any> = {
            name: row[fieldIndices['name']],
            description: fieldIndices['description'] !== undefined ? row[fieldIndices['description']] : '',
            price: parseFloat(row[fieldIndices['price']]),
            quantity: fieldIndices['quantity'] !== undefined ? parseInt(row[fieldIndices['quantity']]) : 1, // Default to 1 for stamps
            status: fieldIndices['status'] !== undefined ? row[fieldIndices['status']] : 'draft',
            category: isStampImport ? 'stamps' : (fieldIndices['category'] !== undefined ? row[fieldIndices['category']] : 'uncategorized'),
            condition: fieldIndices['condition'] !== undefined ? row[fieldIndices['condition']] : 'used',
            tags: isStampImport ? ['stamp', 'collectible'] : [],
            images: [],
            marketplace: [],
            aiEnhanced: false,
            aiTags: []
          };
          
          // For stamp collections, extract detailed info and enhance with AI description
          if (isStampImport) {
            // Extract any year or country information from the name
            const yearMatch = itemData.name.match(/\((\d{4})\)/);
            if (yearMatch && yearMatch[1]) {
              const year = yearMatch[1];
              itemData.tags.push(`year-${year}`);
            }
            
            // Extract country information
            const countryMatches = [
              'Austria', 'Germany', 'France', 'Italy', 'Spain', 'UK', 'US', 'Canada', 
              'Japan', 'China', 'Russia', 'Brazil', 'Australia'
            ];
            
            for (const country of countryMatches) {
              if (itemData.name.includes(country)) {
                itemData.tags.push(country.toLowerCase());
                break;
              }
            }
            
            // Add condition tag
            if (itemData.condition) {
              itemData.tags.push(`condition-${itemData.condition.toLowerCase()}`);
            }
          }
          
          // Generate SKU if not provided
          if (fieldIndices['sku'] !== undefined && row[fieldIndices['sku']]) {
            itemData.sku = row[fieldIndices['sku']];
          } else {
            // For stamp collection, create a more specific SKU
            if (isStampImport) {
              const prefix = 'STAMP';
              const namePart = itemData.name.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '');
              const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
              itemData.sku = `${prefix}-${namePart}-${randomPart}`;
            } else {
              itemData.sku = generateSKU(itemData);
            }
          }
          
          // Generate barcode data
          itemData.barcode = generateBarcodeData(itemData.sku);
          
          // Add image reference if available
          if (fieldIndices['image'] !== undefined && row[fieldIndices['image']]) {
            const imagePath = row[fieldIndices['image']];
            // Store image reference for future processing
            itemData.imageReference = imagePath;
          }
          
          console.log("Importing item:", itemData.name);
          
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
        const pushStatus = getPushStatus();
        if (pushStatus.pushEnabled) {
          // Process each item through Shopify push pipeline
          const results = await Promise.all(importedItems.map(async (item) => {
            const pushInfo = await getItemPushInfo(item);
            if (pushInfo.canPush) {
              return await pushItemToShopify(pushInfo.shopifyProduct);
            }
            return { 
              success: false, 
              message: 'Item not ready for Shopify push',
              productId: undefined 
            };
          }));
          
          // Count successful pushes
          const successful = results.filter(r => r.success).length;
          
          syncResults = {
            pushEnabled: true,
            synced: successful,
            failed: importedItems.length - successful,
            totalProcessed: importedItems.length
          };
        } else {
          syncResults = {
            pushEnabled: false,
            message: 'Shopify push is disabled. Enable it in settings to push items.'
          };
        }
      }
      
      res.status(201).json({
        success: true,
        importedCount: importedItems.length,
        totalRows: dataRows.length,
        type: isStampImport ? 'stamp_collection' : 'standard_inventory',
        syncResults
      });
    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ 
        error: "Failed to import items from CSV",
        details: error instanceof Error ? error.message : String(error)
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

  // Employee Routes
  app.get("/api/employees", async (_req: Request, res: Response) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const employee = await storage.getEmployee(id);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Failed to fetch employee:", error);
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.get("/api/employees/by-employee-id/:employeeId", async (req: Request, res: Response) => {
    try {
      const employeeId = req.params.employeeId;
      const employee = await storage.getEmployeeByEmployeeId(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Failed to fetch employee:", error);
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req: Request, res: Response) => {
    try {
      const parsedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(parsedData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create employee:", error);
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingEmployee = await storage.getEmployee(id);
      
      if (!existingEmployee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Direct update without schema validation for flexibility
      const updatedEmployee = await storage.updateEmployee(id, req.body);
      res.json(updatedEmployee);
    } catch (error) {
      console.error("Failed to update employee:", error);
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEmployee(id);
      
      if (!success) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });
  
  // Inventory Action Routes
  app.get("/api/inventory-actions", async (req: Request, res: Response) => {
    try {
      const filters = {
        itemId: req.query.itemId ? parseInt(req.query.itemId as string) : undefined,
        employeeId: req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined,
        actionType: req.query.actionType as string | undefined
      };
      
      const actions = await storage.getInventoryActions(
        Object.values(filters).some(v => v !== undefined) ? filters : undefined
      );
      
      res.json(actions);
    } catch (error) {
      console.error("Failed to fetch inventory actions:", error);
      res.status(500).json({ error: "Failed to fetch inventory actions" });
    }
  });

  app.get("/api/inventory-actions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const action = await storage.getInventoryAction(id);
      
      if (!action) {
        return res.status(404).json({ error: "Inventory action not found" });
      }
      
      res.json(action);
    } catch (error) {
      console.error("Failed to fetch inventory action:", error);
      res.status(500).json({ error: "Failed to fetch inventory action" });
    }
  });

  app.post("/api/inventory-actions", async (req: Request, res: Response) => {
    try {
      const parsedData = insertInventoryActionSchema.parse(req.body);
      const action = await storage.createInventoryAction(parsedData);
      
      // If this is a quantity change action, update the item quantity
      if (parsedData.actionType === 'add' || parsedData.actionType === 'remove') {
        const item = await storage.getItem(parsedData.itemId);
        if (item && parsedData.quantity !== null && parsedData.quantity !== undefined) {
          const newQuantity = parsedData.actionType === 'add'
            ? item.quantity + parsedData.quantity
            : Math.max(0, item.quantity - parsedData.quantity);
            
          await storage.updateItem(item.id, { quantity: newQuantity });
        }
      }
      
      res.status(201).json(action);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create inventory action:", error);
      res.status(500).json({ error: "Failed to create inventory action" });
    }
  });

  app.get("/api/items/:itemId/inventory-actions", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      const actions = await storage.getInventoryActionsByItem(itemId);
      res.json(actions);
    } catch (error) {
      console.error("Failed to fetch item inventory actions:", error);
      res.status(500).json({ error: "Failed to fetch item inventory actions" });
    }
  });

  app.get("/api/employees/:employeeId/inventory-actions", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      const actions = await storage.getInventoryActionsByEmployee(employeeId);
      res.json(actions);
    } catch (error) {
      console.error("Failed to fetch employee inventory actions:", error);
      res.status(500).json({ error: "Failed to fetch employee inventory actions" });
    }
  });

  // Update item handling endpoint to include employee tracking
  app.post("/api/items/:id/employee-action", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const { employeeId, actionType, quantity, notes } = req.body;
      
      if (!employeeId || !actionType || (actionType !== 'check' && !quantity)) {
        return res.status(400).json({ 
          error: "Missing required fields. employeeId, actionType, and quantity (for non-check actions) are required."
        });
      }
      
      // Validate item exists
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Validate employee exists
      const employee = await storage.getEmployee(parseInt(employeeId));
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Create inventory action
      const action = await storage.createInventoryAction({
        itemId,
        employeeId: parseInt(employeeId),
        actionType,
        quantity: actionType === 'check' ? null : parseInt(quantity),
        notes: notes || null,
        actionDetails: {}
      });
      
      // Update item quantity if needed
      if (actionType !== 'check') {
        const parsedQuantity = parseInt(quantity);
        const newQuantity = actionType === 'add'
          ? item.quantity + parsedQuantity
          : Math.max(0, item.quantity - parsedQuantity);
          
        await storage.updateItem(itemId, { quantity: newQuantity });
      }
      
      res.status(201).json(action);
    } catch (error) {
      console.error("Failed to record employee action:", error);
      res.status(500).json({ error: "Failed to record employee action" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
