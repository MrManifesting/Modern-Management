import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';
import path from 'path';

interface FlowerVariant {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  cleanedProductTitle: string;
  cleanedKey: string;
}

interface MenuTabItem {
  variantId: string;
  strain: string;
  amount: number;
  tier: string;
  bulk: string;
  distro25: string;
  master50: string;
  master100: string;
  media: string;
  coas: string;
  type: string;
  variantSku: string;
  barcode: string;
  keyId: string;
  title: string;
  cleanedProductTitle: string;
  trimmed: string;
  matchedVariantId: string;
  matchedInventoryQty: number;
}

export class CSVInventorySync {
  private flowerVariants: FlowerVariant[] = [];
  private menuTabItems: MenuTabItem[] = [];

  async loadFlowerVariantsCSV(): Promise<void> {
    try {
      const csvPath = path.join(process.cwd(), 'attached_assets', 'Automated_Gold_Standard_online_catalog  - All_Flower_Variants_1750441221138.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      this.flowerVariants = records.map((record: any) => ({
        variantId: record['Variant_ID'] || '',
        productTitle: record['Product_Title'] || '',
        variantTitle: record['Variant_Title'] || '',
        sku: record['SKU'] || '',
        cleanedProductTitle: record['Cleaned Product Title'] || '',
        cleanedKey: record[''] || '' // Last column appears to be the cleaned key
      }));

