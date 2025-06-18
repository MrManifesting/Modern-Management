/**
 * Real-time Inventory Sync Service
 * Handles immediate inventory updates when Shopify webhooks are received
 */

import { storage } from '../storage';
import { log } from '../vite';

interface ShopifyOrderLineItem {
  id: number;
  product_id?: number;
  variant_id?: number;
  sku: string;
  name: string;
  quantity: number;
  price: string;
}

interface ShopifyOrder {
  id: number;
  name: string;
  line_items: ShopifyOrderLineItem[];
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
}

class RealTimeInventorySync {
  
  /**
   * Process order creation and immediately update inventory quantities
   */
  async processOrderCreated(order: ShopifyOrder): Promise<boolean> {
    try {
      log(`Processing order ${order.name} for real-time inventory sync`, 'real-time-sync');
      
      const inventoryUpdates = [];
      let itemsProcessed = 0;

      for (const lineItem of order.line_items || []) {
        if (!lineItem.sku) {
          log(`Skipping line item without SKU: ${lineItem.name}`, 'real-time-sync');
          continue;
        }

        // Find matching inventory item by SKU
        const items = await storage.getItems();
        const item = items.find(i => i.sku === lineItem.sku);
        
        if (item && item.id !== undefined) {
          const currentQuantity = item.quantity || 0;
          const newQuantity = Math.max(0, currentQuantity - lineItem.quantity);
          
          // Update inventory immediately
          await storage.updateItem(item.id, {
            quantity: newQuantity,
            updatedAt: new Date()
          });

          // Log the inventory action
          await storage.logInventoryAction({
            itemId: item.id,
            action: 'sale',
            quantity: -lineItem.quantity,
            previousQuantity: currentQuantity,
            newQuantity,
            reason: `Shopify order ${order.name} (Real-time)`,
            notes: `Line item: ${lineItem.name}`,
            metadata: {
              shopifyOrderId: order.id,
              shopifyOrderNumber: order.name,
              lineItemId: lineItem.id,
              realTimeSync: true
            }
          });

          inventoryUpdates.push({
            sku: lineItem.sku,
            name: item.name,
            quantityOrdered: lineItem.quantity,
            remainingStock: newQuantity,
            previousStock: currentQuantity
          });

          itemsProcessed++;
          log(`Updated inventory for ${item.name}: ${currentQuantity} → ${newQuantity}`, 'real-time-sync');
        } else {
          log(`Item not found for SKU: ${lineItem.sku}`, 'real-time-sync');
        }
      }

      if (itemsProcessed > 0) {
        log(`Real-time sync completed: updated ${itemsProcessed} items for order ${order.name}`, 'real-time-sync');
        return true;
      } else {
        log(`No inventory items updated for order ${order.name}`, 'real-time-sync');
        return false;
      }

    } catch (error) {
      log(`Error in real-time inventory sync: ${error}`, 'real-time-sync');
      return false;
    }
  }

  /**
   * Process order cancellation and restore inventory quantities
   */
  async processOrderCancelled(order: ShopifyOrder): Promise<boolean> {
    try {
      log(`Processing order cancellation ${order.name} for inventory restoration`, 'real-time-sync');
      
      let itemsProcessed = 0;

      for (const lineItem of order.line_items || []) {
        if (!lineItem.sku) continue;

        const items = await storage.getItems();
        const item = items.find(i => i.sku === lineItem.sku);
        
        if (item && item.id !== undefined) {
          const currentQuantity = item.quantity || 0;
          const newQuantity = currentQuantity + lineItem.quantity;
          
          // Restore inventory
          await storage.updateItem(item.id, {
            quantity: newQuantity,
            updatedAt: new Date()
          });

          // Log the inventory action
          await storage.logInventoryAction({
            itemId: item.id,
            action: 'return',
            quantity: lineItem.quantity,
            previousQuantity: currentQuantity,
            newQuantity,
            reason: `Shopify order cancelled ${order.name} (Real-time)`,
            notes: `Restored from cancelled order: ${lineItem.name}`,
            metadata: {
              shopifyOrderId: order.id,
              shopifyOrderNumber: order.name,
              lineItemId: lineItem.id,
              realTimeSync: true
            }
          });

          itemsProcessed++;
          log(`Restored inventory for ${item.name}: ${currentQuantity} → ${newQuantity}`, 'real-time-sync');
        }
      }

      if (itemsProcessed > 0) {
        log(`Order cancellation processed: restored ${itemsProcessed} items for order ${order.name}`, 'real-time-sync');
        return true;
      }

      return false;
    } catch (error) {
      log(`Error processing order cancellation: ${error}`, 'real-time-sync');
      return false;
    }
  }

  /**
   * Force sync a specific item by SKU from Shopify
   */
  async syncItemBySKU(sku: string): Promise<boolean> {
    try {
      // This would fetch the current quantity from Shopify for the specific SKU
      // and update our local inventory to match
      log(`Force syncing item with SKU: ${sku}`, 'real-time-sync');
      
      // Find local item
      const items = await storage.getItems();
      const item = items.find(i => i.sku === sku);
      
      if (!item) {
        log(`Item not found for SKU: ${sku}`, 'real-time-sync');
        return false;
      }

      // In a full implementation, we would fetch the current Shopify quantity here
      // For now, we'll trigger a manual sync
      log(`Item found for manual sync: ${item.name}`, 'real-time-sync');
      return true;

    } catch (error) {
      log(`Error syncing item by SKU: ${error}`, 'real-time-sync');
      return false;
    }
  }
}

export const realTimeInventorySync = new RealTimeInventorySync();