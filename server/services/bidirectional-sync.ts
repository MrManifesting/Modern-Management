/**
 * Bidirectional Synchronization Service
 * Handles sync between App ↔ Google Sheets ↔ Shopify
 */

import GoogleSheetsService, { SheetConfig, InventoryRow } from './google-sheets';
import { IStorage } from '../storage';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { items, syncLogs } from '../../shared/schema';

export interface SyncConfiguration {
  googleSheets: {
    spreadsheetId: string;
    worksheetName: string;
    enabled: boolean;
  };
  shopify: {
    enabled: boolean;
    autoSync: boolean;
  };
  syncInterval: number; // minutes
  conflictResolution: 'app-wins' | 'sheets-wins' | 'shopify-wins' | 'latest-wins';
}

export interface SyncResult {
  success: boolean;
  itemsUpdated: number;
  itemsCreated: number;
  conflicts: SyncConflict[];
  errors: string[];
  timestamp: Date;
}

export interface SyncConflict {
  sku: string;
  field: string;
  appValue: any;
  sheetsValue: any;
  shopifyValue?: any;
  resolution: string;
}

export class BidirectionalSyncService {
  private googleSheets: GoogleSheetsService;
  private storage: IStorage;
  private syncConfig: SyncConfiguration | null = null;
  private lastSyncTimestamp: Date | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.googleSheets = new GoogleSheetsService();
  }

  /**
   * Initialize sync configuration
   */
  async initializeSync(config: SyncConfiguration): Promise<boolean> {
    try {
      this.syncConfig = config;
      
      // For now, skip Google Sheets verification and focus on Shopify sync
      console.log('Bypassing Google Sheets setup for simplified sync');

      await this.logSyncEvent('sync-initialized', 'Bidirectional sync initialized', {
        config: config
      });

      console.log('Bidirectional sync initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize bidirectional sync:', error);
      return false;
    }
  }

  /**
   * Perform full bidirectional sync
   */
  async performFullSync(): Promise<SyncResult> {
    if (!this.syncConfig) {
      throw new Error('Sync not initialized');
    }

    const result: SyncResult = {
      success: false,
      itemsUpdated: 0,
      itemsCreated: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date()
    };

    try {
      console.log('Starting full bidirectional sync...');

      // Get data from all sources
      const [appData, sheetsData] = await Promise.all([
        this.getAppInventory(),
        this.getSheetsInventory()
      ]);

      console.log(`Found ${appData.length} items in app, ${sheetsData.length} items in sheets`);

      // Create lookup maps
      const appMap = new Map(appData.map(item => [item.sku, item]));
      const sheetsMap = new Map(sheetsData.map(item => [item.sku, item]));

      // Get all unique SKUs
      const allSkus = new Set([...appMap.keys(), ...sheetsMap.keys()]);

      // Process each item
      for (const sku of allSkus) {
        try {
          const appItem = appMap.get(sku);
          const sheetsItem = sheetsMap.get(sku);

          if (appItem && sheetsItem) {
            // Both exist - check for conflicts and sync
            const conflicts = await this.detectConflicts(appItem, sheetsItem);
            result.conflicts.push(...conflicts);

            const resolvedItem = await this.resolveConflicts(appItem, sheetsItem, conflicts);
            await this.updateAllSources(resolvedItem);
            result.itemsUpdated++;
          } else if (appItem && !sheetsItem) {
            // App only - push to sheets
            await this.pushToSheets(appItem);
            result.itemsCreated++;
          } else if (!appItem && sheetsItem) {
            // Sheets only - pull to app
            await this.pullFromSheets(sheetsItem);
            result.itemsCreated++;
          }
        } catch (error) {
          result.errors.push(`Error syncing ${sku}: ${error}`);
        }
      }

      this.lastSyncTimestamp = result.timestamp;
      result.success = result.errors.length === 0;

      await this.logSyncEvent('full-sync-completed', 'Full bidirectional sync completed', result);
      console.log(`Sync completed: ${result.itemsUpdated} updated, ${result.itemsCreated} created, ${result.conflicts.length} conflicts`);

      return result;
    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
      console.error('Full sync failed:', error);
      return result;
    }
  }

  /**
   * Sync a single item across all platforms
   */
  async syncSingleItem(sku: string, source: 'app' | 'sheets' | 'shopify'): Promise<boolean> {
    if (!this.syncConfig) {
      throw new Error('Sync not initialized');
    }

    try {
      console.log(`Syncing single item ${sku} from ${source}`);

      let sourceItem: any;

      // Get the source item
      switch (source) {
        case 'app':
          sourceItem = await this.storage.getItemBySku(sku);
          break;
        case 'sheets':
          const sheetsData = await this.getSheetsInventory();
          sourceItem = sheetsData.find(item => item.sku === sku);
          break;
        case 'shopify':
          // TODO: Get from Shopify API
          sourceItem = null;
          break;
      }

      if (!sourceItem) {
        console.warn(`Item ${sku} not found in source ${source}`);
        return false;
      }

      // Update all other sources
      await this.updateAllSources(sourceItem, source);

      await this.logSyncEvent('item-synced', `Item ${sku} synced from ${source}`, {
        sku,
        source,
        item: sourceItem
      });

      return true;
    } catch (error) {
      console.error(`Failed to sync item ${sku}:`, error);
      return false;
    }
  }

  /**
   * Detect changes in Google Sheets since last sync
   */
  async detectSheetsChanges(): Promise<InventoryRow[]> {
    if (!this.syncConfig?.googleSheets.enabled) {
      return [];
    }

    try {
      const sheetsData = await this.getSheetsInventory();
      
      if (!this.lastSyncTimestamp) {
        return sheetsData; // First sync - all items are "changed"
      }

      // Filter items that have been updated since last sync
      const changedItems = sheetsData.filter(item => {
        if (!item.lastUpdated) return false;
        const itemUpdateTime = new Date(item.lastUpdated);
        return itemUpdateTime > this.lastSyncTimestamp!;
      });

      console.log(`Detected ${changedItems.length} changed items in Google Sheets`);
      return changedItems;
    } catch (error) {
      console.error('Error detecting sheets changes:', error);
      return [];
    }
  }

  /**
   * Process incremental changes from sheets
   */
  async processIncrementalSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsUpdated: 0,
      itemsCreated: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date()
    };

    try {
      const changedItems = await this.detectSheetsChanges();
      
      for (const sheetsItem of changedItems) {
        try {
          const appItem = await this.storage.getItemBySku(sheetsItem.sku);
          
          if (appItem) {
            // Update existing item
            const conflicts = await this.detectConflicts(appItem, sheetsItem);
            result.conflicts.push(...conflicts);
            
            const resolvedItem = await this.resolveConflicts(appItem, sheetsItem, conflicts);
            await this.updateAppFromSheets(resolvedItem);
            result.itemsUpdated++;
          } else {
            // Create new item
            await this.pullFromSheets(sheetsItem);
            result.itemsCreated++;
          }
        } catch (error) {
          result.errors.push(`Error processing ${sheetsItem.sku}: ${error}`);
        }
      }

      this.lastSyncTimestamp = result.timestamp;
      result.success = result.errors.length === 0;

      if (changedItems.length > 0) {
        await this.logSyncEvent('incremental-sync', 'Incremental sync from sheets', result);
        console.log(`Incremental sync: ${result.itemsUpdated} updated, ${result.itemsCreated} created`);
      }

      return result;
    } catch (error) {
      result.errors.push(`Incremental sync failed: ${error}`);
      console.error('Incremental sync failed:', error);
      return result;
    }
  }

  /**
   * Private helper methods
   */
  private async getAppInventory(): Promise<any[]> {
    return await this.storage.getItems();
  }

  private async getSheetsInventory(): Promise<InventoryRow[]> {
    if (!this.syncConfig?.googleSheets.enabled) {
      return [];
    }

    return await this.googleSheets.getInventoryFromSheet({
      spreadsheetId: this.syncConfig.googleSheets.spreadsheetId,
      worksheetName: this.syncConfig.googleSheets.worksheetName
    });
  }

  private async detectConflicts(appItem: any, sheetsItem: InventoryRow): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Check quantity conflicts
    if (appItem.quantity !== sheetsItem.quantity) {
      conflicts.push({
        sku: appItem.sku,
        field: 'quantity',
        appValue: appItem.quantity,
        sheetsValue: sheetsItem.quantity,
        resolution: 'pending'
      });
    }

    // Check price conflicts
    const appPrice = parseFloat(appItem.basePrice || '0');
    const sheetsPrice = parseFloat(sheetsItem.price || '0');
    if (Math.abs(appPrice - sheetsPrice) > 0.01) {
      conflicts.push({
        sku: appItem.sku,
        field: 'price',
        appValue: appPrice,
        sheetsValue: sheetsPrice,
        resolution: 'pending'
      });
    }

    // Check name conflicts
    if (appItem.name !== sheetsItem.name) {
      conflicts.push({
        sku: appItem.sku,
        field: 'name',
        appValue: appItem.name,
        sheetsValue: sheetsItem.name,
        resolution: 'pending'
      });
    }

    return conflicts;
  }

  private async resolveConflicts(appItem: any, sheetsItem: InventoryRow, conflicts: SyncConflict[]): Promise<any> {
    const resolvedItem = { ...appItem };

    for (const conflict of conflicts) {
      switch (this.syncConfig?.conflictResolution) {
        case 'app-wins':
          conflict.resolution = 'app-wins';
          break;
        case 'sheets-wins':
          conflict.resolution = 'sheets-wins';
          resolvedItem[conflict.field] = conflict.sheetsValue;
          break;
        case 'latest-wins':
          // Use sheets value if it was updated more recently
          const sheetsUpdated = new Date(sheetsItem.lastUpdated);
          const appUpdated = new Date(appItem.updatedAt || appItem.createdAt);
          if (sheetsUpdated > appUpdated) {
            conflict.resolution = 'sheets-wins';
            resolvedItem[conflict.field] = conflict.sheetsValue;
          } else {
            conflict.resolution = 'app-wins';
          }
          break;
        default:
          conflict.resolution = 'app-wins';
          break;
      }
    }

    return resolvedItem;
  }

  private async updateAllSources(item: any, excludeSource?: string): Promise<void> {
    // Update app database
    if (excludeSource !== 'app') {
      await this.updateAppFromSheets(item);
    }

    // Update Google Sheets
    if (excludeSource !== 'sheets' && this.syncConfig?.googleSheets.enabled) {
      await this.pushToSheets(item);
    }

    // Update Shopify (TODO: implement Shopify sync)
    if (excludeSource !== 'shopify' && this.syncConfig?.shopify.enabled) {
      // await this.updateShopifyItem(item);
    }
  }

  private async pushToSheets(item: any): Promise<void> {
    if (!this.syncConfig?.googleSheets.enabled) {
      return;
    }

    await this.googleSheets.updateInventoryItem(item, {
      spreadsheetId: this.syncConfig.googleSheets.spreadsheetId,
      worksheetName: this.syncConfig.googleSheets.worksheetName
    });
  }

  private async pullFromSheets(sheetsItem: InventoryRow): Promise<void> {
    // Convert sheets item to app format
    const appItem = {
      sku: sheetsItem.sku,
      name: sheetsItem.name,
      category: sheetsItem.category,
      brand: sheetsItem.vendor,
      quantity: sheetsItem.quantity,
      weight: String(sheetsItem.weight || 0),
      basePrice: sheetsItem.price,
      costPrice: sheetsItem.cost,
      status: sheetsItem.status || 'active'
    };

    await this.storage.createItem(appItem);
  }

  private async updateAppFromSheets(item: any): Promise<void> {
    const existingItem = await this.storage.getItemBySku(item.sku);
    if (existingItem) {
      await this.storage.updateItem(existingItem.id, item);
    } else {
      await this.storage.createItem(item);
    }
  }

  private async logSyncEvent(type: string, message: string, data?: any): Promise<void> {
    try {
      await db.insert(syncLogs).values({
        type,
        message,
        data: JSON.stringify(data),
        timestamp: new Date(),
        source: 'system',
        target: 'all', // Add required target field
        status: 'completed',
        itemsProcessed: 0,
        itemsSuccess: 0,
        itemsError: 0,
        duration: 0
      });
    } catch (error) {
      console.error('Failed to log sync event:', error);
    }
  }

  /**
   * Get sync status and configuration
   */
  getSyncStatus() {
    return {
      initialized: !!this.syncConfig,
      lastSync: this.lastSyncTimestamp,
      config: this.syncConfig,
      googleSheetsConfigured: this.googleSheets.isConfigured()
    };
  }
}

export default BidirectionalSyncService;