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
  webhookUrl: "",
  configured: false,
};

// Set proper webhook URL based on environment
if (process.env.REPLIT_DOMAINS) {
  const domains = process.env.REPLIT_DOMAINS.split(',');
  telegramConfig.webhookUrl = `https://${domains[0]}/api/telegram/webhook`;
} else {
  telegramConfig.webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://localhost:5000'}/api/telegram/webhook`;
}

// Telegram bot API functions
const sendTelegramMessage = async (chatId: string, text: string) => {
  if (!telegramConfig.configured) return false;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramConfig.token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
};

const downloadTelegramFile = async (fileId: string): Promise<Buffer | null> => {
  try {
    // Get file info
    const fileInfoResponse = await fetch(`https://api.telegram.org/bot${telegramConfig.token}/getFile?file_id=${fileId}`);
    const fileInfo = await fileInfoResponse.json();
    
    if (!fileInfo.ok) {
      console.error('Failed to get file info:', fileInfo);
      return null;
    }
    
    // Download file
    const fileResponse = await fetch(`https://api.telegram.org/file/bot${telegramConfig.token}/${fileInfo.result.file_path}`);
    const arrayBuffer = await fileResponse.arrayBuffer();
    
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading Telegram file:', error);
    return null;
  }
};

// Initialize Telegram bot if config is available
const initTelegramBot = (storageApi: IStorage) => {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_URL) {
    telegramConfig.token = process.env.TELEGRAM_BOT_TOKEN;
    telegramConfig.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    telegramConfig.configured = true;
    
    console.log("Telegram bot initialized with token:", telegramConfig.token.substring(0, 5) + "...");
    
    // Set webhook
    setWebhook();
  } else {
    console.log("Telegram bot not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_URL env variables to enable.");
  }
};

const setWebhook = async () => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramConfig.token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: telegramConfig.webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('Telegram webhook set successfully');
    } else {
      console.error('Failed to set Telegram webhook:', result);
    }
  } catch (error) {
    console.error('Error setting Telegram webhook:', error);
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
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const update = req.body;
      
      // Handle messages with photos
      if (update.message && update.message.photo) {
        const message = update.message;
        const chatId = message.chat.id.toString();
        const photo = message.photo[message.photo.length - 1]; // Get highest quality photo
        const caption = message.caption || null;
        
        // Download the photo
        const photoBuffer = await downloadTelegramFile(photo.file_id);
        if (!photoBuffer) {
          await sendTelegramMessage(chatId, "❌ Failed to download photo. Please try again.");
          return res.status(200).json({ ok: true });
        }
        
        // Save the photo to disk
        const uploadDir = path.join(process.cwd(), "uploads", "telegram");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const fileName = `telegram-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, photoBuffer);
        
        // Store photo info in database
        const photoRecord = await storageApi.addTelegramPhoto({
          fileId: photo.file_id,
          filePath: `/uploads/telegram/${fileName}`,
          caption,
          associatedItemId: null,
        });
        
        // Send confirmation message with photo URL
        const photoUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/uploads/telegram/${fileName}`;
        await sendTelegramMessage(chatId, `✅ Photo uploaded successfully!\n\n📷 **Photo URL**: ${photoUrl}\n\n🔗 You can now assign this photo to inventory items in your admin panel.`);
        
        res.status(200).json({ ok: true });
      } else {
        // Handle other message types
        res.status(200).json({ ok: true });
      }
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