import { log } from '../utils/logger.js';

interface ShopifyGraphQLVariant {
  id: string;
  title: string;
  sku: string;
  price: string;
  compareAtPrice?: string;
  inventoryQuantity: number;
  weight: number;
  weightUnit: string;
  inventoryItem: {
    id: string;
    tracked: boolean;
  };
}

interface ShopifyGraphQLProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  vendor: string;
  productType: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  variants: {
    edges: Array<{
      node: ShopifyGraphQLVariant;
    }>;
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText?: string;
        width: number;
        height: number;
      };
    }>;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  compareAtPriceRange: {
    minVariantCompareAtPrice?: {
      amount: string;
      currencyCode: string;
    };
    maxVariantCompareAtPrice?: {
      amount: string;
      currencyCode: string;
    };
  };
}

export class ShopifyGraphQLService {
  private shopifyDomain: string;
  private accessToken: string;
  private graphqlEndpoint: string;

  constructor() {
    this.shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    this.graphqlEndpoint = `https://${this.shopifyDomain}/admin/api/2023-10/graphql.json`;
  }

  private async executeGraphQLQuery(query: string, variables: any = {}) {
    try {
      if (!this.accessToken) {
        throw new Error('Shopify access token not configured');
      }

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const result = await response.json();

      if (result.errors) {
        log(`GraphQL errors: ${JSON.stringify(result.errors)}`, 'shopify-graphql');
        throw new Error(result.errors[0].message);
      }

      return result.data;
    } catch (error) {
      log(`GraphQL query failed: ${error}`, 'shopify-graphql');
      throw error;
    }
  }

