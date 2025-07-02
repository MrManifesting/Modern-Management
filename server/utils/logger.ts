/**
 * Logger utility for consistent logging across the application
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'inventory' | 'shopify' | 'webhook' | 'sync';

class Logger {
  getTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatMessage(message: string, level: LogLevel, context?: string): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${contextStr} ${message}`;
  }

  log(message: string, level: LogLevel = 'info', context?: string): void {
    const formattedMessage = this.formatMessage(message, level, context);
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'inventory':
      case 'shopify':
      case 'webhook':
      case 'sync':
        console.log(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  info(message: string, context?: string): void {
    this.log(message, 'info', context);
  }

  warn(message: string, context?: string): void {
    this.log(message, 'warn', context);
  }

  error(message: string, context?: string): void {
    this.log(message, 'error', context);
  }

  debug(message: string, context?: string): void {
    this.log(message, 'debug', context);
  }

  inventory(message: string): void {
    this.log(message, 'inventory', 'inventory');
  }

  shopify(message: string): void {
    this.log(message, 'shopify', 'shopify');
  }

  webhook(message: string): void {
    this.log(message, 'webhook', 'webhook');
  }

  sync(message: string): void {
    this.log(message, 'sync', 'sync');
  }
}

// Create singleton instance
const logger = new Logger();

// Export the main log function for backward compatibility
export const log = logger.log.bind(logger);
export { logger };
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logDebug = logger.debug.bind(logger);