import fs from 'fs';
import path from 'path';

// Directory to store log files
const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure the log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

interface LogEntry {
  timestamp: string;
  marketplaceId: number;
  operation: string;
  data: any;
  success: boolean;
  message: string;
}

/**
 * Log a marketplace operation
 * 
 * @param marketplaceId The ID of the marketplace
 * @param operation The operation being performed
 * @param data Additional data about the operation
 * @param success Whether the operation was successful
 * @param message A message describing the operation result
 */
export function logOperation(
  marketplaceId: number,
  operation: string,
  data: any,
  success: boolean,
  message: string
): void {
  try {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      marketplaceId,
      operation,
      data,
      success,
      message
    };
    
    const logPath = path.join(LOG_DIR, `marketplace-${marketplaceId}-operations.log`);
    
    // Append to the log file
    fs.appendFileSync(
      logPath,
      JSON.stringify(logEntry) + '\n',
      'utf8'
    );
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Marketplace ${marketplaceId}] ${operation}: ${message}`);
    }
  } catch (error) {
    console.error('Failed to log marketplace operation:', error);
  }
}

/**
 * Get the operations log for a marketplace
 * 
 * @param marketplaceId The ID of the marketplace
 * @param limit The maximum number of log entries to return
 * @returns An array of log entries
 */
export function getOperationsLog(marketplaceId: number, limit: number = 100): LogEntry[] {
  try {
    const logPath = path.join(LOG_DIR, `marketplace-${marketplaceId}-operations.log`);
    
    // If the log file doesn't exist, return an empty array
    if (!fs.existsSync(logPath)) {
      return [];
    }
    
    // Read the log file
    const logContent = fs.readFileSync(logPath, 'utf8');
    
    // Parse the log entries
    const entries = logContent
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line) as LogEntry)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Return the requested number of entries
    return entries.slice(0, limit);
  } catch (error) {
    console.error(`Failed to get operations log for marketplace ${marketplaceId}:`, error);
    return [];
  }
}

/**
 * Clear the operations log for a marketplace
 * 
 * @param marketplaceId The ID of the marketplace
 */
export function clearOperationsLog(marketplaceId: number): boolean {
  try {
    const logPath = path.join(LOG_DIR, `marketplace-${marketplaceId}-operations.log`);
    
    // If the log file doesn't exist, return success
    if (!fs.existsSync(logPath)) {
      return true;
    }
    
    // Clear the log file
    fs.writeFileSync(logPath, '', 'utf8');
    return true;
  } catch (error) {
    console.error(`Failed to clear operations log for marketplace ${marketplaceId}:`, error);
    return false;
  }
}