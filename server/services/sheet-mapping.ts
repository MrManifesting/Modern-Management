/**
 * Google Sheets Column Mapping Service
 * Maps between THCa Flower sheet, Inventory sheet, and InventoryList sheet formats
 */

export interface THCaFlowerRow {
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
}

export interface InventorySheetRow {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  productCategory: string;
  type: string;
  tags: string;
  published: string;
  option1Name: string;
  option1Value: string;
  option1LinkedTo: string;
  option2Name: string;
  option2Value: string;
  option2LinkedTo: string;
  option3Name: string;
  option3Value: string;
  option3LinkedTo: string;
  variantSku: string;
  variantGrams: string;
  variantInventoryTracker: string;
  variantInventoryPolicy: string;
  variantFulfillmentService: string;
  variantPrice: string;
  variantCompareAtPrice: string;
  variantRequiresShipping: string;
  variantTaxable: string;
  variantBarcode: string;
  imageSrc: string;
  imageUploaded: string;
  n8nImageSent: string;
  imagePosition: string;
  imageAltText: string;
  giftCard: string;
  seoTitle: string;
  seoDescription: string;
  googleProductCategory: string;
  googleGender: string;
  googleAgeGroup: string;
  googleMpn: string;
  googleCondition: string;
  googleCustomProduct: string;
  googleCustomLabel0: string;
  googleCustomLabel1: string;
  googleCustomLabel2: string;
  googleCustomLabel3: string;
  googleCustomLabel4: string;
  qckAccordion: string;
  strainBannerText: string;
  googleCustomProductMeta: string;
  coasContent: string;
  coasLink: string;
  productRatingCount: string;
  complementaryProducts: string;
  relatedProducts: string;
  relatedProductsSettings: string;
  searchProductBoosts: string;
  variantImage: string;
  variantWeightUnit: string;
  variantTaxCode: string;
  costPerItem: string;
  includedUnitedStates: string;
  priceUnitedStates: string;
  compareAtPriceUnitedStates: string;
  status: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  variantInventoryQty: string;
}

export interface InventoryListRow {
  strain: string;
  amount: string;
  percentage: string;
  tier: string;
  strainType: string;
  sku: string;
  keyId: string;
}

export class SheetMappingService {
  
  /**
   * Map THCa Flower sheet columns to standardized format
   */
  static readonly THCA_FLOWER_MAPPING = {
    'Strain': 'strain',
    'Amount': 'amount',
    '%': 'percentage',
    'Tier': 'tier',
    'Bulk': 'bulk',
    'Distro 25lbs +': 'distro25',
    'Master 50lbs+': 'master50',
    'Master 2 100lbs +': 'master100',
    'COAs (click on name)': 'coas',
    'Media': 'media',
    'Strain type': 'strainType'
  };

