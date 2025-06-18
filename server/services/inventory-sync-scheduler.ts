/**
 * Inventory Sync Scheduler
 * Automatically syncs inventory levels from Shopify every minute
 */

import { storage } from '../storage';
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
      
      // Fetch Shopify products with inventory quantities directly from Shopify API
      const storeUrl = process.env.SHOPIFY_STORE;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!storeUrl || !accessToken) {
        log('Missing Shopify credentials for inventory sync', 'inventory-sync');
        return;
      }

      const response = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json?limit=250&fields=id,title,variants`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        log(`Shopify API request failed: ${response.status} ${response.statusText}`, 'inventory-sync');
        return;
      }
      
      const responseData = await response.json();
      const shopifyProducts = responseData.products || [];
      
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
        if (!shopifyProduct.variants || shopifyProduct.variants.length === 0) {
          continue;
        }

        // Process each variant (most products have only one variant)
        for (const variant of shopifyProduct.variants) {
          const variantSku = variant.sku;
          const inventoryQty = variant.inventory_quantity || 0;

          if (!variantSku) {
            continue;
          }

          // Find matching local item by SKU
          const localItem = localItems.find(item => 
            item.sku === variantSku || 
            item.name?.toLowerCase().includes(shopifyProduct.title?.toLowerCase() || '') ||
            shopifyProduct.title?.toLowerCase().includes(item.name?.toLowerCase() || '')
          );

          if (localItem) {
            const currentQty = parseInt(String(localItem.quantity || 0));
            const shopifyQty = parseInt(String(inventoryQty));

            // Only update if quantities are different
            if (currentQty !== shopifyQty) {
              try {
                await storage.updateItem(localItem.id, {
                  quantity: shopifyQty,
                  shopifyId: shopifyProduct.id.toString()
                });

                // Log the inventory action
                await storage.createInventoryAction({
                  itemId: localItem.id,
                  type: 'sync',
                  quantity: shopifyQty - currentQty,
                  reason: `Auto-sync from Shopify (${currentQty} → ${shopifyQty})`,
                  previousQuantity: currentQty,
                  newQuantity: shopifyQty
                });

                updates.push({
                  itemId: localItem.id,
                  oldQty: currentQty,
                  newQty: shopifyQty,
                  sku: variantSku
                });

                updatedCount++;
                log(`Updated ${localItem.name}: ${currentQty} → ${shopifyQty}`, 'inventory-sync');
              } catch (updateError) {
                console.error(`Failed to update item ${localItem.id}:`, updateError);
              }
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