  async getProductsWithPricingAndWeight(first: number = 50, after?: string) {
    const query = `
      query getProductsWithPricingAndWeight($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              description
              vendor
              productType
              status
              tags
              createdAt
              updatedAt
              variants(first: 10) {
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
                    inventoryItem {
                      id
                      tracked
                    }
                  }
                }
              }
              images(first: 5) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantCompareAtPrice {
                  amount
                  currencyCode
                }
                maxVariantCompareAtPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;

    return this.executeGraphQLQuery(query, { first, after });
  }

  async getAllProducts(): Promise<ShopifyGraphQLProduct[]> {
    let allProducts: ShopifyGraphQLProduct[] = [];
    let hasNextPage = true;
    let after: string | undefined;

    while (hasNextPage) {
      try {
        const data = await this.getProductsWithPricingAndWeight(50, after);
        const products = data.products.edges.map((edge: any) => edge.node);
        
        allProducts = allProducts.concat(products);
        
        hasNextPage = data.products.pageInfo.hasNextPage;
        after = data.products.pageInfo.endCursor;

        log(`Fetched ${products.length} products, total: ${allProducts.length}`, 'shopify-graphql');
        
        // Add a small delay to avoid rate limiting
        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        log(`Error fetching products batch: ${error}`, 'shopify-graphql');
        break;
      }
    }

    log(`Completed fetching ${allProducts.length} products from Shopify GraphQL`, 'shopify-graphql');
    return allProducts;
  }

  async getProductByHandle(handle: string) {
    const query = `
      query getProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          handle
          description
          vendor
          productType
          status
          tags
          createdAt
          updatedAt
          variants(first: 10) {
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
                inventoryItem {
                  id
                  tracked
                }
              }
            }
          }
          images(first: 5) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantCompareAtPrice {
              amount
              currencyCode
            }
            maxVariantCompareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQLQuery(query, { handle });
    return data.productByHandle;
  }

  async getInventoryLevels(inventoryItemIds: string[]) {
    const query = `
      query getInventoryLevels($inventoryItemIds: [ID!]!) {
        inventoryItems(ids: $inventoryItemIds) {
          edges {
            node {
              id
              sku
              tracked
              inventoryLevels(first: 10) {
                edges {
                  node {
                    id
                    available
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
    `;

    return this.executeGraphQLQuery(query, { inventoryItemIds });
  }

  // Transform Shopify GraphQL data to our internal format
  transformProductData(shopifyProduct: ShopifyGraphQLProduct) {
    const primaryVariant = shopifyProduct.variants.edges[0]?.node;
    const allVariants = shopifyProduct.variants.edges.map(edge => edge.node);

    // Extract pricing information
    const price = parseFloat(shopifyProduct.priceRange.minVariantPrice.amount);
    const maxPrice = parseFloat(shopifyProduct.priceRange.maxVariantPrice.amount);
    const compareAtPrice = shopifyProduct.compareAtPriceRange.minVariantCompareAtPrice 
      ? parseFloat(shopifyProduct.compareAtPriceRange.minVariantCompareAtPrice.amount)
      : null;

    // Extract weight information
    const weight = primaryVariant?.weight || 0;
    const weightUnit = primaryVariant?.weightUnit || 'GRAMS';

    // Extract strain and tier information from title
    const strainInfo = this.extractStrainInfo(shopifyProduct.title);
    const tierInfo = this.extractTierInfo(shopifyProduct.title, shopifyProduct.tags);

    return {
      shopifyId: shopifyProduct.id,
      title: shopifyProduct.title,
      handle: shopifyProduct.handle,
      description: shopifyProduct.description,
      vendor: shopifyProduct.vendor,
      productType: shopifyProduct.productType,
      status: shopifyProduct.status,
      tags: shopifyProduct.tags,
      
      // Pricing data
      price,
      maxPrice: price !== maxPrice ? maxPrice : null,
      compareAtPrice,
      hasDiscount: compareAtPrice && compareAtPrice > price,
      discountPercentage: compareAtPrice && compareAtPrice > price 
        ? ((compareAtPrice - price) / compareAtPrice) * 100 
        : null,
      currency: shopifyProduct.priceRange.minVariantPrice.currencyCode || 'USD',

      // Weight data  
      weight,
      weightUnit,
      weightInGrams: this.convertToGrams(weight, weightUnit),
      
      // Inventory data
      inventoryQuantity: primaryVariant?.inventoryQuantity || 0,
      sku: primaryVariant?.sku || '',
      
      // Strain and tier information
      strain: strainInfo.strain,
      thcaPercentage: strainInfo.thcaPercentage,
      qualityTier: tierInfo.tier,
      sizeCategory: tierInfo.sizeCategory,
      
      // Variants
      variants: allVariants.map(variant => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        price: parseFloat(variant.price),
        compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
        inventoryQuantity: variant.inventoryQuantity,
        weight: variant.weight,
        weightUnit: variant.weightUnit,
      })),
      
      // Images
      images: shopifyProduct.images.edges.map(edge => ({
        id: edge.node.id,
        url: edge.node.url,
        altText: edge.node.altText,
        width: edge.node.width,
        height: edge.node.height,
      })),
      
      // Timestamps
      createdAt: shopifyProduct.createdAt,
      updatedAt: shopifyProduct.updatedAt,
    };
  }

  private extractStrainInfo(title: string) {
    // Extract strain name (everything before " - " or common separators)
    const strainMatch = title.match(/^([^-]+?)(?:\s*-\s*|$)/);
    const strain = strainMatch ? strainMatch[1].trim() : title;

    // Extract THCa percentage
    const thcaMatch = title.match(/(\d+(?:\.\d+)?)\s*%?\s*thca?/i);
    const thcaPercentage = thcaMatch ? parseFloat(thcaMatch[1]) : null;

    return { strain, thcaPercentage };
  }

  private extractTierInfo(title: string, tags: string[]) {
    const titleLower = title.toLowerCase();
    const tagsLower = tags.map(tag => tag.toLowerCase());
    const combinedText = [titleLower, ...tagsLower].join(' ');

    // Quality tiers
    let tier = 'Standard';
    if (combinedText.includes('exotic')) tier = 'Exotic';
    else if (combinedText.includes('top shelf')) tier = 'Top Shelf';
    else if (combinedText.includes('aaa indoor') || combinedText.includes('aaa+')) tier = 'AAA Indoor';
    else if (combinedText.includes('aa indoor') || combinedText.includes('aa+')) tier = 'AA Indoor';
    else if (combinedText.includes('classic reserve')) tier = 'Classic Reserve';

    // Size categories
    let sizeCategory = 'Regular';
    if (combinedText.includes('smalls')) sizeCategory = 'Smalls';
    else if (combinedText.includes('mediums')) sizeCategory = 'Mediums';
    else if (combinedText.includes('large')) sizeCategory = 'Large';

    return { tier, sizeCategory };
  }

  private convertToGrams(weight: number, unit: string): number {
    switch (unit.toUpperCase()) {
      case 'GRAMS': return weight;
      case 'KILOGRAMS': return weight * 1000;
      case 'OUNCES': return weight * 28.3495;
      case 'POUNDS': return weight * 453.592;
      default: return weight;
    }
  }
}

export const shopifyGraphQL = new ShopifyGraphQLService();