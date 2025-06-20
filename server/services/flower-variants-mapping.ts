import fs from 'fs';
import path from 'path';

interface FlowerVariant {
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  cleanedTitle: string;
  slug: string;
}

class FlowerVariantsMappingService {
  private variants: FlowerVariant[] = [];
  private productMap: Map<string, string> = new Map(); // item name -> product ID
  private skuMap: Map<string, string> = new Map(); // sku -> product ID
  
  constructor() {
    this.loadVariants();
  }

  private loadVariants() {
    try {
      const csvPath = path.join(process.cwd(), 'attached_assets', 'Automated_Gold_Standard_online_catalog  - All_Flower_Variants_1750441221138.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = this.parseCSVLine(line);
        if (columns.length >= 6) {
          const productId = this.extractProductId(columns[0]);
          if (productId) {
            const variant: FlowerVariant = {
              productId,
              productTitle: columns[1],
              variantTitle: columns[3],
              sku: columns[4],
              cleanedTitle: columns[5],
              slug: columns[6]
            };
            
            this.variants.push(variant);
            
            // Create mappings for lookup
            this.productMap.set(variant.cleanedTitle.toLowerCase(), productId);
            this.productMap.set(variant.productTitle.toLowerCase(), productId);
            
            if (variant.sku) {
              this.skuMap.set(variant.sku.toLowerCase(), productId);
            }
          }
        }
      }
      
      console.log(`Loaded ${this.variants.length} flower variants for store link mapping`);
    } catch (error) {
      console.error('Error loading flower variants:', error);
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private extractProductId(gid: string): string | null {
    // Extract ID from gid://shopify/Product/9571019030815 format
    const match = gid.match(/gid:\/\/shopify\/Product\/(\d+)/);
    return match ? match[1] : null;
  }

  public getProductIdByName(name: string): string | null {
    const cleanName = name.toLowerCase().trim();
    
    // Try exact match first
    if (this.productMap.has(cleanName)) {
      return this.productMap.get(cleanName) || null;
    }
    
    // Try partial matches
    for (const [key, productId] of this.productMap.entries()) {
      if (key.includes(cleanName) || cleanName.includes(key)) {
        return productId;
      }
    }
    
    return null;
  }

  public getProductIdBySku(sku: string): string | null {
    if (!sku) return null;
    return this.skuMap.get(sku.toLowerCase()) || null;
  }

  public getStoreUrl(itemName: string, sku?: string): string {
    let productId: string | null = null;
    
    // Try SKU first if provided
    if (sku) {
      productId = this.getProductIdBySku(sku);
    }
    
    // If no SKU match, try by name
    if (!productId) {
      productId = this.getProductIdByName(itemName);
    }
    
    if (productId) {
      // Return direct product URL
      return `https://gold-standard-cbd.myshopify.com/products/${this.getProductHandle(productId)}`;
    }
    
    // Fallback to search if no mapping found
    const searchTerm = sku || itemName;
    return `https://gold-standard-cbd.myshopify.com/search?q=${encodeURIComponent(searchTerm)}`;
  }

  public getAdminUrl(itemName: string, sku?: string): string {
    let productId: string | null = null;
    
    // Try SKU first if provided
    if (sku) {
      productId = this.getProductIdBySku(sku);
    }
    
    // If no SKU match, try by name
    if (!productId) {
      productId = this.getProductIdByName(itemName);
    }
    
    if (productId) {
      // Return direct admin URL
      return `https://gold-standard-cbd.myshopify.com/admin/products/${productId}`;
    }
    
    // Fallback to admin search if no mapping found
    const searchTerm = sku || itemName;
    return `https://gold-standard-cbd.myshopify.com/admin/products?query=${encodeURIComponent(searchTerm)}`;
  }

  private getProductHandle(productId: string): string {
    // Find the variant with this product ID and return its slug
    const variant = this.variants.find(v => v.productId === productId);
    if (variant && variant.slug) {
      return variant.slug;
    }
    
    // Fallback to using the product ID
    return productId;
  }

  public getAllVariants(): FlowerVariant[] {
    return this.variants;
  }
}

export const flowerVariantsMappingService = new FlowerVariantsMappingService();