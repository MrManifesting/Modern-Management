/**
 * Marketplace Scheduler Service
 * 
 * This service handles scheduling and executing sync operations between 
 * the local inventory and connected marketplaces.
 */

import { type Marketplace } from '@shared/schema';
import { IStorage } from '../storage';
import { MarketplaceService } from './marketplace';
import { log } from '../vite';

// Default intervals in milliseconds
const DEFAULT_PULL_INTERVAL = 15 * 60 * 1000; // 15 minutes
const DEFAULT_PUSH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export class MarketplaceSchedulerService {
  private storage: IStorage;
  private pullIntervals: Map<number, NodeJS.Timeout> = new Map();
  private pushIntervals: Map<number, NodeJS.Timeout> = new Map();
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Initialize the scheduler
   */
  async initialize(): Promise<void> {
    try {
      log('Initializing marketplace scheduler service', 'marketplace-scheduler');
      
      // Get all marketplaces
      const marketplaces = await this.storage.getAllMarketplaces();
      
      // Set up scheduled syncs for each marketplace with sync enabled
      for (const marketplace of marketplaces) {
        if (marketplace.isSyncEnabled && marketplace.isConnected) {
          await this.scheduleMarketplaceSync(marketplace);
        }
      }
      
      log(`Initialized scheduling for ${marketplaces.length} marketplaces`, 'marketplace-scheduler');
    } catch (error: any) {
      log(`Error initializing marketplace scheduler: ${error.message}`, 'marketplace-scheduler-error');
    }
  }
  
  /**
   * Schedule sync operations for a marketplace
   */
  async scheduleMarketplaceSync(marketplace: Marketplace): Promise<void> {
    try {
      // Cancel any existing intervals
      this.cancelMarketplaceSync(marketplace.id);
      
      if (!marketplace.isSyncEnabled || !marketplace.isConnected) {
        log(`Marketplace ${marketplace.name} (ID: ${marketplace.id}) sync not enabled or not connected. Skipping scheduling.`, 'marketplace-scheduler');
        return;
      }
      
      // Calculate intervals
      const pullInterval = marketplace.syncPullInterval ? 
        marketplace.syncPullInterval * 60 * 1000 : DEFAULT_PULL_INTERVAL;
      
      const pushInterval = marketplace.syncPushInterval ? 
        marketplace.syncPushInterval * 60 * 1000 : DEFAULT_PUSH_INTERVAL;
      
      // Schedule pull (sync from marketplace to local)
      const pullIntervalId = setInterval(async () => {
        await this.executePullSync(marketplace);
      }, pullInterval);
      
      // Schedule push (sync from local to marketplace)
      const pushIntervalId = setInterval(async () => {
        await this.executePushSync(marketplace);
      }, pushInterval);
      
      // Store the interval IDs
      this.pullIntervals.set(marketplace.id, pullIntervalId);
      this.pushIntervals.set(marketplace.id, pushIntervalId);
      
      log(`Scheduled syncs for marketplace ${marketplace.name} (ID: ${marketplace.id}):
        - Pull interval: ${pullInterval / (60 * 1000)} minutes
        - Push interval: ${pushInterval / (60 * 1000)} minutes`, 
        'marketplace-scheduler');
    } catch (error: any) {
      log(`Error scheduling marketplace sync for ${marketplace.name} (ID: ${marketplace.id}): ${error.message}`, 'marketplace-scheduler-error');
    }
  }
  
  /**
   * Cancel scheduled sync operations for a marketplace
   */
  cancelMarketplaceSync(marketplaceId: number): void {
    // Cancel pull interval
    if (this.pullIntervals.has(marketplaceId)) {
      clearInterval(this.pullIntervals.get(marketplaceId)!);
      this.pullIntervals.delete(marketplaceId);
    }
    
    // Cancel push interval
    if (this.pushIntervals.has(marketplaceId)) {
      clearInterval(this.pushIntervals.get(marketplaceId)!);
      this.pushIntervals.delete(marketplaceId);
    }
    
    log(`Cancelled scheduled syncs for marketplace ID: ${marketplaceId}`, 'marketplace-scheduler');
  }
  
  /**
   * Execute a pull sync (from marketplace to local)
   */
  async executePullSync(marketplace: Marketplace): Promise<void> {
    try {
      log(`Executing pull sync for ${marketplace.name} (ID: ${marketplace.id})`, 'marketplace-scheduler');
      
      // Create marketplace service
      const marketplaceService = new MarketplaceService(marketplace);
      
      // Execute the sync
      const result = await marketplaceService.syncProducts();
      
      if (result.success) {
        log(`Pull sync completed for ${marketplace.name}: ${result.message}`, 'marketplace-scheduler');
        
        // Update last sync time
        await this.storage.updateMarketplaceLastSync(marketplace.id, new Date());
      } else {
        log(`Pull sync failed for ${marketplace.name}: ${result.message}`, 'marketplace-scheduler-error');
      }
    } catch (error: any) {
      log(`Error executing pull sync for ${marketplace.name} (ID: ${marketplace.id}): ${error.message}`, 'marketplace-scheduler-error');
    }
  }
  
  /**
   * Execute a push sync (from local to marketplace)
   */
  async executePushSync(marketplace: Marketplace): Promise<void> {
    try {
      log(`Executing push sync for ${marketplace.name} (ID: ${marketplace.id})`, 'marketplace-scheduler');
      
      // Get items that need to be pushed
      const items = await this.storage.getItemsForMarketplacePush(marketplace.id);
      
      if (items.length === 0) {
        log(`No items to push for ${marketplace.name}`, 'marketplace-scheduler');
        return;
      }
      
      // Create marketplace service
      const marketplaceService = new MarketplaceService(marketplace);
      
      // Push each item
      let successCount = 0;
      let failureCount = 0;
      
      for (const item of items) {
        try {
          const result = await marketplaceService.pushProduct(item);
          
          if (result.success) {
            successCount++;
            // Update the item's push status
            await this.storage.updateItemLastPushed(item.id, marketplace.id, new Date());
          } else {
            failureCount++;
            log(`Failed to push item ${item.name} (ID: ${item.id}) to ${marketplace.name}: ${result.message}`, 'marketplace-scheduler-error');
          }
        } catch (error: any) {
          failureCount++;
          log(`Error pushing item ${item.name} (ID: ${item.id}) to ${marketplace.name}: ${error.message}`, 'marketplace-scheduler-error');
        }
      }
      
      log(`Push sync completed for ${marketplace.name}: ${successCount} succeeded, ${failureCount} failed`, 'marketplace-scheduler');
      
      // Update last push time
      await this.storage.updateMarketplaceLastPush(marketplace.id, new Date());
    } catch (error: any) {
      log(`Error executing push sync for ${marketplace.name} (ID: ${marketplace.id}): ${error.message}`, 'marketplace-scheduler-error');
    }
  }
  
  /**
   * Execute a manual pull sync
   */
  async manualPullSync(marketplaceId: number): Promise<{ success: boolean; message: string }> {
    try {
      const marketplace = await this.storage.getMarketplace(marketplaceId);
      
      if (!marketplace) {
        return { success: false, message: 'Marketplace not found' };
      }
      
      await this.executePullSync(marketplace);
      return { success: true, message: `Manual pull sync initiated for ${marketplace.name}` };
    } catch (error: any) {
      return { success: false, message: `Error initiating manual pull sync: ${error.message}` };
    }
  }
  
  /**
   * Execute a manual push sync
   */
  async manualPushSync(marketplaceId: number): Promise<{ success: boolean; message: string }> {
    try {
      const marketplace = await this.storage.getMarketplace(marketplaceId);
      
      if (!marketplace) {
        return { success: false, message: 'Marketplace not found' };
      }
      
      await this.executePushSync(marketplace);
      return { success: true, message: `Manual push sync initiated for ${marketplace.name}` };
    } catch (error: any) {
      return { success: false, message: `Error initiating manual push sync: ${error.message}` };
    }
  }
  
  /**
   * Clean up all scheduled tasks
   */
  cleanup(): void {
    // Cancel all pull intervals
    for (const [marketplaceId, intervalId] of this.pullIntervals.entries()) {
      clearInterval(intervalId);
    }
    this.pullIntervals.clear();
    
    // Cancel all push intervals
    for (const [marketplaceId, intervalId] of this.pushIntervals.entries()) {
      clearInterval(intervalId);
    }
    this.pushIntervals.clear();
    
    log('Cleaned up all marketplace scheduler tasks', 'marketplace-scheduler');
  }
}

// Create a singleton instance
let schedulerInstance: MarketplaceSchedulerService | null = null;

/**
 * Get or create the marketplace scheduler service
 */
export function getMarketplaceScheduler(storage: IStorage): MarketplaceSchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new MarketplaceSchedulerService(storage);
  }
  return schedulerInstance;
}