/**
 * Logger utility for consistent logging across the application
 */

class Logger {
  getTimestamp() {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatMessage(message, level, context) {
    const timestamp = this.getTimestamp();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${contextStr} ${message}`;
  }

  log(message, level = 'info', context) {
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

  info(message, context) {
    this.log(message, 'info', context);
  }

  warn(message, context) {
    this.log(message, 'warn', context);
  }

  error(message, context) {
    this.log(message, 'error', context);
  }

  debug(message, context) {
    this.log(message, 'debug', context);
  }

  inventory(message) {
    this.log(message, 'inventory', 'inventory');
  }

  shopify(message) {
    this.log(message, 'shopify', 'shopify');
  }

  webhook(message) {
    this.log(message, 'webhook', 'webhook');
  }

  sync(message) {
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