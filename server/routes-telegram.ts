/**
 * Routes for Telegram bot integration
 * Handles receiving photos from Telegram and associating them with inventory items
 */

import type { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import axios from "axios";

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Initialize Telegram bot if token is provided
let bot: Telegraf | null = null;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Function to initialize the Telegram bot
const initTelegramBot = (storageApi: IStorage) => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("Telegram bot token not provided, bot functionality disabled");
    return null;
  }

  try {
    const telegramBot = new Telegraf(TELEGRAM_BOT_TOKEN);

    // Handle photo messages
    telegramBot.on(message("photo"), async (ctx) => {
      try {
        const caption = ctx.message.caption || "";
        const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        const fileInfo = await ctx.telegram.getFile(photoId);
        
        if (!fileInfo.file_path) {
          console.error("No file path in Telegram response");
          ctx.reply("Error: Could not get file information");
          return;
        }

        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
        const fileName = `telegram-${Date.now()}-${photoId}.jpg`;
        const filePath = path.join(process.cwd(), "uploads", fileName);
        
        // Download the file
        const response = await axios({
          url: fileUrl,
          method: "GET",
          responseType: "stream",
        });
        
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        // Try to associate the photo with an inventory item based on caption
        let associatedItem = null;
        if (caption) {
          // Look for items with names similar to the caption
          const items = await storageApi.getItems();
          associatedItem = items.find(item => 
            item.name.toLowerCase().includes(caption.toLowerCase())
          );
          
          if (associatedItem) {
            // Add the image URL to the item
            const imageUrl = `/uploads/${fileName}`;
            const updatedImages = associatedItem.images || [];
            updatedImages.push(imageUrl);
            
            await storageApi.updateItem(associatedItem.id, {
              ...associatedItem,
              images: updatedImages,
            });

            ctx.reply(`Photo added to item: ${associatedItem.name}`);
          } else {
            ctx.reply("Received your photo, but couldn't find a matching item. Try including the exact item name in the caption.");
          }
        } else {
          ctx.reply("Photo received! Add a caption with the item name to associate it with an inventory item.");
        }
        
        // Save this photo to our temporary storage for later assignment
        await storageApi.addTelegramPhoto({
          fileId: photoId,
          filePath: `/uploads/${fileName}`,
          caption,
          timestamp: new Date(),
          associatedItemId: associatedItem?.id || null,
        });
        
      } catch (error) {
        console.error("Error handling Telegram photo:", error);
        ctx.reply("Sorry, there was an error processing your photo. Please try again later.");
      }
    });

    // Handle text messages
    telegramBot.on(message("text"), (ctx) => {
      ctx.reply("Send me photos of your inventory items! Include the item name in the caption to automatically associate it.");
    });

    // Start the bot
    telegramBot.launch().then(() => {
      console.log("Telegram bot started successfully");
    }).catch(err => {
      console.error("Failed to start Telegram bot:", err);
    });

    return telegramBot;
  } catch (error) {
    console.error("Error initializing Telegram bot:", error);
    return null;
  }
};

/**
 * Register Telegram integration routes
 */
export function registerTelegramRoutes(app: Express, storageApi: IStorage) {
  // Initialize telegram bot
  bot = initTelegramBot(storageApi);
  
  // Get available Telegram photos for manual assignment
  app.get("/api/telegram/photos", async (_req: Request, res: Response) => {
    try {
      const photos = await storageApi.getTelegramPhotos();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching Telegram photos:", error);
      res.status(500).json({ error: "Failed to fetch Telegram photos" });
    }
  });

  // Associate a Telegram photo with an item
  app.post("/api/telegram/photos/assign", async (req: Request, res: Response) => {
    try {
      const { photoId, itemId } = req.body;
      
      if (!photoId || !itemId) {
        return res.status(400).json({ error: "Missing photoId or itemId" });
      }
      
      // Get the photo
      const photo = await storageApi.getTelegramPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      // Get the item
      const item = await storageApi.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Add the image URL to the item
      const updatedImages = item.images || [];
      updatedImages.push(photo.filePath);
      
      await storageApi.updateItem(itemId, {
        ...item,
        images: updatedImages,
      });
      
      // Update the photo to mark it as assigned
      await storageApi.updateTelegramPhoto(photoId, {
        ...photo,
        associatedItemId: itemId,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error assigning Telegram photo:", error);
      res.status(500).json({ error: "Failed to assign Telegram photo" });
    }
  });

  // Delete a Telegram photo
  app.delete("/api/telegram/photos/:id", async (req: Request, res: Response) => {
    try {
      const photoId = req.params.id;
      await storageApi.deleteTelegramPhoto(photoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Telegram photo:", error);
      res.status(500).json({ error: "Failed to delete Telegram photo" });
    }
  });

  // Check if Telegram integration is configured
  app.get("/api/telegram/status", (_req: Request, res: Response) => {
    res.json({ 
      configured: !!TELEGRAM_BOT_TOKEN,
      active: !!bot 
    });
  });

  // Webhook for Telegram bot
  app.post("/api/telegram/webhook", upload.single("photo"), async (req: Request, res: Response) => {
    try {
      // This endpoint can be set as a webhook for the Telegram bot
      // For simplicity, we're using the polling method above, but this endpoint
      // could be used in production for webhook-based bot updates
      res.status(200).send("OK");
    } catch (error) {
      console.error("Error processing Telegram webhook:", error);
      res.status(500).json({ error: "Failed to process Telegram webhook" });
    }
  });
}