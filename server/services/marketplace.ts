import { type Item, type Marketplace } from '@shared/schema';
import { MarketplaceLogger } from './marketplace-logger';
import { ShopifyService } from './marketplaces/shopify';

/**
 * Interface for marketplace services
 */
export interface IMarketplaceService {
  testConnection(): Promise<{ success: boolean; message: string }>;
  getMarketplaceInfo(): Promise<{ success: boolean; message: string; data?: any }>;
  syncProducts(): Promise<{ success: boolean; message: string; data?: any }>;
  pushProduct(item: Item): Promise<{ success: boolean; message: string; data?: any }>;
  prepareItemForPush(item: Item): Promise<{ success: boolean; message: string; data?: any }>;
  fetchProduct?(externalId: string): Promise<{ success: boolean; message: string; product?: any }>;
  deleteProduct(externalId: string): Promise<{ success: boolean; message: string }>;
}

/**
 * Factory class to create the appropriate marketplace service based on marketplace type
 */
export class MarketplaceService {
  private marketplace: Marketplace;
  private service: IMarketplaceService | null = null;

  constructor(marketplace: Marketplace) {
    this.marketplace = marketplace;
    
    try {
      // Create the appropriate service based on marketplace name or marketplaceTypeId
      const marketplaceName = marketplace.name.toLowerCase();
      
      // Handle Shopify marketplace (marketplaceTypeId 1 or name contains 'shopify')
      if (marketplace.marketplaceTypeId === 1 || marketplaceName.includes('shopify')) {
        const credentials = marketplace.credentials as Record<string, string>;
        this.service = new ShopifyService(
          credentials.shopName || credentials.storeUrl || marketplace.storeUrl || 'mrlisterscurations.myshopify.com', 
          credentials.apiKey || credentials.accessToken || marketplace.apiKey || process.env.SHOPIFY_ACCESS_TOKEN || '', 
          credentials.apiSecret || marketplace.apiSecret || process.env.SHOPIFY_SECRET || ''
        );
      }
      // eBay: marketplaceTypeId 2
      else if (marketplace.marketplaceTypeId === 2 || marketplaceName.includes('ebay')) {
        // eBay service not yet implemented - return a stub service
        this.service = {
          testConnection: async () => ({ success: false, message: 'eBay integration is not yet implemented' }),
          getMarketplaceInfo: async () => ({ success: false, message: 'eBay integration is not yet implemented' }),
          syncProducts: async () => ({ success: false, message: 'eBay integration is not yet implemented' }),
          pushProduct: async () => ({ success: false, message: 'eBay integration is not yet implemented' }),
          prepareItemForPush: async () => ({ success: false, message: 'eBay integration is not yet implemented' }),
          deleteProduct: async () => ({ success: false, message: 'eBay integration is not yet implemented' })
        };
      }
      // Amazon: marketplaceTypeId 3
      else if (marketplace.marketplaceTypeId === 3 || marketplaceName.includes('amazon')) {
        // Amazon service not yet implemented - return a stub service
        this.service = {
          testConnection: async () => ({ success: false, message: 'Amazon integration is not yet implemented' }),
          getMarketplaceInfo: async () => ({ success: false, message: 'Amazon integration is not yet implemented' }),
          syncProducts: async () => ({ success: false, message: 'Amazon integration is not yet implemented' }),
          pushProduct: async () => ({ success: false, message: 'Amazon integration is not yet implemented' }),
          prepareItemForPush: async () => ({ success: false, message: 'Amazon integration is not yet implemented' }),
          deleteProduct: async () => ({ success: false, message: 'Amazon integration is not yet implemented' })
        };
      }
      // Etsy: marketplaceTypeId 4
      else if (marketplace.marketplaceTypeId === 4 || marketplaceName.includes('etsy')) {
        // Etsy service not yet implemented - return a stub service
        this.service = {
          testConnection: async () => ({ success: false, message: 'Etsy integration is not yet implemented' }),
          getMarketplaceInfo: async () => ({ success: false, message: 'Etsy integration is not yet implemented' }),
          syncProducts: async () => ({ success: false, message: 'Etsy integration is not yet implemented' }),
          pushProduct: async () => ({ success: false, message: 'Etsy integration is not yet implemented' }),
          prepareItemForPush: async () => ({ success: false, message: 'Etsy integration is not yet implemented' }),
          deleteProduct: async () => ({ success: false, message: 'Etsy integration is not yet implemented' })
        };
      }
      else {
        // Unknown marketplace type - return a stub service
        this.service = {
          testConnection: async () => ({ success: false, message: `Marketplace type not supported: ${marketplace.name}` }),
          getMarketplaceInfo: async () => ({ success: false, message: `Marketplace type not supported: ${marketplace.name}` }),
          syncProducts: async () => ({ success: false, message: `Marketplace type not supported: ${marketplace.name}` }),
          pushProduct: async () => ({ success: false, message: `Marketplace type not supported: ${marketplace.name}` }),
          prepareItemForPush: async () => ({ success: false, message: `Marketplace type not supported: ${marketplace.name}` }),
          deleteProduct: async () => ({ success: false, message: `Marketplace type not supported: ${marketplace.name}` })
        };
      }
    } catch (error) {
      console.error(`Error initializing marketplace service for ${marketplace.name}:`, error);
      this.service = null;
    }
  }

