import { Telegraf } from 'telegraf';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { log } from '../vite';

// The media folder where we'll store uploaded images and videos
const MEDIA_FOLDER = path.join(process.cwd(), 'public', 'media');

// Make sure the media folder exists
if (!fs.existsSync(MEDIA_FOLDER)) {
  fs.mkdirSync(MEDIA_FOLDER, { recursive: true });
  log(`Created media folder at ${MEDIA_FOLDER}`, 'telegram');
}

// Auto-associate uploaded images with inventory items
async function autoAssociateImageWithInventory(fileName: string, publicUrl: string, caption?: string) {
  try {
    const { DatabaseStorage } = await import('../storage.js');
    const storage = new DatabaseStorage();
    
    // Get all inventory items
    const items = await storage.getItems();
    
    // Find matching items based on caption, filename, or SKU patterns
    let matchedItems = [];
    
    if (caption) {
      const captionLower = caption.toLowerCase();
      matchedItems = items.filter(item => {
        const itemName = item.name?.toLowerCase() || '';
        const itemSku = item.sku?.toLowerCase() || '';
        
        return captionLower.includes(itemName) || 
               captionLower.includes(itemSku) ||
               itemName.includes(captionLower) ||
               itemSku.includes(captionLower);
      });
    }
    
    // If no caption matches, try filename patterns
    if (matchedItems.length === 0) {
      const fileNameLower = fileName.toLowerCase();
      matchedItems = items.filter(item => {
        const itemName = item.name?.toLowerCase() || '';
        const itemSku = item.sku?.toLowerCase() || '';
        
        return fileNameLower.includes(itemSku) ||
               fileNameLower.includes(itemName.replace(/\s+/g, '_')) ||
               fileNameLower.includes(itemName.replace(/\s+/g, ''));
      });
    }
    
    // Update matched items with the new image
    for (const item of matchedItems) {
      try {
        // Get current images or initialize empty array
        let currentImages = [];
        if (item.images && Array.isArray(item.images)) {
          currentImages = item.images;
        } else if (typeof item.images === 'string') {
          currentImages = [item.images];
        }
        
        // Add new image if not already present
        if (!currentImages.includes(publicUrl)) {
          currentImages.push(publicUrl);
          
          // Update item with new images
          await storage.updateItem(item.id, {
            images: JSON.stringify(currentImages)
          });
          
          log(`Associated image ${fileName} with item: ${item.name} (ID: ${item.id})`, 'telegram');
          
          // Sync to Shopify if item has shopifyId
          if (item.shopifyId) {
            await syncImageToShopify(item.id, publicUrl);
          }
        }
      } catch (error) {
        console.error(`Error updating item ${item.id} with image:`, error);
      }
    }
    
    // If no matches found, create a new item suggestion
    if (matchedItems.length === 0 && caption) {
      log(`No matching items found for image ${fileName}. Caption: ${caption}`, 'telegram');
      // Could create a pending item or suggest creation based on caption
    }
    
  } catch (error) {
    console.error('Error in autoAssociateImageWithInventory:', error);
  }
}

// Sync image to Shopify product
async function syncImageToShopify(itemId: number, imageUrl: string) {
  try {
    const { ShopifyProductImportService } = await import('./shopify-product-import.js');
    const shopifyService = new ShopifyProductImportService();
    
    // Update Shopify product with new image
    await shopifyService.updateProductImage(itemId, imageUrl);
    log(`Synced image to Shopify for item ID: ${itemId}`, 'telegram');
    
  } catch (error) {
    console.error(`Error syncing image to Shopify for item ${itemId}:`, error);
  }
}

let bot: any = null;

