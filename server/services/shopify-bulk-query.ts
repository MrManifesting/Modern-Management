import { log } from '../utils/logger.js';

export class ShopifyBulkQueryService {
  private shopifyDomain: string;
  private accessToken: string;

  constructor() {
    this.shopifyDomain = process.env.SHOPIFY_STORE_URL || 'gold-standard-cbd.myshopify.com';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  }

  /**
   * Start a bulk query to fetch all customers with their 12-month order history
   */
  async startBulkQuery() {
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              customers {
                edges {
                  node {
                    id
                    email
                    firstName
                    lastName
                    displayName
                    phone
                    tags
                    createdAt
                    updatedAt
                    state
                    numberOfOrders
                    orders(first: 250, query: "financial_status:paid") {
                      edges {
                        node {
                          id
                          name
                          createdAt
                          totalPriceSet {
                            shopMoney {
                              amount
                            }
                          }
                          displayFinancialStatus
                          displayFulfillmentStatus
                          cancelledAt
                          lineItems(first: 50) {
                            edges {
                              node {
                                quantity
                                variant {
                                  price
                                }
                                originalTotalSet {
                                  shopMoney {
                                    amount
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
          """
        ) {
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await fetch(
      `https://${this.shopifyDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query: mutation }),
      }
    );

    const data = await response.json();
    
    if (data.data?.bulkOperationRunQuery?.userErrors?.length > 0) {
      throw new Error(`Bulk operation failed: ${JSON.stringify(data.data.bulkOperationRunQuery.userErrors)}`);
    }

    const operationId = data.data?.bulkOperationRunQuery?.bulkOperation?.id;
    log(`Started bulk operation: ${operationId}`, 'shopify-bulk');
    
    return operationId;
  }

  /**
   * Check the status of a bulk operation
   */
  async checkBulkOperationStatus(operationId: string) {
    const query = `
      query {
        node(id: "${operationId}") {
          ... on BulkOperation {
            id
            status
            errorCode
            createdAt
            completedAt
            objectCount
            fileSize
            url
          }
        }
      }
    `;

    const response = await fetch(
      `https://${this.shopifyDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();
    return data.data?.node;
  }

  /**
   * Poll for bulk operation completion and return the results URL
   */
  async waitForBulkOperation(operationId: string, maxWaitTimeMs: number = 300000) { // 5 minutes max
    const startTime = Date.now();
    let status = null;

    while (Date.now() - startTime < maxWaitTimeMs) {
      status = await this.checkBulkOperationStatus(operationId);
      
      if (status?.status === 'COMPLETED') {
        log(`Bulk operation completed: ${status.objectCount} objects, ${status.fileSize} bytes`, 'shopify-bulk');
        return status.url;
      }
      
      if (status?.status === 'FAILED') {
        throw new Error(`Bulk operation failed: ${status.errorCode}`);
      }
      
      log(`Bulk operation status: ${status?.status}`, 'shopify-bulk');
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Bulk operation timed out');
  }

  /**
   * Download and parse the bulk operation results
   */
  async downloadBulkResults(url: string) {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    const customers = new Map();
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        
        if (data.id && data.id.includes('Customer')) {
          customers.set(data.id, {
            ...data,
            orders: []
          });
        } else if (data.id && data.id.includes('Order')) {
          // Find the customer this order belongs to
          const customerId = data.__parentId;
          if (customers.has(customerId)) {
            customers.get(customerId).orders.push(data);
          }
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }
    
    return Array.from(customers.values());
  }
}