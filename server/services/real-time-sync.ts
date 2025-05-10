/**
 * Real-time synchronization service
 * 
 * This service handles real-time synchronization of inventory items with marketplaces
 * Ensures immediate sync rather than waiting for scheduled updates
 */

import type { IStorage } from "../storage";
import type { Item, Marketplace } from "@shared/schema";
import { log } from '../vite';
import { MarketplaceService } from "./marketplace";

/**
 * Synchronize a single item with all connected marketplaces
 * This is called after any item update/creation in the app to push changes to marketplaces
 */
export async function syncItemWithMarketplaces(
  item: Item, 
  storage: IStorage
): Promise<{
  success: boolean;
  syncedWith: Array<{
    marketplaceId: number;
    name: string;
    success: boolean;
    message: string;
  }>;
  error?: string;
}> {
  try {
    // Get all enabled marketplaces this item should be pushed to
    const allMarketplaces = await storage.getAllMarketplaces();
    
    // If the item has marketplace settings, filter by those
    let enabledMarketplaces: Marketplace[] = [];
    
    if (item.marketplace && Array.isArray(item.marketplace) && item.marketplace.length > 0) {
      // Find marketplaces that match the IDs in item.marketplace
      enabledMarketplaces = allMarketplaces.filter(m => 
        m.isConnected && 
        m.isSyncEnabled &&
        (item.marketplace?.includes(m.id.toString()) || item.marketplace?.includes(m.id))
      );
    } else {
      // Get all enabled marketplaces
      enabledMarketplaces = allMarketplaces.filter(m => m.isConnected && m.isSyncEnabled);
    }
    
    if (enabledMarketplaces.length === 0) {
      return {
        success: true,
        syncedWith: [],
        error: "No enabled marketplaces found for this item"
      };
    }
    
    log(`Real-time sync: Pushing item "${item.name}" (ID: ${item.id}) to ${enabledMarketplaces.length} marketplaces`, 'marketplace-sync');
    
    // Push to each marketplace in parallel
    const syncResults = await Promise.all(
      enabledMarketplaces.map(async (marketplace) => {
        try {
          const marketplaceService = new MarketplaceService(marketplace);
          const result = await marketplaceService.pushProduct(item);
          
          if (result.success) {
            // Update the item's last pushed timestamp for this marketplace
            if (typeof storage.updateItemLastPushed === 'function') {
              await storage.updateItemLastPushed(item.id, marketplace.id, new Date());
            }
          }
          
          return {
            marketplaceId: marketplace.id,
            name: marketplace.name,
            success: result.success,
            message: result.message || (result.success ? 'Sync successful' : 'Sync failed')
          };
        } catch (error: any) {
          return {
            marketplaceId: marketplace.id,
            name: marketplace.name,
            success: false,
            message: `Error during sync: ${error.message}`
          };
        }
      })
    );
    
    const allSuccessful = syncResults.every(result => result.success);
    
    return {
      success: allSuccessful,
      syncedWith: syncResults
    };
  } catch (error: any) {
    log(`Error in real-time sync for item ${item.id}: ${error.message}`, 'marketplace-sync-error');
    return {
      success: false,
      syncedWith: [],
      error: `Sync failed: ${error.message}`
    };
  }
}

/**
 * Get the latest data from marketplaces for a single item
 * Called when viewing/using a specific item to ensure its data is up-to-date
 */
export async function refreshItemFromMarketplaces(
  item: Item,
  storage: IStorage
): Promise<{
  success: boolean;
  refreshedFrom: Array<{
    marketplaceId: number;
    name: string;
    success: boolean;
    message: string;
    externalData?: any;
  }>;
  error?: string;
}> {
  try {
    // Get all external IDs for this item
    let itemExternalIds: Record<string, string> = {};
    
    if (typeof storage.getItemExternalIds === 'function') {
      itemExternalIds = await storage.getItemExternalIds(item.id) || {};
    }
    
    // Get all enabled marketplaces
    const allMarketplaces = await storage.getAllMarketplaces();
    const enabledMarketplaces = allMarketplaces.filter(m => m.isConnected && m.isSyncEnabled);
    
    if (enabledMarketplaces.length === 0) {
      return {
        success: true,
        refreshedFrom: [],
        error: "No enabled marketplaces found"
      };
    }
    
    // Only process marketplaces where this item exists
    const relevantMarketplaces = enabledMarketplaces.filter(m => 
      itemExternalIds[m.id.toString()] !== undefined
    );
    
    if (relevantMarketplaces.length === 0) {
      return {
        success: true,
        refreshedFrom: [],
        error: "Item not found in any marketplace"
      };
    }
    
    log(`Real-time refresh: Fetching latest data for item "${item.name}" (ID: ${item.id}) from ${relevantMarketplaces.length} marketplaces`, 'marketplace-sync');
    
    // Fetch from each marketplace in parallel
    const refreshResults = await Promise.all(
      relevantMarketplaces.map(async (marketplace) => {
        try {
          const externalId = itemExternalIds[marketplace.id.toString()];
          
          if (!externalId) {
            return {
              marketplaceId: marketplace.id,
              name: marketplace.name,
              success: false,
              message: 'No external ID found for this marketplace'
            };
          }
          
          const marketplaceService = new MarketplaceService(marketplace);
          const result = await marketplaceService.fetchProduct(externalId);
          
          if (result.success && result.product) {
            // Update the item with data from the marketplace
            // Here you could selectively update certain fields from the marketplace
            // For example, you might want to update inventory but not other fields
            await storage.updateItem(item.id, { 
              quantity: result.product.quantity,
              // Add any other fields that should be updated from the marketplace
            });
            
            return {
              marketplaceId: marketplace.id,
              name: marketplace.name,
              success: true,
              message: 'Successfully refreshed item data',
              externalData: result.product
            };
          } else {
            return {
              marketplaceId: marketplace.id,
              name: marketplace.name,
              success: false,
              message: result.message || 'Failed to fetch product data'
            };
          }
        } catch (error: any) {
          return {
            marketplaceId: marketplace.id,
            name: marketplace.name,
            success: false,
            message: `Error during refresh: ${error.message}`
          };
        }
      })
    );
    
    const allSuccessful = refreshResults.every(result => result.success);
    
    return {
      success: allSuccessful,
      refreshedFrom: refreshResults
    };
  } catch (error: any) {
    log(`Error in real-time refresh for item ${item.id}: ${error.message}`, 'marketplace-sync-error');
    return {
      success: false,
      refreshedFrom: [],
      error: `Refresh failed: ${error.message}`
    };
  }
}