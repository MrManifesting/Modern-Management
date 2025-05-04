import { type Marketplace, marketplaces } from '@shared/schema';
import { db } from '../db';
import { sql, eq } from 'drizzle-orm';

/**
 * Service for logging marketplace operations
 */
export class MarketplaceLogger {
  /**
   * Log an operation for a marketplace
   * 
   * @param marketplace The marketplace to log for
   * @param operation The operation being performed
   * @param details Additional details about the operation
   * @param status The status of the operation (success/error)
   * @param error Optional error message
   */
  static async logOperation(
    marketplace: Marketplace,
    operation: string,
    details: string,
    status: 'success' | 'error' | 'info' | 'warning',
    error?: string
  ) {
    try {
      // Get current log
      const currentLog = marketplace.syncLog || [];
      
      // Add new log entry
      const newEntry = {
        timestamp: new Date().toISOString(),
        operation,
        details,
        status,
        error
      };
      
      // Add new entry to the beginning of the log (most recent first)
      const updatedLog = [newEntry, ...Array.isArray(currentLog) ? currentLog.slice(0, 99) : []]; // Keep last 100 entries
      
      // Update marketplace with new log
      await db.update(marketplaces)
        .set({ 
          syncLog: updatedLog,
          // Also update lastSyncDate if this was a sync operation and it succeeded
          ...(operation.toLowerCase().includes('sync') && status === 'success' 
            ? { lastSyncDate: new Date() } 
            : {})
        })
        .where(eq(marketplaces.id, marketplace.id));
        
      return true;
    } catch (error) {
      console.error('Error logging marketplace operation:', error);
      return false;
    }
  }
  
  /**
   * Clear the operation log for a marketplace
   * 
   * @param marketplaceId The ID of the marketplace to clear logs for
   */
  static async clearLog(marketplaceId: number) {
    try {
      await db.update(marketplaces)
        .set({ syncLog: [] })
        .where(eq(marketplaces.id, marketplaceId));
        
      return true;
    } catch (error) {
      console.error('Error clearing marketplace log:', error);
      return false;
    }
  }
  
  /**
   * Get the operation log for a marketplace
   * 
   * @param marketplaceId The ID of the marketplace to get logs for
   */
  static async getLog(marketplaceId: number) {
    try {
      const marketplace = await db.query.marketplaces.findFirst({
        where: eq(marketplaces.id, marketplaceId)
      });
      
      if (!marketplace) {
        return [];
      }
      
      return marketplace.syncLog || [];
    } catch (error) {
      console.error('Error getting marketplace log:', error);
      return [];
    }
  }
}