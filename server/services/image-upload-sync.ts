import { storage } from '../storage.js';
import { log } from '../vite.js';

/**
 * Enhanced image upload system with Shopify synchronization
 */

export async function uploadItemImages(itemId: number, files: Express.Multer.File[]): Promise<string[]> {
  try {
    const uploadedUrls: string[] = [];
    
    // Get the item to verify it exists
    const item = await storage.getItem(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Process each uploaded file
    for (const file of files) {
      try {
        // Generate unique filename with item info
        const timestamp = Date.now();
        const cleanName = item.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'item';
        const fileName = `${cleanName}_${item.sku || itemId}_${timestamp}.${file.originalname.split('.').pop()}`;
        
        // Save file to uploads directory
        const fs = await import('fs/promises');
        const path = await import('path');
        const sharp = await import('sharp');
        
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const thumbsDir = path.join(uploadsDir, 'thumbnails');
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.mkdir(thumbsDir, { recursive: true });
        
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, file.buffer);
        
        // Generate thumbnail (300x300)
        const thumbnailName = `thumb_${fileName}`;
        const thumbnailPath = path.join(thumbsDir, thumbnailName);
        
        await sharp.default(file.buffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toFile(thumbnailPath);
        
        // Create public URLs
        const publicUrl = `/uploads/${fileName}`;
        const thumbnailUrl = `/uploads/thumbnails/${thumbnailName}`;
        uploadedUrls.push(publicUrl);
        
        log(`Uploaded image: ${fileName} for item ${item.name}`, 'image-upload');
        
      } catch (error) {
        log(`Failed to upload image for item ${itemId}: ${error}`, 'image-upload');
      }
    }

    // Update item with new images and thumbnails
    if (uploadedUrls.length > 0) {
      const currentImages = Array.isArray(item.images) ? item.images : 
                           (typeof item.images === 'string' && item.images) ? [item.images] : [];
      
      const allImages = [...currentImages, ...uploadedUrls];
      
      // Set first image as imageUrl if not already set
      const imageUrl = item.imageUrl || uploadedUrls[0];
      
      const updateResult = await storage.updateItem(itemId, {
        images: allImages,
        imageUrl: imageUrl
      });
      
      if (!updateResult) {
        throw new Error('Failed to update item in database');
      }

      // Sync to Shopify if item has shopifyId
      if (item.shopifyId) {
        await syncImagesToShopify(item.shopifyId, uploadedUrls);
      }
      
      log(`Updated item ${item.name} with ${uploadedUrls.length} new images`, 'image-upload');
    }

    return uploadedUrls;
  } catch (error) {
    log(`Error in uploadItemImages: ${error}`, 'image-upload');
    throw error;
  }
}

export async function syncImagesToShopify(shopifyId: string, imageUrls: string[]): Promise<void> {
  try {
    if (!process.env.SHOPIFY_STORE || !process.env.SHOPIFY_ACCESS_TOKEN) {
      log('Shopify not configured - skipping image sync', 'image-upload');
      return;
    }

    const baseUrl = process.env.REPL_ID ? 
      `https://${process.env.REPL_ID}-00-${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER}.replit.dev` :
      'http://localhost:5000';

    for (const imageUrl of imageUrls) {
      try {
        const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
        
        const response = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/products/${shopifyId}/images.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: {
              src: fullUrl,
              alt: 'Product image'
            }
          })
        });

        if (response.ok) {
          log(`Synced image to Shopify product ${shopifyId}: ${fullUrl}`, 'image-upload');
        } else {
          log(`Failed to sync image to Shopify: ${response.status} ${response.statusText}`, 'image-upload');
        }
      } catch (error) {
        log(`Error syncing individual image to Shopify: ${error}`, 'image-upload');
      }
    }
  } catch (error) {
    log(`Error in syncImagesToShopify: ${error}`, 'image-upload');
  }
}

export async function getItemThumbnail(itemId: number): Promise<string | null> {
  try {
    const item = await storage.getItem(itemId);
    if (!item) return null;

    // Check for thumbnails first
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const thumbsDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    
    // Look for existing thumbnails
    if (Array.isArray(item.images) && item.images.length > 0) {
      for (const imageUrl of item.images) {
        if (imageUrl.startsWith('/uploads/')) {
          const fileName = path.basename(imageUrl);
          const thumbnailName = `thumb_${fileName}`;
          const thumbnailPath = path.join(thumbsDir, thumbnailName);
          
          try {
            await fs.access(thumbnailPath);
            return `/uploads/thumbnails/${thumbnailName}`;
          } catch {
            // Thumbnail doesn't exist, return original image
            return imageUrl;
          }
        }
      }
      return item.images[0]; // Return first image if no local thumbnails
    }

    // Check imageUrl field
    if (item.imageUrl) {
      if (item.imageUrl.startsWith('/uploads/')) {
        const fileName = path.basename(item.imageUrl);
        const thumbnailName = `thumb_${fileName}`;
        const thumbnailPath = path.join(thumbsDir, thumbnailName);
        
        try {
          await fs.access(thumbnailPath);
          return `/uploads/thumbnails/${thumbnailName}`;
        } catch {
          return item.imageUrl;
        }
      }
      return item.imageUrl;
    }

    // Try to get from Shopify if available
    if (item.shopifyId && process.env.SHOPIFY_STORE && process.env.SHOPIFY_ACCESS_TOKEN) {
      try {
        const response = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/products/${item.shopifyId}/images.json`, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            return data.images[0].src;
          }
        }
      } catch (error) {
        log(`Failed to fetch Shopify image for item ${itemId}: ${error}`, 'image-upload');
      }
    }

    return null;
  } catch (error) {
    log(`Error in getItemThumbnail: ${error}`, 'image-upload');
    return null;
  }
}