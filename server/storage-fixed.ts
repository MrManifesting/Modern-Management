import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export class FixedStorage {
  async getItems() {
    try {
      const items = await sql`
        SELECT id, name, description, sku, brand, category, 
               base_price, sale_price, cost_price, wholesale_price,
               quantity, status, weight, images, created_at, updated_at
        FROM items 
        ORDER BY 
          CASE 
            WHEN status = 'available' AND quantity > 0 AND (base_price > 0 OR sale_price > 0 OR cost_price > 0) THEN 1
            WHEN status = 'draft' AND quantity > 0 THEN 2
            ELSE 3
          END,
          quantity DESC NULLS LAST,
          id DESC
        LIMIT 100
      `;
      
      return items.map(item => ({
        ...item,
        basePrice: item.base_price,
        salePrice: item.sale_price,
        costPrice: item.cost_price,
        wholesalePrice: item.wholesale_price,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  }

  async getStats() {
    try {
      const [itemStats] = await sql`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN status = 'available' AND quantity > 0 AND (base_price > 0 OR sale_price > 0 OR cost_price > 0) THEN 1 END) as active_items,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_items,
          COUNT(CASE WHEN quantity > 0 THEN 1 END) as items_with_stock,
          COALESCE(SUM(CASE WHEN status = 'available' AND quantity > 0 THEN quantity ELSE 0 END), 0) as total_quantity
        FROM items
      `;

      const [salesStats] = await sql`
        SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(CAST(total AS NUMERIC)), 0) as total_revenue
        FROM sales
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;

      return {
        totalItems: Number(itemStats.total_items),
        activeItems: Number(itemStats.active_items),
        draftItems: Number(itemStats.draft_items),
        itemsWithStock: Number(itemStats.items_with_stock),
        totalQuantity: Number(itemStats.total_quantity),
        totalSales: Number(salesStats.total_sales),
        totalRevenue: Number(salesStats.total_revenue)
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        totalItems: 0,
        activeItems: 0,
        draftItems: 0,
        itemsWithStock: 0,
        totalQuantity: 0,
        totalSales: 0,
        totalRevenue: 0
      };
    }
  }

  async getSales() {
    try {
      const sales = await sql`
        SELECT id, order_id as orderId, total, items, customer_name as customerName, 
               created_at as createdAt, status
        FROM sales 
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      return sales;
    } catch (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
  }

  async getInventoryStats() {
    try {
      const [stats] = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'available' AND quantity > 0 AND (base_price > 0 OR sale_price > 0 OR cost_price > 0) THEN 1 END) as available,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
          COUNT(CASE WHEN base_price > 0 OR sale_price > 0 OR cost_price > 0 THEN 1 END) as withPricing,
          COUNT(CASE WHEN category ILIKE '%flower%' OR name ILIKE '%flower%' THEN 1 END) as flowers,
          COUNT(CASE WHEN status = 'available' AND quantity > 0 AND (base_price > 0 OR sale_price > 0 OR cost_price > 0) THEN 1 END) as activationCandidates,
          COALESCE(SUM(CASE WHEN status = 'available' AND quantity > 0 AND base_price > 0 THEN base_price * quantity END), 0) as totalValue
        FROM items
      `;

      return {
        total: Number(stats.total),
        available: Number(stats.available),
        draft: Number(stats.draft),
        withPricing: Number(stats.withPricing),
        flowers: Number(stats.flowers),
        activationCandidates: Number(stats.activationCandidates),
        totalValue: Number(stats.totalValue)
      };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return {
        total: 0,
        available: 0,
        draft: 0,
        withPricing: 0,
        flowers: 0,
        activationCandidates: 0,
        totalValue: 0
      };
    }
  }

  async getActivationCandidates() {
    try {
      const items = await sql`
        SELECT id, name, sku, base_price, sale_price, cost_price, 
               category, brand, status, quantity
        FROM items 
        WHERE status = 'available' 
          AND quantity > 0 
          AND (base_price > 0 OR sale_price > 0 OR cost_price > 0)
        ORDER BY 
          CASE 
            WHEN category ILIKE '%flower%' OR name ILIKE '%flower%' THEN 1 
            ELSE 2 
          END,
          quantity DESC
        LIMIT 50
      `;
      
      return items.map(item => ({
        ...item,
        base_price: Number(item.base_price) || null,
        sale_price: Number(item.sale_price) || null,
        cost_price: Number(item.cost_price) || null
      }));
    } catch (error) {
      console.error('Error fetching activation candidates:', error);
      return [];
    }
  }
}