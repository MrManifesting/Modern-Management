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

let bot: TelegramBot | null = null;

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
          
          await downloadMediaFile(bot!, fileId, fileName);
          bot!.sendMessage(chatId, `✅ Photo saved to media folder as: ${fileName}`);
          log(`Received photo from Telegram: ${fileName}`, 'telegram');
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
          
          await downloadMediaFile(bot!, fileId, fileName);
          bot!.sendMessage(chatId, `✅ Video saved to media folder as: ${fileName}`);
          log(`Received video from Telegram: ${fileName}`, 'telegram');
        } catch (error) {
          console.error('Error saving video:', error);
          bot!.sendMessage(chatId, '❌ Error saving video. Please try again.');
        }
      }
      
      // Handle documents/files
      else if (msg.document) {
        try {
          const fileId = msg.document.file_id;
          const originalName = msg.document.file_name || `file_${Date.now()}`;
          const fileName = `doc_${Date.now()}_${originalName}`;
          
          await downloadMediaFile(bot!, fileId, fileName);
          bot!.sendMessage(chatId, `✅ Document saved to media folder as: ${fileName}`);
          log(`Received document from Telegram: ${fileName}`, 'telegram');
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
            '👋 Welcome to the Gold Standard CBD Media Bot!\n\n' +
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
      const localFilePath = path.join(MEDIA_FOLDER, fileName);
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

// Function to get a list of all media files
export const getMediaFiles = (): string[] => {
  try {
    if (fs.existsSync(MEDIA_FOLDER)) {
      return fs.readdirSync(MEDIA_FOLDER);
    }
    return [];
  } catch (error) {
    console.error('Error reading media folder:', error);
    return [];
  }
};

// Function to get the URL for a media file
export const getMediaUrl = (fileName: string): string => {
  return `/media/${fileName}`;
};

// Get the Telegram bot instance (or null if not initialized)
export const getTelegramBot = (): TelegramBot | null => {
  return bot;
};