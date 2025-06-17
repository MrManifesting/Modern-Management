/**
 * Inventory Sync Scheduler
 * Automatically syncs inventory levels from Shopify every minute
 */

import { storage } from '../storage';
import { getShopifyProducts } from './shopify-sync';
import { log } from '../vite';

class InventorySyncScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSync: Date | null = null;
  private syncCount = 0;

  constructor() {
    this.startScheduler();
  }

  startScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Run sync every minute (60,000 ms)
    this.intervalId = setInterval(() => {
      this.performSync();
    }, 60000);

    this.isRunning = true;
    log('Inventory sync scheduler started - will sync every minute', 'inventory-sync');
    
    // Perform initial sync
    setTimeout(() => {
      this.performSync();
    }, 5000); // Wait 5 seconds after startup
  }

  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    log('Inventory sync scheduler stopped', 'inventory-sync');
  }

  async performSync() {
    if (!this.isRunning) {
      return;
    }

    try {
      log(`Starting automatic inventory sync #${this.syncCount + 1}`, 'inventory-sync');
      
      // Get all Shopify products with current inventory
      const shopifyProductsResponse: any = await getShopifyProducts();
      const shopifyProducts = Array.isArray(shopifyProductsResponse) ? shopifyProductsResponse : shopifyProductsResponse?.products || [];
      
      if (!shopifyProducts || shopifyProducts.length === 0) {
        log('No Shopify products found during sync', 'inventory-sync');
        return;
      }

      // Get all local inventory items
      const localItems = await storage.getAllItems();
      
      let updatedCount = 0;
      const updates: Array<{itemId: number, oldQty: number, newQty: number, sku: string}> = [];

      // Match Shopify products to local items and update quantities
      for (const shopifyProduct of shopifyProducts) {
        // Find matching local item by SKU or product title
        const localItem = localItems.find(item => 
          item.sku === shopifyProduct.sku || 
          item.name?.toLowerCase().includes(shopifyProduct.title?.toLowerCase() || '') ||
          shopifyProduct.title?.toLowerCase().includes(item.name?.toLowerCase() || '')
        );

        if (localItem && shopifyProduct.inventory_quantity !== undefined) {
          const currentQty = parseInt(String(localItem.quantity || 0));
          const shopifyQty = parseInt(String(shopifyProduct.inventory_quantity));

          // Only update if quantities are different
          if (currentQty !== shopifyQty) {
            try {
              await storage.updateItem(localItem.id, {
                quantity: shopifyQty
              });

              updates.push({
                itemId: localItem.id,
                oldQty: currentQty,
                newQty: shopifyQty,
                sku: localItem.sku || 'N/A'
              });

              updatedCount++;
            } catch (updateError) {
              console.error(`Failed to update item ${localItem.id}:`, updateError);
            }
          }
        }
      }

      this.lastSync = new Date();
      this.syncCount++;

      if (updatedCount > 0) {
        log(`Inventory sync completed: Updated ${updatedCount} items from Shopify`, 'inventory-sync');
        
        // Log detailed updates
        updates.forEach(update => {
          log(`Updated ${update.sku}: ${update.oldQty} → ${update.newQty}`, 'inventory-sync');
        });
      } else {
        log(`Inventory sync completed: All ${localItems.length} items already in sync`, 'inventory-sync');
      }

    } catch (error) {
      console.error('Failed to perform automatic inventory sync:', error);
      log(`Inventory sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'inventory-sync');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSync,
      syncCount: this.syncCount,
      nextSync: this.intervalId ? new Date(Date.now() + 60000) : null
    };
  }

  async manualSync() {
    log('Manual inventory sync triggered', 'inventory-sync');
    await this.performSync();
  }
}

// Create singleton instance
export const inventorySyncScheduler = new InventorySyncScheduler();

// Export for API access
export { InventorySyncScheduler };