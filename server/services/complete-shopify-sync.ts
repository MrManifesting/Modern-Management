/**
 * Complete Shopify Inventory Sync - Populate all items with real data
 */

import { IStorage } from '../storage';

export async function completeShopifySync(storage: IStorage): Promise<{
  totalShopifyProducts: number;
  totalInventoryItems: number;
  matched: number;
  updated: number;
  withQuantity: number;
  withImages: number;
  errors: string[];
}> {
  const results = {
    totalShopifyProducts: 0,
    totalInventoryItems: 0,
    matched: 0,
    updated: 0,
    withQuantity: 0,
    withImages: 0,
    errors: [] as string[]
  };

  try {
    console.log('Starting complete Shopify sync...');

    // Get all inventory items
    const items = await storage.getItems();
    results.totalInventoryItems = items.length;
    console.log(`Found ${items.length} inventory items to sync`);

    // Fetch ALL Shopify products with pagination
    const shopifyProducts = await fetchAllShopifyProductsComplete();
    results.totalShopifyProducts = shopifyProducts.length;
    console.log(`Fetched ${shopifyProducts.length} products from MrListersCurations store`);

    // Create comprehensive lookup maps
    const productsByTitle = new Map<string, any>();
    const productsBySku = new Map<string, any>();
    const productsByHandle = new Map<string, any>();

    for (const product of shopifyProducts) {
      // Index by normalized title
      if (product.title) {
        const normalizedTitle = normalizeProductTitle(product.title);
        productsByTitle.set(normalizedTitle, product);
      }

      // Index by handle
      if (product.handle) {
        productsByHandle.set(product.handle, product);
      }

      // Index by variant SKUs
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.sku) {
            productsBySku.set(variant.sku, { product, variant });
          }
        }
      }
    }

    console.log(`Created lookup maps: ${productsByTitle.size} titles, ${productsBySku.size} SKUs, ${productsByHandle.size} handles`);

    // Process each inventory item
    for (const item of items) {
      try {
        let shopifyMatch: { product: any; variant?: any } | null = null;

        // 1. Try exact SKU match first (most reliable)
        if (item.sku && productsBySku.has(item.sku)) {
          shopifyMatch = productsBySku.get(item.sku)!;
        }

        // 2. Try exact title match
        if (!shopifyMatch && item.name) {
          const normalizedName = normalizeProductTitle(item.name);
          const product = productsByTitle.get(normalizedName);
          if (product && product.variants && product.variants.length > 0) {
            shopifyMatch = { product, variant: product.variants[0] };
          }
        }

        // 3. Try handle-based matching
        if (!shopifyMatch && item.name) {
          const handle = nameToHandle(item.name);
          const product = productsByHandle.get(handle);
          if (product && product.variants && product.variants.length > 0) {
            shopifyMatch = { product, variant: product.variants[0] };
          }
        }

        // 4. Try fuzzy matching on title keywords
        if (!shopifyMatch && item.name) {
          const nameKeywords = item.name.toLowerCase().split(' ').filter(word => word.length > 3);
          for (const [title, product] of productsByTitle) {
            const titleKeywords = title.split(' ');
            const matchCount = nameKeywords.filter(keyword => 
              titleKeywords.some(titleWord => titleWord.includes(keyword))
            ).length;
            
            if (matchCount >= 2 && product.variants && product.variants.length > 0) {
              shopifyMatch = { product, variant: product.variants[0] };
              break;
            }
          }
        }

        if (shopifyMatch) {
          results.matched++;
          const { product, variant } = shopifyMatch;
          
          const updates: any = {};
          let hasUpdates = false;

          // Always update quantity from Shopify
          if (variant && typeof variant.inventory_quantity === 'number') {
            updates.quantity = variant.inventory_quantity;
            hasUpdates = true;
            if (variant.inventory_quantity > 0) {
              results.withQuantity++;
            }
          }

          // Update price from variant
          if (variant && variant.price) {
            const shopifyPrice = parseFloat(variant.price);
            if (shopifyPrice > 0) {
              updates.basePrice = shopifyPrice.toString();
              hasUpdates = true;
            }
          }

          // Update images from product
          if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            const imageUrls = product.images.map((img: any) => img.src).filter(Boolean);
            if (imageUrls.length > 0) {
              updates.images = imageUrls;
              hasUpdates = true;
              results.withImages++;
            }
          }

          // Store Shopify ID for future reference
          if (variant && variant.id) {
            updates.shopifyId = variant.id.toString();
            hasUpdates = true;
          }

          // Update item status to available if we have quantity
          if (variant && variant.inventory_quantity > 0) {
            updates.status = 'available';
            hasUpdates = true;
          }

          if (hasUpdates) {
            await storage.updateItem(item.id, updates);
            results.updated++;
            
            const details = [];
            if (updates.quantity !== undefined) details.push(`qty: ${updates.quantity}`);
            if (updates.basePrice) details.push(`price: $${updates.basePrice}`);
            if (updates.images) details.push(`images: ${updates.images.length}`);
            
            console.log(`✓ Updated "${item.name}": ${details.join(', ')}`);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to sync ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`\n=== SYNC COMPLETE ===`);
    console.log(`Total items: ${results.totalInventoryItems}`);
    console.log(`Shopify products: ${results.totalShopifyProducts}`);
    console.log(`Matched: ${results.matched}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`With quantities: ${results.withQuantity}`);
    console.log(`With images: ${results.withImages}`);
    console.log(`Errors: ${results.errors.length}`);

    return results;

  } catch (error) {
    const errorMsg = `Complete sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    results.errors.push(errorMsg);
    console.error(errorMsg);
    return results;
  }
}

async function fetchAllShopifyProductsComplete(): Promise<any[]> {
  const shopifyStore = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!shopifyStore || !accessToken) {
    throw new Error('Shopify credentials not configured');
  }

  const allProducts: any[] = [];
  let page = 1;
  const limit = 250;

  while (true) {
    try {
      const url = `https://${shopifyStore}/admin/api/2023-10/products.json?limit=${limit}&page=${page}&fields=id,title,handle,variants,images`;
      
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
        break;
      }

      allProducts.push(...products);
      console.log(`Page ${page}: Fetched ${products.length} products, total: ${allProducts.length}`);
      
      // If we got fewer than the limit, we're done
      if (products.length < limit) {
        break;
      }
      
      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      console.error('Error fetching products:', error);
      break;
    }
  }

  return allProducts;
}

function normalizeProductTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameToHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}