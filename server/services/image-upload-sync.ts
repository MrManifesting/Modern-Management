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
        
        const uploadsDir = path.join(process.cwd(), 'uploads');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, file.buffer);
        
        // Create public URL
        const publicUrl = `/uploads/${fileName}`;
        uploadedUrls.push(publicUrl);
        
        log(`Uploaded image: ${fileName} for item ${item.name}`, 'image-upload');
        
      } catch (error) {
        log(`Failed to upload image for item ${itemId}: ${error}`, 'image-upload');
      }
    }

    // Update item with new images
    if (uploadedUrls.length > 0) {
      const currentImages = Array.isArray(item.images) ? item.images : 
                           (typeof item.images === 'string' && item.images) ? [item.images] : [];
      
      const allImages = [...currentImages, ...uploadedUrls];
      
      await storage.updateItem(itemId, {
        images: allImages
      });

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

    // Priority order: item.images array, Shopify images, default
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images[0];
    }

    if (typeof item.images === 'string' && item.images) {
      return item.images;
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