import { db } from './db';
import { eq, and, or, like } from 'drizzle-orm';
import { items } from '@shared/schema';

// Price structure based on weight for cannabis products
const PRICE_BY_WEIGHT = {
  // Pre-rolls
  preroll: { base: 10, sale: 8 },
  
  // Regular flower by weight
  '1g': { base: 15, sale: 12 },
  '2g': { base: 25, sale: 20 },
  '3.5g': { base: 50, sale: 40 }, // eighth
  '7g': { base: 90, sale: 75 },    // quarter
  '14g': { base: 150, sale: 120 },  // half oz
  '28g': { base: 250, sale: 200 },  // ounce
  
  // Bulk flower (pounds)
  '1lb': { base: 1250, sale: 1150 },
  '453g': { base: 1250, sale: 1150 }, // 1 pound in grams
};

async function fixImportPrices() {
  console.log('Starting price correction for imported items...');
  
  try {
    // First, get all items with the problematic $30 price
    const problematicItems = await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.sale_price, 30),
          or(
            eq(items.category, 'Shopify Import'),
            eq(items.category, 'Imported')
          )
        )
      );
    
    console.log(`Found ${problematicItems.length} items with $30 price to fix`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const item of problematicItems) {
      const nameLower = item.name.toLowerCase();
      let newPrices = null;
      
      // Check if it's a pre-roll
      if (nameLower.includes('preroll') || nameLower.includes('pre-roll')) {
        newPrices = PRICE_BY_WEIGHT.preroll;
      }
      // Check for weight-only names
      else if (nameLower.match(/^\d+(\.\d+)?\s*(gram|grams|g)$/)) {
        const weightMatch = nameLower.match(/^(\d+(?:\.\d+)?)\s*/);
        if (weightMatch) {
          const weight = parseFloat(weightMatch[1]);
          
          if (weight <= 1) newPrices = PRICE_BY_WEIGHT['1g'];
          else if (weight <= 2) newPrices = PRICE_BY_WEIGHT['2g'];
          else if (weight <= 3.5) newPrices = PRICE_BY_WEIGHT['3.5g'];
          else if (weight <= 7) newPrices = PRICE_BY_WEIGHT['7g'];
          else if (weight <= 14) newPrices = PRICE_BY_WEIGHT['14g'];
          else if (weight <= 28) newPrices = PRICE_BY_WEIGHT['28g'];
          else if (weight >= 453) newPrices = PRICE_BY_WEIGHT['1lb'];
        }
      }
      // Check for pound weights
      else if (nameLower.includes('pound') || nameLower.includes('lb')) {
        newPrices = PRICE_BY_WEIGHT['1lb'];
      }
      
      // Apply the price fix
      if (newPrices) {
        await db
          .update(items)
          .set({
            base_price: newPrices.base,
            sale_price: newPrices.sale
          })
          .where(eq(items.id, item.id));
        
        console.log(`Fixed: ${item.name} - Base: $${newPrices.base}, Sale: $${newPrices.sale}`);
        fixed++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\nPrice correction complete!`);
    console.log(`Fixed: ${fixed} items`);
    console.log(`Skipped: ${skipped} items (unable to determine correct price)`);
    
    return { fixed, skipped, total: problematicItems.length };
  } catch (error) {
    console.error('Error fixing prices:', error);
    throw error;
  }
}

// Run the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  fixImportPrices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixImportPrices };