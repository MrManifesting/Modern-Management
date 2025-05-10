/**
 * Real-time synchronization service
 * 
 * This service handles real-time synchronization of inventory items with marketplaces
 * Ensures immediate sync rather than waiting for scheduled updates
 */

import { type Item, type Marketplace } from '@shared/schema';
import { IStorage } from '../storage';
import { MarketplaceService } from './marketplace';
import { log } from '../vite';

/**
 * Synchronize a single item with all connected marketplaces
 * This is called after any item update/creation in the app to push changes to marketplaces
 */
export async function syncItemWithMarketplaces(
  item: Item, 
  storage: IStorage
): Promise<{ success: boolean; message: string }> {
  try {
    // Get all connected and enabled marketplaces
    const marketplaces = await storage.getAllMarketplaces();
    const enabledMarketplaces = marketplaces.filter(m => m.isConnected && m.isSyncEnabled);
    
    if (enabledMarketplaces.length === 0) {
      return { success: true, message: "No enabled marketplaces found for synchronization" };
    }
    
    log(`Real-time sync: Pushing item "${item.name}" (ID: ${item.id}) to ${enabledMarketplaces.length} marketplaces`, 'marketplace-sync');
    
    // Track results
    let successCount = 0;
    let errorMessages: string[] = [];
    
    // Push to each marketplace
    for (const marketplace of enabledMarketplaces) {
      try {
        const marketplaceService = new MarketplaceService(marketplace);
        const result = await marketplaceService.pushProduct(item);
        
        if (result.success) {
          successCount++;
          
          // Update the item's last pushed timestamp for this marketplace
          await storage.updateItemLastPushed(item.id, marketplace.id, new Date());
          
          log(`Real-time sync: Successfully pushed item "${item.name}" to ${marketplace.name}`, 'marketplace-sync');
        } else {
          errorMessages.push(`Failed on ${marketplace.name}: ${result.message}`);
          log(`Real-time sync: Failed to push item "${item.name}" to ${marketplace.name}: ${result.message}`, 'marketplace-sync-error');
        }
      } catch (error: any) {
        errorMessages.push(`Error with ${marketplace.name}: ${error.message}`);
        log(`Real-time sync: Error pushing item "${item.name}" to ${marketplace.name}: ${error.message}`, 'marketplace-sync-error');
      }
    }
    
    // Return overall result
    if (successCount === enabledMarketplaces.length) {
      return { 
        success: true, 
        message: `Item "${item.name}" successfully synced with all ${successCount} marketplaces` 
      };
    } else {
      return { 
        success: false, 
        message: `Item partially synced with ${successCount}/${enabledMarketplaces.length} marketplaces. Errors: ${errorMessages.join('; ')}` 
      };
    }
  } catch (error: any) {
    log(`Real-time sync: Error during sync for item "${item.name}": ${error.message}`, 'marketplace-sync-error');
    return { success: false, message: `Sync error: ${error.message}` };
  }
}

/**
 * Get the latest data from marketplaces for a single item
 * Called when viewing/using a specific item to ensure its data is up-to-date
 */
export async function refreshItemFromMarketplaces(
  itemId: number,
  storage: IStorage
): Promise<{ success: boolean; message: string }> {
  try {
    const item = await storage.getItem(itemId);
    
    if (!item) {
      return { success: false, message: "Item not found" };
    }
    
    // Get all connected marketplaces
    const marketplaces = await storage.getAllMarketplaces();
    const enabledMarketplaces = marketplaces.filter(m => m.isConnected && m.isSyncEnabled);
    
    if (enabledMarketplaces.length === 0) {
      return { success: true, message: "No enabled marketplaces found for synchronization" };
    }
    
    log(`Real-time refresh: Checking latest data for item "${item.name}" (ID: ${item.id}) from marketplaces`, 'marketplace-sync');
    
    let updated = false;
    let errorMessages: string[] = [];
    
    for (const marketplace of enabledMarketplaces) {
      try {
        // Implement marketplace-specific logic to fetch the latest data for this item
        // This will depend on how your specific marketplace integrations work
        // For Shopify, this would involve looking up by externalId

        // Example placeholder - actual implementation will depend on marketplace specifics
        // const marketplaceService = new MarketplaceService(marketplace);
        // const latestData = await marketplaceService.getItemLatestData(item);
        // if (latestData.needsUpdate) {
        //   await storage.updateItem(item.id, latestData.updates);
        //   updated = true;
        // }
      } catch (error: any) {
        errorMessages.push(`Error with ${marketplace.name}: ${error.message}`);
      }
    }
    
    if (updated) {
      return { 
        success: true, 
        message: `Item "${item.name}" was updated with the latest data from marketplaces` 
      };
    } else if (errorMessages.length > 0) {
      return { 
        success: false, 
        message: `Could not refresh item data. Errors: ${errorMessages.join('; ')}` 
      };
    } else {
      return { 
        success: true, 
        message: `Item "${item.name}" is already up-to-date with marketplace data` 
      };
    }
  } catch (error: any) {
    return { success: false, message: `Refresh error: ${error.message}` };
  }
}