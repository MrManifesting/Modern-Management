import { 
  Item, InsertItem, 
  Marketplace, InsertMarketplace,
  Sale, InsertSale, ReportParams, SalesReport, TimeSeriesData,
  Employee, InsertEmployee, InventoryAction, InsertInventoryAction,
  ProductBreakdown, InsertProductBreakdown, BreakdownTarget, breakdownTargetSchema,
  ItemType, ProcessingStatus, ItemCondition,
  User, InsertUser,
  Affiliate, InsertAffiliate, QrCode, InsertQrCode, 
  AffiliateTransaction, InsertAffiliateTransaction,
  
  // Import schema tables for Drizzle
  users, items, marketplaces, sales, employees, inventoryActions, productBreakdowns,
  affiliates, qrCodes, affiliateTransactions
} from "@shared/schema";
import session from 'express-session';
// We need to import createMemoryStore this way because it has a non-standard export
import memoryStoreModule from 'memorystore';
import { db } from './db';
import { eq, and, gte, lte, desc, asc, isNull, sql, count, sum, avg } from 'drizzle-orm';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

// Interface for storage methods
export interface IStorage {
  // User authentication methods
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Session store for authentication
  sessionStore: any;
  
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
  
  // Affiliate methods
  getAllAffiliates(): Promise<Affiliate[]>;
  getAffiliateById(id: number): Promise<Affiliate | undefined>;
  getAffiliateByCode(code: string): Promise<Affiliate | undefined>;
  createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate>;
  updateAffiliate(id: number, affiliate: Partial<InsertAffiliate>): Promise<Affiliate | undefined>;
  deleteAffiliate(id: number): Promise<boolean>;
  getAffiliateStats(id: number): Promise<{
    totalSales: number;
    totalEarnings: number;
    pendingPayouts: number;
    conversionRate: number;
    recentTransactions: AffiliateTransaction[];
  }>;
  updateAffiliateEarnings(id: number, amount: number): Promise<Affiliate | undefined>;
  updateAffiliateStats(id: number, stats: { totalEarnings?: number; totalSales?: number }): Promise<boolean>;
  
  // QR Code methods
  getQrCodes(): Promise<QrCode[]>;
  getQrCodeById(id: number): Promise<QrCode | undefined>;
  getQrCodeByCode(code: string): Promise<QrCode | undefined>;
  getQrCodesByAffiliateId(affiliateId: number): Promise<QrCode[]>;
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  updateQrCode(id: number, qrCode: Partial<InsertQrCode>): Promise<QrCode | undefined>;
  deleteQrCode(id: number): Promise<boolean>;
  
  // QR code tracking methods
  incrementQrCodeScans(id: number): Promise<QrCode | undefined>;
  incrementQrCodeConversions(id: number): Promise<QrCode | undefined>;
  
  // Affiliate Transaction methods
  getAffiliateTransactions(): Promise<AffiliateTransaction[]>;
  getAffiliateTransactionsByAffiliateId(affiliateId: number): Promise<AffiliateTransaction[]>;
  getAffiliateTransactionsBySaleId(saleId: number): Promise<AffiliateTransaction[]>;
  createAffiliateTransaction(transaction: InsertAffiliateTransaction): Promise<AffiliateTransaction>;
  updateAffiliateTransactionStatus(id: number, status: string): Promise<AffiliateTransaction | undefined>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private items: Map<number, Item>;
  private marketplaces: Map<number, Marketplace>;
  private sales: Map<number, Sale>;
  private employees: Map<number, Employee>;
  private inventoryActions: Map<number, InventoryAction>;
  private productBreakdowns: Map<number, ProductBreakdown>;
  private users: Map<number, User>;
  private affiliates: Map<number, Affiliate>;
  private qrCodes: Map<number, QrCode>;
  private affiliateTransactions: Map<number, AffiliateTransaction>;
  private itemCurrentId: number;
  private marketplaceCurrentId: number;
  private salesCurrentId: number;
  private employeeCurrentId: number;
  private inventoryActionCurrentId: number;
  private breakdownCurrentId: number;
  private userCurrentId: number;
  private affiliateCurrentId: number;
  private qrCodeCurrentId: number;
  private affiliateTransactionCurrentId: number;
  
  // Session store for authentication
  sessionStore: any;

