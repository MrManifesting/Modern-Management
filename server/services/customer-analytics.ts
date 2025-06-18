import { db } from '../db';
import { 
  customers, 
  customerPurchaseAnalytics, 
  customerTierThresholds, 
  orderAnalytics, 
  productPerformanceAnalytics,
  sales,
  items,
  type Customer,
  type InsertCustomer,
  type InsertCustomerPurchaseAnalytics,
  type InsertOrderAnalytics,
  type InsertCustomerTierThresholds
} from '@shared/schema';
import { eq, desc, asc, sql, and, gte, lte, count, sum, avg } from 'drizzle-orm';

export class CustomerAnalyticsService {
  
  // Initialize default tier thresholds
  async initializeDefaultTiers() {
    const existingTiers = await db.select().from(customerTierThresholds).limit(1);
    
    if (existingTiers.length === 0) {
      const defaultTiers: InsertCustomerTierThresholds[] = [
        {
          tierName: 'Bronze',
          minTotalSpent: 0,
          minOrders: 1,
          minMonthsActive: 0,
          discountPercentage: 0,
          loyaltyPointsMultiplier: 1,
          badgeColor: '#CD7F32',
          displayOrder: 1,
        },
        {
          tierName: 'Silver',
          minTotalSpent: 500,
          minOrders: 3,
          minMonthsActive: 1,
          discountPercentage: 5,
          freeShippingThreshold: 75,
          loyaltyPointsMultiplier: 1.25,
          badgeColor: '#C0C0C0',
          displayOrder: 2,
        },
        {
          tierName: 'Gold',
          minTotalSpent: 1500,
          minOrders: 8,
          minMonthsActive: 3,
          discountPercentage: 10,
          freeShippingThreshold: 50,
          loyaltyPointsMultiplier: 1.5,
          earlyAccessToProducts: true,
          badgeColor: '#FFD700',
          displayOrder: 3,
        },
        {
          tierName: 'Platinum',
          minTotalSpent: 5000,
          minOrders: 15,
          minMonthsActive: 6,
          discountPercentage: 15,
          freeShippingThreshold: 25,
          loyaltyPointsMultiplier: 2,
          earlyAccessToProducts: true,
          dedicatedSupport: true,
          badgeColor: '#E5E4E2',
          displayOrder: 4,
        },
        {
          tierName: 'Diamond',
          minTotalSpent: 15000,
          minOrders: 30,
          minMonthsActive: 12,
          discountPercentage: 20,
          freeShippingThreshold: 0,
          loyaltyPointsMultiplier: 3,
          earlyAccessToProducts: true,
          dedicatedSupport: true,
          badgeColor: '#B9F2FF',
          displayOrder: 5,
        }
      ];

      await db.insert(customerTierThresholds).values(defaultTiers);
    }
  }

