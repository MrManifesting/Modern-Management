import Shopify from 'shopify-api-node';

// Using fixed credentials from the user input for Shopify
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Types for Shopify report data
export interface ShopifyOrderReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    title: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
  periodSales: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export interface ShopifyInventoryReport {
  totalProducts: number;
  totalVariants: number;
  lowStockItems: Array<{
    productId: string;
    variantId: string;
    title: string;
    sku: string;
    inventory: number;
    price: number;
  }>;
  outOfStockItems: Array<{
    productId: string;
    variantId: string;
    title: string;
    sku: string;
    price: number;
  }>;
  inventoryValue: number;
}

export interface ShopifyCustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    email: string;
    ordersCount: number;
    totalSpent: number;
  }>;
}

/**
 * Fetch sales report data from Shopify
 * @param timeframe - Time period for the report (e.g., '7d', '30d', '90d')
 */
export async function fetchShopifySalesReport(timeframe: string): Promise<ShopifyOrderReport> {
  const { shopify } = await getShopifyClient();
  
  // Calculate date range based on timeframe
  const endDate = new Date();
  const startDate = new Date();
  
  const days = parseInt(timeframe.replace(/[^0-9]/g, ''));
  startDate.setDate(startDate.getDate() - (isNaN(days) ? 30 : days)); // Default to 30 days if parsing fails
  
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();
  
  try {
    // Fetch orders within date range
    const orders = await shopify.order.list({
      status: 'any',
      created_at_min: startDateStr,
      created_at_max: endDateStr,
      limit: 250
    });
    
    // Initialize report data
    const report: ShopifyOrderReport = {
      totalOrders: orders.length,
      totalRevenue: 0,
      averageOrderValue: 0,
      topProducts: [],
      periodSales: []
    };
    
    // Product sales tracking
    const productSales: Record<string, {
      productId: string;
      title: string;
      sku: string;
      quantity: number;
      revenue: number;
    }> = {};
    
    // Daily sales tracking
    const dailySales: Record<string, {
      date: string;
      orders: number;
      revenue: number;
    }> = {};
    
    // Process orders
    orders.forEach(order => {
      // Skip draft and canceled orders
      if (order.cancelled_at || order.financial_status === 'voided') {
        return;
      }
      
      const orderTotal = parseFloat(order.total_price);
      report.totalRevenue += orderTotal;
      
      // Track daily sales
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      if (!dailySales[orderDate]) {
        dailySales[orderDate] = {
          date: orderDate,
          orders: 0,
          revenue: 0
        };
      }
      dailySales[orderDate].orders += 1;
      dailySales[orderDate].revenue += orderTotal;
      
      // Track product sales
      if (order.line_items && order.line_items.length > 0) {
        order.line_items.forEach(item => {
          const productId = item.product_id?.toString() || 'unknown';
          const sku = item.sku || 'no-sku';
          const title = item.title || 'Unknown Product';
          const quantity = item.quantity || 0;
          const lineTotal = parseFloat(item.price) * quantity;
          
          if (!productSales[productId]) {
            productSales[productId] = {
              productId,
              title,
              sku,
              quantity: 0,
              revenue: 0
            };
          }
          
          productSales[productId].quantity += quantity;
          productSales[productId].revenue += lineTotal;
        });
      }
    });
    
    // Calculate average order value
    report.averageOrderValue = report.totalOrders > 0 
      ? report.totalRevenue / report.totalOrders 
      : 0;
    
    // Sort and limit top products
    report.topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Sort period sales by date
    report.periodSales = Object.values(dailySales)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return report;
  } catch (error) {
    console.error('Error fetching Shopify sales report:', error);
    throw error;
  }
}

/**
 * Fetch inventory report data from Shopify
 */