      console.log(`[csv-sync] Loaded ${this.flowerVariants.length} flower variants`);
    } catch (error) {
      console.error('[csv-sync] Error loading flower variants CSV:', error);
      throw error;
    }
  }

  async loadMenuTabCSV(): Promise<void> {
    try {
      const csvPath = path.join(process.cwd(), 'attached_assets', 'Automated_Gold_Standard_online_catalog  - MENU_TAB_1750441221139.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      this.menuTabItems = records.map((record: any) => ({
        variantId: record['Variant_ID'] || '',
        strain: record['Strain'] || '',
        amount: parseFloat(record['Amount']) || 0,
        tier: record['Tier'] || '',
        bulk: record['Bulk'] || '',
        distro25: record['Distro 25lbs +'] || '',
        master50: record['Master 50lbs+'] || '',
        master100: record['Master 2 100lbs +'] || '',
        media: record['Media'] || '',
        coas: record['COAs '] || '',
        type: record['Type'] || '',
        variantSku: record['Variant SKU'] || '',
        barcode: record['Barcode '] || '',
        keyId: record['KEY ID'] || '',
        title: record['Title'] || '',
        cleanedProductTitle: record['Cleaned Product Title'] || '',
        trimmed: record['Trimmed'] || '',
        matchedVariantId: record['Matched Variant_ID'] || '',
        matchedInventoryQty: parseInt(record['Matched Inventory Qty']) || 0
      }));

      console.log(`[csv-sync] Loaded ${this.menuTabItems.length} menu tab items`);
    } catch (error) {
      console.error('[csv-sync] Error loading menu tab CSV:', error);
      throw error;
    }
  }

  // Get Shopify product quantities from the products export CSV
  async getShopifyInventoryQuantities(): Promise<Map<string, number>> {
    try {
      const csvPath = path.join(process.cwd(), 'attached_assets', 'products_export_1 (10)_1750441221139.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const quantityMap = new Map<string, number>();

      records.forEach((record: any) => {
        const handle = record['Handle'] || '';
        const title = record['Title'] || '';
        const variantSku = record['Variant SKU'] || '';
        const inventoryQty = parseInt(record['Variant Inventory Qty']) || 0;
        
        // Create multiple keys for matching
        if (handle) quantityMap.set(handle.toLowerCase(), inventoryQty);
        if (title) quantityMap.set(title.toLowerCase(), inventoryQty);
        if (variantSku) quantityMap.set(variantSku.toLowerCase(), inventoryQty);
        
        // Clean title version
        const cleanTitle = title.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '')
          .trim();
        if (cleanTitle) quantityMap.set(cleanTitle, inventoryQty);
      });

      console.log(`[csv-sync] Loaded ${quantityMap.size} Shopify inventory quantities`);
      return quantityMap;
    } catch (error) {
      console.error('[csv-sync] Error loading Shopify inventory:', error);
      throw error;
    }
  }

  // Match menu tab items with Shopify quantities and update column C
  async syncMenuTabWithShopifyQuantities(): Promise<MenuTabItem[]> {
    await this.loadFlowerVariantsCSV();
    await this.loadMenuTabCSV();
    const shopifyQuantities = await this.getShopifyInventoryQuantities();

    const updatedMenuItems: MenuTabItem[] = [];

    for (const menuItem of this.menuTabItems) {
      let matchedQuantity = 0;

      // Try multiple matching strategies
      const searchKeys = [
        menuItem.strain.toLowerCase().replace(/[^a-z0-9]/g, ''),
        menuItem.cleanedProductTitle.toLowerCase(),
        menuItem.title.toLowerCase(),
        menuItem.keyId.toLowerCase(),
        menuItem.variantSku.toLowerCase()
      ].filter(key => key.length > 0);

      // Search for matching quantity in Shopify data
      for (const key of searchKeys) {
        if (shopifyQuantities.has(key)) {
          matchedQuantity = shopifyQuantities.get(key) || 0;
          break;
        }
      }

      // Also try partial matching for strain names
      if (matchedQuantity === 0) {
        const strainWords = menuItem.strain.toLowerCase().split(' ');
        for (const [shopifyKey, qty] of shopifyQuantities.entries()) {
          const matchesAllWords = strainWords.every(word => 
            word.length > 2 && shopifyKey.includes(word)
          );
          if (matchesAllWords && strainWords.length > 0) {
            matchedQuantity = qty;
            break;
          }
        }
      }

      // Update the menu item with matched quantity
      const updatedItem: MenuTabItem = {
        ...menuItem,
        amount: matchedQuantity, // Update column C with Shopify quantity
        matchedInventoryQty: matchedQuantity
      };

      updatedMenuItems.push(updatedItem);
    }

    console.log(`[csv-sync] Updated ${updatedMenuItems.filter(item => item.amount > 0).length} items with Shopify quantities`);
    return updatedMenuItems;
  }

  // Generate updated CSV content for Menu Tab
  async generateUpdatedMenuTabCSV(): Promise<string> {
    const updatedItems = await this.syncMenuTabWithShopifyQuantities();
    
    const headers = [
      'Variant_ID', 'Strain', 'Amount', 'Tier', 'Bulk', 'Distro 25lbs +', 
      'Master 50lbs+', 'Master 2 100lbs +', 'Media', 'COAs ', 'Type', 
      'Variant SKU', 'Barcode ', 'KEY ID', 'Title', 'Cleaned Product Title', 
      'Trimmed', 'Matched Variant_ID', 'Matched Inventory Qty', 'COA_Link',
      'Media_Download_Link', 'Store_Order_Link'
    ];

    const rows = updatedItems.map(item => {
      // Generate enhanced links
      const strainSlug = item.strain.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const coaLink = item.coas && item.coas.trim() !== '' ? 
        `https://gold-standard-cbd.com/coa/${strainSlug}` : '';
      
      const mediaLink = item.media && item.media.trim() !== '' ? 
        `https://gold-standard-cbd.com/media/download/${item.variantSku || item.keyId}` : '';
      
      const productSlug = item.cleanedProductTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const storeLink = item.matchedVariantId ? 
        `https://gold-standard-cbd.myshopify.com/products/${productSlug}` : 
        `https://gold-standard-cbd.myshopify.com/search?q=${encodeURIComponent(item.strain)}`;

      return [
        item.variantId || '',
        `"${item.strain}"`,
        item.amount.toString(),
        `"${item.tier}"`,
        `"${item.bulk}"`,
        `"${item.distro25}"`,
        `"${item.master50}"`,
        `"${item.master100}"`,
        `"${item.media}"`,
        `"${item.coas}"`,
        `"${item.type}"`,
        item.variantSku || '',
        item.barcode || '',
        item.keyId || '',
        `"${item.title}"`,
        `"${item.cleanedProductTitle}"`,
        `"${item.trimmed}"`,
        item.matchedVariantId || '',
        item.matchedInventoryQty.toString(),
        `"${coaLink}"`,
        `"${mediaLink}"`,
        `"${storeLink}"`
      ];
    });

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  // Get summary of sync results
  async getSyncSummary(): Promise<{
    totalItems: number;
    itemsWithQuantity: number;
    itemsWithoutQuantity: number;
    totalAvailableQuantity: number;
  }> {
    const updatedItems = await this.syncMenuTabWithShopifyQuantities();
    
    const itemsWithQuantity = updatedItems.filter(item => item.amount > 0);
    const totalAvailableQuantity = updatedItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      totalItems: updatedItems.length,
      itemsWithQuantity: itemsWithQuantity.length,
      itemsWithoutQuantity: updatedItems.length - itemsWithQuantity.length,
      totalAvailableQuantity
    };
  }
}