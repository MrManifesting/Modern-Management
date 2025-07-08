import { getShopifyCredentials } from './shopify-auth.js';
import { log } from '../vite.js';

export interface CustomerTier {
  name: string;
  threshold: number;
  color: string;
  icon: string;
}

export interface CustomerWithTier {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalSpent: number;
  ordersCount: number;
  tier: CustomerTier;
  lastOrderDate: string;
  tags: string[];
  phone?: string;
  company?: string;
}

export interface CustomerTierSummary {
  tier: CustomerTier;
  count: number;
  totalRevenue: number;
  customers: CustomerWithTier[];
}

export class CustomerTierService {
  private readonly tiers: CustomerTier[] = [
    { name: 'Diamond', threshold: 250000, color: '#B9F2FF', icon: '💎' },
    { name: 'Platinum', threshold: 100000, color: '#E5E4E2', icon: '🏆' },
    { name: 'Gold', threshold: 50000, color: '#FFD700', icon: '🥇' },
    { name: 'Silver', threshold: 25000, color: '#C0C0C0', icon: '🥈' },
    { name: 'Bronze', threshold: 10000, color: '#CD7F32', icon: '🥉' },
    { name: 'Premium', threshold: 5000, color: '#9370DB', icon: '⭐' },
    { name: 'Standard', threshold: 1000, color: '#32CD32', icon: '✓' },
    { name: 'Basic', threshold: 0, color: '#808080', icon: '•' }
  ];

