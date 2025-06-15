/**
 * Rate Limiter for Shopify API calls
 * Ensures we don't exceed Shopify's API rate limits (2 calls per second)
 */

class RateLimiter {
  private lastCallTime: number = 0;
  private callQueue: (() => void)[] = [];
  private isProcessing: boolean = false;
  private minInterval: number;

  constructor(callsPerSecond: number = 2) {
    this.minInterval = 1000 / callsPerSecond; // milliseconds between calls
  }

  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.callQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.callQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.callQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      
      if (timeSinceLastCall < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastCall;
        await this.sleep(waitTime);
      }

      const fn = this.callQueue.shift();
      if (fn) {
        this.lastCallTime = Date.now();
        await fn();
      }
    }

    this.isProcessing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Add exponential backoff for 429 errors
  async executeWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        return await this.executeWithRateLimit(fn);
      } catch (error: any) {
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          retries++;
          if (retries > maxRetries) {
            throw new Error(`Max retries exceeded. Last error: ${error.message}`);
          }
          
          const backoffTime = Math.pow(2, retries) * 1000; // Exponential backoff
          console.log(`Rate limit hit, waiting ${backoffTime}ms before retry ${retries}/${maxRetries}`);
          await this.sleep(backoffTime);
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Unexpected error in rate limiter');
  }
}

// Singleton instance for Shopify API calls
export const shopifyRateLimiter = new RateLimiter(1); // Very conservative: 1 call per second