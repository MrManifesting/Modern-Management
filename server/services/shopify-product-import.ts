/**
 * Shopify Product Import Service
 * Imports pricing and images from Shopify store to inventory items
 */

import { DatabaseStorage } from '../storage.js';
import { isShopifyConfigured } from './shopify-integration.js';

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  status: string;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
}

interface ShopifyImage {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  position: number;
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compare_at_price: string;
  sku: string;
  inventory_quantity: number;
  weight: number;
  weight_unit: string;
}

export class ShopifyProductImportService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Import all products from Shopify and update inventory
   */
  async importAllProducts(): Promise<{ imported: number; updated: number; errors: string[] }> {
    try {
      if (!isShopifyConfigured()) {
        throw new Error('Shopify not configured');
      }

      console.log('Fetching all products from Shopify...');
      
      // Fetch all products from Shopify using direct API
      const response = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=250&fields=id,handle,title,body_html,vendor,product_type,tags,status,images,variants`, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      const products = data.products || [];

      console.log(`Found ${products.length} products in Shopify`);

      const results = {
        imported: 0,
        updated: 0,
        errors: [] as string[]
      };

      // Get existing inventory items
      const existingItems = await this.storage.getItems();
      
      for (const product of products) {
        try {
          await this.importSingleProduct(product as any, existingItems, results);
        } catch (error) {
          results.errors.push(`Failed to import product ${product.title}: ${error}`);
          console.error(`Error importing product ${product.title}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error importing products from Shopify:', error);
      throw error;
    }
  }

  /**
   * Import a single product and update/create inventory item
   */
  private async importSingleProduct(
    product: ShopifyProduct, 
    existingItems: any[], 
    results: { imported: number; updated: number; errors: string[] }
  ): Promise<void> {
    try {
      // Get the primary variant (usually the first one)
      const primaryVariant = product.variants?.[0];
      if (!primaryVariant) {
        results.errors.push(`Product ${product.title} has no variants`);
        return;
      }

      // Get the primary image
      const primaryImage = product.images?.[0];
      
      // Find existing inventory item by SKU or name
      const existingItem = existingItems.find(item => 
        (primaryVariant.sku && item.sku === primaryVariant.sku) ||
        item.name?.toLowerCase().includes(product.title.toLowerCase()) ||
        item.shopifyId === product.id
      );

      const itemData = {
        name: product.title,
        description: this.stripHtml(product.body_html || ''),
        category: this.mapProductType(product.product_type),
        vendor: product.vendor || 'Unknown',
        sku: primaryVariant.sku || this.generateFallbackSku(product.title),
        basePrice: primaryVariant.price || '0',
        salePrice: primaryVariant.compare_at_price || null,
        quantity: primaryVariant.inventory_quantity || 0,
        weight: this.formatWeight(primaryVariant.weight, primaryVariant.weight_unit),
        status: this.mapShopifyStatus(product.status),
        shopifyId: product.id,
        shopifyUrl: `https://${process.env.SHOPIFY_STORE}/admin/products/${product.id}`,
        imageUrl: primaryImage?.src || null,
        tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
        publishedToShopify: product.status === 'active'
      };

      if (existingItem) {
        // Update existing item with Shopify data
        await this.storage.updateItem(existingItem.id, {
          ...itemData,
          updatedAt: new Date()
        });
        results.updated++;
        console.log(`Updated item: ${product.title}`);
      } else {
        // Create new item from Shopify product
        await this.storage.addItem({
          ...itemData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        results.imported++;
        console.log(`Imported new item: ${product.title}`);
      }

    } catch (error) {
      results.errors.push(`Failed to process product ${product.title}: ${error}`);
      console.error(`Error processing product ${product.title}:`, error);
    }
  }

  /**
   * Update pricing for existing items from Shopify
   */
  async updatePricingFromShopify(): Promise<{ updated: number; errors: string[] }> {
    try {
      if (!isShopifyConfigured()) {
        throw new Error('Shopify not configured');
      }

      console.log('Fetching products for pricing update...');
      
      const response = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=250&fields=id,title,variants`, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      const products = data.products || [];

      const results = {
        updated: 0,
        errors: [] as string[]
      };

      const existingItems = await this.storage.getItems();

      for (const product of products) {
        try {
          const primaryVariant = product.variants?.[0];
          if (!primaryVariant) continue;

          // Find matching inventory item
          const matchingItem = existingItems.find(item => 
            (primaryVariant.sku && item.sku === primaryVariant.sku) ||
            item.shopifyId === product.id ||
            item.name?.toLowerCase().includes(product.title?.toLowerCase() || '')
          );

          if (matchingItem && primaryVariant.price) {
            await this.storage.updateItem(matchingItem.id, {
              basePrice: primaryVariant.price,
              salePrice: primaryVariant.compare_at_price || null,
              quantity: primaryVariant.inventory_quantity || 0,
              shopifyId: product.id,
              updatedAt: new Date()
            });
            results.updated++;
            console.log(`Updated pricing for: ${product.title}`);
          }
        } catch (error) {
          results.errors.push(`Failed to update pricing for ${product.title}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error updating pricing from Shopify:', error);
      throw error;
    }
  }

  /**
   * Update images for existing items from Shopify
   */
  async updateImagesFromShopify(): Promise<{ updated: number; errors: string[] }> {
    try {
      if (!isShopifyConfigured()) {
        throw new Error('Shopify not configured');
      }

      console.log('Fetching products for image update...');
      
      const response = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=250&fields=id,title,images,variants`, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      const products = data.products || [];

      const results = {
        updated: 0,
        errors: [] as string[]
      };

      const existingItems = await this.storage.getItems();

      for (const product of products) {
        try {
          const primaryImage = product.images?.[0];
          const primaryVariant = product.variants?.[0];
          
          if (!primaryImage) continue;

          // Find matching inventory item
          const matchingItem = existingItems.find(item => 
            (primaryVariant?.sku && item.sku === primaryVariant.sku) ||
            item.shopifyId === product.id ||
            item.name?.toLowerCase().includes(product.title?.toLowerCase() || '')
          );

          if (matchingItem) {
            await this.storage.updateItem(matchingItem.id, {
              imageUrl: primaryImage.src,
              shopifyId: product.id,
              updatedAt: new Date()
            });
            results.updated++;
            console.log(`Updated image for: ${product.title}`);
          }
        } catch (error) {
          results.errors.push(`Failed to update image for ${product.title}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error updating images from Shopify:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private mapProductType(productType: string): string {
    if (!productType) return 'Other';
    
    const type = productType.toLowerCase();
    if (type.includes('flower') || type.includes('thca')) return 'Flower';
    if (type.includes('electronic') || type.includes('battery') || type.includes('vape')) return 'Electronics';
    if (type.includes('edible') || type.includes('gummies')) return 'Edibles';
    if (type.includes('concentrate') || type.includes('wax') || type.includes('oil')) return 'Concentrates';
    
    return 'Other';
  }

  private mapShopifyStatus(status: string): string {
    switch (status) {
      case 'active': return 'available';
      case 'draft': return 'draft';
      case 'archived': return 'archived';
      default: return 'draft';
    }
  }

  private formatWeight(weight: number, unit: string): string {
    if (!weight || !unit) return '1 pound';
    
    switch (unit.toLowerCase()) {
      case 'lb':
      case 'lbs':
        if (weight >= 1) return `${weight} pound${weight > 1 ? 's' : ''}`;
        return `${weight * 16} ounce${weight * 16 > 1 ? 's' : ''}`;
      case 'oz':
      case 'ounces':
        return `${weight} ounce${weight > 1 ? 's' : ''}`;
      case 'g':
      case 'grams':
        if (weight >= 28) return `${Math.round(weight / 28)} ounce${Math.round(weight / 28) > 1 ? 's' : ''}`;
        return `${weight} gram${weight > 1 ? 's' : ''}`;
      default:
        return `${weight} ${unit}`;
    }
  }

  private generateFallbackSku(title: string): string {
    return title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 12) + '-' + Date.now().toString().slice(-4);
  }
}