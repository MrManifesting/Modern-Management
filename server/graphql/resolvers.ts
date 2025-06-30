import { storage } from '../storage.js';

const log = (message: string, context: string = 'graphql') => {
  console.log(`${new Date().toLocaleTimeString()} [${context}] ${message}`);
};

// Helper function to get live Shopify data
async function getShopifyProducts() {
  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
    if (!accessToken) {
      log('Shopify access token not configured', 'shopify-api');
      return [];
    }

    const response = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&fields=id,title,handle,vendor,product_type,status,variants,images,tags,created_at,updated_at`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.products || [];
    } else {
      log(`Shopify API error: ${response.status}`, 'shopify-api');
      return [];
    }
  } catch (error) {
    log(`Shopify fetch error: ${error}`, 'shopify-api');
    return [];
  }
}

// Helper function to get live inventory levels from Shopify
async function getShopifyInventoryLevels(inventoryItemIds: string[]) {
  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
    if (!accessToken || inventoryItemIds.length === 0) {
      return {};
    }

    const inventoryLevels: Record<string, any> = {};
    
    // Fetch inventory levels in batches
    for (let i = 0; i < inventoryItemIds.length; i += 50) {
      const batch = inventoryItemIds.slice(i, i + 50);
      const idsParam = batch.join(',');
      
      const response = await fetch(`https://${shopifyDomain}/admin/api/2023-10/inventory_levels.json?inventory_item_ids=${idsParam}`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        data.inventory_levels?.forEach((level: any) => {
          inventoryLevels[level.inventory_item_id] = level;
        });
      }
    }
    
    return inventoryLevels;
  } catch (error) {
    log(`Inventory levels fetch error: ${error}`, 'shopify-api');
    return {};
  }
}

// Helper function to generate product links
function generateProductLinks(item: any, shopifyProduct?: any) {
  const storeDomain = 'gold-standard-cbd.myshopify.com';
  const storeHandle = shopifyProduct?.handle || item.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  return {
    shopifyStore: `https://${storeDomain.replace('.myshopify.com', '.com')}/products/${storeHandle}`,
    shopifyAdmin: `https://admin.shopify.com/store/gold-standard-cbd/products/${shopifyProduct?.id || '?query=' + encodeURIComponent(item.sku || item.name)}`,
    googleSheets: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID || '1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU'}/edit#gid=0&search=${encodeURIComponent(item.sku || item.name)}`,
    coaCertificate: item.name ? `https://gold-standard-cbd.com/coa/${storeHandle}` : null,
    mediaDownload: item.sku ? `https://gold-standard-cbd.com/media/download/${item.sku}` : null,
    directPurchase: `https://${storeDomain.replace('.myshopify.com', '.com')}/products/${storeHandle}?variant=${shopifyProduct?.variants?.[0]?.id || ''}`
  };
}