  constructor() {
    this.items = new Map();
    this.marketplaces = new Map();
    this.sales = new Map();
    this.employees = new Map();
    this.inventoryActions = new Map();
    this.productBreakdowns = new Map();
    this.users = new Map();
    this.affiliates = new Map();
    this.qrCodes = new Map();
    this.affiliateTransactions = new Map();
    this.itemCurrentId = 1;
    this.marketplaceCurrentId = 1;
    this.salesCurrentId = 1;
    this.employeeCurrentId = 1;
    this.inventoryActionCurrentId = 1;
    this.breakdownCurrentId = 1;
    this.userCurrentId = 1;
    this.affiliateCurrentId = 1;
    this.qrCodeCurrentId = 1;
    this.affiliateTransactionCurrentId = 1;
    
    // Create in-memory session store
    const MemoryStore = memoryStoreModule(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with some default marketplaces
    this.initializeMarketplaces();
    
    // Initialize with a default admin employee
    this.initializeEmployees();
    
    // Initialize with a default admin user
    this.initializeUsers();
    
    // Initialize with a default test affiliate
    this.initializeAffiliates();
  }
  
  private initializeAffiliates() {
    const defaultAffiliate: InsertAffiliate = {
      name: "Test Affiliate",
      email: "affiliate@example.com",
      code: "TESTAFFILIATE",
      commissionRate: 0.04, // 4% commission
      status: "active",
      paymentDetails: { 
        method: "paypal",
        email: "affiliate@example.com"
      },
      notes: "This is a test affiliate account."
    };
    
    this.createAffiliate(defaultAffiliate);
  }
  
  private initializeUsers() {
    const defaultUser: InsertUser = {
      username: "admin",
      // Hash of "admin123"
      password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8.b87eb7a3186a47b8a905645fd1798818",
      email: "admin@inventorypro.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      isActive: true
    };
    
    this.createUser(defaultUser);
  }
  
  // User authentication methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    return users.find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const newUser: User = {
      ...user,
      id,
      createdAt: now,
      updatedAt: now,
      lastLogin: null
    };
    
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...user,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
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
        const itemCost = item.basePrice; // Assuming basePrice is our cost
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
          const profitPerUnit = sale.salePrice - itemEntity.basePrice;
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
      item.itemType === ItemType.BUNDLE && item.processingStatus === ProcessingStatus.WAITING);
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

// Database-backed storage implementation
export class DatabaseStorage implements IStorage {
  // Session store for authentication
  sessionStore: any;

  constructor() {
    // Create PostgreSQL-backed session store
    const PgSession = connectPgSimple(session);
    this.sessionStore = new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
    
    // Initialize with default data
    this.initializeData();
  }
  
  private async initializeData() {
    try {
      // Check if there are any users
      const existingUsers = await db.select().from(users);
      
      if (existingUsers.length === 0) {
        // Initialize with a default admin user
        await this.initializeUsers();
      }
      
      // Check if there are any marketplaces
      const existingMarketplaces = await db.select().from(marketplaces);
      
      if (existingMarketplaces.length === 0) {
        // Initialize with default marketplaces
        await this.initializeMarketplaces();
      }
      
      // Check if there are any employees
      const existingEmployees = await db.select().from(employees);
      
      if (existingEmployees.length === 0) {
        // Initialize with a default admin employee
        await this.initializeEmployees();
      }
      
      // Check if there are any affiliates
      const existingAffiliates = await db.select().from(affiliates);
      
      if (existingAffiliates.length === 0) {
        // Initialize with a default test affiliate
        await this.initializeAffiliates();
      }
    } catch (error) {
      console.error("Failed to initialize data:", error);
    }
  }
  
  private async initializeAffiliates() {
    // Create a default test affiliate
    const defaultAffiliate: InsertAffiliate = {
      name: "Test Affiliate",
      email: "affiliate@example.com",
      code: "TESTAFFILIATE",
      commissionRate: 0.04, // 4% commission
      status: "active",
      paymentDetails: { 
        method: "paypal",
        email: "affiliate@example.com"
      },
      notes: "This is a test affiliate account."
    };
    
    await this.createAffiliate(defaultAffiliate);
    console.log('Created default test affiliate');
  }
  
  private async initializeUsers() {
    const defaultUser: InsertUser = {
      username: "admin",
      // Hash of "admin123"
      password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8.b87eb7a3186a47b8a905645fd1798818",
      email: "admin@inventorypro.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      isActive: true
    };
    
    await this.createUser(defaultUser);
  }
  
  private async initializeEmployees() {
    const defaultEmployee: InsertEmployee = {
      employeeId: "ADMIN001",
      name: "Admin User",
      email: "admin@mrmanifestlister.com",
      role: "admin",
      department: "management",
      active: true,
      pin: "123456"
    };
    
    await this.createEmployee(defaultEmployee);
  }
  
  private async initializeMarketplaces() {
    const defaultMarketplaces: InsertMarketplace[] = [
      { name: "eBay", isConnected: true, credentials: {} },
      { name: "Etsy", isConnected: true, credentials: {} },
      { name: "Amazon", isConnected: true, credentials: {} },
      { name: "Shopify", isConnected: false, credentials: {} },
    ];
    
    for (const marketplace of defaultMarketplaces) {
      await this.createMarketplace(marketplace);
    }
  }
  
  // User authentication methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: now })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }
  
