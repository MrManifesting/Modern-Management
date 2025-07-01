import crypto from 'crypto';

export class WebhookSecurity {
  private static webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  /**
   * Verify Shopify webhook signature for production security
   * Critical for $100K/day store operations
   */
  static verifyShopifyWebhook(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.error('SHOPIFY_WEBHOOK_SECRET not configured - webhooks cannot be verified');
      return false;
    }

    if (!signature) {
      console.error('Missing webhook signature header');
      return false;
    }

    try {
      // Shopify sends signature as base64-encoded HMAC-SHA256
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(rawBody, 'utf8');
      const computedSignature = hmac.digest('base64');

      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace('sha256=', '');
      
      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature),
        Buffer.from(cleanSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Middleware for webhook signature verification
   * Blocks unauthorized requests to protect high-volume operations
   */
  static createVerificationMiddleware() {
    return (req: any, res: any, next: any) => {
      const signature = req.get('X-Shopify-Hmac-Sha256');
      const rawBody = req.rawBody || JSON.stringify(req.body);

      if (!this.verifyShopifyWebhook(rawBody, signature)) {
        console.error('Webhook verification failed - blocking request');
        return res.status(401).json({ 
          error: 'Unauthorized webhook request',
          timestamp: new Date().toISOString()
        });
      }

      console.log('Webhook signature verified successfully');
      next();
    };
  }

  /**
   * Safe webhook processing for read-only mode
   * Logs all webhook data without making changes
   */
  static logWebhookSafely(webhookType: string, data: any) {
    console.log(`[WEBHOOK-SAFE] ${webhookType}:`, {
      timestamp: new Date().toISOString(),
      type: webhookType,
      dataSize: JSON.stringify(data).length,
      summary: {
        id: data.id,
        name: data.name || data.title,
        total: data.total_price || data.subtotal_price,
        customer: data.customer?.email,
        items: data.line_items?.length
      }
    });
  }

  /**
   * Production-ready webhook rate limiting
   * Prevents webhook flooding for high-volume stores
   */
  static rateLimiter = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(clientId: string, maxRequests = 1000, windowMs = 60000): boolean {
    const now = Date.now();
    const clientData = this.rateLimiter.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      this.rateLimiter.set(clientId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (clientData.count >= maxRequests) {
      console.warn(`Rate limit exceeded for client ${clientId}`);
      return false;
    }

    clientData.count++;
    return true;
  }
}