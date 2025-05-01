import { 
  Item, InsertItem, 
  Marketplace, InsertMarketplace,
  Sale, InsertSale, ReportParams, SalesReport, TimeSeriesData,
  Employee, InsertEmployee, InventoryAction, InsertInventoryAction,
  ProductBreakdown, InsertProductBreakdown, BreakdownTarget, breakdownTargetSchema,
  ItemType, BreakdownStatus
} from "@shared/schema";

// Interface for storage methods
export interface IStorage {
  // Item methods
  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: number): Promise<boolean>;
  getItemBySku(sku: string): Promise<Item | undefined>;
  getBulkItems(): Promise<Item[]>;
  getBreakdownItems(): Promise<Item[]>;
  getWaitingItems(): Promise<Item[]>;
  
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
  
  // Employee methods
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;
  
  // Inventory Action methods
  getInventoryActions(filters?: { itemId?: number, employeeId?: number, actionType?: string }): Promise<InventoryAction[]>;
  getInventoryAction(id: number): Promise<InventoryAction | undefined>;
  createInventoryAction(action: InsertInventoryAction): Promise<InventoryAction>;
  getInventoryActionsByItem(itemId: number): Promise<InventoryAction[]>;
  getInventoryActionsByEmployee(employeeId: number): Promise<InventoryAction[]>;
  
  // Product Breakdown methods
  getProductBreakdowns(): Promise<ProductBreakdown[]>;
  getProductBreakdown(id: number): Promise<ProductBreakdown | undefined>;
  createProductBreakdown(breakdown: InsertProductBreakdown): Promise<ProductBreakdown>;
  updateProductBreakdown(id: number, breakdown: Partial<InsertProductBreakdown>): Promise<ProductBreakdown | undefined>;
  completeProductBreakdown(id: number, completedProducts: number[]): Promise<ProductBreakdown | undefined>;
  deleteProductBreakdown(id: number): Promise<boolean>;
  
  // Bulk product management
  moveToBulkWaiting(bulkItemId: number, quantity: number, employeeId: number): Promise<Item | undefined>;
  createBreakdownProducts(breakdownId: number, targetProducts: BreakdownTarget[], employeeId: number): Promise<Item[]>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private items: Map<number, Item>;
  private marketplaces: Map<number, Marketplace>;
  private sales: Map<number, Sale>;
  private employees: Map<number, Employee>;
  private inventoryActions: Map<number, InventoryAction>;
  private productBreakdowns: Map<number, ProductBreakdown>;
  private itemCurrentId: number;
  private marketplaceCurrentId: number;
  private salesCurrentId: number;
  private employeeCurrentId: number;
  private inventoryActionCurrentId: number;
  private breakdownCurrentId: number;

  constructor() {
    this.items = new Map();
    this.marketplaces = new Map();
    this.sales = new Map();
    this.employees = new Map();
    this.inventoryActions = new Map();
    this.productBreakdowns = new Map();
    this.itemCurrentId = 1;
    this.marketplaceCurrentId = 1;
    this.salesCurrentId = 1;
    this.employeeCurrentId = 1;
    this.inventoryActionCurrentId = 1;
    this.breakdownCurrentId = 1;
    
    // Initialize with some default marketplaces
    this.initializeMarketplaces();
    
    // Initialize with a default admin employee
    this.initializeEmployees();
  }
  
  private initializeEmployees() {
    const defaultEmployee: InsertEmployee = {
      employeeId: "ADMIN001",
      name: "Admin User",
      email: "admin@mrmanifestlister.com",
      role: "admin",
      department: "management",
      active: true,
      pin: "123456"
    };
    
    this.createEmployee(defaultEmployee);
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
      if (item && sale.quantity) {
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
        const profit = (sale.salePrice - itemCost) * sale.quantity - (sale.fees || 0) - (sale.shippingCost || 0);
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
        const itemEntity = this.items.get(item.id);
        if (!itemEntity) {
          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            revenue: item.revenue,
            profit: 0
          };
        }
        
        // Calculate profit for this item
        const itemSalesList = filteredSales.filter(sale => sale.itemId === item.id);
        const profit = itemSalesList.reduce((total, sale) => {
          const profitPerUnit = sale.salePrice - itemEntity.price;
          return total + (profitPerUnit * sale.quantity) - (sale.fees || 0) - (sale.shippingCost || 0);
        }, 0);
        
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          revenue: item.revenue,
          profit
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
    if (sales.length === 0) {
      return [];
    }
    
    if (groupBy === 'marketplace') {
      // Group by marketplace
      const marketplaceData = new Map<string, { sales: number, revenue: number, profit: number }>();
      
      sales.forEach(sale => {
        const existing = marketplaceData.get(sale.marketplace) || { sales: 0, revenue: 0, profit: 0 };
        existing.sales += 1;
        
        const revenue = sale.salePrice * sale.quantity;
        existing.revenue += revenue;
        
        const item = this.items.get(sale.itemId);
        if (item) {
          const profit = (sale.salePrice - item.price) * sale.quantity - (sale.fees || 0) - (sale.shippingCost || 0);
          existing.profit += profit;
        }
        
        marketplaceData.set(sale.marketplace, existing);
      });
      
      return Array.from(marketplaceData.entries()).map(([name, data]) => {
        return {
          label: name,
          sales: data.sales,
          revenue: data.revenue,
          profit: data.profit
        };
      });
    } else if (groupBy === 'category') {
      // Group by category
      const categoryData = new Map<string, { sales: number, revenue: number, profit: number }>();
      
      sales.forEach(sale => {
        const item = this.items.get(sale.itemId);
        if (!item) return;
        
        const category = item.category;
        const existing = categoryData.get(category) || { sales: 0, revenue: 0, profit: 0 };
        existing.sales += 1;
        
        const revenue = sale.salePrice * sale.quantity;
        existing.revenue += revenue;
        
        const profit = (sale.salePrice - item.price) * sale.quantity - (sale.fees || 0) - (sale.shippingCost || 0);
        existing.profit += profit;
        
        categoryData.set(category, existing);
      });
      
      return Array.from(categoryData.entries()).map(([name, data]) => {
        return {
          label: name,
          sales: data.sales,
          revenue: data.revenue,
          profit: data.profit
        };
      });
    } else {
      // Group by time period (day, week, month)
      const timeData = new Map<string, { sales: number, revenue: number, profit: number }>();
      
      // Sort sales by date
      const sortedSales = [...sales].sort((a, b) => {
        return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
      });
      
      sortedSales.forEach(sale => {
        const date = new Date(sale.saleDate);
        let key = '';
        
        if (groupBy === 'day') {
          key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        } else if (groupBy === 'week') {
          // Get the week start (Monday)
          const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
          const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
          const weekStart = new Date(date);
          weekStart.setDate(diff);
          key = weekStart.toISOString().slice(0, 10);
        } else if (groupBy === 'month') {
          key = date.toISOString().slice(0, 7); // YYYY-MM
        }
        
        const existing = timeData.get(key) || { sales: 0, revenue: 0, profit: 0 };
        existing.sales += 1;
        
        const revenue = sale.salePrice * sale.quantity;
        existing.revenue += revenue;
        
        const item = this.items.get(sale.itemId);
        if (item) {
          const profit = (sale.salePrice - item.price) * sale.quantity - (sale.fees || 0) - (sale.shippingCost || 0);
          existing.profit += profit;
        }
        
        timeData.set(key, existing);
      });
      
      // Sort time series data by date
      return Array.from(timeData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, data]) => {
          return {
            label: key,
            sales: data.sales,
            revenue: data.revenue,
            profit: data.profit
          };
        });
    }
  }
  
  async getSalesTimeSeries(params: ReportParams): Promise<TimeSeriesData[]> {
    const { startDate, endDate, marketplaces = [], categories = [] } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get all applicable sales
    const allSales = Array.from(this.sales.values()).filter(sale => {
      const saleDate = new Date(sale.saleDate);
      if (saleDate < start || saleDate > end) {
        return false;
      }
      
      if (marketplaces.length > 0 && !marketplaces.includes(sale.marketplace)) {
        return false;
      }
      
      if (categories.length > 0) {
        const item = this.items.get(sale.itemId);
        if (!item || !categories.includes(item.category)) {
          return false;
        }
      }
      
      return true;
    });
    
    return this.generateTimeSeries(allSales, params.groupBy);
  }
  
  async getTopSellingItems(limit: number = 5): Promise<{ id: number, name: string, quantity: number, revenue: number }[]> {
    const itemSales = new Map<number, { id: number, name: string, quantity: number, revenue: number }>();
    
    // Calculate total sales for each item
    const allSales = Array.from(this.sales.values()).filter(sale => sale.status === 'completed');
    
    allSales.forEach(sale => {
      const item = this.items.get(sale.itemId);
      if (item) {
        const existing = itemSales.get(item.id) || { id: item.id, name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += sale.quantity;
        existing.revenue += sale.salePrice * sale.quantity;
        itemSales.set(item.id, existing);
      }
    });
    
    // Sort by revenue and limit
    return Array.from(itemSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
  
  async getSalesByMarketplace(): Promise<{ name: string, sales: number, revenue: number }[]> {
    const marketplaceSales = new Map<string, { name: string, sales: number, revenue: number }>();
    
    // Calculate sales for each marketplace
    const allSales = Array.from(this.sales.values()).filter(sale => sale.status === 'completed');
    
    allSales.forEach(sale => {
      const existing = marketplaceSales.get(sale.marketplace) || { name: sale.marketplace, sales: 0, revenue: 0 };
      existing.sales += 1;
      existing.revenue += sale.salePrice * sale.quantity;
      marketplaceSales.set(sale.marketplace, existing);
    });
    
    return Array.from(marketplaceSales.values());
  }
  
  async getSalesByCategory(): Promise<{ name: string, sales: number, revenue: number }[]> {
    const categorySales = new Map<string, { name: string, sales: number, revenue: number }>();
    
    // Calculate sales for each category
    const allSales = Array.from(this.sales.values()).filter(sale => sale.status === 'completed');
    
    allSales.forEach(sale => {
      const item = this.items.get(sale.itemId);
      if (item) {
        const existing = categorySales.get(item.category) || { name: item.category, sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += sale.salePrice * sale.quantity;
        categorySales.set(item.category, existing);
      }
    });
    
    return Array.from(categorySales.values());
  }

  // Employee methods
  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }
  
  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      employee => employee.employeeId === employeeId
    );
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = this.employeeCurrentId++;
    const now = new Date();
    const newEmployee: Employee = {
      ...employee,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.employees.set(id, newEmployee);
    return newEmployee;
  }
  
  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const existingEmployee = this.employees.get(id);
    
    if (!existingEmployee) {
      return undefined;
    }
    
    const updatedEmployee: Employee = {
      ...existingEmployee,
      ...employee,
      updatedAt: new Date()
    };
    
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<boolean> {
    return this.employees.delete(id);
  }
  
  // Inventory Action methods
  async getInventoryActions(filters?: { itemId?: number, employeeId?: number, actionType?: string }): Promise<InventoryAction[]> {
    const actions = Array.from(this.inventoryActions.values());
    
    if (!filters) {
      return actions;
    }
    
    return actions.filter(action => {
      if (filters.itemId && action.itemId !== filters.itemId) {
        return false;
      }
      
      if (filters.employeeId && action.employeeId !== filters.employeeId) {
        return false;
      }
      
      if (filters.actionType && action.actionType !== filters.actionType) {
        return false;
      }
      
      return true;
    });
  }
  
  async getInventoryAction(id: number): Promise<InventoryAction | undefined> {
    return this.inventoryActions.get(id);
  }
  
  async createInventoryAction(action: InsertInventoryAction): Promise<InventoryAction> {
    const id = this.inventoryActionCurrentId++;
    const now = new Date();
    const newAction: InventoryAction = {
      ...action,
      id,
      timestamp: now
    };
    
    this.inventoryActions.set(id, newAction);
    return newAction;
  }
  
  async getInventoryActionsByItem(itemId: number): Promise<InventoryAction[]> {
    return this.getInventoryActions({ itemId });
  }
  
  async getInventoryActionsByEmployee(employeeId: number): Promise<InventoryAction[]> {
    return this.getInventoryActions({ employeeId });
  }
  
  // Additional item methods for bulk product handling
  async getItemBySku(sku: string): Promise<Item | undefined> {
    return Array.from(this.items.values()).find(item => item.sku === sku);
  }
  
  async getBulkItems(): Promise<Item[]> {
    return Array.from(this.items.values()).filter(item => item.itemType === ItemType.BULK);
  }
  
  async getBreakdownItems(): Promise<Item[]> {
    return Array.from(this.items.values()).filter(item => item.itemType === ItemType.BREAKDOWN);
  }
  
  async getWaitingItems(): Promise<Item[]> {
    return Array.from(this.items.values()).filter(item => 
      item.itemType === ItemType.BULK && item.breakdownStatus === BreakdownStatus.WAITING);
  }
  
  // Product Breakdown methods
  async getProductBreakdowns(): Promise<ProductBreakdown[]> {
    return Array.from(this.productBreakdowns.values());
  }
  
  async getProductBreakdown(id: number): Promise<ProductBreakdown | undefined> {
    return this.productBreakdowns.get(id);
  }
  
  async createProductBreakdown(breakdown: InsertProductBreakdown): Promise<ProductBreakdown> {
    const id = this.breakdownCurrentId++;
    const now = new Date();
    
    const newBreakdown: ProductBreakdown = {
      ...breakdown,
      id,
      startedAt: now,
      completedAt: null
    };
    
    this.productBreakdowns.set(id, newBreakdown);
    
    // Update the bulk item to be in the "waiting" status
    const bulkItem = this.items.get(breakdown.bulkItemId);
    if (bulkItem) {
      this.updateItem(bulkItem.id, { breakdownStatus: BreakdownStatus.WAITING });
    }
    
    return newBreakdown;
  }
  
  async updateProductBreakdown(id: number, breakdown: Partial<InsertProductBreakdown>): Promise<ProductBreakdown | undefined> {
    const existingBreakdown = this.productBreakdowns.get(id);
    
    if (!existingBreakdown) {
      return undefined;
    }
    
    const updatedBreakdown: ProductBreakdown = {
      ...existingBreakdown,
      ...breakdown,
    };
    
    this.productBreakdowns.set(id, updatedBreakdown);
    
    // If status changed, update the bulk item status as well
    if (breakdown.status && breakdown.status !== existingBreakdown.status) {
      const bulkItem = this.items.get(existingBreakdown.bulkItemId);
      if (bulkItem) {
        this.updateItem(bulkItem.id, { breakdownStatus: breakdown.status });
      }
    }
    
    return updatedBreakdown;
  }
  
  async completeProductBreakdown(id: number, completedProducts: number[]): Promise<ProductBreakdown | undefined> {
    const breakdown = this.productBreakdowns.get(id);
    
    if (!breakdown) {
      return undefined;
    }
    
    const now = new Date();
    const updatedBreakdown: ProductBreakdown = {
      ...breakdown,
      status: BreakdownStatus.COMPLETED,
      completedAt: now,
      completedProducts: completedProducts
    };
    
    this.productBreakdowns.set(id, updatedBreakdown);
    
    // Update the bulk item to be in "completed" status
    const bulkItem = this.items.get(breakdown.bulkItemId);
    if (bulkItem) {
      this.updateItem(bulkItem.id, { breakdownStatus: BreakdownStatus.COMPLETED });
    }
    
    return updatedBreakdown;
  }
  
  async deleteProductBreakdown(id: number): Promise<boolean> {
    const breakdown = this.productBreakdowns.get(id);
    
    if (breakdown && breakdown.status !== BreakdownStatus.COMPLETED) {
      // Reset the bulk item status if the breakdown is not completed
      const bulkItem = this.items.get(breakdown.bulkItemId);
      if (bulkItem) {
        this.updateItem(bulkItem.id, { breakdownStatus: BreakdownStatus.NONE });
      }
    }
    
    return this.productBreakdowns.delete(id);
  }
  
  // Bulk product management methods
  async moveToBulkWaiting(bulkItemId: number, quantity: number, employeeId: number): Promise<Item | undefined> {
    const bulkItem = this.items.get(bulkItemId);
    
    if (!bulkItem || bulkItem.itemType !== ItemType.BULK) {
      return undefined;
    }
    
    // Make sure the bulk item has enough quantity
    if (bulkItem.quantity < quantity) {
      return undefined;
    }
    
    // Create inventory action
    await this.createInventoryAction({
      itemId: bulkItemId,
      employeeId,
      actionType: 'move_to_waiting',
      quantity,
      actionDetails: {
        fromStatus: bulkItem.breakdownStatus,
        toStatus: BreakdownStatus.WAITING
      }
    });
    
    // Create or update a breakdown request
    const existingBreakdowns = Array.from(this.productBreakdowns.values())
      .filter(bd => bd.bulkItemId === bulkItemId && bd.status === BreakdownStatus.WAITING);
    
    if (existingBreakdowns.length > 0) {
      // Update the existing breakdown request
      // (This is a simplification - in a real system you might want to create a new breakdown for each batch)
      return this.updateItem(bulkItemId, { 
        breakdownStatus: BreakdownStatus.WAITING,
        quantity: bulkItem.quantity - quantity
      });
    } else {
      // Create a new breakdown request
      await this.createProductBreakdown({
        bulkItemId,
        status: BreakdownStatus.WAITING,
        employeeId,
        targetProducts: [],
        completedProducts: [],
        notes: `Moving ${quantity} units to waiting area for breakdown`
      });
      
      return this.updateItem(bulkItemId, { 
        breakdownStatus: BreakdownStatus.WAITING,
        quantity: bulkItem.quantity - quantity
      });
    }
  }
  
  async createBreakdownProducts(breakdownId: number, targetProducts: BreakdownTarget[], employeeId: number): Promise<Item[]> {
    const breakdown = this.productBreakdowns.get(breakdownId);
    
    if (!breakdown || breakdown.status === BreakdownStatus.COMPLETED) {
      return [];
    }
    
    const bulkItem = this.items.get(breakdown.bulkItemId);
    if (!bulkItem) {
      return [];
    }
    
    // Update breakdown status to in progress
    await this.updateProductBreakdown(breakdownId, { 
      status: BreakdownStatus.IN_PROGRESS,
      targetProducts: targetProducts
    });
    
    // Update bulk item status
    await this.updateItem(bulkItem.id, { breakdownStatus: BreakdownStatus.IN_PROGRESS });
    
    // Create each breakdown product
    const createdProducts: Item[] = [];
    
    for (const target of targetProducts) {
      // Create breakdown product
      const newProduct: InsertItem = {
        name: target.name || `${bulkItem.name} - ${target.weight}${target.weightUnit}`,
        description: bulkItem.description,
        price: target.price,
        category: bulkItem.category,
        condition: bulkItem.condition,
        sku: target.sku || `${bulkItem.sku}-${target.weight}${target.weightUnit}`,
        quantity: target.quantity,
        images: bulkItem.images,
        tags: bulkItem.tags,
        attributes: bulkItem.attributes,
        itemType: ItemType.BREAKDOWN,
        weight: target.weight,
        weightUnit: target.weightUnit,
        sourceItemId: bulkItem.id
      };
      
      const createdProduct = await this.createItem(newProduct);
      createdProducts.push(createdProduct);
      
      // Record inventory action
      await this.createInventoryAction({
        itemId: createdProduct.id,
        employeeId,
        actionType: 'create_from_breakdown',
        quantity: target.quantity,
        actionDetails: {
          sourceItemId: bulkItem.id,
          breakdownId
        }
      });
    }
    
    // Record inventory action on bulk item
    await this.createInventoryAction({
      itemId: bulkItem.id,
      employeeId,
      actionType: 'broken_down',
      quantity: createdProducts.reduce((sum, product) => sum + product.quantity, 0),
      actionDetails: {
        breakdownId,
        resultItemIds: createdProducts.map(product => product.id)
      }
    });
    
    // Update the breakdown with the actual completed products
    await this.completeProductBreakdown(
      breakdownId, 
      createdProducts.map(product => product.id)
    );
    
    return createdProducts;
  }
}

export const storage = new MemStorage();