  // Item methods
  async getItems(): Promise<Item[]> {
    return await db.select().from(items);
  }
  
  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }
  
  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }
  
  async updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined> {
    const now = new Date();
    const [updatedItem] = await db
      .update(items)
      .set({ ...item, updatedAt: now })
      .where(eq(items.id, id))
      .returning();
    
    return updatedItem;
  }
  
  async deleteItem(id: number): Promise<boolean> {
    const result = await db.delete(items).where(eq(items.id, id));
    return result.rowCount > 0;
  }
  
  async getItemBySku(sku: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.sku, sku));
    return item;
  }
  
  async getBulkItems(): Promise<Item[]> {
    return await db
      .select()
      .from(items)
      .where(eq(items.itemType, ItemType.BULK));
  }
  
  async getBreakdownItems(): Promise<Item[]> {
    return await db
      .select()
      .from(items)
      .where(eq(items.itemType, ItemType.BREAKDOWN));
  }
  
  async getWaitingItems(): Promise<Item[]> {
    return await db
      .select()
      .from(items)
      .where(eq(items.breakdownStatus, BreakdownStatus.WAITING));
  }
  
  // Marketplace methods
  async getMarketplaces(): Promise<Marketplace[]> {
    return await db.select().from(marketplaces);
  }
  
  async getMarketplace(id: number): Promise<Marketplace | undefined> {
    const [marketplace] = await db.select().from(marketplaces).where(eq(marketplaces.id, id));
    return marketplace;
  }
  
  async createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace> {
    const [newMarketplace] = await db.insert(marketplaces).values(marketplace).returning();
    return newMarketplace;
  }
  
  async updateMarketplace(id: number, marketplace: Partial<InsertMarketplace>): Promise<Marketplace | undefined> {
    const now = new Date();
    const [updatedMarketplace] = await db
      .update(marketplaces)
      .set({ ...marketplace, updatedAt: now })
      .where(eq(marketplaces.id, id))
      .returning();
    
    return updatedMarketplace;
  }
  
  async deleteMarketplace(id: number): Promise<boolean> {
    const result = await db.delete(marketplaces).where(eq(marketplaces.id, id));
    return result.rowCount > 0;
  }
  
  async connectMarketplace(id: number): Promise<Marketplace | undefined> {
    const now = new Date();
    const [updatedMarketplace] = await db
      .update(marketplaces)
      .set({ isConnected: true, updatedAt: now })
      .where(eq(marketplaces.id, id))
      .returning();
    
    return updatedMarketplace;
  }
  
  // Sales methods
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales);
  }
  
  async getSale(id: number): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  }
  
  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    
    // If the sale was successful, update the item's quantity
    if (sale.status !== 'cancelled' && sale.status !== 'refunded') {
      const item = await this.getItem(sale.itemId);
      if (item && sale.quantity) {
        const newQuantity = Math.max(0, item.quantity - sale.quantity);
        await this.updateItem(item.id, { quantity: newQuantity });
      }
    }
    
    return newSale;
  }
  
  async updateSale(id: number, sale: Partial<InsertSale>): Promise<Sale | undefined> {
    // Get the existing sale first
    const existingSale = await this.getSale(id);
    if (!existingSale) {
      return undefined;
    }
    
    const now = new Date();
    const [updatedSale] = await db
      .update(sales)
      .set({ ...sale, updatedAt: now })
      .where(eq(sales.id, id))
      .returning();
    
    // Handle quantity adjustments if status changed
    if (sale.status && sale.status !== existingSale.status) {
      const item = await this.getItem(existingSale.itemId);
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
          await this.updateItem(item.id, { quantity: newQuantity });
        }
      }
    }
    
    return updatedSale;
  }
  
  async deleteSale(id: number): Promise<boolean> {
    // Get sale before deleting to restore inventory if needed
    const sale = await this.getSale(id);
    
    if (sale && sale.status === 'completed') {
      // Restore the quantity to inventory
      const item = await this.getItem(sale.itemId);
      if (item) {
        const newQuantity = item.quantity + sale.quantity;
        await this.updateItem(item.id, { quantity: newQuantity });
      }
    }
    
    const result = await db.delete(sales).where(eq(sales.id, id));
    return result.rowCount > 0;
  }
  
  // Analytics methods
  async getSalesReport(params: ReportParams): Promise<SalesReport> {
    const { startDate, endDate, marketplaces = [], categories = [] } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Build the query with filters
    let query = db.select().from(sales).where(and(
      gte(sales.saleDate, start),
      lte(sales.saleDate, end)
    ));
    
    // Add marketplace filter if provided
    if (marketplaces.length > 0) {
      query = query.where(sql`${sales.marketplace} = ANY(${marketplaces})`);
    }
    
    // Execute the query
    const filteredSales = await query;
    
    // If categories are provided, we need to filter by items
    const categorySalesIds: number[] = [];
    if (categories.length > 0) {
      // Get all items in the specified categories
      const categoryItems = await db
        .select()
        .from(items)
        .where(sql`${items.category} = ANY(${categories})`);
      
      const categoryItemIds = categoryItems.map(item => item.id);
      
      // Filter sales by these item IDs
      if (categoryItemIds.length > 0) {
        const categorySales = await db
          .select()
          .from(sales)
          .where(sql`${sales.itemId} = ANY(${categoryItemIds})`);
        
        categorySalesIds.push(...categorySales.map(sale => sale.id));
      }
      
      // Further filter the filtered sales to only include those in the category
      if (categorySalesIds.length > 0) {
        const finalFilteredSales = filteredSales.filter(sale => 
          categorySalesIds.includes(sale.id)
        );
        
        // Replace the filtered sales with the category-filtered ones
        filteredSales.length = 0;
        filteredSales.push(...finalFilteredSales);
      } else {
        // No sales match the category filter
        filteredSales.length = 0;
      }
    }
    
    // Calculate summary statistics
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.salePrice * sale.quantity), 0);
    
    // For profit calculation, we need to get the items for each sale
    let totalProfit = 0;
    for (const sale of filteredSales) {
      const item = await this.getItem(sale.itemId);
      if (item) {
        const itemCost = item.basePrice; // Assuming basePrice is our cost
        const profit = (sale.salePrice - itemCost) * sale.quantity - (sale.fees || 0) - (sale.shippingCost || 0);
        totalProfit += profit;
      }
    }
    
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Calculate best selling item
    const itemSalesMap = new Map<number, { id: number, name: string, quantity: number, revenue: number }>();
    
    for (const sale of filteredSales) {
      const item = await this.getItem(sale.itemId);
      if (item) {
        const existing = itemSalesMap.get(item.id) || { id: item.id, name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += sale.quantity;
        existing.revenue += sale.salePrice * sale.quantity;
        itemSalesMap.set(item.id, existing);
      }
    }
    
    let bestSellingItem = null;
    let bestItemRevenue = 0;
    
    itemSalesMap.forEach(item => {
      if (item.revenue > bestItemRevenue) {
        bestSellingItem = item;
        bestItemRevenue = item.revenue;
      }
    });
    
    // Calculate best marketplace
    const marketplaceSalesMap = new Map<string, { name: string, sales: number, revenue: number }>();
    
    for (const sale of filteredSales) {
      const existing = marketplaceSalesMap.get(sale.marketplace) || { name: sale.marketplace, sales: 0, revenue: 0 };
      existing.sales++;
      existing.revenue += sale.salePrice * sale.quantity;
      marketplaceSalesMap.set(sale.marketplace, existing);
    }
    
    let bestMarketplace = null;
    let bestMarketplaceRevenue = 0;
    
    marketplaceSalesMap.forEach(marketplace => {
      if (marketplace.revenue > bestMarketplaceRevenue) {
        bestMarketplace = marketplace;
        bestMarketplaceRevenue = marketplace.revenue;
      }
    });
    
    // Convert maps to arrays for the return value
    const itemSales = Array.from(itemSalesMap.values());
    const marketplaceSales = Array.from(marketplaceSalesMap.values());
    
    // Result
    return {
      startDate,
      endDate,
      totalSales,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      bestSellingItem,
      bestMarketplace,
      itemSales,
      marketplaceSales,
    };
  }
  
  async getSalesTimeSeries(params: ReportParams): Promise<TimeSeriesData[]> {
    const { startDate, endDate, marketplaces = [], categories = [], groupBy = 'day' } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Build the query with filters
    let query = db.select({
      date: sales.saleDate,
      revenue: sql<number>`SUM(${sales.salePrice} * ${sales.quantity})`,
      count: count()
    })
    .from(sales)
    .where(and(
      gte(sales.saleDate, start),
      lte(sales.saleDate, end)
    ))
    .groupBy(sales.saleDate);
    
    // Add marketplace filter if provided
    if (marketplaces.length > 0) {
      query = query.where(sql`${sales.marketplace} = ANY(${marketplaces})`);
    }
    
    // Execute the query
    let timeSeriesData = await query;
    
    // If categories are provided, we need to filter by items
    if (categories.length > 0) {
      // Get all items in the specified categories
      const categoryItems = await db
        .select()
        .from(items)
        .where(sql`${items.category} = ANY(${categories})`);
      
      const categoryItemIds = categoryItems.map(item => item.id);
      
      // Filter the time series data to only include sales of items in the specified categories
      if (categoryItemIds.length > 0) {
        const categorySales = await db
          .select()
          .from(sales)
          .where(sql`${sales.itemId} = ANY(${categoryItemIds})`);
        
        const categorySaleDates = categorySales.map(sale => sale.saleDate.toISOString().split('T')[0]);
        
        // Filter the time series data
        timeSeriesData = timeSeriesData.filter(data => 
          categorySaleDates.includes(data.date.toISOString().split('T')[0])
        );
      } else {
        // No sales match the category filter
        timeSeriesData = [];
      }
    }
    
    // Group the data by the specified interval
    const groupedData: Record<string, TimeSeriesData> = {};
    
    for (const data of timeSeriesData) {
      let key: string;
      const date = new Date(data.date);
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        // Get the week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNumber}`;
      } else { // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!groupedData[key]) {
        groupedData[key] = {
          date: date,
          revenue: 0,
          count: 0
        };
      }
      
      groupedData[key].revenue += data.revenue;
      groupedData[key].count += data.count;
    }
    
    // Convert the grouped data to an array and sort by date
    return Object.values(groupedData).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  async getTopSellingItems(limit: number = 10): Promise<{id: number, name: string, quantity: number, revenue: number}[]> {
    // First get the total quantity sold for each item
    const itemSales = await db
      .select({
        itemId: sales.itemId,
        totalQuantity: sql<number>`SUM(${sales.quantity})`,
        totalRevenue: sql<number>`SUM(${sales.salePrice} * ${sales.quantity})`
      })
      .from(sales)
      .where(sql`${sales.status} NOT IN ('cancelled', 'refunded')`)
      .groupBy(sales.itemId)
      .orderBy(desc(sql`SUM(${sales.quantity})`))
      .limit(limit);
    
    // Now get the item details for each of these top sellers
    const result: {id: number, name: string, quantity: number, revenue: number}[] = [];
    
    for (const sale of itemSales) {
      const item = await this.getItem(sale.itemId);
      if (item) {
        result.push({
          id: item.id,
          name: item.name,
          quantity: sale.totalQuantity,
          revenue: sale.totalRevenue
        });
      }
    }
    
    return result;
  }
  
  async getSalesByMarketplace(): Promise<{name: string, sales: number, revenue: number}[]> {
    const marketplaceSales = await db
      .select({
        marketplace: sales.marketplace,
        totalSales: count(),
        totalRevenue: sql<number>`SUM(${sales.salePrice} * ${sales.quantity})`
      })
      .from(sales)
      .where(sql`${sales.status} NOT IN ('cancelled', 'refunded')`)
      .groupBy(sales.marketplace)
      .orderBy(desc(sql`SUM(${sales.salePrice} * ${sales.quantity})`));
    
    return marketplaceSales.map(ms => ({
      name: ms.marketplace,
      sales: Number(ms.totalSales),
      revenue: ms.totalRevenue
    }));
  }
  
  async getSalesByCategory(): Promise<{name: string, sales: number, revenue: number}[]> {
    // This is more complex because we need to join with items to get the category
    const categorySales = await db
      .select({
        category: items.category,
        totalSales: count(),
        totalRevenue: sql<number>`SUM(${sales.salePrice} * ${sales.quantity})`
      })
      .from(sales)
      .innerJoin(items, eq(sales.itemId, items.id))
      .where(sql`${sales.status} NOT IN ('cancelled', 'refunded')`)
      .groupBy(items.category)
      .orderBy(desc(sql`SUM(${sales.salePrice} * ${sales.quantity})`));
    
    return categorySales.map(cs => ({
      name: cs.category,
      sales: Number(cs.totalSales),
      revenue: cs.totalRevenue
    }));
  }
  
  // Employee methods
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }
  
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }
  
  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee;
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }
  
  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const now = new Date();
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...employee, updatedAt: now })
      .where(eq(employees.id, id))
      .returning();
    
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id));
    return result.rowCount > 0;
  }
  
  // Inventory Action methods
  async getInventoryActions(filters?: { itemId?: number, employeeId?: number, actionType?: string }): Promise<InventoryAction[]> {
    let query = db.select().from(inventoryActions);
    
    if (filters) {
      if (filters.itemId) {
        query = query.where(eq(inventoryActions.itemId, filters.itemId));
      }
      
      if (filters.employeeId) {
        query = query.where(eq(inventoryActions.employeeId, filters.employeeId));
      }
      
      if (filters.actionType) {
        query = query.where(eq(inventoryActions.actionType, filters.actionType));
      }
    }
    
    return await query.orderBy(desc(inventoryActions.timestamp));
  }
  
  async getInventoryAction(id: number): Promise<InventoryAction | undefined> {
    const [action] = await db.select().from(inventoryActions).where(eq(inventoryActions.id, id));
    return action;
  }
  
  async createInventoryAction(action: InsertInventoryAction): Promise<InventoryAction> {
    const [newAction] = await db.insert(inventoryActions).values(action).returning();
    return newAction;
  }
  
  async getInventoryActionsByItem(itemId: number): Promise<InventoryAction[]> {
    return await db
      .select()
      .from(inventoryActions)
      .where(eq(inventoryActions.itemId, itemId))
      .orderBy(desc(inventoryActions.timestamp));
  }
  
  async getInventoryActionsByEmployee(employeeId: number): Promise<InventoryAction[]> {
    return await db
      .select()
      .from(inventoryActions)
      .where(eq(inventoryActions.employeeId, employeeId))
      .orderBy(desc(inventoryActions.timestamp));
  }
  
  // Product Breakdown methods
  async getProductBreakdowns(): Promise<ProductBreakdown[]> {
    return await db.select().from(productBreakdowns);
  }
  
  async getProductBreakdown(id: number): Promise<ProductBreakdown | undefined> {
    const [breakdown] = await db.select().from(productBreakdowns).where(eq(productBreakdowns.id, id));
    return breakdown;
  }
  
  async createProductBreakdown(breakdown: InsertProductBreakdown): Promise<ProductBreakdown> {
    const [newBreakdown] = await db.insert(productBreakdowns).values(breakdown).returning();
    return newBreakdown;
  }
  
  async updateProductBreakdown(id: number, breakdown: Partial<InsertProductBreakdown>): Promise<ProductBreakdown | undefined> {
    const now = new Date();
    const [updatedBreakdown] = await db
      .update(productBreakdowns)
      .set({ ...breakdown, updatedAt: now })
      .where(eq(productBreakdowns.id, id))
      .returning();
    
    return updatedBreakdown;
  }
  
  async completeProductBreakdown(id: number, completedProducts: number[]): Promise<ProductBreakdown | undefined> {
    const breakdown = await this.getProductBreakdown(id);
    if (!breakdown) {
      return undefined;
    }
    
    // Mark the breakdown as completed
    const now = new Date();
    const [updatedBreakdown] = await db
      .update(productBreakdowns)
      .set({ 
        status: 'completed',
        completedProducts,
        completionDate: now,
        updatedAt: now
      })
      .where(eq(productBreakdowns.id, id))
      .returning();
    
    // Update the status of all produced items
    for (const productId of completedProducts) {
      await db
        .update(items)
        .set({ 
          breakdownStatus: BreakdownStatus.COMPLETED,
          updatedAt: now
        })
        .where(eq(items.id, productId));
    }
    
    return updatedBreakdown;
  }
  
  async deleteProductBreakdown(id: number): Promise<boolean> {
    const result = await db.delete(productBreakdowns).where(eq(productBreakdowns.id, id));
    return result.rowCount > 0;
  }
  
  // Bulk product management
  async moveToBulkWaiting(bulkItemId: number, quantity: number, employeeId: number): Promise<Item | undefined> {
    // Get the bulk item
    const bulkItem = await this.getItem(bulkItemId);
    if (!bulkItem || bulkItem.itemType !== ItemType.BULK || bulkItem.quantity < quantity) {
      return undefined;
    }
    
    // Update the bulk item quantity
    const newQuantity = bulkItem.quantity - quantity;
    const updatedBulkItem = await this.updateItem(bulkItemId, { quantity: newQuantity });
    
    // Create an inventory action for this
    await this.createInventoryAction({
      itemId: bulkItemId,
      employeeId,
      actionType: 'move_to_waiting',
      quantityBefore: bulkItem.quantity,
      quantityAfter: newQuantity,
      notes: `Moved ${quantity} units to waiting for breakdown`,
      timestamp: new Date()
    });
    
    // Update or create the waiting item
    // First check if there's already a waiting item for this bulk item
    const existingWaitingItems = await db
      .select()
      .from(items)
      .where(and(
        eq(items.breakdownStatus, BreakdownStatus.WAITING),
        eq(items.parentItemId, bulkItemId)
      ));
    
    if (existingWaitingItems.length > 0) {
      // Update the existing waiting item
      const waitingItem = existingWaitingItems[0];
      const updatedQuantity = waitingItem.quantity + quantity;
      
      return await this.updateItem(waitingItem.id, { quantity: updatedQuantity });
    } else {
      // Create a new waiting item as a copy of the bulk item
      const waitingItem: InsertItem = {
        name: `${bulkItem.name} (Waiting)`,
        description: bulkItem.description,
        price: bulkItem.price,
        category: bulkItem.category,
        condition: bulkItem.condition,
        sku: `${bulkItem.sku}-W${new Date().getTime()}`,
        quantity,
        status: 'waiting',
        itemType: bulkItem.itemType,
        breakdownStatus: BreakdownStatus.WAITING,
        parentItemId: bulkItemId,
        // Copy the rest of the bulk item's properties...
        barcode: bulkItem.barcode,
        qrCode: bulkItem.qrCode,
        images: bulkItem.images,
        tags: bulkItem.tags,
        marketplace: bulkItem.marketplace,
        syncedToMarketplaces: [],
        lowStockThreshold: bulkItem.lowStockThreshold,
        reorderPoint: bulkItem.reorderPoint,
        reorderQuantity: bulkItem.reorderQuantity,
        stockAlerts: bulkItem.stockAlerts
      };
      
      return await this.createItem(waitingItem);
    }
  }
  
  async createBreakdownProducts(breakdownId: number, targetProducts: BreakdownTarget[], employeeId: number): Promise<Item[]> {
    // Get the breakdown plan
    const breakdown = await this.getProductBreakdown(breakdownId);
    if (!breakdown || breakdown.status !== 'in_progress') {
      return [];
    }
    
    // Get the source item
    const sourceItem = await this.getItem(breakdown.sourceItemId);
    if (!sourceItem || sourceItem.quantity < breakdown.quantity) {
      return [];
    }
    
    // Update the source item quantity
    const newSourceQuantity = sourceItem.quantity - breakdown.quantity;
    await this.updateItem(sourceItem.id, { 
      quantity: newSourceQuantity,
      breakdownStatus: BreakdownStatus.COMPLETED
    });
    
    // Create an inventory action for the source item
    await this.createInventoryAction({
      itemId: sourceItem.id,
      employeeId,
      actionType: 'breakdown_source',
      quantityBefore: sourceItem.quantity,
      quantityAfter: newSourceQuantity,
      notes: `Used ${breakdown.quantity} units for breakdown #${breakdown.id}`,
      timestamp: new Date()
    });
    
    // Create the target products
    const createdProducts: Item[] = [];
    
    for (const target of targetProducts) {
      // Validate target against schema
      const validationResult = breakdownTargetSchema.safeParse(target);
      if (!validationResult.success) {
        console.error("Invalid breakdown target:", validationResult.error);
        continue;
      }
      
      // Calculate the quantity produced
      const producedQuantity = breakdown.quantity * target.ratio;
      
      // Check if we need to update an existing item or create a new one
      if (target.existingItemId) {
        // Update the existing item
        const existingItem = await this.getItem(target.existingItemId);
        if (existingItem) {
          const newQuantity = existingItem.quantity + producedQuantity;
          const updatedItem = await this.updateItem(existingItem.id, { quantity: newQuantity });
          
          if (updatedItem) {
            // Create an inventory action
            await this.createInventoryAction({
              itemId: existingItem.id,
              employeeId,
              actionType: 'breakdown_target',
              quantityBefore: existingItem.quantity,
              quantityAfter: newQuantity,
              notes: `Added ${producedQuantity} units from breakdown #${breakdown.id}`,
              timestamp: new Date()
            });
            
            createdProducts.push(updatedItem);
          }
        }
      } else {
        // Create a new item
        const newItemData: InsertItem = {
          name: target.name,
          description: target.description || sourceItem.description,
          price: target.price,
          category: target.category || sourceItem.category,
          condition: sourceItem.condition,
          sku: `${sourceItem.sku}-${target.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().getTime()}`,
          quantity: producedQuantity,
          status: 'available',
          itemType: ItemType.REGULAR,
          breakdownStatus: BreakdownStatus.NONE,
          parentItemId: sourceItem.id,
          breakdownId,
          // Copy some properties from the source item
          images: sourceItem.images,
          tags: [...sourceItem.tags, 'breakdown-product'],
          marketplace: sourceItem.marketplace,
          syncedToMarketplaces: [],
          lowStockThreshold: 5,
          reorderPoint: 3,
          reorderQuantity: 10,
          stockAlerts: true
        };
        
        const newItem = await this.createItem(newItemData);
        
        // Create an inventory action for the new item
        await this.createInventoryAction({
          itemId: newItem.id,
          employeeId,
          actionType: 'breakdown_target_new',
          quantityBefore: 0,
          quantityAfter: producedQuantity,
          notes: `Created from breakdown #${breakdown.id}`,
          timestamp: new Date()
        });
        
        createdProducts.push(newItem);
      }
    }
    
    // Update the breakdown to mark the products as created
    await this.completeProductBreakdown(
      breakdownId,
      createdProducts.map(p => p.id)
    );
    
    return createdProducts;
  }
  
  // Affiliate methods
  async getAllAffiliates(): Promise<Affiliate[]> {
    return await db.select().from(affiliates);
  }
  
  async getAffiliateById(id: number): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate;
  }
  
  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.code, code));
    return affiliate;
  }
  
  async createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate> {
    const [newAffiliate] = await db.insert(affiliates).values(affiliate).returning();
    return newAffiliate;
  }
  
  async updateAffiliate(id: number, affiliate: Partial<InsertAffiliate>): Promise<Affiliate | undefined> {
    const now = new Date();
    const [updatedAffiliate] = await db
      .update(affiliates)
      .set({ ...affiliate, updatedAt: now })
      .where(eq(affiliates.id, id))
      .returning();
    
    return updatedAffiliate;
  }
  
  async deleteAffiliate(id: number): Promise<boolean> {
    const result = await db.delete(affiliates).where(eq(affiliates.id, id));
    return result.rowCount > 0;
  }
  
  async getAffiliateStats(id: number): Promise<{
    totalSales: number;
    totalEarnings: number;
    pendingPayouts: number;
    conversionRate: number;
    recentTransactions: AffiliateTransaction[];
  }> {
    // Get all QR codes for this affiliate
    const affiliateQrCodes = await this.getQrCodesByAffiliateId(id);
    
    // Calculate total scans across all QR codes
    const totalScans = affiliateQrCodes.reduce((sum, qr) => sum + qr.scanCount, 0);
    
    // Calculate total conversions across all QR codes
    const totalConversions = affiliateQrCodes.reduce((sum, qr) => sum + qr.conversionCount, 0);
    
    // Get all transactions for this affiliate
    const allTransactions = await this.getAffiliateTransactionsByAffiliateId(id);
    
    // Calculate total earnings
    const totalEarnings = allTransactions.reduce((sum, tx) => 
      tx.transactionType === 'commission' ? sum + tx.amount : sum, 0);
    
    // Calculate pending payouts (transactions with status 'pending')
    const pendingPayouts = allTransactions
      .filter(tx => tx.status === 'pending')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    // Calculate conversion rate (handle divide by zero)
    const conversionRate = totalScans > 0 ? totalConversions / totalScans : 0;
    
    // Get recent transactions (last 10)
    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    
    return {
      totalSales: totalConversions,
      totalEarnings,
      pendingPayouts,
      conversionRate,
      recentTransactions
    };
  }
  
  async updateAffiliateEarnings(id: number, amount: number): Promise<Affiliate | undefined> {
    const affiliate = await this.getAffiliateById(id);
    if (!affiliate) return undefined;
    
    const currentTotalSales = affiliate.totalSales || 0;
    const currentTotalEarnings = affiliate.totalEarnings || 0;
    
    return this.updateAffiliate(id, {
      totalSales: currentTotalSales + 1,
      totalEarnings: currentTotalEarnings + amount
    });
  }
  
  // QR Code methods
  async getQrCodes(): Promise<QrCode[]> {
    return await db.select().from(qrCodes);
  }
  
  async getQrCodeById(id: number): Promise<QrCode | undefined> {
    const [qrCode] = await db.select().from(qrCodes).where(eq(qrCodes.id, id));
    return qrCode;
  }
  
  async getQrCodeByCode(code: string): Promise<QrCode | undefined> {
    const [qrCode] = await db.select().from(qrCodes).where(eq(qrCodes.code, code));
    return qrCode;
  }
  
  async getQrCodesByAffiliateId(affiliateId: number): Promise<QrCode[]> {
    return await db.select().from(qrCodes).where(eq(qrCodes.affiliateId, affiliateId));
  }
  
  async createQrCode(qrCode: InsertQrCode): Promise<QrCode> {
    const [newQrCode] = await db.insert(qrCodes).values(qrCode).returning();
    return newQrCode;
  }
  
  async updateQrCode(id: number, qrCode: Partial<InsertQrCode>): Promise<QrCode | undefined> {
    const now = new Date();
    const [updatedQrCode] = await db
      .update(qrCodes)
      .set({ ...qrCode, updatedAt: now })
      .where(eq(qrCodes.id, id))
      .returning();
    
    return updatedQrCode;
  }
  
  async deleteQrCode(id: number): Promise<boolean> {
    const result = await db.delete(qrCodes).where(eq(qrCodes.id, id));
    return result.rowCount > 0;
  }
  
  async incrementQrCodeScans(id: number): Promise<QrCode | undefined> {
    const qrCode = await this.getQrCodeById(id);
    if (!qrCode) return undefined;
    
    const [updatedQrCode] = await db
      .update(qrCodes)
      .set({ 
        scans: (qrCode.scans || 0) + 1,
        lastScannedAt: new Date()
      })
      .where(eq(qrCodes.id, id))
      .returning();
    
    return updatedQrCode;
  }
  
  async incrementQrCodeConversions(id: number): Promise<QrCode | undefined> {
    const qrCode = await this.getQrCodeById(id);
    if (!qrCode) return undefined;
    
    const [updatedQrCode] = await db
      .update(qrCodes)
      .set({ 
        conversions: (qrCode.conversions || 0) + 1,
        // We don't have a lastConversionAt field, but we could update lastScannedAt
        lastScannedAt: new Date()
      })
      .where(eq(qrCodes.id, id))
      .returning();
    
    return updatedQrCode;
  }
  
  // Affiliate Transaction methods
  async getAffiliateTransactions(): Promise<AffiliateTransaction[]> {
    return await db.select().from(affiliateTransactions);
  }
  
  async getAffiliateTransactionsByAffiliateId(affiliateId: number): Promise<AffiliateTransaction[]> {
    return await db.select()
      .from(affiliateTransactions)
      .where(eq(affiliateTransactions.affiliateId, affiliateId));
  }
  
  async getAffiliateTransactionsBySaleId(saleId: number): Promise<AffiliateTransaction[]> {
    return await db.select()
      .from(affiliateTransactions)
      .where(eq(affiliateTransactions.saleId, saleId));
  }
  
  async createAffiliateTransaction(transaction: InsertAffiliateTransaction): Promise<AffiliateTransaction> {
    const [newTransaction] = await db.insert(affiliateTransactions).values(transaction).returning();
    return newTransaction;
  }
  
  async updateAffiliateTransactionStatus(id: number, status: string): Promise<AffiliateTransaction | undefined> {
    const now = new Date();
    const [updatedTransaction] = await db
      .update(affiliateTransactions)
      .set({ 
        status, 
        updatedAt: now,
        processedAt: status === 'processed' ? now : null
      })
      .where(eq(affiliateTransactions.id, id))
      .returning();
    
    return updatedTransaction;
  }
  
  async updateAffiliateStats(id: number, stats: { totalEarnings?: number; totalSales?: number }): Promise<boolean> {
    try {
      const affiliate = await this.getAffiliateById(id);
      if (!affiliate) return false;
      
      const result = await db
        .update(affiliates)
        .set({
          totalEarnings: stats.totalEarnings !== undefined 
            ? stats.totalEarnings 
            : affiliate.totalEarnings || 0,
          totalSales: stats.totalSales !== undefined 
            ? stats.totalSales 
            : affiliate.totalSales || 0
        })
        .where(eq(affiliates.id, id))
        .execute();
      
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error updating affiliate stats:", error);
      return false;
    }
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();