  /**
   * Map Inventory sheet columns to standardized format
   */
  static readonly INVENTORY_SHEET_MAPPING = {
    'Handle': 'handle',
    'Title': 'title',
    'Body (HTML)': 'bodyHtml',
    'Vendor': 'vendor',
    'Product Category': 'productCategory',
    'Type': 'type',
    'Tags': 'tags',
    'Published': 'published',
    'Option1 Name': 'option1Name',
    'Option1 Value': 'option1Value',
    'Option1 Linked To': 'option1LinkedTo',
    'Option2 Name': 'option2Name',
    'Option2 Value': 'option2Value',
    'Option2 Linked To': 'option2LinkedTo',
    'Option3 Name': 'option3Name',
    'Option3 Value': 'option3Value',
    'Option3 Linked To': 'option3LinkedTo',
    'Variant SKU': 'variantSku',
    'Variant Grams': 'variantGrams',
    'Variant Inventory Tracker': 'variantInventoryTracker',
    'Variant Inventory Policy': 'variantInventoryPolicy',
    'Variant Fulfillment Service': 'variantFulfillmentService',
    'Variant Price': 'variantPrice',
    'Variant Compare At Price': 'variantCompareAtPrice',
    'Variant Requires Shipping': 'variantRequiresShipping',
    'Variant Taxable': 'variantTaxable',
    'Variant Barcode': 'variantBarcode',
    'Image Src': 'imageSrc',
    'Image Uploaded': 'imageUploaded',
    'n8n Image Sent': 'n8nImageSent',
    'Image Position': 'imagePosition',
    'Image Alt Text': 'imageAltText',
    'Gift Card': 'giftCard',
    'SEO Title': 'seoTitle',
    'SEO Description': 'seoDescription',
    'Google Shopping / Google Product Category': 'googleProductCategory',
    'Google Shopping / Gender': 'googleGender',
    'Google Shopping / Age Group': 'googleAgeGroup',
    'Google Shopping / MPN': 'googleMpn',
    'Google Shopping / Condition': 'googleCondition',
    'Google Shopping / Custom Product': 'googleCustomProduct',
    'Google Shopping / Custom Label 0': 'googleCustomLabel0',
    'Google Shopping / Custom Label 1': 'googleCustomLabel1',
    'Google Shopping / Custom Label 2': 'googleCustomLabel2',
    'Google Shopping / Custom Label 3': 'googleCustomLabel3',
    'Google Shopping / Custom Label 4': 'googleCustomLabel4',
    'qck-accordion (product.metafields.custom.qck_accordion)': 'qckAccordion',
    'Strain Banner Text (product.metafields.custom.strain_banner_text)': 'strainBannerText',
    'Google: Custom Product (product.metafields.mm-google-shopping.custom_product)': 'googleCustomProductMeta',
    'COAS content (product.metafields.my_fields.coas_content)': 'coasContent',
    'COAS link (product.metafields.my_fields.coas_link)': 'coasLink',
    'Product rating count (product.metafields.reviews.rating_count)': 'productRatingCount',
    'Complementary products (product.metafields.shopify--discovery--product_recommendation.complementary_products)': 'complementaryProducts',
    'Related products (product.metafields.shopify--discovery--product_recommendation.related_products)': 'relatedProducts',
    'Related products settings (product.metafields.shopify--discovery--product_recommendation.related_products_display)': 'relatedProductsSettings',
    'Search product boosts (product.metafields.shopify--discovery--product_search_boost.queries)': 'searchProductBoosts',
    'Variant Image': 'variantImage',
    'Variant Weight Unit': 'variantWeightUnit',
    'Variant Tax Code': 'variantTaxCode',
    'Cost per item': 'costPerItem',
    'Included / United States': 'includedUnitedStates',
    'Price / United States': 'priceUnitedStates',
    'Compare At Price / United States': 'compareAtPriceUnitedStates',
    'Status': 'status',
    'Shopify Product ID': 'shopifyProductId',
    'Shopify Variant ID': 'shopifyVariantId',
    'Variant Inventory Qty': 'variantInventoryQty'
  };

  /**
   * Map InventoryList sheet columns to standardized format
   */
  static readonly INVENTORY_LIST_MAPPING = {
    'Strain': 'strain',
    'Amount': 'amount',
    '%': 'percentage',
    'Tier': 'tier',
    'Strain Type': 'strainType',
    'SKU': 'sku',
    'KEY-ID': 'keyId'
  };

  /**
   * Convert THCa Flower row to internal inventory item format
   */
  static thcaFlowerToInventory(thcaRow: THCaFlowerRow): any {
    return {
      name: thcaRow.strain,
      category: 'Flower',
      subcategory: thcaRow.tier,
      condition: thcaRow.strainType,
      weight: thcaRow.amount,
      basePrice: parseFloat(thcaRow.bulk) || 0,
      salePrice: parseFloat(thcaRow.distro25) || 0,
      wholesalePrice: parseFloat(thcaRow.master50) || 0,
      costPrice: parseFloat(thcaRow.master100) || 0,
      description: `${thcaRow.percentage}% THCa ${thcaRow.strainType} strain`,
      brand: 'Gold Standard',
      status: 'available',
      quantity: 1,
      tags: [thcaRow.tier, thcaRow.strainType, 'THCa'].filter(Boolean)
    };
  }

