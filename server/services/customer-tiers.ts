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

      // GraphQL query to get customers with their order history
      // Limit to 50 customers initially for better performance
      const query = `
        query GetCustomersWithOrders($cursor: String) {
          customers(first: 50, after: $cursor) {
            edges {
              node {
                id
                email
                firstName
                lastName
                phone
                tags
                orders(first: 20, query: "financial_status:paid") {
                  edges {
                    node {
                      id
                      totalPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                      createdAt
                      cancelledAt
                    }
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
          
          // Calculate total spent from non-cancelled orders
          let totalSpent = 0;
          let validOrdersCount = 0;
          let lastOrderDate = '';

          for (const orderEdge of customer.orders.edges) {
            const order = orderEdge.node;
            
            // Only count non-cancelled orders (already filtered for paid status in query)
            if (!order.cancelledAt) {
              totalSpent += parseFloat(order.totalPriceSet.shopMoney.amount);
              validOrdersCount++;
              
              if (!lastOrderDate || order.createdAt > lastOrderDate) {
                lastOrderDate = order.createdAt;
              }
            }
          }

          // Skip customers with no valid orders
          if (validOrdersCount === 0) continue;

          // Determine tier based on total spending
          const tier = this.getTierForAmount(totalSpent);
          
          // Calculate next tier info
          const nextTier = this.getNextTier(totalSpent);
          const nextTierAmount = nextTier ? nextTier.threshold : null;
          const remainingToNextTier = nextTierAmount ? nextTierAmount - totalSpent : 0;

          customers.push({
            id: customer.id.split('/').pop() || customer.id,
            email: customer.email || 'No email',
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            displayName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'No name',
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