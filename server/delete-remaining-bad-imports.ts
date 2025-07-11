import { db } from './db';
import { eq } from 'drizzle-orm';
import { items } from '@shared/schema';

async function deleteRemainingBadImports() {
  console.log('Deleting all remaining items with $30 price...\n');
  
  try {
    // Count items before deletion
    const itemsToDelete = await db
      .select()
      .from(items)
      .where(eq(items.sale_price, 30));
    
    console.log(`Found ${itemsToDelete.length} items with $30 price to delete`);
    
    // Show sample of what will be deleted
    console.log('\nSample of items to be deleted:');
    itemsToDelete.slice(0, 10).forEach(item => {
      console.log(`  - ${item.name} (Qty: ${item.quantity}, Category: ${item.category})`);
    });
    if (itemsToDelete.length > 10) {
      console.log(`  ... and ${itemsToDelete.length - 10} more items`);
    }
    
    // Delete all items with $30 price
    const result = await db
      .delete(items)
      .where(eq(items.sale_price, 30));
    
    console.log(`\nSuccessfully deleted ${itemsToDelete.length} items with $30 price`);
    
    // Get updated count
    const remainingItems = await db.select().from(items);
    console.log(`Total items remaining in inventory: ${remainingItems.length}`);
    
    return {
      deleted: itemsToDelete.length,
      remaining: remainingItems.length
    };
  } catch (error) {
    console.error('Error deleting items:', error);
    throw error;
  }
}

// Run deletion
if (import.meta.url === `file://${process.argv[1]}`) {
  deleteRemainingBadImports()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { deleteRemainingBadImports };