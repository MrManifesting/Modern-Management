import { db } from './db';
import { items } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Fix pricing data in the database by converting raw numbers to proper decimal format
 * This script handles cases where prices were stored as raw numbers (e.g., 1155 instead of 11.55)
 */
async function fixPricingData() {
  console.log('Starting pricing data fix...');
  
  try {
    // Get all items with pricing data
    const allItems = await db.select().from(items);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const item of allItems) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Fix basePrice if it's a large number that should be a decimal
      if (item.basePrice && typeof item.basePrice === 'string') {
        const basePrice = parseFloat(item.basePrice);
        if (basePrice > 100 && basePrice.toString().indexOf('.') === -1) {
          // Convert large whole numbers to decimals (e.g., 1155 -> 11.55)
          updates.basePrice = (basePrice / 100).toFixed(2);
          needsUpdate = true;
        }
      }
      
      // Fix salePrice if it's a large number that should be a decimal
      if (item.salePrice && typeof item.salePrice === 'string') {
        const salePrice = parseFloat(item.salePrice);
        if (salePrice > 100 && salePrice.toString().indexOf('.') === -1) {
          updates.salePrice = (salePrice / 100).toFixed(2);
          needsUpdate = true;
        }
      }
      
      // Fix wholesalePrice if it's a large number that should be a decimal
      if (item.wholesalePrice && typeof item.wholesalePrice === 'string') {
        const wholesalePrice = parseFloat(item.wholesalePrice);
        if (wholesalePrice > 100 && wholesalePrice.toString().indexOf('.') === -1) {
          updates.wholesalePrice = (wholesalePrice / 100).toFixed(2);
          needsUpdate = true;
        }
      }
      
      // Fix costPrice if it's a large number that should be a decimal
      if (item.costPrice && typeof item.costPrice === 'string') {
        const costPrice = parseFloat(item.costPrice);
        if (costPrice > 100 && costPrice.toString().indexOf('.') === -1) {
          updates.costPrice = (costPrice / 100).toFixed(2);
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await db.update(items).set(updates).where(eq(items.id, item.id));
        console.log(`Fixed pricing for item ${item.id}: ${item.name}`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Pricing data fix complete:`);
    console.log(`- Fixed ${fixedCount} items`);
    console.log(`- Skipped ${skippedCount} items (no changes needed)`);
    
  } catch (error) {
    console.error('Error fixing pricing data:', error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPricingData()
    .then(() => {
      console.log('Pricing data fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to fix pricing data:', error);
      process.exit(1);
    });
}

export { fixPricingData };