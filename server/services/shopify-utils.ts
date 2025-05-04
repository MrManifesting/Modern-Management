import { items } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

/**
 * Shopify marketplace integration utilities
 * 
 * This file contains utility functions for interacting with Shopify.
 * The actual service implementation is in marketplaces/shopify.ts.
 */

/**
 * Update an item with Shopify product ID
 */
export async function updateItemWithShopifyId(itemId: number, shopifyProductId: number): Promise<boolean> {
  try {
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId)
    });
    
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    
    // Update the marketplace data with Shopify info
    const marketplaceData = item.marketplace || {};
    
    await db.update(items)
      .set({
        marketplace: {
          ...marketplaceData,
          shopify: {
            ...((marketplaceData as any).shopify || {}),
            productId: shopifyProductId,
            lastSynced: new Date().toISOString()
          }
        }
      })
      .where(eq(items.id, itemId));
      
    return true;
  } catch (error) {
    console.error(`Failed to update item with Shopify product ID: ${error}`);
    return false;
  }
}