  /**
   * Convert Inventory sheet row to internal inventory item format
   */
  static inventorySheetToInventory(invRow: InventorySheetRow): any {
    return {
      name: invRow.title,
      description: invRow.bodyHtml?.replace(/<[^>]*>/g, '') || '', // Strip HTML
      brand: invRow.vendor,
      category: invRow.productCategory || 'General',
      subcategory: invRow.type,
      sku: invRow.variantSku,
      barcode: invRow.variantBarcode,
      basePrice: parseFloat(invRow.variantPrice) || 0,
      retailPrice: parseFloat(invRow.variantCompareAtPrice) || 0,
      costPrice: parseFloat(invRow.costPerItem) || 0,
      weight: invRow.variantGrams || invRow.variantWeightUnit,
      quantity: parseInt(invRow.variantInventoryQty) || 0,
      status: invRow.status?.toLowerCase() === 'active' ? 'available' : 'inactive',
      imageUrl: invRow.imageSrc,
      shopifyId: invRow.shopifyProductId,
      tags: invRow.tags?.split(',').map(t => t.trim()).filter(Boolean) || []
    };
  }

  /**
   * Convert InventoryList row to internal inventory item format
   */
  static inventoryListToInventory(listRow: InventoryListRow): any {
    return {
      name: listRow.strain,
      category: 'Flower',
      subcategory: listRow.tier,
      condition: listRow.strainType,
      sku: listRow.sku,
      weight: listRow.amount,
      description: `${listRow.percentage}% THCa ${listRow.strainType} strain`,
      brand: 'Gold Standard',
      status: 'available',
      quantity: 1,
      keyId: listRow.keyId,
      tags: [listRow.tier, listRow.strainType, 'THCa'].filter(Boolean)
    };
  }

  /**
   * Convert internal inventory item to THCa Flower sheet format
   */
  static inventoryToThcaFlower(item: any): THCaFlowerRow {
    const percentage = item.description?.match(/(\d+(?:\.\d+)?)%/)?.[1] || '';
    
    return {
      strain: item.name,
      amount: item.weight || '1 pound',
      percentage: percentage,
      tier: item.subcategory || 'Standard',
      bulk: item.basePrice?.toString() || '0',
      distro25: item.salePrice?.toString() || '0',
      master50: item.wholesalePrice?.toString() || '0',
      master100: item.costPrice?.toString() || '0',
      coas: '', // Will be populated from external source
      media: item.imageUrl || '',
      strainType: item.condition || 'Hybrid'
    };
  }

  /**
   * Convert internal inventory item to Inventory sheet format
   */
  static inventoryToInventorySheet(item: any): InventorySheetRow {
    const handle = item.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '';
    
    return {
      handle: handle,
      title: item.name,
      bodyHtml: item.description || '',
      vendor: item.brand || 'Gold Standard',
      productCategory: item.category || 'Flower',
      type: item.subcategory || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      published: 'TRUE',
      option1Name: 'Weight',
      option1Value: item.weight || '1 pound',
      option1LinkedTo: '',
      option2Name: '',
      option2Value: '',
      option2LinkedTo: '',
      option3Name: '',
      option3Value: '',
      option3LinkedTo: '',
      variantSku: item.sku || '',
      variantGrams: item.weight || '',
      variantInventoryTracker: 'shopify',
      variantInventoryPolicy: 'deny',
      variantFulfillmentService: 'manual',
      variantPrice: item.basePrice?.toString() || '0',
      variantCompareAtPrice: item.retailPrice?.toString() || '',
      variantRequiresShipping: 'TRUE',
      variantTaxable: 'TRUE',
      variantBarcode: item.barcode || '',
      imageSrc: item.imageUrl || '',
      imageUploaded: '',
      n8nImageSent: '',
      imagePosition: '1',
      imageAltText: item.name,
      giftCard: 'FALSE',
      seoTitle: item.name,
      seoDescription: item.description || '',
      googleProductCategory: 'Health & Beauty > Personal Care > Cosmetics',
      googleGender: '',
      googleAgeGroup: 'adult',
      googleMpn: item.sku || '',
      googleCondition: 'new',
      googleCustomProduct: 'FALSE',
      googleCustomLabel0: item.category || '',
      googleCustomLabel1: item.subcategory || '',
      googleCustomLabel2: item.brand || '',
      googleCustomLabel3: '',
      googleCustomLabel4: '',
      qckAccordion: '',
      strainBannerText: item.name,
      googleCustomProductMeta: 'FALSE',
      coasContent: '',
      coasLink: '',
      productRatingCount: '',
      complementaryProducts: '',
      relatedProducts: '',
      relatedProductsSettings: '',
      searchProductBoosts: '',
      variantImage: item.imageUrl || '',
      variantWeightUnit: 'g',
      variantTaxCode: '',
      costPerItem: item.costPrice?.toString() || '0',
      includedUnitedStates: 'TRUE',
      priceUnitedStates: item.basePrice?.toString() || '0',
      compareAtPriceUnitedStates: item.retailPrice?.toString() || '',
      status: item.status === 'available' ? 'active' : 'draft',
      shopifyProductId: item.shopifyId || '',
      shopifyVariantId: '',
      variantInventoryQty: item.quantity?.toString() || '0'
    };
  }

