/**
 * Shopify Inventory Levels Service
 * Fetches real inventory quantities from Shopify's inventory API
 */

import { getShopifyClient } from './shopify-auth';
import { shopifyRateLimiter } from './rate-limiter';
import https from 'https';

interface InventoryLevel {
  inventory_item_id: string;
  location_id: string;
  available: number;
}

export class ShopifyInventoryLevels {
  
  /**
   * Fetch real inventory quantities for all products
   */
  async fetchInventoryLevels(): Promise<Map<string, number>> {
    const inventoryMap = new Map<string, number>();
    
    try {
      const { shopify, credentials } = await getShopifyClient();
      
      // Get all inventory items first
      const inventoryItems = await this.fetchInventoryItems(credentials);
      
      if (inventoryItems.length === 0) {
        console.log('No inventory items found');
        return inventoryMap;
      }
      
      // Fetch inventory levels for all items
      const inventoryLevels = await this.fetchInventoryLevelsForItems(credentials, inventoryItems);
      
      // Map inventory item IDs to available quantities
      for (const level of inventoryLevels) {
        inventoryMap.set(level.inventory_item_id, level.available);
      }
      
      console.log(`Fetched inventory levels for ${inventoryMap.size} items`);
      return inventoryMap;
      
    } catch (error) {
      console.error('Error fetching inventory levels:', error);
      return inventoryMap;
    }
  }
  
  /**
   * Fetch all inventory items from Shopify
   */
  private async fetchInventoryItems(credentials: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const path = '/admin/api/2023-10/inventory_items.json?limit=250';
      
      const req = https.request({
        hostname: credentials.storeUrl,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Shopify-Access-Token': credentials.accessToken
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              resolve(response.inventory_items || []);
            } catch (error) {
              reject(new Error(`Failed to parse inventory items: ${error}`));
            }
          } else {
            reject(new Error(`API responded with status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
  }
  
  /**
   * Fetch inventory levels for specific inventory items
   */
  private async fetchInventoryLevelsForItems(credentials: any, inventoryItems: any[]): Promise<InventoryLevel[]> {
    return new Promise((resolve, reject) => {
      // Get inventory item IDs
      const itemIds = inventoryItems.map(item => item.id).join(',');
      const path = `/admin/api/2023-10/inventory_levels.json?inventory_item_ids=${itemIds}&limit=250`;
      
      const req = https.request({
        hostname: credentials.storeUrl,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Shopify-Access-Token': credentials.accessToken
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              resolve(response.inventory_levels || []);
            } catch (error) {
              reject(new Error(`Failed to parse inventory levels: ${error}`));
            }
          } else {
            reject(new Error(`API responded with status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
  }
  
  /**
   * Fetch inventory quantity for a specific product variant
   */
  async getVariantInventoryQuantity(variantId: string): Promise<number> {
    try {
      const { credentials } = await getShopifyClient();
      
      return new Promise((resolve, reject) => {
        const path = `/admin/api/2023-10/variants/${variantId}.json`;
        
        const req = https.request({
          hostname: credentials.storeUrl,
          port: 443,
          path: path,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Shopify-Access-Token': credentials.accessToken
          },
          timeout: 30000
        }, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const response = JSON.parse(data);
                const variant = response.variant;
                
                if (variant && variant.inventory_item_id) {
                  // Now get inventory levels for this inventory item
                  this.getInventoryLevelForItem(credentials, variant.inventory_item_id)
                    .then(quantity => resolve(quantity))
                    .catch(error => {
                      console.log(`Could not get inventory level: ${error}`);
                      resolve(0);
                    });
                } else {
                  resolve(0);
                }
              } catch (error) {
                reject(new Error(`Failed to parse variant: ${error}`));
              }
            } else {
              reject(new Error(`API responded with status ${res.statusCode}: ${data}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.end();
      });
      
    } catch (error) {
      console.error('Error fetching variant inventory:', error);
      return 0;
    }
  }
  
  /**
   * Get inventory level for a specific inventory item
   */
  private async getInventoryLevelForItem(credentials: any, inventoryItemId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const path = `/admin/api/2023-10/inventory_levels.json?inventory_item_ids=${inventoryItemId}`;
      
      const req = https.request({
        hostname: credentials.storeUrl,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Shopify-Access-Token': credentials.accessToken
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              const levels = response.inventory_levels || [];
              
              if (levels.length > 0) {
                resolve(levels[0].available || 0);
              } else {
                resolve(0);
              }
            } catch (error) {
              reject(new Error(`Failed to parse inventory levels: ${error}`));
            }
          } else {
            reject(new Error(`API responded with status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
  }
}