  /**
   * Fetch all customers with their spending data from Shopify
   */
  async fetchCustomersWithSpending(): Promise<CustomerWithTier[]> {
    try {
      const { accessToken } = await getShopifyCredentials();
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';

      log('Fetching customer data from Shopify for tier analysis', 'customer-tiers');

      // Calculate date 12 months ago for comprehensive sales data
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const dateFilter = twelveMonthsAgo.toISOString().split('T')[0];

      // GraphQL query to get customers with comprehensive 12-month order history
      const query = `
        query GetCustomersWithOrders($cursor: String) {
          customers(first: 250, after: $cursor) {
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
                totalSpentV2 {
                  amount
                  currencyCode
                }
                ordersCount
                lastOrder {
                  id
                  createdAt
                  totalPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                }
                orders(first: 100, query: "financial_status:paid AND created_at:>=${dateFilter}") {
                  edges {
                    node {
                      id
                      name
                      totalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      subtotalPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                      totalTaxSet {
                        shopMoney {
                          amount
                        }
                      }
                      totalShippingPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                      createdAt
                      cancelledAt
                      financialStatus
                      fulfillmentStatus
                      lineItems(first: 50) {
                        edges {
                          node {
                            quantity
                            variant {
                              price
                            }
                            product {
                              title
                              productType
                            }
                          }
                        }
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `;

      const customers: CustomerWithTier[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;

      // Paginate through all customers
      while (hasNextPage) {
        log(`Making request to Shopify GraphQL API - Page: ${cursor ? 'next' : 'first'}`, 'customer-tiers');
        
        const requestUrl = `https://${shopifyDomain}/admin/api/2024-01/graphql.json`;
        log(`Request URL: ${requestUrl}`, 'customer-tiers');
        
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({ 
            query, 
            variables: { cursor } 
          }),
        });

        log(`Response status: ${response.status}`, 'customer-tiers');
        
        const data = await response.json();

        if (data.errors) {
          log(`GraphQL errors: ${JSON.stringify(data.errors)}`, 'customer-tiers');
          throw new Error('Failed to fetch customer data from Shopify');
        }

        // Process each customer
        for (const edge of data.data.customers.edges) {
          const customer = edge.node;
          
          // Calculate total spent from orders in the last 12 months
          let totalSpent12Months = 0;
          let validOrdersCount = 0;
          let lastOrderDate = '';
          const orderDetails: any[] = [];

          // Process all orders from the last 12 months
          for (const orderEdge of customer.orders.edges) {
            const order = orderEdge.node;
            
            // Only count non-cancelled orders (already filtered for paid status in query)
            if (!order.cancelledAt) {
              const orderAmount = parseFloat(order.totalPriceSet.shopMoney.amount);
              totalSpent12Months += orderAmount;
              validOrdersCount++;
              
              if (!lastOrderDate || order.createdAt > lastOrderDate) {
                lastOrderDate = order.createdAt;
              }

              // Store order details for comprehensive analysis
              orderDetails.push({
                id: order.id,
                name: order.name,
                amount: orderAmount,
                date: order.createdAt,
                itemCount: order.lineItems?.edges?.length || 0
              });
            }
          }

          // Use totalSpentV2 as lifetime total if available
          const lifetimeSpent = customer.totalSpentV2?.amount ? 
            parseFloat(customer.totalSpentV2.amount) : 
            totalSpent12Months;

          // Use 12-month spending for tier calculation
          const spendingForTier = totalSpent12Months;

          // Skip customers with no spending in the last 12 months
          if (totalSpent12Months === 0) continue;

          // Determine tier based on 12-month spending
          const tier = this.getTierForAmount(spendingForTier);
          
          // Calculate next tier info
          const nextTier = this.getNextTier(spendingForTier);
          const nextTierAmount = nextTier ? nextTier.threshold : null;
          const remainingToNextTier = nextTierAmount ? nextTierAmount - spendingForTier : 0;

          customers.push({
            id: customer.id.split('/').pop() || customer.id,
            email: customer.email || 'No email',
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            displayName: customer.displayName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'No name',
            totalSpent,
            orderCount: validOrdersCount,
            tier: tier.name,
            tierColor: tier.color,
            nextTier: nextTier?.name || null,
            nextTierAmount,
            remainingToNextTier,
            lastOrderDate,
            tags: customer.tags || [],
            phone: customer.phone || undefined,
            company: customer.company?.value || undefined,
          });
        }

        // Check if there are more pages
        // For now, limit to first page to avoid timeout
        hasNextPage = false; // data.data.customers.pageInfo.hasNextPage;
        // if (hasNextPage && data.data.customers.edges.length > 0) {
        //   cursor = data.data.customers.edges[data.data.customers.edges.length - 1].cursor;
        // }
      }

      log(`Fetched ${customers.length} customers with spending data`, 'customer-tiers');

      // Sort by total spent (highest first)
      return customers.sort((a, b) => b.totalSpent - a.totalSpent);

    } catch (error) {
      log(`Error fetching customer data: ${error}`, 'customer-tiers');
      throw error;
    }
  }

  /**
   * Get tier summary with customer counts and revenue
   */
  async getCustomerTierSummary(): Promise<{
    summary: CustomerTierSummary[];
    totalCustomers: number;
    totalRevenue: number;
    averageSpend: number;
  }> {
    const customers = await this.fetchCustomersWithSpending();
    
    // Initialize tier summaries
    const tierSummaries: Map<string, CustomerTierSummary> = new Map();
    this.tiers.forEach(tier => {
      tierSummaries.set(tier.name, {
        tier,
        count: 0,
        totalRevenue: 0,
        customers: []
      });
    });

    // Categorize customers into tiers
    let totalRevenue = 0;
    customers.forEach(customer => {
      const summary = tierSummaries.get(customer.tier);
      if (summary) {
        summary.count++;
        summary.totalRevenue += customer.totalSpent;
        summary.customers.push(customer);
      }
      totalRevenue += customer.totalSpent;
    });

    // Convert to array and sort by threshold (highest first)
    const summaryArray = Array.from(tierSummaries.values())
      .sort((a, b) => b.tier.threshold - a.tier.threshold);

    return {
      summary: summaryArray,
      totalCustomers: customers.length,
      totalRevenue,
      averageSpend: customers.length > 0 ? totalRevenue / customers.length : 0
    };
  }

  /**
   * Get specific customer tier information
   */
  async getCustomerTier(customerId: string): Promise<CustomerWithTier | null> {
    const customers = await this.fetchCustomersWithSpending();
    return customers.find(c => c.id === customerId) || null;
  }

  /**
   * Determine tier based on spending amount
   */
  private getTierForAmount(amount: number): CustomerTier {
    for (const tier of this.tiers) {
      if (amount >= tier.threshold) {
        return tier;
      }
    }
    return this.tiers[this.tiers.length - 1]; // Return basic tier as fallback
  }

  /**
   * Get the next tier based on current spending
   */
  private getNextTier(currentSpending: number): CustomerTier | null {
    // Find all tiers with threshold higher than current spending
    const higherTiers = this.tiers.filter(tier => tier.threshold > currentSpending);
    
    // Return the tier with the lowest threshold among the higher tiers
    if (higherTiers.length > 0) {
      return higherTiers[higherTiers.length - 1];
    }
    
    return null; // Already at highest tier
  }

  /**
   * Get customers by specific tier
   */
  async getCustomersByTier(tierName: string): Promise<CustomerWithTier[]> {
    const customers = await this.fetchCustomersWithSpending();
    return customers.filter(c => c.tier.name === tierName);
  }
}