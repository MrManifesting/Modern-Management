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
  private lastSyncTime: Date | null = null;
  private syncResults: {
    totalSynced: number;
    newItems: number;
    updatedItems: number;
    errors: string[];
  } = { totalSynced: 0, newItems: 0, updatedItems: 0, errors: [] };

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
    lastSyncTime: Date | null;
    syncResults: typeof this.syncResults;
  }> {
    const updatedItems = await this.syncMenuTabWithShopifyQuantities();
    
    const itemsWithQuantity = updatedItems.filter(item => item.amount > 0);
    const totalAvailableQuantity = updatedItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      totalItems: updatedItems.length,
      itemsWithQuantity: itemsWithQuantity.length,
      itemsWithoutQuantity: updatedItems.length - itemsWithQuantity.length,
      totalAvailableQuantity,
      lastSyncTime: this.lastSyncTime,
      syncResults: this.syncResults
    };
  }

  // Generate custom menu based on filters and options
  async generateCustomMenu(options: {
    includeTiers?: string[];
    minQuantity?: number;
    maxQuantity?: number;
    includeOutOfStock?: boolean;
    sortBy?: 'strain' | 'quantity' | 'tier' | 'price';
    sortOrder?: 'asc' | 'desc';
    format?: 'csv' | 'json' | 'html';
  } = {}): Promise<{ data: any; format: string; timestamp: Date }> {
    const {
      includeTiers = [],
      minQuantity = 0,
      maxQuantity = Infinity,
      includeOutOfStock = false,
      sortBy = 'strain',
      sortOrder = 'asc',
      format = 'json'
    } = options;

    let menuItems = await this.syncMenuTabWithShopifyQuantities();

    // Apply filters
    if (!includeOutOfStock) {
      menuItems = menuItems.filter(item => item.amount > 0);
    }

    if (minQuantity > 0) {
      menuItems = menuItems.filter(item => item.amount >= minQuantity);
    }

    if (maxQuantity < Infinity) {
      menuItems = menuItems.filter(item => item.amount <= maxQuantity);
    }

    if (includeTiers.length > 0) {
      menuItems = menuItems.filter(item => 
        includeTiers.some(tier => item.tier.toLowerCase().includes(tier.toLowerCase()))
      );
    }

    // Apply sorting
    menuItems.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'strain':
          comparison = a.strain.localeCompare(b.strain);
          break;
        case 'quantity':
          comparison = a.amount - b.amount;
          break;
        case 'tier':
          comparison = a.tier.localeCompare(b.tier);
          break;
        case 'price':
          const aPrice = parseFloat(a.bulk.replace(/[^0-9.]/g, '')) || 0;
          const bPrice = parseFloat(b.bulk.replace(/[^0-9.]/g, '')) || 0;
          comparison = aPrice - bPrice;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Format output
    const timestamp = new Date();
    let formattedData;

    switch (format) {
      case 'csv':
        formattedData = await this.formatMenuAsCSV(menuItems);
        break;
      case 'html':
        formattedData = await this.formatMenuAsHTML(menuItems, options);
        break;
      default:
        formattedData = menuItems;
    }

    return {
      data: formattedData,
      format,
      timestamp
    };
  }

  // Format menu as HTML for display
  private async formatMenuAsHTML(items: MenuTabItem[], options: any): Promise<string> {
    const timestamp = new Date().toLocaleString();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Gold Standard Cannabis Menu - ${timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #D4AF37; font-size: 2.5em; font-weight: bold; }
        .subtitle { color: #666; margin-top: 10px; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .strain-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .strain-name { font-size: 1.4em; font-weight: bold; color: #333; margin-bottom: 10px; }
        .tier-badge { display: inline-block; padding: 4px 12px; border-radius: 15px; font-size: 0.8em; font-weight: bold; margin-bottom: 10px; }
        .tier-exotic { background: #ff6b6b; color: white; }
        .tier-top-shelf { background: #4ecdc4; color: white; }
        .tier-aaa { background: #45b7d1; color: white; }
        .tier-aa { background: #96ceb4; color: white; }
        .tier-classic { background: #ffeaa7; color: #333; }
        .availability { font-size: 1.2em; font-weight: bold; color: #27ae60; margin-bottom: 15px; }
        .pricing { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .price-item { text-align: center; padding: 8px; background: #f8f9fa; border-radius: 4px; }
        .price-label { font-size: 0.8em; color: #666; }
        .price-value { font-weight: bold; color: #2c3e50; }
        .footer { text-align: center; margin-top: 40px; color: #666; }
        .coa-link { display: inline-block; margin-top: 10px; padding: 8px 16px; background: #D4AF37; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🌿 GOLD STANDARD</div>
        <div class="subtitle">Premium Cannabis Menu - Updated ${timestamp}</div>
        <div class="subtitle">${items.length} Strains Available | ${items.reduce((sum, item) => sum + item.amount, 0)} lbs Total</div>
    </div>
    
    <div class="menu-grid">
        ${items.map(item => {
          const tierClass = item.tier.toLowerCase().includes('exotic') ? 'tier-exotic' :
                           item.tier.toLowerCase().includes('top shelf') ? 'tier-top-shelf' :
                           item.tier.toLowerCase().includes('aaa') ? 'tier-aaa' :
                           item.tier.toLowerCase().includes('aa') ? 'tier-aa' : 'tier-classic';
          
          const strainSlug = item.strain.toLowerCase().replace(/[^a-z0-9]/g, '-');
          
          return `
            <div class="strain-card">
                <div class="strain-name">${item.strain}</div>
                <div class="tier-badge ${tierClass}">${item.tier}</div>
                <div class="availability">${item.amount} lbs available</div>
                <div class="pricing">
                    <div class="price-item">
                        <div class="price-label">Bulk</div>
                        <div class="price-value">${item.bulk}</div>
                    </div>
                    <div class="price-item">
                        <div class="price-label">Distro 25+</div>
                        <div class="price-value">${item.distro25}</div>
                    </div>
                    <div class="price-item">
                        <div class="price-label">Master 50+</div>
                        <div class="price-value">${item.master50}</div>
                    </div>
                    <div class="price-item">
                        <div class="price-label">Master 100+</div>
                        <div class="price-value">${item.master100}</div>
                    </div>
                </div>
                <a href="https://gold-standard-cbd.com/coa/${strainSlug}" class="coa-link" target="_blank">
                    📄 View COA
                </a>
            </div>
          `;
        }).join('')}
    </div>
    
    <div class="footer">
        <p>🔄 Live Shopify Sync | 📱 Order: gold-standard-cbd.com | 📧 Contact: orders@gold-standard-cbd.com</p>
        <p>Generated: ${timestamp} | System: Gold Standard Management</p>
    </div>
</body>
</html>`;

    return html;
  }

  // Format menu as CSV
  private async formatMenuAsCSV(items: MenuTabItem[]): Promise<string> {
    const headers = [
      'Strain', 'Available_Lbs', 'Tier', 'Bulk_Price', 'Distro_25_Price', 
      'Master_50_Price', 'Master_100_Price', 'SKU', 'COA_Link', 'Store_Link'
    ];

    const rows = items.map(item => {
      const strainSlug = item.strain.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return [
        `"${item.strain}"`,
        item.amount.toString(),
        `"${item.tier}"`,
        `"${item.bulk}"`,
        `"${item.distro25}"`,
        `"${item.master50}"`,
        `"${item.master100}"`,
        `"${item.variantSku}"`,
        `"https://gold-standard-cbd.com/coa/${strainSlug}"`,
        `"https://gold-standard-cbd.myshopify.com/products/${strainSlug}"`
      ];
    });

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}