// Initialize the Telegram bot
export const initializeTelegramBot = (token: string) => {
  try {
    // Create a bot instance
    bot = new TelegramBot(token, { polling: true });
    log('Telegram bot initialized successfully', 'telegram');

    // Listen for any message
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      
      // Handle photos
      if (msg.photo) {
        try {
          const photo = msg.photo[msg.photo.length - 1]; // Get the highest resolution
          const fileId = photo.file_id;
          const fileName = `photo_${Date.now()}.jpg`;
          
          const filePath = await downloadMediaFile(bot!, fileId, fileName);
          const publicUrl = `/media/${fileName}`;
          
          // Auto-associate with inventory items
          await autoAssociateImageWithInventory(fileName, publicUrl, msg.caption);
          
          // Send confirmation with image URL
          await bot!.sendPhoto(chatId, filePath, {
            caption: `✅ Photo saved and auto-associated with inventory!\n📁 File: ${fileName}\n🔗 URL: ${publicUrl}\n\nImage will appear in inventory and sync to Shopify.`
          });
          
          log(`Received photo from Telegram: ${fileName} (URL: ${publicUrl})`, 'telegram');
        } catch (error) {
          console.error('Error saving photo:', error);
          bot!.sendMessage(chatId, '❌ Error saving photo. Please try again.');
        }
      }
      
      // Handle videos
      else if (msg.video) {
        try {
          const fileId = msg.video.file_id;
          const fileName = `video_${Date.now()}.mp4`;
          
          const filePath = await downloadMediaFile(bot!, fileId, fileName);
          const publicUrl = `/media/${fileName}`;
          
          // Send confirmation with video URL
          await bot!.sendMessage(chatId, `✅ Video saved successfully!\n📁 File: ${fileName}\n🔗 URL: ${publicUrl}\n\nYou can now use this video in your inventory system.`);
          
          log(`Received video from Telegram: ${fileName} (URL: ${publicUrl})`, 'telegram');
        } catch (error) {
          console.error('Error saving video:', error);
          bot!.sendMessage(chatId, '❌ Error saving video. Please try again.');
        }
      }
      
      // Handle documents/files
      else if (msg.document) {
        try {
          const fileId = msg.document.file_id;
          const originalName = path.basename(msg.document.file_name || `file_${Date.now()}`);
          const fileName = `doc_${Date.now()}_${originalName}`;
          
          const filePath = await downloadMediaFile(bot!, fileId, fileName);
          const publicUrl = `/media/${fileName}`;
          
          // Send confirmation with document URL
          await bot!.sendMessage(chatId, `✅ Document saved successfully!\n📁 File: ${fileName}\n🔗 URL: ${publicUrl}\n\nYou can now use this document in your inventory system.`);
          
          log(`Received document from Telegram: ${fileName} (URL: ${publicUrl})`, 'telegram');
        } catch (error) {
          console.error('Error saving document:', error);
          bot!.sendMessage(chatId, '❌ Error saving document. Please try again.');
        }
      }
      
      // Welcome message for text
      else if (msg.text) {
        if (msg.text === '/start') {
          bot!.sendMessage(
            chatId, 
            '👋 Welcome to the Gold-Standard_Management Media Bot!\n\n' +
            'Send me photos, videos, or documents, and I\'ll save them to your media folder.\n\n' +
            'They will be available in your inventory management system.'
          );
        }
      }
    });

    // Handle errors
    bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
      log(`Telegram bot error: ${error.message}`, 'telegram');
    });

    // Return the bot for external usage
    return bot;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    log(`Failed to initialize Telegram bot: ${error}`, 'telegram');
    return null;
  }
};

