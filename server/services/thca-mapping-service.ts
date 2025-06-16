import { db } from '../db.js';
import { 
  thcaFlowerMapping, 
  shopifyProductLookup, 
  thcaSheetData, 
  items,
  type ThcaFlowerMapping,
  type ShopifyProductLookup,
  type ThcaSheetData 
} from '@shared/schema';
import { eq, sql, and, or, like, desc } from 'drizzle-orm';
import { GoogleSheetsService } from './google-sheets.js';
import { syncProductsFromShopify, isShopifyConfigured } from './shopify-integration.js';

export class ThcaMappingService {
  private googleSheets: GoogleSheetsService;

  constructor() {
    this.googleSheets = new GoogleSheetsService();
  }

  /**
   * Analyze and create pivot tables showing connections between THCa sheet and Shopify
   */
  async generatePivotTables() {
    console.log('Starting pivot table analysis for THCa flower sheet connections...');

    try {
      // Step 1: Sync latest data from both sources
      await this.syncThcaSheetData();
      await this.syncShopifyProductData();

      // Step 2: Perform intelligent mapping
      await this.performAutomaticMapping();

      // Step 3: Generate pivot table reports
      const pivotTables = await this.createPivotTableReports();

      return pivotTables;
    } catch (error) {
      console.error('Error generating pivot tables:', error);
      throw error;
    }
  }

  /**
   * Sync THCa flower sheet data to database
   */
  async syncThcaSheetData() {
    console.log('Syncing THCa flower sheet data...');
    
    try {
      // Get THCa Flower sheet data
      const sheetData = await this.googleSheets.getSheetData('THCa Flower');
      
      if (!sheetData || sheetData.length === 0) {
        console.log('No THCa flower sheet data found');
        return;
      }

      // Clear existing data
      await db.delete(thcaSheetData);

      // Insert fresh data
      const insertData = sheetData.map((row: any, index: number) => ({
        rowNumber: index + 1,
        strain: row['Strain'] || '',
        amount: row['Amount'] || '',
        percentage: row['%'] || '',
        tier: row['Tier'] || '',
        bulk: row['Bulk'] || '',
        distro25lbs: row['Distro 25lbs +'] || '',
        master50lbs: row['Master 50lbs+'] || '',
        master2100lbs: row['Master 2 100lbs +'] || '',
        coas: row['COAs'] || '',
        media: row['Media'] || '',
        strainType: row['Strain type'] || '',
        weightParsed: this.parseWeight(row['Amount']),
        weightUnit: this.extractWeightUnit(row['Amount']),
        percentageParsed: this.parsePercentage(row['%']),
        sheetLastModified: new Date(),
        processed: false
      }));

      await db.insert(thcaSheetData).values(insertData);
      console.log(`Synced ${insertData.length} rows from THCa flower sheet`);

    } catch (error) {
      console.error('Error syncing THCa sheet data:', error);
      throw error;
    }
  }

