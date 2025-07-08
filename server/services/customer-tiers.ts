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
  displayName: string;
  totalSpent: number;
  lifetimeSpent: number;
  orderCount: number;
  ordersCount: number;
  tier: string;
  tierColor: string;
  nextTier: string | null;
  nextTierAmount: number | null;
  remainingToNextTier: number;
  lastOrderDate: string;
  tags: string[];
  phone?: string;
  company?: string;
  state?: string;
  createdAt?: string;
  orderDetails?: any[];
  averageOrderValue: number;
}

export interface CustomerTierSummary {
  tier: CustomerTier;
  count: number;
  totalRevenue: number;
  totalRevenue12Months: number;
  averageSpending: number;
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

      // GraphQL query to get customers with simplified data to avoid cost limits
      const query = `
        query GetCustomersWithOrders($cursor: String) {
          customers(first: 10, after: $cursor) {
            edges {
              node {
                id
                email
                firstName
                lastName
                displayName
                numberOfOrders
                orders(first: 5, query: "financial_status:paid") {
                  edges {
                    node {
                      totalPriceSet {
                        shopMoney {
                          amount
                        }
                      }
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
      let pageCount = 0;
      const maxPages = 100; // Fetch up to 5000 customers (50 per page) to handle 1000+ customer base

      // Paginate through customers (limited to prevent timeout)
      while (hasNextPage && pageCount < maxPages) {
        log(`Making request to Shopify GraphQL API - Page: ${cursor ? 'next' : 'first'} (${pageCount + 1}/${maxPages})`, 'customer-tiers');
        
        // Add delay between requests to avoid rate limiting
        if (pageCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
        
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
          throw new Error(`Failed to fetch customer data from Shopify: ${JSON.stringify(data.errors)}`);
        }

        // Debug the response structure
        if (customers.length === 0 && data.data?.customers?.edges?.length > 0) {
          log(`Sample customer data: ${JSON.stringify(data.data.customers.edges[0]?.node, null, 2)}`, 'customer-tiers');
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

          // Calculate lifetime spent from ALL orders (not just 12 months)
          let lifetimeSpentActual = totalSpent12Months;
          
          // Get numberOfOrders to determine if customer has historical orders
          const totalOrderCount = parseInt(customer.numberOfOrders || '0');
          
          // If customer has more orders than we fetched, use lastOrder.totalPriceSet as a baseline
          if (totalOrderCount > 0 && customer.lastOrder) {
            const lastOrderAmount = parseFloat(customer.lastOrder.totalPriceSet?.shopMoney?.amount || '0');
            // Estimate lifetime spending if we have more orders than fetched
            if (totalOrderCount > customer.orders.edges.length) {
              lifetimeSpentActual = Math.max(totalSpent12Months, lastOrderAmount * totalOrderCount * 0.8); // Conservative estimate
            }
          }
          
          // Skip customers with lifetime spending less than $25,000
          if (lifetimeSpentActual < 25000) continue;
          
          // Use actual lifetime spent
          const lifetimeSpent = lifetimeSpentActual;
          
          // Use lifetime spending for tier calculation to capture high-value customers
          const spendingForTier = lifetimeSpentActual;

          // Determine tier based on lifetime spending
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
            totalSpent: totalSpent12Months,
            lifetimeSpent: lifetimeSpent,
            orderCount: validOrdersCount,
            ordersCount: customer.numberOfOrders || validOrdersCount,
            tier: tier.name,
            tierColor: tier.color,
            nextTier: nextTier?.name || null,
            nextTierAmount,
            remainingToNextTier,
            lastOrderDate,
            tags: customer.tags || [],
            phone: customer.phone || undefined,
            company: customer.company?.value || undefined,
            state: customer.state || '',
            createdAt: customer.createdAt,
            orderDetails: orderDetails,
            averageOrderValue: validOrdersCount > 0 ? totalSpent12Months / validOrdersCount : 0,
          });
        }

        // Check if there are more pages
        hasNextPage = data.data.customers.pageInfo.hasNextPage;
        if (hasNextPage && data.data.customers.edges.length > 0 && pageCount < maxPages - 1) {
          cursor = data.data.customers.edges[data.data.customers.edges.length - 1].cursor;
        }
        pageCount++;
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
        totalRevenue12Months: 0,
        averageSpending: 0,
        customers: []
      });
    });

    // Categorize customers into tiers
    let totalRevenue = 0;
    let totalRevenue12Months = 0;
    customers.forEach(customer => {
      const summary = tierSummaries.get(customer.tier);
      if (summary) {
        summary.count++;
        summary.totalRevenue += customer.lifetimeSpent;
        summary.totalRevenue12Months += customer.totalSpent; // 12-month spending
        summary.customers.push(customer);
      }
      totalRevenue += customer.lifetimeSpent;
      totalRevenue12Months += customer.totalSpent;
    });

    // Calculate average spending per tier
    tierSummaries.forEach(summary => {
      if (summary.count > 0) {
        summary.averageSpending = summary.totalRevenue12Months / summary.count;
      }
    });

    // Convert to array and sort by threshold (highest first)
    const summaryArray = Array.from(tierSummaries.values())
      .sort((a, b) => b.tier.threshold - a.tier.threshold);

    return {
      summary: summaryArray,
      totalCustomers: customers.length,
      totalRevenue: totalRevenue12Months,
      totalLifetimeRevenue: totalRevenue,
      averageSpend: customers.length > 0 ? totalRevenue12Months / customers.length : 0,
      averageLifetimeSpend: customers.length > 0 ? totalRevenue / customers.length : 0
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