  // Create or update customer from Shopify webhook data
  async upsertCustomerFromShopify(shopifyCustomerData: any): Promise<Customer> {
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.shopifyCustomerId, shopifyCustomerData.id.toString()))
      .limit(1);

    const customerData: Partial<InsertCustomer> = {
      shopifyCustomerId: shopifyCustomerData.id.toString(),
      email: shopifyCustomerData.email,
      firstName: shopifyCustomerData.first_name,
      lastName: shopifyCustomerData.last_name,
      phone: shopifyCustomerData.phone,
      city: shopifyCustomerData.default_address?.city,
      state: shopifyCustomerData.default_address?.province,
      country: shopifyCustomerData.default_address?.country,
      zipCode: shopifyCustomerData.default_address?.zip,
      shopifyAcceptsMarketing: shopifyCustomerData.accepts_marketing,
      shopifyTags: shopifyCustomerData.tags,
      shopifyOrdersCount: shopifyCustomerData.orders_count || 0,
      shopifyTotalSpent: parseFloat(shopifyCustomerData.total_spent || '0'),
      marketingOptIn: shopifyCustomerData.accepts_marketing,
      isVerified: shopifyCustomerData.verified_email,
    };

    if (existingCustomer.length > 0) {
      const [updatedCustomer] = await db
        .update(customers)
        .set({ ...customerData, updatedAt: new Date() })
        .where(eq(customers.id, existingCustomer[0].id))
        .returning();
      
      await this.recalculateCustomerMetrics(updatedCustomer.id);
      return updatedCustomer;
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values(customerData as InsertCustomer)
        .returning();
      
      return newCustomer;
    }
  }

  // Process order analytics from Shopify webhook
  async processOrderAnalytics(shopifyOrderData: any): Promise<void> {
    // Find or create customer
    let customer: Customer | null = null;
    
    if (shopifyOrderData.customer?.id) {
      customer = await this.upsertCustomerFromShopify(shopifyOrderData.customer);
    }

    const orderDate = new Date(shopifyOrderData.created_at);
    const orderAnalyticsData: InsertOrderAnalytics = {
      orderId: shopifyOrderData.name || shopifyOrderData.order_number?.toString(),
      shopifyOrderId: shopifyOrderData.id.toString(),
      customerId: customer?.id,
      orderNumber: shopifyOrderData.name,
      totalAmount: parseFloat(shopifyOrderData.total_price || '0'),
      subtotal: parseFloat(shopifyOrderData.subtotal_price || '0'),
      taxes: parseFloat(shopifyOrderData.total_tax || '0'),
      shipping: parseFloat(shopifyOrderData.shipping_lines?.[0]?.price || '0'),
      discounts: parseFloat(shopifyOrderData.total_discounts || '0'),
      itemCount: shopifyOrderData.line_items?.length || 0,
      uniqueProductCount: new Set(shopifyOrderData.line_items?.map((item: any) => item.product_id) || []).size,
      categories: this.extractCategoriesFromLineItems(shopifyOrderData.line_items || []),
      brands: this.extractBrandsFromLineItems(shopifyOrderData.line_items || []),
      isFirstOrder: customer ? customer.totalOrders === 0 : true,
      daysSinceLastOrder: customer && customer.lastOrderDate 
        ? Math.floor((orderDate.getTime() - customer.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      customerTierAtOrderTime: customer?.customerTier,
      orderHour: orderDate.getHours(),
      orderDayOfWeek: orderDate.getDay(),
      orderMonth: orderDate.getMonth() + 1,
      fulfillmentStatus: shopifyOrderData.fulfillment_status || 'pending',
      paymentStatus: shopifyOrderData.financial_status || 'pending',
      shippingMethod: shopifyOrderData.shipping_lines?.[0]?.title,
      shippingCity: shopifyOrderData.shipping_address?.city,
      shippingState: shopifyOrderData.shipping_address?.province,
      shippingCountry: shopifyOrderData.shipping_address?.country,
      orderDate,
    };

    await db.insert(orderAnalytics).values(orderAnalyticsData);

    // Update customer metrics if customer exists
    if (customer) {
      await this.recalculateCustomerMetrics(customer.id);
      await this.updateCustomerTier(customer.id);
    }

    // Update product performance analytics
    await this.updateProductPerformanceAnalytics(shopifyOrderData.line_items || [], orderDate);
  }

  // Recalculate customer metrics based on their order history
  async recalculateCustomerMetrics(customerId: number): Promise<void> {
    const customerOrderStats = await db
      .select({
        totalOrders: count(orderAnalytics.id),
        totalSpent: sql<number>`COALESCE(SUM(${orderAnalytics.totalAmount}), 0)`,
        averageOrderValue: sql<number>`COALESCE(AVG(${orderAnalytics.totalAmount}), 0)`,
        firstOrderDate: sql<Date>`MIN(${orderAnalytics.orderDate})`,
        lastOrderDate: sql<Date>`MAX(${orderAnalytics.orderDate})`,
      })
      .from(orderAnalytics)
      .where(eq(orderAnalytics.customerId, customerId));

    const stats = customerOrderStats[0];
    if (!stats) return;

    const daysSinceLastOrder = stats.lastOrderDate 
      ? Math.floor((new Date().getTime() - stats.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const monthsActive = stats.firstOrderDate
      ? Math.ceil((new Date().getTime() - stats.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    const orderFrequency = monthsActive > 0 ? Number(stats.totalOrders) / monthsActive : 0;

    // Get favorite categories and products
    const favoriteCategories = await this.getFavoriteCategories(customerId);
    const favoriteProducts = await this.getFavoriteProducts(customerId);
    const preferredBrands = await this.getPreferredBrands(customerId);

    await db
      .update(customers)
      .set({
        totalOrders: Number(stats.totalOrders),
        totalSpent: Number(stats.totalSpent),
        averageOrderValue: Number(stats.averageOrderValue),
        lifetimeValue: Number(stats.totalSpent), // Simple LTV calculation
        firstOrderDate: stats.firstOrderDate,
        lastOrderDate: stats.lastOrderDate,
        daysSinceLastOrder,
        orderFrequency,
        favoriteCategories,
        favoriteProducts,
        preferredBrands,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));
  }

  // Update customer tier based on their metrics
  async updateCustomerTier(customerId: number): Promise<void> {
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (customer.length === 0) return;

    const tiers = await db
      .select()
      .from(customerTierThresholds)
      .where(eq(customerTierThresholds.isActive, true))
      .orderBy(desc(customerTierThresholds.minTotalSpent));

    const customerData = customer[0];
    const monthsActive = customerData.firstOrderDate
      ? Math.ceil((new Date().getTime() - customerData.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    // Find the highest tier the customer qualifies for
    let qualifyingTier = tiers.find(tier => 
      Number(customerData.totalSpent) >= Number(tier.minTotalSpent) &&
      customerData.totalOrders >= tier.minOrders &&
      monthsActive >= tier.minMonthsActive
    );

    if (!qualifyingTier) {
      qualifyingTier = tiers[tiers.length - 1]; // Default to lowest tier
    }

    if (qualifyingTier && customerData.customerTier !== qualifyingTier.tierName) {
      await db
        .update(customers)
        .set({
          customerTier: qualifyingTier.tierName,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));
    }
  }

  // Generate monthly customer purchase analytics
  async generateMonthlyCustomerAnalytics(customerId: number, year: number, month: number): Promise<void> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const monthlyStats = await db
      .select({
        ordersThisPeriod: count(orderAnalytics.id),
        totalSpentThisPeriod: sql<number>`COALESCE(SUM(${orderAnalytics.totalAmount}), 0)`,
        averageOrderValueThisPeriod: sql<number>`COALESCE(AVG(${orderAnalytics.totalAmount}), 0)`,
        itemsPurchasedThisPeriod: sql<number>`COALESCE(SUM(${orderAnalytics.itemCount}), 0)`,
      })
      .from(orderAnalytics)
      .where(
        and(
          eq(orderAnalytics.customerId, customerId),
          gte(orderAnalytics.orderDate, startDate),
          lte(orderAnalytics.orderDate, endDate)
        )
      );

    const stats = monthlyStats[0];
    if (!stats || Number(stats.ordersThisPeriod) === 0) return;

    // Get top category and product for this period
    const topCategory = await this.getTopCategoryForPeriod(customerId, startDate, endDate);
    const topProduct = await this.getTopProductForPeriod(customerId, startDate, endDate);
    const categoriesExplored = await this.getCategoriesExploredForPeriod(customerId, startDate, endDate);

    const analyticsData: InsertCustomerPurchaseAnalytics = {
      customerId,
      month,
      year,
      quarter: Math.ceil(month / 3),
      ordersThisPeriod: Number(stats.ordersThisPeriod),
      totalSpentThisPeriod: Number(stats.totalSpentThisPeriod),
      averageOrderValueThisPeriod: Number(stats.averageOrderValueThisPeriod),
      itemsPurchasedThisPeriod: Number(stats.itemsPurchasedThisPeriod),
      topCategoryThisPeriod: topCategory,
      topProductThisPeriod: topProduct,
      categoriesExploredThisPeriod: categoriesExplored,
      daysActiveDuringPeriod: await this.getDaysActiveDuringPeriod(customerId, startDate, endDate),
    };

    // Upsert monthly analytics
    const existing = await db
      .select()
      .from(customerPurchaseAnalytics)
      .where(
        and(
          eq(customerPurchaseAnalytics.customerId, customerId),
          eq(customerPurchaseAnalytics.year, year),
          eq(customerPurchaseAnalytics.month, month)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(customerPurchaseAnalytics)
        .set({ ...analyticsData, updatedAt: new Date() })
        .where(eq(customerPurchaseAnalytics.id, existing[0].id));
    } else {
      await db.insert(customerPurchaseAnalytics).values(analyticsData);
    }
  }

  // Update product performance analytics
  async updateProductPerformanceAnalytics(lineItems: any[], orderDate: Date): Promise<void> {
    const month = orderDate.getMonth() + 1;
    const year = orderDate.getFullYear();

    for (const lineItem of lineItems) {
      // Find matching item by SKU or product title
      const matchingItems = await db
        .select()
        .from(items)
        .where(
          sql`${items.sku} = ${lineItem.sku} OR ${items.name} ILIKE ${`%${lineItem.title}%`}`
        )
        .limit(1);

      const itemId = matchingItems[0]?.id;
      const quantity = lineItem.quantity || 1;
      const revenue = parseFloat(lineItem.price || '0') * quantity;

      // Upsert product performance analytics
      const existing = await db
        .select()
        .from(productPerformanceAnalytics)
        .where(
          and(
            itemId ? eq(productPerformanceAnalytics.itemId, itemId) : sql`1=0`,
            eq(productPerformanceAnalytics.year, year),
            eq(productPerformanceAnalytics.month, month)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(productPerformanceAnalytics)
          .set({
            unitsSold: sql`${productPerformanceAnalytics.unitsSold} + ${quantity}`,
            revenue: sql`${productPerformanceAnalytics.revenue} + ${revenue}`,
            updatedAt: new Date(),
          })
          .where(eq(productPerformanceAnalytics.id, existing[0].id));
      } else if (itemId) {
        await db.insert(productPerformanceAnalytics).values({
          itemId,
          sku: lineItem.sku,
          productName: lineItem.title,
          month,
          year,
          unitsSold: quantity,
          revenue,
          averageSellingPrice: parseFloat(lineItem.price || '0'),
        });
      }
    }
  }

  // Helper methods for extracting data from line items
  private extractCategoriesFromLineItems(lineItems: any[]): string[] {
    return [...new Set(lineItems.map(item => item.product_type || 'Uncategorized').filter(Boolean))];
  }

  private extractBrandsFromLineItems(lineItems: any[]): string[] {
    return [...new Set(lineItems.map(item => item.vendor || 'Unknown').filter(Boolean))];
  }

  // Get customer's favorite categories based on purchase history
  private async getFavoriteCategories(customerId: number): Promise<string[]> {
    const categoryData = await db
      .select({
        category: sql<string>`unnest(${orderAnalytics.categories})`,
        count: sql<number>`count(*)`,
      })
      .from(orderAnalytics)
      .where(eq(orderAnalytics.customerId, customerId))
      .groupBy(sql`unnest(${orderAnalytics.categories})`)
      .orderBy(sql`count(*) DESC`)
      .limit(5);

    return categoryData.map(row => row.category);
  }

  // Get customer's favorite products based on purchase history
  private async getFavoriteProducts(customerId: number): Promise<string[]> {
    // This would require joining with line items data - simplified for now
    return [];
  }

  // Get customer's preferred brands based on purchase history
  private async getPreferredBrands(customerId: number): Promise<string[]> {
    const brandData = await db
      .select({
        brand: sql<string>`unnest(${orderAnalytics.brands})`,
        count: sql<number>`count(*)`,
      })
      .from(orderAnalytics)
      .where(eq(orderAnalytics.customerId, customerId))
      .groupBy(sql`unnest(${orderAnalytics.brands})`)
      .orderBy(sql`count(*) DESC`)
      .limit(5);

    return brandData.map(row => row.brand);
  }

  // Get top category for a specific period
  private async getTopCategoryForPeriod(customerId: number, startDate: Date, endDate: Date): Promise<string | null> {
    const categoryData = await db
      .select({
        category: sql<string>`unnest(${orderAnalytics.categories})`,
        count: sql<number>`count(*)`,
      })
      .from(orderAnalytics)
      .where(
        and(
          eq(orderAnalytics.customerId, customerId),
          gte(orderAnalytics.orderDate, startDate),
          lte(orderAnalytics.orderDate, endDate)
        )
      )
      .groupBy(sql`unnest(${orderAnalytics.categories})`)
      .orderBy(sql`count(*) DESC`)
      .limit(1);

    return categoryData[0]?.category || null;
  }

  // Get top product for a specific period
  private async getTopProductForPeriod(customerId: number, startDate: Date, endDate: Date): Promise<string | null> {
    // Simplified - would need line items data
    return null;
  }

  // Get categories explored during a period
  private async getCategoriesExploredForPeriod(customerId: number, startDate: Date, endDate: Date): Promise<string[]> {
    const categoryData = await db
      .select({
        category: sql<string>`unnest(${orderAnalytics.categories})`,
      })
      .from(orderAnalytics)
      .where(
        and(
          eq(orderAnalytics.customerId, customerId),
          gte(orderAnalytics.orderDate, startDate),
          lte(orderAnalytics.orderDate, endDate)
        )
      )
      .groupBy(sql`unnest(${orderAnalytics.categories})`);

    return categoryData.map(row => row.category);
  }

  // Get days active during a period
  private async getDaysActiveDuringPeriod(customerId: number, startDate: Date, endDate: Date): Promise<number> {
    const activeDays = await db
      .select({
        count: sql<number>`COUNT(DISTINCT DATE(${orderAnalytics.orderDate}))`,
      })
      .from(orderAnalytics)
      .where(
        and(
          eq(orderAnalytics.customerId, customerId),
          gte(orderAnalytics.orderDate, startDate),
          lte(orderAnalytics.orderDate, endDate)
        )
      );

    return Number(activeDays[0]?.count || 0);
  }

  // Get comprehensive customer analytics report
  async getCustomerAnalyticsReport(timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Customer tier distribution
    const tierDistribution = await db
      .select({
        tier: customers.customerTier,
        count: count(customers.id),
        totalSpent: sum(customers.totalSpent),
        averageSpent: avg(customers.totalSpent),
      })
      .from(customers)
      .groupBy(customers.customerTier)
      .orderBy(desc(sql`sum(${customers.totalSpent})`));

    // Top customers by spending
    const topCustomers = await db
      .select({
        id: customers.id,
        name: sql<string>`COALESCE(${customers.firstName} || ' ' || ${customers.lastName}, ${customers.email})`,
        email: customers.email,
        customerTier: customers.customerTier,
        totalSpent: customers.totalSpent,
        totalOrders: customers.totalOrders,
        averageOrderValue: customers.averageOrderValue,
        lastOrderDate: customers.lastOrderDate,
      })
      .from(customers)
      .orderBy(desc(customers.totalSpent))
      .limit(50);

    // Recent order trends
    const orderTrends = await db
      .select({
        date: sql<string>`DATE(${orderAnalytics.orderDate})`,
        orders: count(orderAnalytics.id),
        revenue: sum(orderAnalytics.totalAmount),
        averageOrderValue: avg(orderAnalytics.totalAmount),
      })
      .from(orderAnalytics)
      .where(gte(orderAnalytics.orderDate, startDate))
      .groupBy(sql`DATE(${orderAnalytics.orderDate})`)
      .orderBy(sql`DATE(${orderAnalytics.orderDate})`);

    return {
      tierDistribution,
      topCustomers,
      orderTrends,
      summary: {
        totalCustomers: await this.getTotalCustomers(),
        newCustomersThisPeriod: await this.getNewCustomersCount(startDate),
        totalRevenue: await this.getTotalRevenue(startDate),
        averageOrderValue: await this.getAverageOrderValue(startDate),
      }
    };
  }

  // Helper methods for summary statistics
  private async getTotalCustomers(): Promise<number> {
    const result = await db.select({ count: count(customers.id) }).from(customers);
    return Number(result[0]?.count || 0);
  }

  private async getNewCustomersCount(startDate: Date): Promise<number> {
    const result = await db
      .select({ count: count(customers.id) })
      .from(customers)
      .where(gte(customers.createdAt, startDate));
    return Number(result[0]?.count || 0);
  }

  private async getTotalRevenue(startDate: Date): Promise<number> {
    const result = await db
      .select({ total: sum(orderAnalytics.totalAmount) })
      .from(orderAnalytics)
      .where(gte(orderAnalytics.orderDate, startDate));
    return Number(result[0]?.total || 0);
  }

  private async getAverageOrderValue(startDate: Date): Promise<number> {
    const result = await db
      .select({ average: avg(orderAnalytics.totalAmount) })
      .from(orderAnalytics)
      .where(gte(orderAnalytics.orderDate, startDate));
    return Number(result[0]?.average || 0);
  }
}

export const customerAnalyticsService = new CustomerAnalyticsService();