import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { items, Item } from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export class Storage {
  async getAllItems(): Promise<Item[]> {
    try {
      const result = await db.select().from(items).orderBy(desc(items.id));
      return result;
    } catch (error) {
      console.error('Database error in getAllItems:', error);
      return [];
    }
  }

  async getItems(): Promise<Item[]> {
    try {
      const result = await db.select().from(items)
        .where(and(
          eq(items.status, 'active'),
          gte(items.quantity, 1)
        ))
        .orderBy(desc(items.quantity));
      return result;
    } catch (error) {
      console.error('Database error in getItems:', error);
      return [];
    }
  }

  async getItemById(id: number): Promise<Item | null> {
    try {
      const result = await db.select().from(items).where(eq(items.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Database error in getItemById:', error);
      return null;
    }
  }

  async updateItem(id: number, updates: Partial<Item>): Promise<boolean> {
    try {
      await db.update(items).set(updates).where(eq(items.id, id));
      return true;
    } catch (error) {
      console.error('Database error in updateItem:', error);
      return false;
    }
  }

  async createItem(item: Omit<Item, 'id'>): Promise<Item | null> {
    try {
      const result = await db.insert(items).values(item).returning();
      return result[0] || null;
    } catch (error) {
      console.error('Database error in createItem:', error);
      return null;
    }
  }

  async deleteItem(id: number): Promise<boolean> {
    try {
      await db.delete(items).where(eq(items.id, id));
      return true;
    } catch (error) {
      console.error('Database error in deleteItem:', error);
      return false;
    }
  }
}

export const storage = new Storage();