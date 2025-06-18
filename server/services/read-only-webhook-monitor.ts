import { WebhookSecurity } from '../utils/webhook-security.js';
import { db } from '../db.js';
import { webhookLogs } from '../../shared/schema.js';

export class ReadOnlyWebhookMonitor {
  /**
   * Safely process webhooks in read-only mode for $100K/day store
   * Logs all webhook data without making inventory changes
   */
  static async processOrderWebhook(orderData: any) {
    try {
      console.log('[READ-ONLY] Order webhook received:', {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        totalPrice: orderData.total_price,
        customerEmail: orderData.customer?.email,
        lineItemsCount: orderData.line_items?.length,
        timestamp: new Date().toISOString()
      });

      // Log each line item that would affect inventory
      for (const item of orderData.line_items || []) {
        console.log('[READ-ONLY] Would reduce inventory:', {
          productId: item.product_id,
          variantId: item.variant_id,
          sku: item.sku,
          title: item.title,
          quantity: item.quantity,
          price: item.price
        });
      }

      // Store webhook log for monitoring
      await db.insert(webhookLogs).values({
        webhookType: 'orders/create',
        shopifyId: orderData.id.toString(),
        payload: orderData,
        processedAt: new Date(),
        status: 'logged_read_only'
      });

      return { success: true, mode: 'read-only', logged: true };
    } catch (error) {
      console.error('[READ-ONLY] Error processing order webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process customer creation webhook in read-only mode
   */
  static async processCustomerWebhook(customerData: any) {
    try {
      console.log('[READ-ONLY] Customer webhook received:', {
        customerId: customerData.id,
        email: customerData.email,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        ordersCount: customerData.orders_count,
        totalSpent: customerData.total_spent,
        timestamp: new Date().toISOString()
      });

      // Store webhook log
      await db.insert(webhookLogs).values({
        webhookType: 'customers/create',
        shopifyId: customerData.id.toString(),
        payload: customerData,
        processedAt: new Date(),
        status: 'logged_read_only'
      });

      return { success: true, mode: 'read-only', logged: true };
    } catch (error) {
      console.error('[READ-ONLY] Error processing customer webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process product update webhook in read-only mode
   */
  static async processProductWebhook(productData: any) {
    try {
      console.log('[READ-ONLY] Product webhook received:', {
        productId: productData.id,
        title: productData.title,
        handle: productData.handle,
        variantsCount: productData.variants?.length,
        status: productData.status,
        timestamp: new Date().toISOString()
      });

      // Log inventory levels that would be synced
      for (const variant of productData.variants || []) {
        console.log('[READ-ONLY] Would sync inventory:', {
          variantId: variant.id,
          sku: variant.sku,
          inventoryQuantity: variant.inventory_quantity,
          price: variant.price
        });
      }

      // Store webhook log
      await db.insert(webhookLogs).values({
        webhookType: 'products/update',
        shopifyId: productData.id.toString(),
        payload: productData,
        processedAt: new Date(),
        status: 'logged_read_only'
      });

      return { success: true, mode: 'read-only', logged: true };
    } catch (error) {
      console.error('[READ-ONLY] Error processing product webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get webhook monitoring dashboard data
   */
  static async getMonitoringData() {
    try {
      // Get recent webhook logs
      const recentLogs = await db.select()
        .from(webhookLogs)
        .orderBy(webhookLogs.processedAt)
        .limit(100);

      // Count webhooks by type
      const webhookCounts = recentLogs.reduce((acc, log) => {
        acc[log.webhookType] = (acc[log.webhookType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        data: {
          recentLogs: recentLogs.slice(-20), // Last 20 logs
          webhookCounts,
          totalWebhooks: recentLogs.length,
          lastProcessed: recentLogs[recentLogs.length - 1]?.processedAt,
          mode: 'read-only'
        }
      };
    } catch (error) {
      console.error('Error getting monitoring data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check for webhook system
   */
  static async healthCheck() {
    try {
      const hasWebhookSecret = !!process.env.SHOPIFY_WEBHOOK_SECRET;
      const canAccessDatabase = await db.select().from(webhookLogs).limit(1);
      
      return {
        success: true,
        status: 'healthy',
        webhookSecretConfigured: hasWebhookSecret,
        databaseConnected: true,
        mode: 'read-only',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Webhook health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}