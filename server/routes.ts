import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { Parser } from "@json2csv/plainjs";
import { log } from "./vite";
import { 
  analyzeProductImage, 
  generateProductDescription, 
  analyzeSentiment, 
  generateSkuSuggestion, 
  generateInventoryInsights 
} from "./services/openai";
import { generateSKU, generateSKUBatch } from "./services/sku-generator";
import { generateBarcodeData, generateQRCodeDataURL } from "./services/barcode";
import { 
  getPushStatus, 
  setPushStatus, 
  isShopifyConfigured, 
  syncProductsFromShopify, 
  getItemPushInfo, 
  pushItemToShopify, 
  prepareItemForShopify 
} from "./services/shopify-integration";
import { loadPaypalDefault, createPaypalOrder, capturePaypalOrder } from "./paypal";
// Removed duplicate Shopify service imports - consolidated into shopify-integration.ts
// Shopify import functionality consolidated into shopify-integration.ts
import { registerCSVImportRoutes } from "./routes-csv-import";
import { registerCleanupRoutes } from "./routes-cleanup";

import { registerShopifyCredentialsRoutes } from "./routes-shopify-credentials";
import { registerMarketplaceRoutes } from "./routes-marketplace";
import { registerAffiliateRoutes } from "./routes-affiliate";
import { registerPayPalRoutes } from "./routes-paypal";
import { registerAIRoutes } from "./routes-ai";
import { registerGoogleSheetsRoutes } from "./routes-google-sheets";
import { registerLabelRoutes } from "./routes-labels";
import { registerSyncRoutes } from "./routes-sync";
import { registerShopifyWebhookRoutes } from "./routes-shopify-webhooks";
import { registerBreakdownRoutes } from "./routes-breakdown";
import { registerBarcodeRoutes } from "./routes-barcode";
import { registerTelegramRoutes } from "./routes-telegram";
import { registerBulkOperationRoutes } from "./routes-bulk";
import { registerAutoBreakdownRoutes } from "./routes-auto-breakdown";

import { registerCredentialRoutes } from "./routes-credentials";
import csvDirectRoutes from "./routes-csv-direct";
import { registerBidirectionalSyncRoutes } from "./routes-bidirectional-sync";
import { registerBarcodeFulfillmentRoutes } from "./routes-barcode-fulfillment";
import { setupAuth, requireAuth } from "./auth-simple";
import priceSheetRoutes from "./routes-price-sheet";
import { registerConnectionStatusRoutes } from "./routes-connection-status";

export function registerRoutes(app: Express): Server {
  // Set up auth middleware first
  setupAuth(app);
  
  // Multer setup for file uploads
  const uploadMemory = multer({ storage: multer.memoryStorage() });
  
  // Core item routes
  app.get("/api/items", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Get items with associated media files and proper pricing display
  app.get("/api/items/with-media", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const fs = await import('fs/promises');
      
      // Process each item to include media files and ensure proper pricing
      const itemsWithMedia = await Promise.all(items.map(async (item) => {
        // Get associated media files from uploads directory
        let mediaFiles: string[] = [];
        try {
          const uploadsDir = 'uploads';
          const files = await fs.readdir(uploadsDir);
          
          // Match files by SKU, item name, or ID patterns
          const itemSku = item.sku || '';
          const itemName = item.name || '';
          const itemId = item.id.toString();
          
          mediaFiles = files.filter(file => {
            const fileName = file.toLowerCase();
            return (
              (itemSku && fileName.includes(itemSku.toLowerCase())) ||
              (itemName && fileName.includes(itemName.toLowerCase().replace(/\s+/g, '_'))) ||
              fileName.includes(`item_${itemId}`) ||
              fileName.includes(`id_${itemId}`)
            );
          });
        } catch (error) {
          // Uploads directory doesn't exist or can't be read
          mediaFiles = [];
        }
        
        // Ensure proper pricing data structure for authentic display
        const basePrice = Number(item.basePrice || item.price || 0);
        const retailPrice = Number(item.retailPrice || basePrice || 0);
        const wholesalePrice = Number(item.wholesalePrice || basePrice * 0.7 || 0);
        
        return {
          ...item,
          mediaFiles,
          // Ensure consistent pricing structure for frontend display
          price: basePrice,
          basePrice,
          retailPrice,
          wholesalePrice,
          // Parse images array if it's a string
          images: typeof item.images === 'string' 
            ? JSON.parse(item.images || '[]') 
            : (item.images || [])
        };
      }));
      
      res.json(itemsWithMedia);
    } catch (error) {
      console.error("Failed to fetch items with media:", error);
      res.status(500).json({ error: "Failed to fetch items with media" });
    }
  });

  app.post("/api/items", uploadMemory.array("files", 5), async (req: Request, res: Response) => {
    try {
      const insertItemSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        brand: z.string().optional(),
        category: z.string().optional(),
        sku: z.string().optional(),
        costPrice: z.string().optional(),
        basePrice: z.string().optional(),
        salePrice: z.string().optional(),
        wholesalePrice: z.string().optional(),
        weight: z.string().optional(),
        dimensions: z.string().optional(),
        quantity: z.number().optional(),
        status: z.string().optional(),
        condition: z.string().optional(),
        tags: z.array(z.string()).optional()
      });

      const validatedData = insertItemSchema.parse(req.body);
      const files = req.files as Express.Multer.File[];
      
      // Create item
      const item = await storage.createItem(validatedData);
      if (!item) {
        throw new Error("Failed to create item");
      }

      // Generate QR code
      const qrCodeDataURL = await generateQRCodeDataURL(item);
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

  // Register all route modules
  // Shopify import functionality consolidated into shopify-integration.ts
  registerCSVImportRoutes(app, storage);
  registerCleanupRoutes(app, storage);
  registerShopifyCredentialsRoutes(app, storage);
  registerMarketplaceRoutes(app, storage);
  registerAffiliateRoutes(app, storage);
  registerPayPalRoutes(app, storage);
  registerAIRoutes(app, storage);
  registerGoogleSheetsRoutes(app, storage);
  registerLabelRoutes(app, storage);
  registerSyncRoutes(app, storage);
  registerShopifyWebhookRoutes(app, storage);
  registerBreakdownRoutes(app, storage);
  registerBarcodeRoutes(app, storage);
  registerTelegramRoutes(app, storage);
  registerBulkOperationRoutes(app, storage);
  registerAutoBreakdownRoutes(app, storage);
  registerCredentialRoutes(app, storage);
  registerBidirectionalSyncRoutes(app, storage);
  registerBarcodeFulfillmentRoutes(app, storage);

  // Register additional route modules
  app.use("/api/csv-direct", csvDirectRoutes);
  app.use("/api/price-sheet", priceSheetRoutes);
  registerConnectionStatusRoutes(app, storage);

  // Create and return HTTP server
  return createServer(app);
}