/**
 * Price Sheet Synchronization Service
 * Syncs pricing data from Google Sheets and ensures Shopify items have proper pricing
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4, google } from 'googleapis';
import { DatabaseStorage } from '../storage.js';

interface PriceSheetRow {
  strain: string;
  amount: string;
  percentage: string;
  tier: string;
  bulk: string;
  distro25: string;
  master50: string;
  master100: string;
  coas: string;
  media: string;
  strainType: string;
  sku?: string;
  keyId?: string;
}

interface ShopifyPriceData {
  id: string;
  handle: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  variantId: string;
}

export class PriceSheetService {
  private sheets: sheets_v4.Sheets | null = null;
  private auth: GoogleAuth | null = null;
  private isInitialized = false;
  private storage: DatabaseStorage;
  
  // Price sheet configuration
  private readonly SPREADSHEET_ID = '1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU';
  private readonly PRICE_SHEET_RANGE = 'THCa Flower!A:K'; // Adjust range as needed
  private readonly INVENTORY_SHEET_RANGE = 'Inventory!A:Z'; // For price updates

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('Price Sheet: Missing Google credentials');
        return;
      }

      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        credentials: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          type: 'authorized_user'
        }
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isInitialized = true;
      console.log('Price Sheet service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Price Sheet service:', error);
    }
  }

  isConfigured(): boolean {
    return this.isInitialized && !!this.sheets;
  }

  /**
   * Read price data from the THCa Flower sheet
   */
  async readPriceSheet(): Promise<PriceSheetRow[]> {
    if (!this.isConfigured()) {
      throw new Error('Price Sheet service not configured');
    }

    try {
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.SPREADSHEET_ID,
        range: this.PRICE_SHEET_RANGE,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return [];
      }

      // Skip header row and parse data
      const priceData: PriceSheetRow[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) { // Has strain name
          priceData.push({
            strain: row[0] || '',
            amount: row[1] || '',
            percentage: row[2] || '',
            tier: row[3] || '',
            bulk: row[4] || '',
            distro25: row[5] || '',
            master50: row[6] || '',
            master100: row[7] || '',
            coas: row[8] || '',
            media: row[9] || '',
            strainType: row[10] || '',
            sku: row[11] || '',
            keyId: row[12] || ''
          });
        }
      }

      return priceData;
    } catch (error) {
      console.error('Error reading price sheet:', error);
      throw error;
    }
  }

  /**
   * Extract pricing from Shopify and apply to inventory items
   */
  async syncShopifyPrices(): Promise<{ updated: number; errors: string[] }> {
    try {
      // Import Shopify service
      const { createShopifyClient } = await import('./shopify-integration.js');
      const shopify = createShopifyClient();
      
      if (!shopify) {
        throw new Error('Shopify client not available');
      }

      // Get all products from Shopify
      const products = await shopify.rest.Product.all({
        session: { shop: process.env.SHOPIFY_STORE!, accessToken: process.env.SHOPIFY_ACCESS_TOKEN! },
        limit: 250,
        fields: 'id,handle,title,variants'
      });

      const shopifyPrices: ShopifyPriceData[] = [];
      
      // Extract pricing data from Shopify products
      for (const product of products.data) {
        if (product.variants && product.variants.length > 0) {
          for (const variant of product.variants) {
            if (variant.sku) {
              shopifyPrices.push({
                id: product.id!.toString(),
                handle: product.handle!,
                title: product.title!,
                price: parseFloat(variant.price || '0'),
                compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : undefined,
                sku: variant.sku,
                variantId: variant.id!.toString()
              });
            }
          }
        }
      }

      // Get inventory items
      const items = await this.storage.getItems();
      let updated = 0;
      const errors: string[] = [];

      // Update inventory prices based on Shopify data
      for (const item of items) {
        if (!item.sku) continue;

        const shopifyData = shopifyPrices.find(sp => sp.sku === item.sku);
        if (shopifyData && shopifyData.price > 0) {
          try {
            await this.storage.updateItem(item.id, {
              basePrice: shopifyData.price.toString(),
              salePrice: shopifyData.compareAtPrice ? shopifyData.compareAtPrice.toString() : null,
              shopifyId: shopifyData.id,
              shopifyUrl: `https://${process.env.SHOPIFY_STORE}/admin/products/${shopifyData.id}`
            });
            updated++;
          } catch (error) {
            errors.push(`Failed to update item ${item.sku}: ${error}`);
          }
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('Error syncing Shopify prices:', error);
      throw error;
    }
  }

  /**
   * Apply price sheet data to inventory items
   */
  async applyPriceSheetToInventory(): Promise<{ updated: number; errors: string[] }> {
    try {
      const priceData = await this.readPriceSheet();
      const items = await this.storage.getItems();
      
      let updated = 0;
      const errors: string[] = [];

      for (const priceRow of priceData) {
        if (!priceRow.strain) continue;

        // Find matching inventory items by strain name
        const matchingItems = items.filter(item => 
          item.name?.toLowerCase().includes(priceRow.strain.toLowerCase()) ||
          item.sku === priceRow.sku
        );

        for (const item of matchingItems) {
          try {
            // Extract pricing from tier column (assuming tier contains price info)
            let basePrice = null;
            if (priceRow.tier && priceRow.tier.includes('$')) {
              const priceMatch = priceRow.tier.match(/\$(\d+(?:\.\d{2})?)/);
              if (priceMatch) {
                basePrice = priceMatch[1];
              }
            }

            // Update item with price sheet data
            const updates: any = {
              tier: priceRow.tier,
              strainType: priceRow.strainType
            };

            if (basePrice) {
              updates.basePrice = basePrice;
            }

            await this.storage.updateItem(item.id, updates);
            updated++;
          } catch (error) {
            errors.push(`Failed to update item ${item.name}: ${error}`);
          }
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('Error applying price sheet to inventory:', error);
      throw error;
    }
  }

  /**
   * Ensure no items are active on Shopify without proper pricing
   */
  async validateShopifyPricing(): Promise<{ valid: number; invalid: string[] }> {
    try {
      const items = await this.storage.getItems();
      const invalid: string[] = [];
      let valid = 0;

      for (const item of items) {
        if (item.status === 'active' && item.publishedToShopify) {
          const price = parseFloat(item.basePrice || '0');
          
          if (price <= 0) {
            invalid.push(`${item.name} (SKU: ${item.sku}) - No valid price set`);
            
            // Automatically deactivate item to prevent Shopify sync
            try {
              await this.storage.updateItem(item.id, {
                status: 'draft',
                publishedToShopify: false
              });
            } catch (error) {
              console.error(`Failed to deactivate item ${item.sku}:`, error);
            }
          } else {
            valid++;
          }
        }
      }

      return { valid, invalid };
    } catch (error) {
      console.error('Error validating Shopify pricing:', error);
      throw error;
    }
  }

  /**
   * Update prices in the Google Sheets from inventory data
   */
  async updatePriceSheet(updates: { sku: string; price: number; tier?: string }[]): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Price Sheet service not configured');
    }

    try {
      // Read current sheet data to find row positions
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.SPREADSHEET_ID,
        range: this.PRICE_SHEET_RANGE,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const updateRequests = [];

      for (const update of updates) {
        // Find the row for this SKU
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[11] === update.sku) { // SKU column
            // Update tier column with price
            const range = `THCa Flower!D${i + 1}`;
            updateRequests.push({
              range,
              values: [[update.tier || `$${update.price.toFixed(2)}`]]
            });
            break;
          }
        }
      }

      if (updateRequests.length > 0) {
        await this.sheets!.spreadsheets.values.batchUpdate({
          spreadsheetId: this.SPREADSHEET_ID,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: updateRequests
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating price sheet:', error);
      throw error;
    }
  }
}