// Helper function to process media information
function processMediaInfo(item: any, shopifyProduct?: any) {
  const imageUrls: string[] = [];
  let thumbnailUrl = null;

  // Process local images - check multiple image fields
  if (item.images && typeof item.images === 'string') {
    try {
      const localImages = JSON.parse(item.images);
      if (Array.isArray(localImages)) {
        imageUrls.push(...localImages);
      } else if (typeof localImages === 'string') {
        imageUrls.push(localImages);
      }
    } catch {
      if (item.images) imageUrls.push(item.images);
    }
  }
  
  // Check additional image fields
  if (item.image_url) {
    imageUrls.push(item.image_url);
  }
  if (item.imageUrl) {
    imageUrls.push(item.imageUrl);
  }
  if (item.thumbnail_url) {
    imageUrls.push(item.thumbnail_url);
  }

  // Process Shopify images
  if (shopifyProduct?.images) {
    shopifyProduct.images.forEach((img: any) => {
      if (img.src) imageUrls.push(img.src);
    });
  }

  // Set thumbnail - prioritize Shopify images first, then local images
  if (shopifyProduct?.images?.[0]?.src) {
    thumbnailUrl = shopifyProduct.images[0].src;
  } else if (imageUrls.length > 0) {
    thumbnailUrl = imageUrls[0];
  } else if (item.image_url) {
    thumbnailUrl = item.image_url;
    imageUrls.push(item.image_url);
  } else {
    // Generate cannabis strain placeholder based on product name
    const strainName = item.name?.toLowerCase() || '';
    if (strainName.includes('flower') || strainName.includes('thca') || strainName.includes('cannabis')) {
      // Use a cannabis leaf SVG placeholder
      thumbnailUrl = `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#22c55e"/>
          <path d="M32 8c-4 0-8 4-8 8s4 8 8 8 8-4 8-8-4-8-8-8zm0 20c-8 0-16 4-16 12s8 12 16 12 16-4 16-12-8-12-16-12z" fill="white"/>
          <text x="32" y="52" text-anchor="middle" fill="white" font-size="8" font-family="Arial">THCa</text>
        </svg>
      `).toString('base64')}`;
    }
  }

  // Ensure URLs are properly formatted
  const processedUrls = imageUrls.map(url => {
    if (url && !url.startsWith('http')) {
      return `/uploads/${url}`;
    }
    return url;
  }).filter(Boolean);

  // Format thumbnail URL properly (skip formatting for data URLs and HTTP URLs)
  if (thumbnailUrl && !thumbnailUrl.startsWith('http') && !thumbnailUrl.startsWith('data:')) {
    thumbnailUrl = `/uploads/${thumbnailUrl}`;
  }

  return {
    thumbnailUrl,
    imageUrls: processedUrls,
    hasImages: processedUrls.length > 0 || !!thumbnailUrl,
    imageCount: processedUrls.length,
    primaryImage: processedUrls.length > 0 ? {
      url: processedUrls[0],
      thumbnail: processedUrls[0],
      alt: `${item.name || 'Product'} - Primary Image`,
      width: null,
      height: null
    } : null,
    gallery: processedUrls.map((url, index) => ({
      url,
      thumbnail: url,
      alt: `${item.name || 'Product'} - Image ${index + 1}`,
      width: null,
      height: null
    }))
  };
}

// Helper function to calculate pricing
function calculatePricing(item: any, shopifyProduct?: any) {
  const basePrice = parseFloat(item.base_price || '0');
  const salePrice = parseFloat(item.sale_price || '0');
  const costPrice = parseFloat(item.cost_price || '0');
  const wholesalePrice = parseFloat(item.wholesale_price || '0');
  
  // Get Shopify pricing if available
  let shopifyPrice = 0;
  if (shopifyProduct?.variants?.[0]?.price) {
    shopifyPrice = parseFloat(shopifyProduct.variants[0].price);
  }

  const displayPrice = salePrice || basePrice || shopifyPrice || costPrice || 0;
  const originalPrice = basePrice || shopifyPrice || 0;
  const hasDiscount = salePrice > 0 && originalPrice > salePrice;
  const discountPercentage = hasDiscount ? ((originalPrice - salePrice) / originalPrice) * 100 : 0;

  return {
    basePrice: basePrice > 0 ? basePrice : null,
    salePrice: salePrice > 0 ? salePrice : null,
    costPrice: costPrice > 0 ? costPrice : null,
    wholesalePrice: wholesalePrice > 0 ? wholesalePrice : null,
    displayPrice,
    currency: 'USD',
    priceRange: displayPrice > 0 ? `$${displayPrice.toFixed(2)}` : 'Price on request',
    hasDiscount,
    discountPercentage: hasDiscount ? discountPercentage : null
  };
}

// Helper function to determine availability
function calculateAvailability(item: any, shopifyInventory?: any) {
  const quantity = item.quantity || 0;
  const shopifyQty = shopifyInventory?.available || 0;
  const actualQuantity = Math.max(quantity, shopifyQty);
  
  const inStock = actualQuantity > 0;
  const lowStock = actualQuantity > 0 && actualQuantity <= 5;
  
  let stockLevel = 'Out of Stock';
  if (actualQuantity > 20) stockLevel = 'In Stock';
  else if (actualQuantity > 5) stockLevel = 'Limited Stock';
  else if (actualQuantity > 0) stockLevel = 'Low Stock';

  return {
    inStock,
    lowStock,
    stockLevel,
    restockDate: null,
    preOrderAvailable: false,
    estimatedDelivery: inStock ? '2-3 business days' : null
  };
}

export const resolvers = {
  Query: {
    inventory: async () => {
      try {
        log('Fetching complete inventory with Shopify integration');
        
        // Get local inventory
        const localItems = await storage.getItems();
        
        // Get Shopify products
        const shopifyProducts = await getShopifyProducts();
        
        // Create a map of Shopify products by SKU and title for matching
        const shopifyMap = new Map();
        shopifyProducts.forEach((product: any) => {
          // Map by product title
          shopifyMap.set(product.title.toLowerCase(), product);
          
          // Map by variant SKUs
          product.variants?.forEach((variant: any) => {
            if (variant.sku) {
              shopifyMap.set(variant.sku.toLowerCase(), product);
            }
          });
        });

        // Get inventory item IDs for live quantity lookup
        const inventoryItemIds = shopifyProducts.flatMap((p: any) => 
          p.variants?.map((v: any) => v.inventory_item_id).filter(Boolean) || []
        );
        
        const inventoryLevels = await getShopifyInventoryLevels(inventoryItemIds);

        // Process and combine data
        const processedItems = localItems.map((item: any) => {
          // Enhanced Shopify product matching - try multiple strategies
          let shopifyProduct = shopifyMap.get(item.name?.toLowerCase()) || 
                              shopifyMap.get(item.sku?.toLowerCase());
          
          // Try partial name matching if no exact match
          if (!shopifyProduct && item.name) {
            const itemNameWords = item.name.toLowerCase().split(/[-\s]+/);
            for (const [shopifyName, product] of shopifyMap.entries()) {
              if (itemNameWords.some(word => word.length > 3 && shopifyName.includes(word))) {
                shopifyProduct = product;
                break;
              }
            }
          }
          
          // Get live inventory for this product
          const variant = shopifyProduct?.variants?.[0];
          const inventoryLevel = variant?.inventory_item_id ? inventoryLevels[variant.inventory_item_id] : null;

          return {
            id: item.id.toString(),
            name: item.name || 'Unnamed Product',
            sku: item.sku,
            description: item.description,
            category: item.category,
            brand: item.brand,
            status: item.status || 'draft',
            quantity: Math.max(item.quantity || 0, inventoryLevel?.available || 0),
            weight: item.weight,
            pricing: calculatePricing(item, shopifyProduct),
            media: processMediaInfo(item, shopifyProduct),
            links: generateProductLinks(item, shopifyProduct),
            shopifyData: shopifyProduct ? {
              productId: shopifyProduct.id?.toString(),
              variantId: variant?.id?.toString(),
              handle: shopifyProduct.handle,
              inventoryItemId: variant?.inventory_item_id,
              lastSyncDate: new Date().toISOString(),
              syncStatus: 'synced'
            } : null,
            availability: calculateAvailability(item, inventoryLevel),
            lastUpdated: item.updatedAt || item.createdAt || new Date().toISOString()
          };
        });

        // Sort by priority: 1) Pound variants, 2) active items with pricing, 3) quantity, 4) newest
        processedItems.sort((a, b) => {
          // Helper function to check if item is a pound variant
          const isPoundVariant = (item: any) => {
            const searchText = `${item.name || ''} ${item.weight || ''} ${item.description || ''}`.toLowerCase();
            return /(\b1\s*pound\b|\b1pound\b|\bone\s*pound\b|\bpound\b)/i.test(searchText);
          };
          
          const aIsPound = isPoundVariant(a);
          const bIsPound = isPoundVariant(b);
          
          // First priority: pound variants at the top
          if (aIsPound && !bIsPound) return -1;
          if (!aIsPound && bIsPound) return 1;
          
          // Second priority: active items with pricing
          const aIsActive = a.status === 'active' && a.pricing.displayPrice > 0;
          const bIsActive = b.status === 'active' && b.pricing.displayPrice > 0;
          
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          
          // Third priority: items with quantity
          if (a.quantity > 0 && b.quantity === 0) return -1;
          if (a.quantity === 0 && b.quantity > 0) return 1;
          
          // Fourth priority: highest quantity first
          if (a.quantity !== b.quantity) return b.quantity - a.quantity;
          
          // Final priority: newest first (highest ID)
          return parseInt(b.id) - parseInt(a.id);
        });

        log(`Processed ${processedItems.length} inventory items with Shopify data - POUND VARIANTS PRIORITIZED`);
        return processedItems;
      } catch (error) {
        log(`Inventory fetch error: ${error}`, 'error');
        return [];
      }
    },

    inventoryItem: async (_: any, { id }: { id: string }) => {
      try {
        const item = await storage.getItem(parseInt(id));
        if (!item) return null;

        // Get Shopify data for this specific item
        const shopifyProducts = await getShopifyProducts();
        const shopifyProduct = shopifyProducts.find((p: any) => 
          p.title.toLowerCase() === item.name?.toLowerCase() ||
          p.variants?.some((v: any) => v.sku?.toLowerCase() === item.sku?.toLowerCase())
        );

        return {
          id: item.id.toString(),
          name: item.name || 'Unnamed Product',
          sku: item.sku,
          description: item.description,
          category: item.category,
          brand: item.brand,
          status: item.status || 'draft',
          quantity: item.quantity || 0,
          weight: item.weight,
          pricing: calculatePricing(item, shopifyProduct),
          media: processMediaInfo(item, shopifyProduct),
          links: generateProductLinks(item, shopifyProduct),
          shopifyData: shopifyProduct ? {
            productId: shopifyProduct.id?.toString(),
            variantId: shopifyProduct.variants?.[0]?.id?.toString(),
            handle: shopifyProduct.handle,
            inventoryItemId: shopifyProduct.variants?.[0]?.inventory_item_id,
            lastSyncDate: new Date().toISOString(),
            syncStatus: 'synced'
          } : null,
          availability: calculateAvailability(item),
          lastUpdated: item.updatedAt || item.createdAt || new Date().toISOString()
        };
      } catch (error) {
        log(`Single item fetch error: ${error}`, 'error');
        return null;
      }
    },

    availableInventory: async () => {
      try {
        const allInventory = await resolvers.Query.inventory();
        const availableItems = allInventory.filter((item: any) => 
          item.availability.inStock && 
          item.pricing.displayPrice > 0
        );
        
        // Apply same pound prioritization to available inventory
        availableItems.sort((a, b) => {
          const isPoundVariant = (item: any) => {
            const searchText = `${item.name || ''} ${item.weight || ''} ${item.description || ''}`.toLowerCase();
            return /(\b1\s*pound\b|\b1pound\b|\bone\s*pound\b|\bpound\b)/i.test(searchText);
          };
          
          const aIsPound = isPoundVariant(a);
          const bIsPound = isPoundVariant(b);
          
          // First priority: pound variants at the top
          if (aIsPound && !bIsPound) return -1;
          if (!aIsPound && bIsPound) return 1;
          
          // Then by quantity
          return b.quantity - a.quantity;
        });
        
        return availableItems;
      } catch (error) {
        log(`Available inventory fetch error: ${error}`, 'error');
        return [];
      }
    },

    shopifyInventory: async () => {
      try {
        log('Fetching live Shopify inventory data');
        
        const shopifyProducts = await getShopifyProducts();
        
        // Get all inventory item IDs
        const inventoryItemIds = shopifyProducts.flatMap((p: any) => 
          p.variants?.map((v: any) => v.inventory_item_id).filter(Boolean) || []
        );
        
        const inventoryLevels = await getShopifyInventoryLevels(inventoryItemIds);

        const processedShopifyItems = shopifyProducts.map((product: any) => {
          const variants = product.variants?.map((variant: any) => {
            const inventoryLevel = inventoryLevels[variant.inventory_item_id];
            
            return {
              id: variant.id?.toString(),
              title: variant.title,
              sku: variant.sku,
              price: parseFloat(variant.price || '0'),
              compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
              inventoryQuantity: inventoryLevel?.available || variant.inventory_quantity || 0,
              inventoryManagement: variant.inventory_management,
              inventoryPolicy: variant.inventory_policy,
              weight: variant.weight ? parseFloat(variant.weight) : null,
              weightUnit: variant.weight_unit
            };
          }) || [];

          const images = product.images?.map((img: any, index: number) => ({
            id: img.id?.toString(),
            src: img.src,
            altText: img.alt || `${product.title} - Image ${index + 1}`,
            width: img.width,
            height: img.height,
            position: img.position || index + 1
          })) || [];

          const prices = variants.map(v => v.price).filter(p => p > 0);
          const compareAtPrices = variants.map(v => v.compareAtPrice).filter(Boolean);
          
          const totalQuantity = variants.reduce((sum, v) => sum + (v.inventoryQuantity || 0), 0);

          return {
            id: product.id?.toString(),
            shopifyId: product.id?.toString(),
            title: product.title,
            handle: product.handle,
            vendor: product.vendor,
            productType: product.product_type,
            status: product.status,
            variants,
            images,
            pricing: {
              minPrice: Math.min(...prices) || 0,
              maxPrice: Math.max(...prices) || 0,
              compareAtMinPrice: compareAtPrices.length > 0 ? Math.min(...compareAtPrices) : null,
              compareAtMaxPrice: compareAtPrices.length > 0 ? Math.max(...compareAtPrices) : null,
              currency: 'USD'
            },
            links: {
              storefront: `https://gold-standard-cbd.com/products/${product.handle}`,
              admin: `https://admin.shopify.com/store/gold-standard-cbd/products/${product.id}`,
              api: `https://gold-standard-cbd.myshopify.com/admin/api/2023-10/products/${product.id}.json`
            },
            inventory: {
              totalQuantity,
              availableQuantity: totalQuantity,
              committedQuantity: 0,
              onHandQuantity: totalQuantity
            },
            tags: product.tags ? product.tags.split(',').map((tag: string) => tag.trim()) : [],
            createdAt: product.created_at,
            updatedAt: product.updated_at
          };
        });

        log(`Processed ${processedShopifyItems.length} Shopify products with live inventory`);
        return processedShopifyItems;
      } catch (error) {
        log(`Shopify inventory fetch error: ${error}`, 'error');
        return [];
      }
    }
  }
};