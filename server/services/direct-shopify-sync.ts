/**
 * Direct Shopify Sync - Pull real quantities and images
 */

import { IStorage } from '../storage';

export async function syncInventoryFromShopify(storage: IStorage): Promise<{
  totalProducts: number;
  matched: number;
  updated: number;
  errors: string[];
}> {
  const results = {
    totalProducts: 0,
    matched: 0,
    updated: 0,
    errors: [] as string[]
  };

  try {
    // Get all inventory items
    const items = await storage.getItems();
    console.log(`Starting sync for ${items.length} inventory items`);

    // Fetch all Shopify products
    const shopifyProducts = await fetchAllShopifyProducts();
    results.totalProducts = shopifyProducts.length;
    console.log(`Fetched ${shopifyProducts.length} products from Shopify`);

    // Create lookup maps
    const productsByTitle = new Map<string, any>();
    const productsBySku = new Map<string, any>();

    shopifyProducts.forEach(product => {
      // Index by normalized title
      const normalizedTitle = normalizeTitle(product.title);
      productsByTitle.set(normalizedTitle, product);

      // Index by SKU
      if (product.variants) {
        product.variants.forEach((variant: any) => {
          if (variant.sku) {
            productsBySku.set(variant.sku, { product, variant });
          }
        });
      }
    });

    console.log(`Created lookup maps: ${productsByTitle.size} titles, ${productsBySku.size} SKUs`);

    // Sync each item
    for (const item of items) {
      try {
        let shopifyMatch: { product: any; variant?: any } | null = null;

        // Try matching by SKU first
        if (item.sku && productsBySku.has(item.sku)) {
          shopifyMatch = productsBySku.get(item.sku)!;
        }

        // Try matching by title
        if (!shopifyMatch && item.name) {
          const normalizedName = normalizeTitle(item.name);
          const product = productsByTitle.get(normalizedName);
          if (product && product.variants && product.variants.length > 0) {
            shopifyMatch = { product, variant: product.variants[0] };
          }
          
          // Try partial matches for similar products
          if (!shopifyMatch) {
            for (const [title, product] of productsByTitle) {
              if (title.includes(normalizedName.split(' ')[0]) || normalizedName.includes(title.split(' ')[0])) {
                if (product && product.variants && product.variants.length > 0) {
                  shopifyMatch = { product, variant: product.variants[0] };
                  break;
                }
              }
            }
          }
        }

        if (shopifyMatch) {
          results.matched++;
          const { product, variant } = shopifyMatch;
          
          const updates: any = {};
          let hasUpdates = false;

          // Update quantity - always sync real Shopify quantities
          if (variant && typeof variant.inventory_quantity === 'number') {
            const shopifyQty = variant.inventory_quantity;
            // Update quantity regardless of current value to ensure sync with live store
            updates.quantity = shopifyQty;
            hasUpdates = true;
          }

          // Update price
          if (variant && variant.price) {
            const shopifyPrice = parseFloat(variant.price);
            const currentPrice = typeof item.basePrice === 'string' ? parseFloat(item.basePrice) : (item.basePrice || 0);
            if (Math.abs(currentPrice - shopifyPrice) > 0.01) {
              updates.basePrice = shopifyPrice.toString();
              hasUpdates = true;
            }
          }

          // Update images
          if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            const imageUrls = product.images.map((img: any) => img.src).filter(Boolean);
            if (imageUrls.length > 0) {
              updates.images = imageUrls;
              hasUpdates = true;
            }
          }

          // Store Shopify ID
          if (variant && variant.id && !item.shopifyId) {
            updates.shopifyId = variant.id.toString();
            hasUpdates = true;
          }

          if (hasUpdates) {
            await storage.updateItem(item.id, updates);
            results.updated++;
            console.log(`Updated ${item.name}: qty=${updates.quantity || 'unchanged'}, images=${updates.images?.length || 0}, price=$${updates.basePrice || 'unchanged'}`);
          }
        }
      } catch (error) {
        const msg = `Failed to sync ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(msg);
        console.error(msg);
      }
    }

    console.log(`Sync complete: ${results.matched} matched, ${results.updated} updated`);
    return results;

  } catch (error) {
    const msg = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    results.errors.push(msg);
    console.error(msg);
    return results;
  }
}

async function fetchAllShopifyProducts(): Promise<any[]> {
  const shopifyStore = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!shopifyStore || !accessToken) {
    throw new Error('Shopify credentials not configured');
  }

  const allProducts: any[] = [];
  let hasMore = true;
  let sinceId = 0;

  while (hasMore) {
    try {
      const url = `https://${shopifyStore}/admin/api/2023-10/products.json?limit=250&since_id=${sinceId}&fields=id,title,handle,variants,images`;
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Shopify API error: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const products = data.products || [];
      
      if (products.length === 0) {
        hasMore = false;
      } else {
        allProducts.push(...products);
        sinceId = products[products.length - 1].id;
        console.log(`Fetched ${products.length} products, total: ${allProducts.length}`);
        
        // Continue until we have all products
        if (products.length < 250) {
          hasMore = false;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      hasMore = false;
    }
  }

  return allProducts;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}