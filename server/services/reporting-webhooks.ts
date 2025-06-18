import { storage } from '../storage.js';
import { logger } from '../utils/logger.js';

export interface ReportingWebhookPayload {
  event: 'daily_sales' | 'customer_tier_update' | 'inventory_alert' | 'big_spender_activity';
  timestamp: string;
  data: any;
}

export class ReportingWebhookService {
  private webhookUrls: Map<string, string> = new Map();

  constructor() {
    // Load webhook URLs from environment or configuration
    this.loadWebhookUrls();
  }

  private loadWebhookUrls() {
    const urls = {
      daily_sales: process.env.DAILY_SALES_WEBHOOK_URL,
      customer_tier_update: process.env.CUSTOMER_TIER_WEBHOOK_URL,
      inventory_alert: process.env.INVENTORY_ALERT_WEBHOOK_URL,
      big_spender_activity: process.env.BIG_SPENDER_WEBHOOK_URL,
    };

    Object.entries(urls).forEach(([event, url]) => {
      if (url) {
        this.webhookUrls.set(event, url);
        logger.info(`Reporting webhook configured for ${event}: ${url}`, 'webhook');
      }
    });
  }

  async sendDailySalesReport() {
    try {
      const sales = await storage.getRecentSales(1); // Last 24 hours
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || '0'), 0);
      const orderCount = sales.length;

      const payload: ReportingWebhookPayload = {
        event: 'daily_sales',
        timestamp: new Date().toISOString(),
        data: {
          date: new Date().toISOString().split('T')[0],
          totalRevenue,
          orderCount,
          averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
          sales: sales.slice(0, 10) // Top 10 sales for context
        }
      };

      await this.sendWebhook('daily_sales', payload);
      logger.info(`Daily sales report sent: $${totalRevenue} from ${orderCount} orders`, 'webhook');
    } catch (error) {
      logger.error(`Failed to send daily sales report: ${error}`, 'webhook');
    }
  }

  async sendCustomerTierUpdate(customerId: number, oldTier: string, newTier: string) {
    try {
      const customer = await storage.getCustomer(customerId);
      if (!customer) return;

      const payload: ReportingWebhookPayload = {
        event: 'customer_tier_update',
        timestamp: new Date().toISOString(),
        data: {
          customerId,
          customerName: customer.name,
          customerEmail: customer.email,
          oldTier,
          newTier,
          totalSpent: customer.totalSpent,
          totalOrders: customer.totalOrders,
          priorityLevel: customer.priorityLevel
        }
      };

      await this.sendWebhook('customer_tier_update', payload);
      logger.info(`Customer tier update sent: ${customer.name} ${oldTier} → ${newTier}`, 'webhook');
    } catch (error) {
      logger.error(`Failed to send customer tier update: ${error}`, 'webhook');
    }
  }

  async sendInventoryAlert(itemId: number, currentQuantity: number, threshold: number) {
    try {
      const item = await storage.getItem(itemId);
      if (!item) return;

      const payload: ReportingWebhookPayload = {
        event: 'inventory_alert',
        timestamp: new Date().toISOString(),
        data: {
          itemId,
          itemName: item.name,
          sku: item.sku,
          currentQuantity,
          threshold,
          status: item.status,
          basePrice: item.basePrice
        }
      };

      await this.sendWebhook('inventory_alert', payload);
      logger.info(`Inventory alert sent: ${item.name} (${currentQuantity} remaining)`, 'webhook');
    } catch (error) {
      logger.error(`Failed to send inventory alert: ${error}`, 'webhook');
    }
  }

  async sendBigSpenderActivity(customerId: number, orderAmount: number, isNewTier: boolean = false) {
    try {
      const customer = await storage.getCustomer(customerId);
      if (!customer) return;

      const payload: ReportingWebhookPayload = {
        event: 'big_spender_activity',
        timestamp: new Date().toISOString(),
        data: {
          customerId,
          customerName: customer.name,
          customerEmail: customer.email,
          orderAmount,
          totalSpent: customer.totalSpent,
          tier: customer.tier,
          priorityLevel: customer.priorityLevel,
          isNewTier,
          lifetimeValue: customer.lifetimeValue
        }
      };

      await this.sendWebhook('big_spender_activity', payload);
      logger.info(`Big spender activity sent: ${customer.name} spent $${orderAmount}`, 'webhook');
    } catch (error) {
      logger.error(`Failed to send big spender activity: ${error}`, 'webhook');
    }
  }

  private async sendWebhook(event: string, payload: ReportingWebhookPayload) {
    const url = this.webhookUrls.get(event);
    if (!url) {
      logger.warn(`No webhook URL configured for event: ${event}`, 'webhook');
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'InventorySystem/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info(`Webhook sent successfully: ${event}`, 'webhook');
    } catch (error) {
      logger.error(`Failed to send webhook ${event}: ${error}`, 'webhook');
      throw error;
    }
  }

  // Manual trigger methods for testing
  async triggerTestWebhook(event: string, testData?: any) {
    const payload: ReportingWebhookPayload = {
      event: event as any,
      timestamp: new Date().toISOString(),
      data: testData || { test: true, message: `Test webhook for ${event}` }
    };

    await this.sendWebhook(event, payload);
  }

  getConfiguredWebhooks(): string[] {
    return Array.from(this.webhookUrls.keys());
  }
}

export const reportingWebhooks = new ReportingWebhookService();