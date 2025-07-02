// Direct Shopify pricing fetch service

interface ShopifyVariant {
  id: number;
  price: string;
  sku?: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: ShopifyVariant[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface ProductData {
  price: number;
  title: string;
  handle: string;
  shopifyId: number;
  variantId: number;
}

type PricingData = Record<string, ProductData>;

export async function getShopifyPricing(): Promise<PricingData> {
  const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  
  if (!SHOPIFY_ACCESS_TOKEN) {
    console.log('No Shopify access token available');
    return {};
  }

  try {
    console.log(`Fetching live pricing from ${SHOPIFY_STORE}...`);
    
    const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=250`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Shopify API error: ${response.status} ${response.statusText}`);
      return {};
    }

    const data: ShopifyProductsResponse = await response.json();
    const products = data.products || [];
    
    console.log(`Retrieved ${products.length} products with live pricing from Shopify`);
    
    // Map products with pricing data by SKU and title
    const pricingData: PricingData = {};
    products.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          const productData: ProductData = {
            price: parseFloat(variant.price),
            title: product.title,
            handle: product.handle,
            shopifyId: product.id,
            variantId: variant.id
          };
          
          // Index by SKU if available
          if (variant.sku && variant.price) {
            pricingData[variant.sku] = productData;
          }
          
          // Also index by product title for items without SKUs
          if (variant.price) {
            pricingData[product.title] = productData;
          }
        });
      }
    });
    
    console.log(`Processed pricing for ${Object.keys(pricingData).length} SKUs`);
    return pricingData;
    
  } catch (error) {
    console.error('Error fetching Shopify pricing:', error);
    return {};
  }
}