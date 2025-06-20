import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema.js';
import type { Item, InsertItem, Sale, InsertSale } from '../shared/schema.js';

// Minimal storage implementation to get system operational
export class MinimalStorage {
  private db;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool, { schema });
  }

  // Essential item methods
  async getItems(): Promise<Item[]> {
    try {
      const items = await this.db.select().from(schema.items);
      return items.sort((a, b) => {
        // Prioritize items with quantities and authentic pricing
        const aHasStock = (a.quantity || 0) > 0;
        const bHasStock = (b.quantity || 0) > 0;
        const aHasPrice = (a.base_price || 0) > 0 || (a.sale_price || 0) > 0;
        const bHasPrice = (b.base_price || 0) > 0 || (b.sale_price || 0) > 0;
        
        if (aHasStock && aHasPrice && !(bHasStock && bHasPrice)) return -1;
        if (!(aHasStock && aHasPrice) && bHasStock && bHasPrice) return 1;
        
        return (b.quantity || 0) - (a.quantity || 0);
      });
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  }

  async getItem(id: number): Promise<Item | undefined> {
    try {
      const items = await this.db.select().from(schema.items).where(schema.eq(schema.items.id, id));
      return items[0];
    } catch (error) {
      console.error('Error fetching item:', error);
      return undefined;
    }
  }

  async createItem(item: InsertItem): Promise<Item> {
    try {
      const result = await this.db.insert(schema.items).values(item).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async updateItem(id: number, updates: Partial<InsertItem>): Promise<Item | undefined> {
    try {
      const result = await this.db.update(schema.items)
        .set(updates)
        .where(schema.eq(schema.items.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating item:', error);
      return undefined;
    }
  }

  async deleteItem(id: number): Promise<boolean> {
    try {
      const result = await this.db.delete(schema.items).where(schema.eq(schema.items.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      return false;
    }
  }

  // Essential sales methods
  async getSales(): Promise<Sale[]> {
    try {
      return await this.db.select().from(schema.sales);
    } catch (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    try {
      const result = await this.db.insert(schema.sales).values(sale).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  // Basic stats
  async getStats() {
    try {
      const items = await this.getItems();
      const sales = await this.getSales();
      
      const totalItems = items.length;
      const activeItems = items.filter(item => 
        (item.quantity || 0) > 0 && 
        ((item.base_price || 0) > 0 || (item.sale_price || 0) > 0)
      ).length;
      
      const totalRevenue = sales.reduce((sum, sale) => {
        const total = parseFloat(sale.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

      return {
        totalItems,
        activeItems,
        totalSales: sales.length,
        totalRevenue
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalItems: 0,
        activeItems: 0,
        totalSales: 0,
        totalRevenue: 0
      };
    }
  }
}