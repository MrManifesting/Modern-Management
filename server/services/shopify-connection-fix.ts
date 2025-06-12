/**
 * Enhanced Shopify Connection Service
 * Handles authentication and API connectivity issues
 */

import fetch from 'node-fetch';

interface ShopifyConnectionResult {
  success: boolean;
  store?: {
    name: string;
    domain: string;
    email: string;
    currency: string;
  };
  error?: string;
  diagnostics?: any;
}

export class ShopifyConnectionService {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    const store = process.env.SHOPIFY_STORE || 'mrlisterscurations';
    const cleanStore = store.replace('.myshopify.com', '');
    
    this.baseUrl = `https://${cleanStore}.myshopify.com/admin/api/2023-10`;
    this.headers = {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async testConnection(): Promise<ShopifyConnectionResult> {
    try {
      if (!this.headers['X-Shopify-Access-Token']) {
        return {
          success: false,
          error: 'SHOPIFY_ACCESS_TOKEN environment variable is required'
        };
      }

      console.log(`Testing direct fetch to: ${this.baseUrl}/shop.json`);
      
      const response = await fetch(`${this.baseUrl}/shop.json`, {
        method: 'GET',
        headers: this.headers,
        timeout: 10000,
        redirect: 'manual' // Don't follow redirects automatically
      });

      console.log(`Response status: ${response.status}, redirect: ${response.headers.get('location')}`);

      if (response.status === 301 || response.status === 302) {
        const redirectUrl = response.headers.get('location');
        console.log(`Store redirected to: ${redirectUrl}`);
        
        // Try the redirect URL if it's a Shopify domain
        if (redirectUrl && redirectUrl.includes('myshopify.com')) {
          const redirectResponse = await fetch(redirectUrl, {
            method: 'GET',
            headers: this.headers,
            timeout: 10000
          });
          
          if (redirectResponse.ok) {
            const shopData = await redirectResponse.json();
            return {
              success: true,
              store: {
                name: shopData.shop.name,
                domain: shopData.shop.domain,
                email: shopData.shop.email,
                currency: shopData.shop.currency
              }
            };
          }
        }
        
        return {
          success: false,
          error: `Store redirected to ${redirectUrl}. This may indicate the store URL is incorrect.`
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          diagnostics: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          }
        };
      }

      const shopData = await response.json();
      return {
        success: true,
        store: {
          name: shopData.shop.name,
          domain: shopData.shop.domain,
          email: shopData.shop.email,
          currency: shopData.shop.currency
        }
      };

    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
        diagnostics: {
          errorType: error instanceof Error ? error.name : 'Unknown',
          baseUrl: this.baseUrl,
          hasToken: !!this.headers['X-Shopify-Access-Token']
        }
      };
    }
  }

  async getProducts(limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/products.json?limit=${limit}`, {
        method: 'GET',
        headers: this.headers,
        timeout: 15000
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return [];
    }
  }

  async createProduct(productData: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/products.json`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ product: productData }),
        timeout: 15000
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create product: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.product;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  async updateInventory(variantId: string, quantity: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/variants/${variantId}.json`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          variant: {
            id: variantId,
            inventory_quantity: quantity
          }
        }),
        timeout: 15000
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update inventory:', error);
      return false;
    }
  }
}

export const shopifyConnectionService = new ShopifyConnectionService();