// Removed logger import - using console directly

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string;
  description: string;
  images: Array<{
    id: string;
    url: string;
    altText: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    sku: string;
    price: string;
    compareAtPrice?: string;
    inventoryQuantity: number;
    weight: number;
    weightUnit: string;
    barcode: string;
    inventoryLevels: Array<{
      available: number;
      location: {
        id: string;
        name: string;
      };
    }>;
  }>;
}

export class RealShopifySync {
  private shopDomain: string;
  private accessToken: string;

  constructor() {
    this.shopDomain = (process.env.SHOPIFY_STORE || 
                      process.env.SHOPIFY_SHOP_DOMAIN || 
                      process.env.SHOPIFY_DOMAIN || '').replace('.myshopify.com', '');
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || 
                      process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || '';
  }

  async fetchRealInventoryData(): Promise<ShopifyProduct[]> {
    try {
      console.log('Fetching real Shopify inventory data with variant matching');
      
      const query = `
        query {
          products(first: 250, query: "status:active AND inventory_quantity:>0") {
            edges {
              node {
                id
                title
                handle
                status
                productType
                description
                images(first: 5) {
                  edges {
                    node {
                      id
                      url
                      altText
                    }
                  }
                }
                variants(first: 20) {
                  edges {
                    node {
                      id
                      title
                      sku
                      price
                      compareAtPrice
                      inventoryQuantity
                      weight
                      weightUnit
                      barcode
                      inventoryItem {
                        id
                        tracked
                        inventoryLevels(first: 10) {
                          edges {
                            node {
                              id
                              quantities(names: ["available"]) {
                                name
                                quantity
                              }
                              location {
                                id
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(`https://${this.shopDomain}.myshopify.com/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const products: ShopifyProduct[] = data.data.products.edges.map((edge: any) => {
        const node = edge.node;
        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          status: node.status,
          productType: node.productType,
          description: node.description,
          images: node.images.edges.map((imgEdge: any) => ({
            id: imgEdge.node.id,
            url: imgEdge.node.url,
            altText: imgEdge.node.altText,
          })),
          variants: node.variants.edges.map((variantEdge: any) => {
            const variant = variantEdge.node;
            return {
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              inventoryQuantity: variant.inventoryQuantity,
              weight: variant.weight,
              weightUnit: variant.weightUnit,
              barcode: variant.barcode,
              inventoryLevels: variant.inventoryItem?.inventoryLevels?.edges?.map((levelEdge: any) => {
                const availableQuantity = levelEdge.node.quantities?.find((q: any) => q.name === 'available')?.quantity || 0;
                return {
                  available: availableQuantity,
                  location: {
                    id: levelEdge.node.location.id,
                    name: levelEdge.node.location.name,
                  },
                };
              }) || [],
            };
          }),
        };
      });

      console.log(`Successfully fetched ${products.length} real Shopify products with variant data`);
      return products;

    } catch (error) {
      console.error('Failed to fetch real Shopify inventory:', error);
      throw error;
    }
  }

  async syncWithLocalInventory(storage: any): Promise<{ synced: number; matched: number; errors: any[] }> {
    try {
      const shopifyProducts = await this.fetchRealInventoryData();
      const localItems = await storage.getAllItems();
      
      let synced = 0;
      let matched = 0;
      const errors: any[] = [];

      console.log(`Starting sync: ${shopifyProducts.length} Shopify products vs ${localItems.length} local items`);

      for (const shopifyProduct of shopifyProducts) {
        for (const variant of shopifyProduct.variants) {
          try {
            // Find matching local item by SKU, title, or fuzzy name matching
            const matchingItem = this.findBestMatch(variant, shopifyProduct, localItems);
            
            if (matchingItem) {
              matched++;
              
              // Update local item with real Shopify data
              const updateData = {
                shopifyId: shopifyProduct.id,
                shopifyVariantId: variant.id,
                shopifyHandle: shopifyProduct.handle,
                shopifyImageUrl: shopifyProduct.images[0]?.url || null,
                name: this.extractStrainName(shopifyProduct.title, variant.title),
                sku: variant.sku || matchingItem.sku,
                quantity: Math.max(variant.inventoryQuantity, 0),
                base_price: parseFloat(variant.price) || matchingItem.base_price,
                sale_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : matchingItem.sale_price,
                weight: this.determineWeight(variant.title, shopifyProduct.title, variant.weight, variant.weightUnit),
                images: shopifyProduct.images.map(img => img.url),
                status: variant.inventoryQuantity > 0 ? 'active' : 'out_of_stock',
                tier: this.extractTier(shopifyProduct.title, variant.title),
                updatedAt: new Date(),
              };

              await storage.updateItem(matchingItem.id, updateData);
              synced++;
              
              console.log(`Synced: ${variant.sku} -> ${matchingItem.id} (${variant.inventoryQuantity} units)`);
            }
          } catch (error) {
            errors.push({ 
              variant: variant.sku, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      }

      console.log(`Sync completed: ${synced} items synced, ${matched} items matched, ${errors.length} errors`);
      
      return { synced, matched, errors };

    } catch (error) {
      console.error('Sync with local inventory failed:', error);
      throw error;
    }
  }

  private findBestMatch(variant: any, product: any, localItems: any[]): any {
    // Try exact SKU match first
    if (variant.sku) {
      const skuMatch = localItems.find(item => item.sku === variant.sku);
      if (skuMatch) return skuMatch;
    }

    // Try fuzzy name matching
    const variantName = variant.title.toLowerCase();
    const productName = product.title.toLowerCase();
    
    for (const item of localItems) {
      const itemName = (item.name || '').toLowerCase();
      
      // Check if strain names match
      const extractedStrain = this.extractStrainName(productName, variantName).toLowerCase();
      if (itemName.includes(extractedStrain) || extractedStrain.includes(itemName)) {
        return item;
      }
      
      // Check for similar weights and types
      const weightMatch = this.weightsMatch(itemName, variantName) || this.weightsMatch(itemName, productName);
      if (weightMatch && this.strainsMatch(itemName, extractedStrain)) {
        return item;
      }
    }

    return null;
  }

  private extractStrainName(productTitle: string, variantTitle: string): string {
    // Extract actual strain name from Shopify product titles
    const combined = `${productTitle} ${variantTitle}`.toLowerCase();
    
    // Remove common cannabis terms to isolate strain name
    const cleanTitle = combined
      .replace(/thca?/gi, '')
      .replace(/hemp/gi, '')
      .replace(/flower/gi, '')
      .replace(/indoor|outdoor/gi, '')
      .replace(/smalls?|large|medium/gi, '')
      .replace(/bulk/gi, '')
      .replace(/classic|reserve|exotic|top\s*shelf|aa|aaa/gi, '')
      .replace(/\d+\s*(gram|g|oz|ounce|lb|pound)/gi, '')
      .replace(/[\-_]+/g, ' ')
      .trim();

    // Take the first meaningful words as strain name
    const words = cleanTitle.split(/\s+/).filter(word => word.length > 2);
    return words.slice(0, 2).join(' ').trim() || productTitle;
  }

  private determineWeight(variantTitle: string, productTitle: string, weight?: number, unit?: string): string {
    const combined = `${productTitle} ${variantTitle}`.toLowerCase();
    
    // Look for weight indicators in the text
    if (combined.includes('pound') || combined.includes('1 lb')) return '1 pound';
    if (combined.includes('half pound') || combined.includes('0.5 lb')) return 'half pound';
    if (combined.includes('quarter pound') || combined.includes('0.25 lb')) return 'quarter pound';
    if (combined.includes('ounce') || combined.includes('oz')) return '1 ounce';
    
    // Use Shopify weight data if available
    if (weight && unit) {
      if (unit === 'POUNDS') return weight === 1 ? '1 pound' : `${weight} pounds`;
      if (unit === 'OUNCES') return weight === 1 ? '1 ounce' : `${weight} ounces`;
      if (unit === 'GRAMS') return `${weight} grams`;
    }
    
    // Extract from text patterns
    const gramMatch = combined.match(/(\d+)\s*g(ram)?s?/);
    if (gramMatch) return `${gramMatch[1]} grams`;
    
    const ozMatch = combined.match(/(\d+)\s*(oz|ounce)/);
    if (ozMatch) return `${ozMatch[1]} ounce${parseInt(ozMatch[1]) > 1 ? 's' : ''}`;
    
    return 'Weight TBD';
  }

  private extractTier(productTitle: string, variantTitle: string): string {
    const combined = `${productTitle} ${variantTitle}`.toLowerCase();
    
    if (combined.includes('exotic')) return 'Exotic';
    if (combined.includes('top shelf')) return 'Top Shelf';
    if (combined.includes('aaa indoor')) return 'AAA Indoor';
    if (combined.includes('aa indoor')) return 'AA Indoor';
    if (combined.includes('classic reserve')) return 'Classic Reserve';
    
    return 'Standard';
  }

  private weightsMatch(text1: string, text2: string): boolean {
    const weights1 = this.extractWeights(text1);
    const weights2 = this.extractWeights(text2);
    return weights1.some(w1 => weights2.some(w2 => w1 === w2));
  }

  private strainsMatch(text1: string, text2: string): boolean {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    return words1.some(w1 => words2.some(w2 => w1.length > 3 && w2.length > 3 && w1.includes(w2)));
  }

  private extractWeights(text: string): string[] {
    const weights: string[] = [];
    const lower = text.toLowerCase();
    
    if (lower.includes('pound') || lower.includes('lb')) weights.push('pound');
    if (lower.includes('ounce') || lower.includes('oz')) weights.push('ounce');
    if (lower.includes('gram') || lower.includes('g ')) weights.push('gram');
    
    return weights;
  }
}

export const realShopifySync = new RealShopifySync();