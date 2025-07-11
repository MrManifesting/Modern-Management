import { db } from './db';
import { items } from '@shared/schema';

async function clearAllInventory() {
  console.log('WARNING: This will delete ALL inventory items from the database.');
  console.log('Starting deletion process...\n');
  
  try {
    // Get count of items before deletion
    const allItems = await db.select().from(items);
    const totalCount = allItems.length;
    
    console.log(`Found ${totalCount} items in inventory`);
    
    if (totalCount === 0) {
      console.log('No items to delete. Inventory is already empty.');
      return;
    }
    
    // Show sample of what will be deleted
    console.log('\nSample of items to be deleted:');
    allItems.slice(0, 5).forEach(item => {
      console.log(`  - ${item.name} (SKU: ${item.sku}, Qty: ${item.quantity})`);
    });
    if (totalCount > 5) {
      console.log(`  ... and ${totalCount - 5} more items`);
    }
    
    // Delete all items
    console.log('\nDeleting all items...');
    await db.delete(items);
    
    console.log(`\n✓ Successfully deleted ${totalCount} items`);
    console.log('✓ Inventory is now empty and ready for fresh import');
    
    // Verify deletion
    const remainingItems = await db.select().from(items);
    console.log(`\nVerification: ${remainingItems.length} items remaining (should be 0)`);
    
  } catch (error) {
    console.error('Error clearing inventory:', error);
    throw error;
  }
}

// Run the clear operation
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== CLEAR ALL INVENTORY ===\n');
  clearAllInventory()
    .then(() => {
      console.log('\n=== OPERATION COMPLETED ===');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n=== OPERATION FAILED ===');
      console.error(error);
      process.exit(1);
    });
}

export { clearAllInventory };