export async function fetchShopifyInventoryReport(): Promise<ShopifyInventoryReport> {
  const { shopify } = await getShopifyClient();
  
  try {
    // Get all products with their variants
    const products = await shopify.product.list({
      limit: 250,
      fields: 'id,title,variants'
    });
    
    const report: ShopifyInventoryReport = {
      totalProducts: products.length,
      totalVariants: 0,
      lowStockItems: [],
      outOfStockItems: [],
      inventoryValue: 0
    };
    
    // Process products and variants
    for (const product of products) {
      if (!product.variants) continue;
      
      report.totalVariants += product.variants.length;
      
      for (const variant of product.variants) {
        const inventory = variant.inventory_quantity || 0;
        const price = parseFloat(variant.price) || 0;
        const inventoryValue = inventory * price;
        
        report.inventoryValue += inventoryValue;
        
        // Check for low or out of stock items
        if (inventory <= 0) {
          report.outOfStockItems.push({
            productId: product.id.toString(),
            variantId: variant.id.toString(),
            title: `${product.title} - ${variant.title}`,
            sku: variant.sku || 'no-sku',
            price
          });
        } else if (inventory <= 5) {
          report.lowStockItems.push({
            productId: product.id.toString(),
            variantId: variant.id.toString(),
            title: `${product.title} - ${variant.title}`,
            sku: variant.sku || 'no-sku',
            inventory,
            price
          });
        }
      }
    }
    
    // Sort low stock items by inventory level
    report.lowStockItems.sort((a, b) => a.inventory - b.inventory);
    
    return report;
  } catch (error) {
    console.error('Error fetching Shopify inventory report:', error);
    throw error;
  }
}

/**
 * Fetch customer report data from Shopify
 */
export async function fetchShopifyCustomerReport(): Promise<ShopifyCustomerReport> {
  const { shopify } = await getShopifyClient();
  
  try {
    // Get current date and 30 days ago
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const customers = await shopify.customer.list({
      limit: 250
    });
    
    // Initialize report
    const report: ShopifyCustomerReport = {
      totalCustomers: customers.length,
      newCustomers: 0,
      returningCustomers: 0,
      topCustomers: []
    };
    
    // Get orders to calculate customer metrics
    const orders = await shopify.order.list({
      status: 'any',
      limit: 250
    });
    
    // Track customer orders and spending
    const customerMetrics: Record<string, {
      customerId: string;
      name: string;
      email: string;
      ordersCount: number;
      totalSpent: number;
      firstOrderDate?: Date;
    }> = {};
    
    // Process orders to gather customer data
    orders.forEach(order => {
      if (!order.customer || order.cancelled_at) return;
      
      const customerId = order.customer.id.toString();
      const orderDate = new Date(order.created_at);
      const orderTotal = parseFloat(order.total_price);
      
      if (!customerMetrics[customerId]) {
        const customer = order.customer;
        customerMetrics[customerId] = {
          customerId,
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
          email: customer.email || 'no-email',
          ordersCount: 0,
          totalSpent: 0,
          firstOrderDate: orderDate
        };
      } else if (customerMetrics[customerId].firstOrderDate && 
                orderDate < customerMetrics[customerId].firstOrderDate) {
        customerMetrics[customerId].firstOrderDate = orderDate;
      }
      
      customerMetrics[customerId].ordersCount += 1;
      customerMetrics[customerId].totalSpent += orderTotal;
    });
    
    // Calculate new vs returning customers
    Object.values(customerMetrics).forEach(customer => {
      if (customer.firstOrderDate && customer.firstOrderDate >= startDate) {
        report.newCustomers += 1;
      } else {
        report.returningCustomers += 1;
      }
    });
    
    // Sort and get top customers by spending
    report.topCustomers = Object.values(customerMetrics)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(({ customerId, name, email, ordersCount, totalSpent }) => ({
        customerId, name, email, ordersCount, totalSpent
      }));
    
    return report;
  } catch (error) {
    console.error('Error fetching Shopify customer report:', error);
    throw error;
  }
}

// Helper function to get Shopify client
async function getShopifyClient() {
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Shopify credentials are not properly configured');
  }
  
  const shopify = new Shopify({
    shopName: SHOPIFY_STORE,
    accessToken: SHOPIFY_ACCESS_TOKEN,
    apiVersion: '2023-10'
  });
  
  return { 
    shopify, 
    credentials: { 
      shopName: SHOPIFY_STORE, 
      accessToken: SHOPIFY_ACCESS_TOKEN 
    } 
  };
}