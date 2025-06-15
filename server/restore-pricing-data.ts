import { db } from './db';
import { items } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Restore pricing data that was incorrectly converted from whole numbers to decimals
 * This script converts back from decimal format to the correct whole number format
 * e.g., 11.55 -> 1155.00, 5.00 -> 500.00
 */
async function restorePricingData() {
  console.log('Starting pricing data restoration...');
  
  try {
    // Get all items with pricing data
    const allItems = await db.select().from(items);
    
    let restoredCount = 0;
    let skippedCount = 0;
    
    for (const item of allItems) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Restore basePrice if it was incorrectly converted to decimal
      if (item.basePrice !== null && item.basePrice !== undefined) {
        const basePrice = typeof item.basePrice === 'string' ? parseFloat(item.basePrice) : item.basePrice;
        if (basePrice < 100 && basePrice > 0 && basePrice.toString().includes('.')) {
          // Convert small decimals back to whole numbers (e.g., 11.55 -> 1155.00)
          const restored = Math.round(basePrice * 100);
          updates.basePrice = restored.toFixed(2);
          needsUpdate = true;
        } else if (basePrice >= 100) {
          // Ensure large values have proper decimal formatting
          updates.basePrice = basePrice.toFixed(2);
          needsUpdate = true;
        }
      }
      
      // Restore salePrice if it was incorrectly converted
      if (item.salePrice !== null && item.salePrice !== undefined) {
        const salePrice = typeof item.salePrice === 'string' ? parseFloat(item.salePrice) : item.salePrice;
        if (salePrice < 100 && salePrice > 0 && salePrice.toString().includes('.')) {
          const restored = Math.round(salePrice * 100);
          updates.salePrice = restored.toFixed(2);
          needsUpdate = true;
        } else if (salePrice >= 100) {
          updates.salePrice = salePrice.toFixed(2);
          needsUpdate = true;
        }
      }
      
      // Restore wholesalePrice if it was incorrectly converted
      if (item.wholesalePrice !== null && item.wholesalePrice !== undefined) {
        const wholesalePrice = typeof item.wholesalePrice === 'string' ? parseFloat(item.wholesalePrice) : item.wholesalePrice;
        if (wholesalePrice < 100 && wholesalePrice > 0 && wholesalePrice.toString().includes('.')) {
          const restored = Math.round(wholesalePrice * 100);
          updates.wholesalePrice = restored.toFixed(2);
          needsUpdate = true;
        } else if (wholesalePrice >= 100) {
          updates.wholesalePrice = wholesalePrice.toFixed(2);
          needsUpdate = true;
        }
      }
      
      // Restore costPrice if it was incorrectly converted
      if (item.costPrice !== null && item.costPrice !== undefined) {
        const costPrice = typeof item.costPrice === 'string' ? parseFloat(item.costPrice) : item.costPrice;
        if (costPrice < 100 && costPrice > 0 && costPrice.toString().includes('.')) {
          const restored = Math.round(costPrice * 100);
          updates.costPrice = restored.toFixed(2);
          needsUpdate = true;
        } else if (costPrice >= 100) {
          updates.costPrice = costPrice.toFixed(2);
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await db.update(items).set(updates).where(eq(items.id, item.id));
        console.log(`Restored pricing for item ${item.id}: ${item.name}`);
        restoredCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Pricing data restoration complete:`);
    console.log(`- Restored ${restoredCount} items`);
    console.log(`- Skipped ${skippedCount} items (no changes needed)`);
    
  } catch (error) {
    console.error('Error restoring pricing data:', error);
    throw error;
  }
}

// Run the restoration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  restorePricingData()
    .then(() => {
      console.log('Pricing data restoration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to restore pricing data:', error);
      process.exit(1);
    });
}

export { restorePricingData };