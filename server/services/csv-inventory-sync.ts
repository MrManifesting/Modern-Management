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

  // Format menu as HTML for display with custom branding and themes
  private async formatMenuAsHTML(items: MenuTabItem[], options: any): Promise<string> {
    const timestamp = new Date().toLocaleString();
    
    // Extract branding and theme from options
    const branding = options.branding || {
      companyName: 'Gold Standard CBD',
      subtitle: 'Premium THCA Flower Wholesale',
      contactInfo: {
        phone: '541-295-8811',
        email: 'wholesale@goldcbd.com',
        website: 'goldcbd.com',
        address: 'Oregon, USA'
      },
      logoUrl: '',
      description: 'Premium quality THCA flower for wholesale distribution'
    };

    const theme = options.theme || {
      primaryColor: '#D4AF37',
      secondaryColor: '#228B22',
      backgroundColor: '#0F0F0F',
      textColor: '#FFFFFF',
      accentColor: '#FFD700'
    };
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${branding.companyName} - Cannabis Menu - ${timestamp}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Arial', sans-serif; 
          background: linear-gradient(135deg, ${theme.backgroundColor}dd, ${theme.backgroundColor}ff);
          color: ${theme.textColor};
          line-height: 1.6;
          min-height: 100vh;
        }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        .header { 
          text-align: center; 
          margin-bottom: 40px; 
          padding: 30px 20px;
          background: linear-gradient(45deg, ${theme.primaryColor}20, ${theme.secondaryColor}20);
          border-radius: 15px;
          backdrop-filter: blur(10px);
          border: 1px solid ${theme.primaryColor}40;
        }
        
        .logo-container {
          margin-bottom: 20px;
        }
        
        .logo-image {
          max-height: 80px;
          width: auto;
          margin-bottom: 15px;
        }
        
        .company-name { 
          color: ${theme.primaryColor}; 
          font-size: 3em; 
          font-weight: bold; 
          margin-bottom: 10px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          background: linear-gradient(45deg, ${theme.primaryColor}, ${theme.accentColor});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .subtitle { 
          color: ${theme.secondaryColor}; 
          font-size: 1.2em;
          margin-bottom: 15px;
          font-weight: 500;
        }
        
        .description {
          color: ${theme.textColor}bb;
          font-size: 1em;
          margin-bottom: 20px;
        }
        
        .contact-info {
          display: flex;
          justify-content: center;
          gap: 30px;
          flex-wrap: wrap;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid ${theme.primaryColor}40;
        }
        
        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${theme.textColor}dd;
          font-size: 0.9em;
        }
        
        .contact-icon {
          width: 16px;
          height: 16px;
          background: ${theme.accentColor};
          border-radius: 50%;
          display: inline-block;
        }
        
        .stats-bar {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin: 30px 0;
          padding: 20px;
          background: ${theme.backgroundColor}80;
          border-radius: 12px;
          backdrop-filter: blur(5px);
          border: 1px solid ${theme.primaryColor}30;
        }
        
        .stat-item {
          text-align: center;
        }
        
        .stat-number {
          font-size: 2em;
          font-weight: bold;
          color: ${theme.accentColor};
          display: block;
        }
        
        .stat-label {
          font-size: 0.9em;
          color: ${theme.textColor}bb;
        }
        
        .menu-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
          gap: 25px; 
          margin-top: 30px;
        }
        
        .strain-card { 
          background: linear-gradient(145deg, ${theme.backgroundColor}dd, ${theme.backgroundColor}aa);
          border-radius: 15px; 
          padding: 25px; 
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          border: 1px solid ${theme.primaryColor}40;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .strain-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, ${theme.primaryColor}, ${theme.accentColor}, ${theme.secondaryColor});
        }
        
        .strain-card:hover { 
          transform: translateY(-5px); 
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          border-color: ${theme.primaryColor}80;
        }
        
        .strain-name { 
          font-size: 1.5em; 
          font-weight: bold; 
          color: ${theme.primaryColor}; 
          margin-bottom: 12px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        
        .tier-badge { 
          display: inline-block; 
          padding: 6px 15px; 
          border-radius: 20px; 
          font-size: 0.85em; 
          font-weight: bold; 
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .tier-exotic { background: linear-gradient(45deg, #ff6b6b, #ff8e8e); color: white; }
        .tier-top-shelf { background: linear-gradient(45deg, ${theme.accentColor}, ${theme.primaryColor}); color: #000; }
        .tier-aaa { background: linear-gradient(45deg, #45b7d1, #6dd5ed); color: white; }
        .tier-aa { background: linear-gradient(45deg, #96ceb4, #b8e6d3); color: #333; }
        .tier-classic { background: linear-gradient(45deg, #ffeaa7, #fdcb6e); color: #333; }
        
        .availability { 
          font-size: 1.3em; 
          font-weight: bold; 
          color: ${theme.secondaryColor}; 
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .availability-icon {
          width: 12px;
          height: 12px;
          background: ${theme.secondaryColor};
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .pricing { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          margin-top: 15px;
        }
        
        .price-item { 
          text-align: center; 
          padding: 12px; 
          background: linear-gradient(145deg, ${theme.backgroundColor}bb, ${theme.backgroundColor}88);
          border-radius: 8px; 
          border: 1px solid ${theme.primaryColor}30;
          transition: all 0.2s ease;
        }
        
        .price-item:hover {
          background: linear-gradient(145deg, ${theme.primaryColor}20, ${theme.secondaryColor}20);
          border-color: ${theme.primaryColor}60;
        }
        
        .price-label { 
          font-size: 0.8em; 
          color: ${theme.textColor}aa; 
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .price-value { 
          font-weight: bold; 
          color: ${theme.accentColor}; 
          font-size: 1.1em;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
          margin-top: 15px;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.9em;
          font-weight: 600;
          text-align: center;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }
        
        .btn-primary {
          background: linear-gradient(45deg, ${theme.primaryColor}, ${theme.accentColor});
          color: #000;
        }
        
        .btn-secondary {
          background: linear-gradient(45deg, ${theme.secondaryColor}, ${theme.secondaryColor}dd);
          color: white;
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .footer { 
          text-align: center; 
          margin-top: 60px; 
          padding: 30px;
          background: linear-gradient(45deg, ${theme.backgroundColor}dd, ${theme.backgroundColor}aa);
          border-radius: 15px;
          border: 1px solid ${theme.primaryColor}40;
        }
        
        .footer-logo {
          font-size: 1.5em;
          color: ${theme.primaryColor};
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        @media (max-width: 768px) {
          .company-name { font-size: 2em; }
          .menu-grid { grid-template-columns: 1fr; }
          .contact-info { flex-direction: column; gap: 15px; }
          .stats-bar { flex-direction: column; gap: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">
                ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName} Logo" class="logo-image">` : ''}
            </div>
            <div class="company-name">${branding.companyName}</div>
            <div class="subtitle">${branding.subtitle}</div>
            <div class="description">${branding.description}</div>
            
            <div class="contact-info">
                <div class="contact-item">
                    <span class="contact-icon"></span>
                    <span>📞 ${branding.contactInfo.phone}</span>
                </div>
                <div class="contact-item">
                    <span class="contact-icon"></span>
                    <span>✉️ ${branding.contactInfo.email}</span>
                </div>
                <div class="contact-item">
                    <span class="contact-icon"></span>
                    <span>🌐 ${branding.contactInfo.website}</span>
                </div>
                <div class="contact-item">
                    <span class="contact-icon"></span>
                    <span>📍 ${branding.contactInfo.address}</span>
                </div>
            </div>
        </div>
        
        <div class="stats-bar">
            <div class="stat-item">
                <span class="stat-number">${items.length}</span>
                <span class="stat-label">Available Strains</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${items.reduce((sum, item) => sum + item.amount, 0)}</span>
                <span class="stat-label">Total Pounds</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${new Set(items.map(item => item.tier)).size}</span>
                <span class="stat-label">Quality Tiers</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${timestamp.split(',')[0]}</span>
                <span class="stat-label">Updated</span>
            </div>
        </div>
        
        <div class="menu-grid">
            ${items.map(item => {
              const tierClass = item.tier.toLowerCase().includes('exotic') ? 'tier-exotic' :
                               item.tier.toLowerCase().includes('top shelf') ? 'tier-top-shelf' :
                               item.tier.toLowerCase().includes('aaa') ? 'tier-aaa' :
                               item.tier.toLowerCase().includes('aa') ? 'tier-aa' : 'tier-classic';
              
              const strainSlug = item.strain.toLowerCase().replace(/[^a-z0-9]/g, '-');
              const coaLink = `https://gold-standard-cbd.com/coa/${strainSlug}`;
              const mediaLink = `https://gold-standard-cbd.com/media/download/${item.variantSku || item.keyId}`;
              const orderLink = `https://gold-standard-cbd.com/products/${strainSlug}`;
              
              return `
                <div class="strain-card">
                    <div class="strain-name">${item.strain}</div>
                    <div class="tier-badge ${tierClass}">${item.tier}</div>
                    <div class="availability">
                        <span class="availability-icon"></span>
                        ${item.amount} lbs available
                    </div>
                    <div class="pricing">
                        <div class="price-item">
                            <div class="price-label">Bulk Price</div>
                            <div class="price-value">${item.bulk}</div>
                        </div>
                        <div class="price-item">
                            <div class="price-label">Distro 25lbs+</div>
                            <div class="price-value">${item.distro25}</div>
                        </div>
                        <div class="price-item">
                            <div class="price-label">Master 50lbs+</div>
                            <div class="price-value">${item.master50}</div>
                        </div>
                        <div class="price-item">
                            <div class="price-label">Master 100lbs+</div>
                            <div class="price-value">${item.master100}</div>
                        </div>
                    </div>
                    ${options.includeImages !== false ? `
                    <div class="action-buttons">
                        <a href="${orderLink}" class="btn btn-primary" target="_blank">🛒 Order Now</a>
                        <a href="${coaLink}" class="btn btn-secondary" target="_blank">📄 View COA</a>
                        <a href="${mediaLink}" class="btn btn-secondary" target="_blank">📥 Download Media</a>
                        <a href="tel:${branding.contactInfo.phone}" class="btn btn-secondary">📞 Call</a>
                    </div>
                    ` : ''}
                </div>
              `;
            }).join('')}
        </div>
        
        <div class="footer">
            <div class="footer-logo">${branding.companyName}</div>
            <p>Generated on ${timestamp}</p>
            <p>${branding.description}</p>
            <div style="margin-top: 15px;">
                <strong>Contact Information:</strong><br>
                📞 ${branding.contactInfo.phone} | 
                ✉️ ${branding.contactInfo.email} | 
                🌐 ${branding.contactInfo.website} | 
                📍 ${branding.contactInfo.address}
            </div>
        </div>
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