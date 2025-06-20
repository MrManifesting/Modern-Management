import { CSVInventorySync } from './csv-inventory-sync.js';

export class CSVSyncScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private csvSync: CSVInventorySync;
  private syncIntervalMinutes: number;

  constructor(syncIntervalMinutes: number = 30) {
    this.csvSync = new CSVInventorySync();
    this.syncIntervalMinutes = syncIntervalMinutes;
  }

  // Start automatic sync every X minutes
  start(): void {
    if (this.intervalId) {
      console.log('[csv-sync-scheduler] Sync scheduler already running');
      return;
    }

    console.log(`[csv-sync-scheduler] Starting automatic CSV sync every ${this.syncIntervalMinutes} minutes`);
    
    // Run initial sync
    this.performSync();
    
    // Schedule recurring syncs
    this.intervalId = setInterval(() => {
      this.performSync();
    }, this.syncIntervalMinutes * 60 * 1000);
  }

  // Stop automatic sync
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[csv-sync-scheduler] Automatic CSV sync stopped');
    }
  }

  // Manually trigger sync
  async performSync(): Promise<void> {
    try {
      console.log('[csv-sync-scheduler] Performing automatic CSV sync...');
      
      // Load latest data and sync
      await this.csvSync.loadFlowerVariantsCSV();
      await this.csvSync.loadMenuTabCSV();
      
      const summary = await this.csvSync.getSyncSummary();
      console.log(`[csv-sync-scheduler] Sync completed: ${summary.itemsWithQuantity}/${summary.totalItems} items with quantities, ${summary.totalAvailableQuantity} total lbs available`);
      
    } catch (error) {
      console.error('[csv-sync-scheduler] Error during automatic sync:', error);
    }
  }

  // Get current sync status
  getStatus(): {
    isRunning: boolean;
    syncIntervalMinutes: number;
    nextSyncTime?: Date;
  } {
    const nextSyncTime = this.intervalId ? 
      new Date(Date.now() + this.syncIntervalMinutes * 60 * 1000) : 
      undefined;

    return {
      isRunning: this.intervalId !== null,
      syncIntervalMinutes: this.syncIntervalMinutes,
      nextSyncTime
    };
  }

  // Update sync interval
  setSyncInterval(minutes: number): void {
    this.syncIntervalMinutes = minutes;
    
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}

// Global instance
export const csvSyncScheduler = new CSVSyncScheduler(30); // Default: sync every 30 minutes