  /**
   * Sync Shopify product data to lookup table
   */
  async syncShopifyProductData() {
    console.log('Syncing Shopify product data...');
    
    try {
      const products = await this.shopify.getAllProducts();
      
      if (!products || products.length === 0) {
        console.log('No Shopify products found');
        return;
      }

      // Clear existing lookup data
      await db.delete(shopifyProductLookup);

      // Insert Shopify product data
      const insertData = products.map((product: any) => ({
        shopifyId: product.id.toString(),
        handle: product.handle,
        title: product.title,
        bodyHtml: product.body_html,
        vendor: product.vendor,
        productType: product.product_type,
        status: product.status,
        tags: product.tags,
        variantId: product.variants?.[0]?.id?.toString() || null,
        variantSku: product.variants?.[0]?.sku || null,
        variantPrice: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : null,
        variantCompareAtPrice: product.variants?.[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null,
        variantInventoryQuantity: product.variants?.[0]?.inventory_quantity || 0,
        variantWeight: product.variants?.[0]?.weight ? parseFloat(product.variants[0].weight) : null,
        variantWeightUnit: product.variants?.[0]?.weight_unit || null,
        featuredImage: product.image?.src || null,
        imageUrls: product.images?.map((img: any) => img.src) || [],
        metaTitle: product.seo?.title || null,
        metaDescription: product.seo?.description || null,
        shopifyCreatedAt: new Date(product.created_at),
        shopifyUpdatedAt: new Date(product.updated_at),
        shopifyPublishedAt: product.published_at ? new Date(product.published_at) : null,
        lastSyncedAt: new Date(),
        syncStatus: 'synced'
      }));

      await db.insert(shopifyProductLookup).values(insertData);
      console.log(`Synced ${insertData.length} Shopify products to lookup table`);

    } catch (error) {
      console.error('Error syncing Shopify product data:', error);
      throw error;
    }
  }

  /**
   * Perform automatic mapping between THCa sheet and Shopify products
   */
  async performAutomaticMapping() {
    console.log('Performing automatic mapping between THCa sheet and Shopify products...');

    try {
      // Clear existing mappings
      await db.delete(thcaFlowerMapping);

      // Get all THCa sheet data
      const thcaData = await db.select().from(thcaSheetData);
      
      // Get all Shopify products
      const shopifyProducts = await db.select().from(shopifyProductLookup);
      
      // Get all inventory items
      const inventoryItems = await db.select().from(items);

      const mappings: any[] = [];

      for (const thcaRow of thcaData) {
        const mapping = await this.findBestMatch(thcaRow, shopifyProducts, inventoryItems);
        if (mapping) {
          mappings.push(mapping);
        }
      }

      if (mappings.length > 0) {
        await db.insert(thcaFlowerMapping).values(mappings);
        console.log(`Created ${mappings.length} automatic mappings`);
      }

    } catch (error) {
      console.error('Error performing automatic mapping:', error);
      throw error;
    }
  }

  /**
   * Find best match for THCa sheet row
   */
  async findBestMatch(thcaRow: any, shopifyProducts: any[], inventoryItems: any[]) {
    const strain = thcaRow.strain?.toLowerCase() || '';
    const amount = thcaRow.amount?.toLowerCase() || '';
    
    let bestMatch: any = null;
    let bestScore = 0;
    let matchMethod = '';

    // Try to match with Shopify products first
    for (const product of shopifyProducts) {
      const score = this.calculateMatchScore(thcaRow, product, 'shopify');
      if (score > bestScore && score > 0.6) {
        bestMatch = product;
        bestScore = score;
        matchMethod = 'shopify_match';
      }
    }

    // Try to match with inventory items
    for (const item of inventoryItems) {
      const score = this.calculateMatchScore(thcaRow, item, 'inventory');
      if (score > bestScore && score > 0.6) {
        bestMatch = item;
        bestScore = score;
        matchMethod = 'inventory_match';
      }
    }

    if (bestMatch) {
      return {
        itemId: matchMethod === 'inventory_match' ? bestMatch.id : null,
        shopifyId: matchMethod === 'shopify_match' ? bestMatch.shopifyId : null,
        shopifyHandle: matchMethod === 'shopify_match' ? bestMatch.handle : null,
        
        // THCa Sheet Data
        thcaSheetStrain: thcaRow.strain,
        thcaSheetAmount: thcaRow.amount,
        thcaSheetPercentage: thcaRow.percentage,
        thcaSheetTier: thcaRow.tier,
        thcaSheetBulk: thcaRow.bulk,
        thcaSheetDistro: thcaRow.distro25lbs,
        thcaSheetMaster: thcaRow.master50lbs,
        thcaSheetCoas: thcaRow.coas,
        thcaSheetMedia: thcaRow.media,
        thcaSheetStrainType: thcaRow.strainType,
        
        // Matched Product Data
        shopifyTitle: matchMethod === 'shopify_match' ? bestMatch.title : null,
        shopifySku: matchMethod === 'shopify_match' ? bestMatch.variantSku : bestMatch.sku,
        shopifyInventoryQuantity: matchMethod === 'shopify_match' ? bestMatch.variantInventoryQuantity : bestMatch.quantity,
        shopifyPrice: matchMethod === 'shopify_match' ? bestMatch.variantPrice : parseFloat(bestMatch.basePrice || '0'),
        shopifyStatus: matchMethod === 'shopify_match' ? bestMatch.status : bestMatch.status,
        shopifyProductType: matchMethod === 'shopify_match' ? bestMatch.productType : bestMatch.category,
        shopifyVendor: matchMethod === 'shopify_match' ? bestMatch.vendor : bestMatch.brand,
        shopifyTags: matchMethod === 'shopify_match' ? bestMatch.tags : bestMatch.tags,
        
        // Mapping metadata
        mappingStatus: 'auto_matched',
        matchScore: bestScore,
        mappingMethod: matchMethod,
        lastSyncedAt: new Date(),
        needsReview: bestScore < 0.8
      };
    }

    return null;
  }

  /**
   * Calculate match score between THCa row and product
   */
  calculateMatchScore(thcaRow: any, product: any, type: 'shopify' | 'inventory'): number {
    let score = 0;
    const weights = {
      strain: 0.4,
      amount: 0.3,
      sku: 0.2,
      title: 0.1
    };

    const strain = thcaRow.strain?.toLowerCase() || '';
    const amount = thcaRow.amount?.toLowerCase() || '';
    
    const productTitle = (type === 'shopify' ? product.title : product.name)?.toLowerCase() || '';
    const productSku = (type === 'shopify' ? product.variantSku : product.sku)?.toLowerCase() || '';

    // Strain name matching
    if (strain && productTitle.includes(strain)) {
      score += weights.strain;
    }

    // Amount/weight matching
    if (amount && (productTitle.includes(amount) || productSku.includes(amount))) {
      score += weights.amount;
    }

    // SKU partial matching
    if (productSku && strain && productSku.includes(strain.slice(0, 4))) {
      score += weights.sku;
    }

    // Title similarity
    const commonWords = this.getCommonWords(strain + ' ' + amount, productTitle);
    if (commonWords > 0) {
      score += weights.title * (commonWords / 5); // Normalize by expected word count
    }

    return Math.min(score, 1.0);
  }

  /**
   * Create comprehensive pivot table reports
   */
  async createPivotTableReports() {
    console.log('Creating pivot table reports...');

    const reports = {
      mappingOverview: await this.getMappingOverview(),
      strainMapping: await this.getStrainMapping(),
      inventoryAlignment: await this.getInventoryAlignment(),
      unmappedItems: await this.getUnmappedItems(),
      conflictResolution: await this.getConflictItems()
    };

    return reports;
  }

  /**
   * Get mapping overview statistics
   */
  async getMappingOverview() {
    const [mappingStats] = await db.execute(sql`
      SELECT 
        COUNT(*) as total_thca_rows,
        COUNT(CASE WHEN mapping_status = 'auto_matched' THEN 1 END) as auto_matched,
        COUNT(CASE WHEN mapping_status = 'manual_mapped' THEN 1 END) as manual_mapped,
        COUNT(CASE WHEN mapping_status = 'conflict' THEN 1 END) as conflicts,
        COUNT(CASE WHEN mapping_status = 'unmapped' THEN 1 END) as unmapped,
        COUNT(CASE WHEN needs_review = true THEN 1 END) as needs_review,
        AVG(match_score) as avg_match_score
      FROM thca_flower_mapping
    `);

    const [shopifyStats] = await db.execute(sql`
      SELECT COUNT(*) as total_shopify_products
      FROM shopify_product_lookup
    `);

    const [inventoryStats] = await db.execute(sql`
      SELECT COUNT(*) as total_inventory_items
      FROM items
    `);

    return {
      thcaSheet: mappingStats,
      shopify: shopifyStats,
      inventory: inventoryStats
    };
  }

  /**
   * Get strain-based mapping pivot table
   */
  async getStrainMapping() {
    const strainMappings = await db.execute(sql`
      SELECT 
        tfm.thca_sheet_strain,
        COUNT(*) as thca_entries,
        COUNT(CASE WHEN tfm.shopify_id IS NOT NULL THEN 1 END) as shopify_matches,
        COUNT(CASE WHEN tfm.item_id IS NOT NULL THEN 1 END) as inventory_matches,
        STRING_AGG(DISTINCT tfm.shopify_title, ', ') as shopify_products,
        STRING_AGG(DISTINCT spl.variant_sku, ', ') as shopify_skus,
        AVG(tfm.match_score) as avg_match_score
      FROM thca_flower_mapping tfm
      LEFT JOIN shopify_product_lookup spl ON tfm.shopify_id = spl.shopify_id
      GROUP BY tfm.thca_sheet_strain
      ORDER BY thca_entries DESC
    `);

    return strainMappings;
  }

  /**
   * Get inventory alignment pivot table
   */
  async getInventoryAlignment() {
    const alignment = await db.execute(sql`
      SELECT 
        i.name as inventory_name,
        i.sku as inventory_sku,
        i.quantity as inventory_quantity,
        tfm.thca_sheet_strain,
        tfm.thca_sheet_amount,
        tfm.thca_sheet_percentage,
        spl.title as shopify_title,
        spl.variant_inventory_quantity as shopify_quantity,
        spl.variant_price as shopify_price,
        tfm.match_score,
        tfm.mapping_method
      FROM items i
      LEFT JOIN thca_flower_mapping tfm ON i.id = tfm.item_id
      LEFT JOIN shopify_product_lookup spl ON tfm.shopify_id = spl.shopify_id
      WHERE tfm.id IS NOT NULL
      ORDER BY tfm.match_score DESC
    `);

    return alignment;
  }

  /**
   * Get unmapped items that need attention
   */
  async getUnmappedItems() {
    const unmapped = {
      thcaRows: await db.execute(sql`
        SELECT 
          tsd.strain,
          tsd.amount,
          tsd.percentage,
          tsd.tier,
          tsd.row_number
        FROM thca_sheet_data tsd
        LEFT JOIN thca_flower_mapping tfm ON tsd.id = tfm.id
        WHERE tfm.id IS NULL
        ORDER BY tsd.row_number
      `),
      
      shopifyProducts: await db.execute(sql`
        SELECT 
          spl.title,
          spl.variant_sku,
          spl.variant_inventory_quantity,
          spl.product_type,
          spl.status
        FROM shopify_product_lookup spl
        LEFT JOIN thca_flower_mapping tfm ON spl.shopify_id = tfm.shopify_id
        WHERE tfm.id IS NULL AND spl.product_type ILIKE '%flower%'
        ORDER BY spl.title
      `),
      
      inventoryItems: await db.execute(sql`
        SELECT 
          i.name,
          i.sku,
          i.quantity,
          i.category,
          i.status
        FROM items i
        LEFT JOIN thca_flower_mapping tfm ON i.id = tfm.item_id
        WHERE tfm.id IS NULL AND i.category ILIKE '%flower%'
        ORDER BY i.name
      `)
    };

    return unmapped;
  }

  /**
   * Get items that need conflict resolution
   */
  async getConflictItems() {
    const conflicts = await db.execute(sql`
      SELECT 
        tfm.*,
        i.name as inventory_name,
        spl.title as shopify_title
      FROM thca_flower_mapping tfm
      LEFT JOIN items i ON tfm.item_id = i.id
      LEFT JOIN shopify_product_lookup spl ON tfm.shopify_id = spl.shopify_id
      WHERE tfm.needs_review = true OR tfm.match_score < 0.7
      ORDER BY tfm.match_score ASC
    `);

    return conflicts;
  }

  // Helper methods
  private parseWeight(amount: string): number | null {
    if (!amount) return null;
    const match = amount.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  private extractWeightUnit(amount: string): string {
    if (!amount) return 'g';
    if (amount.includes('lb') || amount.includes('pound')) return 'lb';
    if (amount.includes('oz') || amount.includes('ounce')) return 'oz';
    if (amount.includes('kg')) return 'kg';
    return 'g';
  }

  private parsePercentage(percentage: string): number | null {
    if (!percentage) return null;
    const match = percentage.replace('%', '').match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  private getCommonWords(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    return words1.filter(word => words2.includes(word)).length;
  }
}