  /**
   * Test connection to the marketplace
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.service) {
        return { 
          success: false, 
          message: `Service for ${this.marketplace.name} (${this.marketplace.marketplaceTypeId}) is not initialized` 
        };
      }
      
      const result = await this.service.testConnection();
      
      // Log the test result
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Test Connection',
        `Testing connection to ${this.marketplace.name}`,
        result.success ? 'success' : 'error',
        result.success ? undefined : result.message
      );
      
      return result;
    } catch (error: any) {
      // Log the error
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Test Connection',
        `Testing connection to ${this.marketplace.name}`,
        'error',
        error.message
      );
      
      return { 
        success: false, 
        message: `Error testing connection: ${error.message}` 
      };
    }
  }
  
  /**
   * Get marketplace information
   */
  async getMarketplaceInfo(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.service) {
        return { 
          success: false, 
          message: `Service for ${this.marketplace.name} (${this.marketplace.marketplaceTypeId}) is not initialized` 
        };
      }
      
      return await this.service.getMarketplaceInfo();
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error getting marketplace info: ${error.message}` 
      };
    }
  }
  
  /**
   * Sync products from the marketplace
   */
  async syncProducts(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.service) {
        return { 
          success: false, 
          message: `Service for ${this.marketplace.name} (${this.marketplace.marketplaceTypeId}) is not initialized` 
        };
      }
      
      // Log start of sync
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Sync Products',
        `Starting product sync from ${this.marketplace.name}`,
        'info'
      );
      
      const result = await this.service.syncProducts();
      
      // Log result of sync
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Sync Products',
        `Completed product sync from ${this.marketplace.name}`,
        result.success ? 'success' : 'error',
        result.success ? undefined : result.message
      );
      
      return result;
    } catch (error: any) {
      // Log error
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Sync Products',
        `Error syncing products from ${this.marketplace.name}`,
        'error',
        error.message
      );
      
      return { 
        success: false, 
        message: `Error syncing products: ${error.message}` 
      };
    }
  }
  
  /**
   * Push a product to the marketplace
   */
  async pushProduct(item: Item): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.service) {
        return { 
          success: false, 
          message: `Service for ${this.marketplace.name} (${this.marketplace.marketplaceTypeId}) is not initialized` 
        };
      }
      
      // Log start of push
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Push Product',
        `Starting product push for "${item.name}" to ${this.marketplace.name}`,
        'info'
      );
      
      const result = await this.service.pushProduct(item);
      
      // Log result of push
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Push Product',
        `Completed product push for "${item.name}" to ${this.marketplace.name}`,
        result.success ? 'success' : 'error',
        result.success ? undefined : result.message
      );
      
      return result;
    } catch (error: any) {
      // Log error
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Push Product',
        `Error pushing product "${item.name}" to ${this.marketplace.name}`,
        'error',
        error.message
      );
      
      return { 
        success: false, 
        message: `Error pushing product: ${error.message}` 
      };
    }
  }
  
  /**
   * Prepare a product for pushing to the marketplace (for preview/validation)
   */
  async prepareItemForPush(item: Item): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.service) {
        return { 
          success: false, 
          message: `Service for ${this.marketplace.name} (${this.marketplace.marketplaceTypeId}) is not initialized` 
        };
      }
      
      return await this.service.prepareItemForPush(item);
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error preparing product for push: ${error.message}` 
      };
    }
  }
  
  /**
   * Fetch a product from the marketplace
   */
  async fetchProduct(externalId: string): Promise<{ success: boolean; message: string; product?: any }> {
    try {
      if (!this.service) {
        return { 
          success: false, 
          message: `Service for ${this.marketplace.name} (${this.marketplace.marketplaceTypeId}) is not initialized` 
        };
      }
      
      // Check if the service implements fetchProduct
      if (typeof this.service.fetchProduct !== 'function') {
        return {
          success: false,
          message: `Fetch product is not supported for ${this.marketplace.name}`
        };
      }
      
      return await this.service.fetchProduct(externalId);
    } catch (error: any) {
      return { 
        success: false, 
        message: `Error fetching product from marketplace: ${error.message}` 
      };
    }
  }
  
  /**
   * Delete a product from the marketplace
   */
  async deleteProduct(externalId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.service) {
        return { 
          success: false, 
          message: `Service for ${this.marketplace.name} (${this.marketplace.marketplaceTypeId}) is not initialized` 
        };
      }
      
      // Log start of delete operation
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Delete Product',
        `Starting product deletion for ID "${externalId}" from ${this.marketplace.name}`,
        'info'
      );
      
      const result = await this.service.deleteProduct(externalId);
      
      // Log result of deletion
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Delete Product',
        `Completed product deletion for ID "${externalId}" from ${this.marketplace.name}`,
        result.success ? 'success' : 'error',
        result.success ? undefined : result.message
      );
      
      return result;
    } catch (error: any) {
      // Log error
      await MarketplaceLogger.logOperation(
        this.marketplace,
        'Delete Product',
        `Error deleting product ID "${externalId}" from ${this.marketplace.name}`,
        'error',
        error.message
      );
      
      return { 
        success: false, 
        message: `Error deleting product: ${error.message}` 
      };
    }
  }
}