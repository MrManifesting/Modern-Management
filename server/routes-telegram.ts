/**
 * Routes for Telegram bot integration
 * Handles receiving photos from Telegram and associating them with inventory items
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import { insertTelegramPhotoSchema } from "@shared/schema-telegram";
import path from "path";
import fs from "fs";
import { IStorage } from "./storage";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "telegram");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Telegram configuration and bot instance
let telegramConfig = {
  token: process.env.TELEGRAM_BOT_TOKEN || "",
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || "",
  configured: false,
};

// Initialize Telegram bot if config is available
const initTelegramBot = (storageApi: IStorage) => {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_URL) {
    telegramConfig.token = process.env.TELEGRAM_BOT_TOKEN;
    telegramConfig.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    telegramConfig.configured = true;
    
    console.log("Telegram bot initialized with token:", telegramConfig.token.substring(0, 5) + "...");
    
    // Here you could set up a webhook or start polling with a real Telegram bot library
    // For example, using the node-telegram-bot-api library
    // This implementation just handles webhook endpoints
  } else {
    console.log("Telegram bot not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_URL env variables to enable.");
  }
};

/**
 * Register Telegram integration routes
 */
export function registerTelegramRoutes(app: Express, storageApi: IStorage) {
  // Initialize the bot
  initTelegramBot(storageApi);
  
  /**
   * Webhook endpoint for Telegram to send updates to
   * This handles photos sent to the bot
   */
  app.post("/api/telegram/webhook", upload.single("photo"), async (req: Request, res: Response) => {
    try {
      // For a real webhook implementation, you'd parse the Telegram update object
      // This is a simplified version that just handles file uploads directly
      
      if (!req.file) {
        return res.status(400).json({ message: "No photo provided" });
      }
      
      // Store file info in database
      const photo = await storageApi.addTelegramPhoto({
        fileId: req.body.file_id || `local-${Date.now()}`,
        filePath: `/uploads/telegram/${req.file.filename}`,
        caption: req.body.caption || null,
        associatedItemId: req.body.item_id ? parseInt(req.body.item_id) : null,
      });
      
      res.status(201).json({ success: true, photo });
    } catch (error) {
      console.error("Error processing Telegram webhook:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
  
  /**
   * Get all telegram photos
   */
  app.get("/api/telegram/photos", async (_req: Request, res: Response) => {
    try {
      let photos = await storageApi.getTelegramPhotos();
      
      // Transform photos to include full URLs
      photos = photos.map(photo => ({
        ...photo,
        filePath: photo.filePath.startsWith('http') 
          ? photo.filePath 
          : `${_req.protocol}://${_req.get('host')}${photo.filePath}`
      }));
      
      res.json(photos);
    } catch (error) {
      console.error("Error fetching Telegram photos:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
  
  /**
   * Assign photo to an item
   */
  app.post("/api/telegram/photos/assign", async (req: Request, res: Response) => {
    try {
      const { photoId, itemId } = req.body;
      
      if (!photoId || !itemId) {
        return res.status(400).json({ message: "Photo ID and item ID are required" });
      }
      
      const photo = await storageApi.getTelegramPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      const updatedPhoto = await storageApi.updateTelegramPhoto(photoId, {
        associatedItemId: itemId
      });
      
      res.json(updatedPhoto);
    } catch (error) {
      console.error("Error assigning Telegram photo:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
  
  /**
   * Delete a telegram photo
   */
  app.delete("/api/telegram/photos/:id", async (req: Request, res: Response) => {
    try {
      const photoId = parseInt(req.params.id);
      
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      
      const photo = await storageApi.getTelegramPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      // Delete the file if it's local
      if (photo.filePath && !photo.filePath.startsWith('http')) {
        const filePath = path.join(process.cwd(), photo.filePath.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storageApi.deleteTelegramPhoto(photoId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Telegram photo:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
  
  /**
   * Get Telegram bot configuration status
   */
  app.get("/api/telegram/status", (_req: Request, res: Response) => {
    res.json({
      configured: telegramConfig.configured,
      webhookUrl: telegramConfig.configured ? telegramConfig.webhookUrl : null
    });
  });
}