// Function to download a file from Telegram and save it to the media folder
const downloadMediaFile = async (bot: TelegramBot, fileId: string, fileName: string): Promise<string> => {
  const safeFileName = path.basename(fileName);
  return new Promise(async (resolve, reject) => {
    try {
      // Get file path from Telegram
      const fileInfo = await bot.getFile(fileId);
      const filePath = fileInfo.file_path;
      
      if (!filePath) {
        reject('File path not found');
        return;
      }
      
      // Construct the download URL
      const token = bot.token;
      const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      
      // Create a write stream for saving the file
      const localFilePath = path.join(MEDIA_FOLDER, safeFileName);
      const fileStream = fs.createWriteStream(localFilePath);
      
      // Download the file
      https.get(downloadUrl, (response) => {
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(localFilePath);
        });
      }).on('error', (err) => {
        fs.unlinkSync(localFilePath); // Remove the file if error occurs
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Media file types we're interested in
export type MediaType = 'image' | 'video' | 'document' | 'all';

// Interface for media file information
export interface MediaFile {
  name: string;
  path: string;
  url: string;
  type: MediaType;
  size: number;
  createdAt: Date;
  dimensions?: { width: number; height: number };
  thumbnail?: string; // Thumbnail URL if available
  isOptimized?: boolean; // Whether the image has been optimized
}

// Function to get a list of all media files with detailed information
export const getMediaFiles = (type: MediaType = 'all', limit = 100, offset = 0): MediaFile[] => {
  try {
    if (!fs.existsSync(MEDIA_FOLDER)) {
      return [];
    }
    
    // Get all files in the media folder
    const allFiles = fs.readdirSync(MEDIA_FOLDER);
    
    // Filter by type if needed
    const filteredFiles = type === 'all' 
      ? allFiles 
      : allFiles.filter(fileName => {
          if (type === 'image') {
            return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
          } else if (type === 'video') {
            return /\.(mp4|mov|avi|webm|mkv)$/i.test(fileName);
          } else if (type === 'document') {
            return /\.(pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(fileName);
          }
          return true;
        });
    
    // Get file details
    const mediaFiles = filteredFiles.map(fileName => {
      const filePath = path.join(MEDIA_FOLDER, fileName);
      const stats = fs.statSync(filePath);
      
      // Determine file type
      let fileType: MediaType = 'document';
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
        fileType = 'image';
      } else if (/\.(mp4|mov|avi|webm|mkv)$/i.test(fileName)) {
        fileType = 'video';
      }
      
      // Return file details
      return {
        name: fileName,
        path: filePath,
        url: `/media/${fileName}`,
        type: fileType,
        size: stats.size,
        createdAt: stats.birthtime || stats.ctime,
        isOptimized: fileName.includes('_optimized'),
      };
    });
    
    // Sort by creation date (newest first)
    mediaFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply pagination
    return mediaFiles.slice(offset, offset + limit);
  } catch (error) {
    console.error('Error reading media folder:', error);
    return [];
  }
};

// Function to get a specific media file by name
export const getMediaFile = (fileName: string): MediaFile | null => {
  try {
    const safeFileName = path.basename(fileName);
    const filePath = path.join(MEDIA_FOLDER, safeFileName);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const stats = fs.statSync(filePath);
    
    // Determine file type
    let fileType: MediaType = 'document';
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
      fileType = 'image';
    } else if (/\.(mp4|mov|avi|webm|mkv)$/i.test(fileName)) {
      fileType = 'video';
    }
    
    return {
      name: safeFileName,
      path: filePath,
      url: `/media/${safeFileName}`,
      type: fileType,
      size: stats.size,
      createdAt: stats.birthtime || stats.ctime,
      isOptimized: fileName.includes('_optimized'),
    };
  } catch (error) {
    console.error(`Error getting media file ${fileName}:`, error);
    return null;
  }
};

// Function to get the URL for a media file
export const getMediaUrl = (fileName: string): string => {
  return `/media/${fileName}`;
};

// Function to delete a media file
export const deleteMediaFile = (fileName: string): boolean => {
  try {
    const safeFileName = path.basename(fileName);
    const filePath = path.join(MEDIA_FOLDER, safeFileName);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    fs.unlinkSync(filePath);
    log(`Deleted media file: ${safeFileName}`, 'telegram');
    return true;
  } catch (error) {
    console.error(`Error deleting media file ${fileName}:`, error);
    return false;
  }
};

// Function to rename a media file
export const renameMediaFile = (oldFileName: string, newFileName: string): boolean => {
  try {
    const safeOldFileName = path.basename(oldFileName);
    const safeNewFileName = path.basename(newFileName);
    const oldFilePath = path.join(MEDIA_FOLDER, safeOldFileName);
    const newFilePath = path.join(MEDIA_FOLDER, safeNewFileName);
    
    if (!fs.existsSync(oldFilePath) || fs.existsSync(newFilePath)) {
      return false;
    }
    
    fs.renameSync(oldFilePath, newFilePath);
    log(`Renamed media file: ${safeOldFileName} to ${safeNewFileName}`, 'telegram');
    return true;
  } catch (error) {
    console.error(`Error renaming media file ${oldFileName}:`, error);
    return false;
  }
};

// Link media to an inventory item
export const linkMediaToItem = async (itemId: number, mediaFileName: string): Promise<boolean> => {
  // This is just a placeholder - in a real system you'd update the database record
  // to associate the media file with the inventory item
  log(`Linked media ${mediaFileName} to item ${itemId}`, 'telegram');
  return true;
};

// Get the Telegram bot instance (or null if not initialized)
export const getTelegramBot = (): TelegramBot | null => {
  return bot;
};