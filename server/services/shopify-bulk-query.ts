import { log } from '../utils/logger.js';

interface BulkQueryResult {
  id: string;
  title: string;
  variants: {
    id: string;
    title: string;
    sku: string;
    inventoryQuantity: number;
    location: string;
  }[];
}

interface BulkOperationResponse {
  data: {
    bulkOperationRunQuery: {
      bulkOperation: {
        id: string;
        status: string;
      };
      userErrors: Array<{
        field: string;
        message: string;
      }>;
    };
  };
}

interface BulkStatusResponse {
  data: {
    currentBulkOperation: {
      status: string;
      url?: string;
      errorCode?: string;
    };
  };
}

export class ShopifyBulkQueryService {
  private shopDomain: string;
  private accessToken: string;

  constructor() {
    this.shopDomain = process.env.SHOPIFY_SHOP_DOMAIN?.replace('.myshopify.com', '') || '';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    
    if (!this.shopDomain || !this.accessToken) {
      throw new Error('Missing Shopify credentials for bulk operations');
    }
  }

  // 1️⃣ Start bulk query with all required IDs - matching your Google Apps Script
  async startBulkQuery(): Promise<string> {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
          {
            products(query: "product_type:flower OR product_type:bulk flower AND status:active") {
              edges { node {
                id
                title
                variants { edges { node {
                  id
                  title
                  sku
                  inventoryItem {
                    inventoryLevels {
                      edges { node {
                        id
                        location { name }
                        quantities(names:["available"]) { name quantity }
                      }}
                    }
                  }
                }}}
              }}
            }
          }
          """
        ) {
          bulkOperation { id status }
          userErrors { field message }
        }
      }`;

    log('Starting Shopify bulk query operation', 'bulk-query');
    const response = await this.makeShopifyRequestWithRetry(mutation);
    
    const errors = response.data.bulkOperationRunQuery.userErrors;
    if (errors.length > 0) {
      log(`Bulk query errors: ${JSON.stringify(errors)}`, 'bulk-query');
      throw new Error(`Bulk query failed: ${JSON.stringify(errors)}`);
    }

    const operationId = response.data.bulkOperationRunQuery.bulkOperation.id;
    log(`Bulk query started with ID: ${operationId}`, 'bulk-query');
    return operationId;
  }

  // 2️⃣ Poll until COMPLETE - matching your polling logic
  async waitForCompletion(maxAttempts: number = 60): Promise<string> {
    const query = `query { currentBulkOperation { status url errorCode } }`;
    
    log('Polling for bulk operation completion', 'bulk-query');
    
    for (let i = 0; i < maxAttempts; i++) {
      const response: BulkStatusResponse = await this.makeShopifyRequestWithRetry(query);
      const operation = response.data.currentBulkOperation;
      
      log(`Bulk operation status (attempt ${i + 1}): ${operation.status}`, 'bulk-query');
      
      if (operation.status === 'COMPLETED') {
        if (!operation.url) {
          throw new Error('Bulk operation completed but no download URL provided');
        }
        log(`Bulk operation completed. Download URL: ${operation.url}`, 'bulk-query');
        return operation.url;
      }
      
      if (operation.status === 'FAILED') {
        const errorMsg = `Bulk operation failed with error: ${operation.errorCode || 'Unknown error'}`;
        log(errorMsg, 'bulk-query');
        throw new Error(errorMsg);
      }
      
      // Wait 5 seconds before next poll (matching your script)
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error(`Bulk operation timed out after ${maxAttempts} attempts`);
  }

  // 3️⃣ Download and parse JSONL - matching your parsing logic
  async fetchAndParse(url: string): Promise<BulkQueryResult[]> {
    log(`Downloading bulk data from: ${url}`, 'bulk-query');
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download bulk data: ${response.statusText}`);
    }
    
    const content = await response.text();
    const lines = content.split('\n').filter(line => line.trim());
    
    log(`Processing ${lines.length} lines of bulk data`, 'bulk-query');
    
    const output: BulkQueryResult[] = [];
    const parentMap: { [key: string]: any } = {};
    
    lines.forEach(line => {
      try {
        const obj = JSON.parse(line);
        
        if (obj.__typename === 'Product') {
          parentMap[obj.id] = { 
            id: obj.id,
            title: obj.title, 
            variants: {} 
          };
        } else if (obj.__typename === 'ProductVariant') {
          const parent = parentMap[obj.__parentId];
          if (parent) {
            parent.variants[obj.id] = { 
              id: obj.id,
              title: obj.title, 
              sku: obj.sku, 
              levels: [] 
            };
          }
        } else if (obj.__typename === 'InventoryLevel') {
          // Find the parent product and variant
          const parentId = obj.__parentId.split('/ProductVariant/')[0].split('/Product/')[1];
          const parent = parentMap[`gid://shopify/Product/${parentId}`];
          
          if (parent && obj.quantities) {
            const available = obj.quantities.find((q: any) => q.name === 'available')?.quantity || 0;
            const locationName = obj.location?.name || 'Default';
            
            // Find the correct variant
            Object.keys(parent.variants).forEach(variantId => {
              const variant = parent.variants[variantId];
              variant.levels.push({
                location: locationName,
                available: available
              });
            });
          }
        }
      } catch (error) {
        log(`Error parsing line: ${error}`, 'bulk-query');
      }
    });

    // Convert parentMap to output format
    Object.values(parentMap).forEach((parent: any) => {
      const variants = Object.values(parent.variants).map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        inventoryQuantity: variant.levels.reduce((sum: number, level: any) => sum + level.available, 0),
        location: variant.levels.map((level: any) => level.location).join(', ')
      }));
      
      if (variants.length > 0) {
        output.push({
          id: parent.id,
          title: parent.title,
          variants: variants
        });
      }
    });

    log(`Parsed ${output.length} products with inventory data`, 'bulk-query');
    return output;
  }

  // Complete bulk query workflow
  async executeBulkInventoryQuery(): Promise<BulkQueryResult[]> {
    try {
      log('Starting complete bulk inventory query workflow', 'bulk-query');
      
      // Step 1: Start bulk query
      const operationId = await this.startBulkQuery();
      
      // Step 2: Wait for completion
      const downloadUrl = await this.waitForCompletion();
      
      // Step 3: Download and parse results
      const results = await this.fetchAndParse(downloadUrl);
      
      log(`Bulk inventory query completed successfully. Retrieved ${results.length} products`, 'bulk-query');
      return results;
      
    } catch (error) {
      log(`Bulk inventory query failed: ${error}`, 'bulk-query');
      throw error;
    }
  }

  // Utility function with retry logic
  private async makeShopifyRequestWithRetry(query: string, variables: any = {}, maxRetries: number = 3): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.makeShopifyRequest(query, variables);
      } catch (error: any) {
        if (error.message.includes('Throttled') && i < maxRetries - 1) {
          const backoffTime = Math.pow(2, i + 1) * 1000;
          log(`Request throttled, waiting ${backoffTime}ms before retry`, 'bulk-query');
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        throw error;
      }
    }
  }

  // GraphQL request function
  private async makeShopifyRequest(query: string, variables: any = {}): Promise<any> {
    const url = `https://${this.shopDomain}.myshopify.com/admin/api/2025-04/graphql.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    
    if (json.errors) {
      log(`GraphQL errors: ${JSON.stringify(json.errors)}`, 'bulk-query');
      throw new Error('GraphQL request failed');
    }

    return json;
  }
}