import { 
  Item, InsertItem, 
  Marketplace, InsertMarketplace,
  Sale, InsertSale, ReportParams, SalesReport, TimeSeriesData
} from "@shared/schema";

// Interface for storage methods
export interface IStorage {
  // Item methods
  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: number): Promise<boolean>;
  
  // Marketplace methods
  getMarketplaces(): Promise<Marketplace[]>;
  getMarketplace(id: number): Promise<Marketplace | undefined>;
  createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace>;
  updateMarketplace(id: number, marketplace: Partial<InsertMarketplace>): Promise<Marketplace | undefined>;
  deleteMarketplace(id: number): Promise<boolean>;
  connectMarketplace(id: number): Promise<Marketplace | undefined>;
  
  // Sales methods
  getSales(): Promise<Sale[]>;
  getSale(id: number): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: number, sale: Partial<InsertSale>): Promise<Sale | undefined>;
  deleteSale(id: number): Promise<boolean>;
  
  // Analytics methods
  getSalesReport(params: ReportParams): Promise<SalesReport>;
  getSalesTimeSeries(params: ReportParams): Promise<TimeSeriesData[]>;
  getTopSellingItems(limit?: number): Promise<{id: number, name: string, quantity: number, revenue: number}[]>;
  getSalesByMarketplace(): Promise<{name: string, sales: number, revenue: number}[]>;
  getSalesByCategory(): Promise<{name: string, sales: number, revenue: number}[]>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private items: Map<number, Item>;
  private marketplaces: Map<number, Marketplace>;
  private sales: Map<number, Sale>;
  private itemCurrentId: number;
  private marketplaceCurrentId: number;
  private salesCurrentId: number;

  constructor() {
    this.items = new Map();
    this.marketplaces = new Map();
    this.sales = new Map();
    this.itemCurrentId = 1;
    this.marketplaceCurrentId = 1;
    this.salesCurrentId = 1;
    
    // Initialize with some default marketplaces
    this.initializeMarketplaces();
  }

  private initializeMarketplaces() {
    const defaultMarketplaces: InsertMarketplace[] = [
      { name: "eBay", isConnected: true, credentials: {} },
      { name: "Etsy", isConnected: true, credentials: {} },
      { name: "Amazon", isConnected: true, credentials: {} },
      { name: "Shopify", isConnected: false, credentials: {} },
    ];

    defaultMarketplaces.forEach(marketplace => {
      this.createMarketplace(marketplace);
    });
  }

  // Item methods
  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(item: InsertItem): Promise<Item> {
    const id = this.itemCurrentId++;
    const now = new Date();
    const newItem: Item = { 
      ...item, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    
    this.items.set(id, newItem);
    return newItem;
  }

  async updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined> {
    const existingItem = this.items.get(id);
    
    if (!existingItem) {
      return undefined;
    }
    
    const updatedItem: Item = {
      ...existingItem,
      ...item,
      updatedAt: new Date()
    };
    
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deleteItem(id: number): Promise<boolean> {
    return this.items.delete(id);
  }

  // Marketplace methods
  async getMarketplaces(): Promise<Marketplace[]> {
    return Array.from(this.marketplaces.values());
  }

  async getMarketplace(id: number): Promise<Marketplace | undefined> {
    return this.marketplaces.get(id);
  }

  async createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace> {
    const id = this.marketplaceCurrentId++;
    const now = new Date();
    const newMarketplace: Marketplace = {
      ...marketplace,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.marketplaces.set(id, newMarketplace);
    return newMarketplace;
  }

  async updateMarketplace(id: number, marketplace: Partial<InsertMarketplace>): Promise<Marketplace | undefined> {
    const existingMarketplace = this.marketplaces.get(id);
    
    if (!existingMarketplace) {
      return undefined;
    }
    
    const updatedMarketplace: Marketplace = {
      ...existingMarketplace,
      ...marketplace,
      updatedAt: new Date()
    };
    
    this.marketplaces.set(id, updatedMarketplace);
    return updatedMarketplace;
  }

  async deleteMarketplace(id: number): Promise<boolean> {
    return this.marketplaces.delete(id);
  }

  async connectMarketplace(id: number): Promise<Marketplace | undefined> {
    const marketplace = this.marketplaces.get(id);
    
    if (!marketplace) {
      return undefined;
    }
    
    const updatedMarketplace: Marketplace = {
      ...marketplace,
      isConnected: true,
      updatedAt: new Date()
    };
    
    this.marketplaces.set(id, updatedMarketplace);
    return updatedMarketplace;
  }
  
  // Sales methods
  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }

  async getSale(id: number): Promise<Sale | undefined> {
    return this.sales.get(id);
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const id = this.salesCurrentId++;
    const now = new Date();
    const newSale: Sale = {
      ...sale,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.sales.set(id, newSale);
    
    // If the sale was successful, update the item's quantity
    if (sale.status !== 'cancelled' && sale.status !== 'refunded') {
      const item = this.items.get(sale.itemId);
      if (item) {
        const newQuantity = Math.max(0, item.quantity - sale.quantity);
        this.updateItem(item.id, { quantity: newQuantity });
      }
    }
    
    return newSale;
  }

  async updateSale(id: number, sale: Partial<InsertSale>): Promise<Sale | undefined> {
    const existingSale = this.sales.get(id);
    
    if (!existingSale) {
      return undefined;
    }
    
    const updatedSale: Sale = {
      ...existingSale,
      ...sale,
      updatedAt: new Date()
    };
    
    this.sales.set(id, updatedSale);
    
    // Handle quantity adjustments if status changed
    if (sale.status && sale.status !== existingSale.status) {
      const item = this.items.get(existingSale.itemId);
      if (item) {
        let quantityAdjustment = 0;
        
        if (existingSale.status === 'completed' && (sale.status === 'cancelled' || sale.status === 'refunded')) {
          // Return the quantity to inventory (sale was cancelled/refunded)
          quantityAdjustment = existingSale.quantity;
        } else if ((existingSale.status === 'cancelled' || existingSale.status === 'refunded') && sale.status === 'completed') {
          // Remove quantity from inventory (sale was reinstated)
          quantityAdjustment = -existingSale.quantity;
        }
        
        if (quantityAdjustment !== 0) {
          const newQuantity = Math.max(0, item.quantity + quantityAdjustment);
          this.updateItem(item.id, { quantity: newQuantity });
        }
      }
    }
    
    return updatedSale;
  }

  async deleteSale(id: number): Promise<boolean> {
    // Get sale before deleting to restore inventory if needed
    const sale = this.sales.get(id);
    
    if (sale && sale.status === 'completed') {
      // Restore the quantity to inventory
      const item = this.items.get(sale.itemId);
      if (item) {
        const newQuantity = item.quantity + sale.quantity;
        this.updateItem(item.id, { quantity: newQuantity });
      }
    }
    
    return this.sales.delete(id);
  }
  
  // Analytics methods
  async getSalesReport(params: ReportParams): Promise<SalesReport> {
    const { startDate, endDate, marketplaces = [], categories = [] } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter sales by date range and optional marketplaces
    const filteredSales = Array.from(this.sales.values()).filter(sale => {
      const saleDate = new Date(sale.saleDate);
      const matchesDateRange = saleDate >= start && saleDate <= end;
      const matchesMarketplace = marketplaces.length === 0 || marketplaces.includes(sale.marketplace);
      
      let matchesCategory = true;
      if (categories.length > 0) {
        const item = this.items.get(sale.itemId);
        if (item) {
          matchesCategory = categories.includes(item.category);
        } else {
          matchesCategory = false;
        }
      }
      
      return matchesDateRange && matchesMarketplace && matchesCategory;
    });
    
    // Calculate summary statistics
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.salePrice * sale.quantity), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => {
      const item = this.items.get(sale.itemId);
      if (item) {
        const itemCost = item.price; // Assuming price is our cost
        const profit = (sale.salePrice - itemCost) * sale.quantity - sale.fees - sale.shippingCost;
        return sum + profit;
      }
      return sum;
    }, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Calculate best selling item
    const itemSales = new Map<number, { id: number, name: string, quantity: number, revenue: number }>();
    
    filteredSales.forEach(sale => {
      const item = this.items.get(sale.itemId);
      if (item) {
        const existing = itemSales.get(item.id) || { id: item.id, name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += sale.quantity;
        existing.revenue += sale.salePrice * sale.quantity;
        itemSales.set(item.id, existing);
      }
    });
    
    let bestSellingItem = null;
    let bestItemRevenue = 0;
    
    itemSales.forEach(item => {
      if (item.revenue > bestItemRevenue) {
        bestSellingItem = item;
        bestItemRevenue = item.revenue;
      }
    });
    
    // Calculate best marketplace
    const marketplaceSales = new Map<string, { name: string, sales: number, revenue: number }>();
    
    filteredSales.forEach(sale => {
      const existing = marketplaceSales.get(sale.marketplace) || { name: sale.marketplace, sales: 0, revenue: 0 };
      existing.sales += 1;
      existing.revenue += sale.salePrice * sale.quantity;
      marketplaceSales.set(sale.marketplace, existing);
    });
    
    let bestMarketplace = null;
    let bestMarketplaceRevenue = 0;
    
    marketplaceSales.forEach(marketplace => {
      if (marketplace.revenue > bestMarketplaceRevenue) {
        bestMarketplace = marketplace;
        bestMarketplaceRevenue = marketplace.revenue;
      }
    });
    
    // Calculate top category
    const categorySales = new Map<string, { name: string, sales: number, revenue: number }>();
    
    filteredSales.forEach(sale => {
      const item = this.items.get(sale.itemId);
      if (item) {
        const existing = categorySales.get(item.category) || { name: item.category, sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += sale.salePrice * sale.quantity;
        categorySales.set(item.category, existing);
      }
    });
    
    let topCategory = null;
    let topCategoryRevenue = 0;
    
    categorySales.forEach(category => {
      if (category.revenue > topCategoryRevenue) {
        topCategory = category;
        topCategoryRevenue = category.revenue;
      }
    });
    
    // Generate time series data based on groupBy parameter
    const timeSeries = this.generateTimeSeries(filteredSales, params.groupBy);
    
    // Generate category and marketplace breakdowns
    const categoryBreakdown = Array.from(categorySales.values()).map(category => {
      return {
        name: category.name,
        value: category.revenue,
        percentage: totalRevenue > 0 ? (category.revenue / totalRevenue) * 100 : 0
      };
    });
    
    const marketplaceBreakdown = Array.from(marketplaceSales.values()).map(marketplace => {
      return {
        name: marketplace.name,
        value: marketplace.revenue,
        percentage: totalRevenue > 0 ? (marketplace.revenue / totalRevenue) * 100 : 0
      };
    });
    
    // Generate top products
    const topProducts = Array.from(itemSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(item => {
        const product = this.items.get(item.id);
        const totalItemProfit = filteredSales
          .filter(sale => sale.itemId === item.id)
          .reduce((sum, sale) => {
            const profit = (sale.salePrice - (product?.price || 0)) * sale.quantity - sale.fees - sale.shippingCost;
            return sum + profit;
          }, 0);
        
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          revenue: item.revenue,
          profit: totalItemProfit
        };
      });
    
    return {
      summary: {
        totalSales,
        totalRevenue,
        totalProfit,
        averageOrderValue,
        bestSellingItem,
        bestMarketplace,
        topCategory
      },
      timeSeries,
      categoryBreakdown,
      marketplaceBreakdown,
      topProducts
    };
  }
  
  private generateTimeSeries(sales: Sale[], groupBy: string): TimeSeriesData[] {
    const timeSeriesMap = new Map<string, { label: string, sales: number, revenue: number, profit: number }>();
    
    sales.forEach(sale => {
      let label = '';
      
      if (groupBy === 'marketplace') {
        label = sale.marketplace;
      } else if (groupBy === 'category') {
        const item = this.items.get(sale.itemId);
        label = item ? item.category : 'Unknown';
      } else {
        // Date-based grouping
        const date = new Date(sale.saleDate);
        
        if (groupBy === 'day') {
          label = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (groupBy === 'week') {
          // Get the first day of the week (Sunday)
          const day = date.getDay();
          const diff = date.getDate() - day;
          const weekStart = new Date(date);
          weekStart.setDate(diff);
          label = weekStart.toISOString().split('T')[0];
        } else if (groupBy === 'month') {
          label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
      }
      
      const existing = timeSeriesMap.get(label) || { label, sales: 0, revenue: 0, profit: 0 };
      
      existing.sales += 1;
      existing.revenue += sale.salePrice * sale.quantity;
      
      const item = this.items.get(sale.itemId);
      if (item) {
        const profit = (sale.salePrice - item.price) * sale.quantity - sale.fees - sale.shippingCost;
        existing.profit += profit;
      }
      
      timeSeriesMap.set(label, existing);
    });
    
    // For date-based grouping, sort by date
    const result = Array.from(timeSeriesMap.values());
    
    if (['day', 'week', 'month'].includes(groupBy)) {
      result.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      // For marketplace or category, sort by revenue
      result.sort((a, b) => b.revenue - a.revenue);
    }
    
    return result;
  }
  
  async getSalesTimeSeries(params: ReportParams): Promise<TimeSeriesData[]> {
    const report = await this.getSalesReport(params);
    return report.timeSeries;
  }
  
  async getTopSellingItems(limit: number = 5): Promise<{ id: number, name: string, quantity: number, revenue: number }[]> {
    const allSales = Array.from(this.sales.values());
    const itemSales = new Map<number, { id: number, name: string, quantity: number, revenue: number }>();
    
    allSales.forEach(sale => {
      const item = this.items.get(sale.itemId);
      if (item) {
        const existing = itemSales.get(item.id) || { id: item.id, name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += sale.quantity;
        existing.revenue += sale.salePrice * sale.quantity;
        itemSales.set(item.id, existing);
      }
    });
    
    return Array.from(itemSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
  
  async getSalesByMarketplace(): Promise<{ name: string, sales: number, revenue: number }[]> {
    const allSales = Array.from(this.sales.values());
    const marketplaceSales = new Map<string, { name: string, sales: number, revenue: number }>();
    
    allSales.forEach(sale => {
      const existing = marketplaceSales.get(sale.marketplace) || { name: sale.marketplace, sales: 0, revenue: 0 };
      existing.sales += 1;
      existing.revenue += sale.salePrice * sale.quantity;
      marketplaceSales.set(sale.marketplace, existing);
    });
    
    return Array.from(marketplaceSales.values())
      .sort((a, b) => b.revenue - a.revenue);
  }
  
  async getSalesByCategory(): Promise<{ name: string, sales: number, revenue: number }[]> {
    const allSales = Array.from(this.sales.values());
    const categorySales = new Map<string, { name: string, sales: number, revenue: number }>();
    
    allSales.forEach(sale => {
      const item = this.items.get(sale.itemId);
      if (item) {
        const existing = categorySales.get(item.category) || { name: item.category, sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += sale.salePrice * sale.quantity;
        categorySales.set(item.category, existing);
      }
    });
    
    return Array.from(categorySales.values())
      .sort((a, b) => b.revenue - a.revenue);
  }
}

// Create and export storage instance
export const storage = new MemStorage();
