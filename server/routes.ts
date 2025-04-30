import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { insertItemSchema, insertMarketplaceSchema, csvExportSchema, aiAnalysisSchema } from "@shared/schema";
import { analyzeImage } from "./services/vision";
import { generateSEOContent } from "./services/openai";
import { Parser } from "@json2csv/plainjs";

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
      
      const parsedData = insertItemSchema.parse({
        ...req.body,
        images: fileUrls,
        price: parseFloat(req.body.price),
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        marketplace: req.body.marketplace ? JSON.parse(req.body.marketplace) : [],
        aiEnhanced: req.body.aiEnhanced === "true",
        aiTags: req.body.aiTags ? JSON.parse(req.body.aiTags) : [],
      });
      
      const item = await storage.createItem(parsedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
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
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      const imageBuffer = req.file.buffer;
      const analysisResult = await analyzeImage(imageBuffer);
      
      res.json(analysisResult);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