  /**
   * Convert internal inventory item to InventoryList sheet format
   */
  static inventoryToInventoryList(item: any): InventoryListRow {
    const percentage = item.description?.match(/(\d+(?:\.\d+)?)%/)?.[1] || '';
    
    return {
      strain: item.name,
      amount: item.weight || '1 pound',
      percentage: percentage,
      tier: item.subcategory || 'Standard',
      strainType: item.condition || 'Hybrid',
      sku: item.sku || '',
      keyId: item.keyId || item.id?.toString() || ''
    };
  }

  /**
   * Parse sheet row data using appropriate mapping
   */
  static parseSheetRow(headers: string[], rowData: string[], sheetType: 'thca' | 'inventory' | 'list'): any {
    const mapping = sheetType === 'thca' ? this.THCA_FLOWER_MAPPING :
                   sheetType === 'inventory' ? this.INVENTORY_SHEET_MAPPING :
                   this.INVENTORY_LIST_MAPPING;

    const parsedRow: any = {};
    
    headers.forEach((header, index) => {
      const mappedKey = mapping[header as keyof typeof mapping];
      if (mappedKey && rowData[index] !== undefined) {
        parsedRow[mappedKey] = rowData[index];
      }
    });

    return parsedRow;
  }

  /**
   * Convert parsed sheet data to inventory items
   */
  static convertToInventoryItems(parsedRows: any[], sheetType: 'thca' | 'inventory' | 'list'): any[] {
    return parsedRows.map(row => {
      switch (sheetType) {
        case 'thca':
          return this.thcaFlowerToInventory(row);
        case 'inventory':
          return this.inventorySheetToInventory(row);
        case 'list':
          return this.inventoryListToInventory(row);
        default:
          return row;
      }
    });
  }

  /**
   * Convert inventory items to sheet format
   */
  static convertFromInventoryItems(items: any[], sheetType: 'thca' | 'inventory' | 'list'): any[] {
    return items.map(item => {
      switch (sheetType) {
        case 'thca':
          return this.inventoryToThcaFlower(item);
        case 'inventory':
          return this.inventoryToInventorySheet(item);
        case 'list':
          return this.inventoryToInventoryList(item);
        default:
          return item;
      }
    });
  }

  /**
   * Get headers for specific sheet type
   */
  static getSheetHeaders(sheetType: 'thca' | 'inventory' | 'list'): string[] {
    const mapping = sheetType === 'thca' ? this.THCA_FLOWER_MAPPING :
                   sheetType === 'inventory' ? this.INVENTORY_SHEET_MAPPING :
                   this.INVENTORY_LIST_MAPPING;

    return Object.keys(mapping);
  }
}

export default SheetMappingService;