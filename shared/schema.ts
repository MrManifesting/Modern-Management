import { pgTable, text, serial, integer, doublePrecision, timestamp, json, boolean, date, varchar, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Enums
export const ItemType = {
  REGULAR: 'regular',
  BUNDLE: 'bundle',
  COMPONENT: 'component'
} as const;

export const ProcessingStatus = {
  NONE: 'none',
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
} as const;

export const ItemCondition = {
  NEW: 'new',
  LIKE_NEW: 'like_new',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor'
} as const;

// Item Schema
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sku: text("sku").notNull(), // Unique Stock Keeping Unit
  
  // Pricing information
  costPrice: doublePrecision("cost_price").notNull().default(0), // What we paid for it
  basePrice: doublePrecision("base_price").notNull(), // MSRP
  salePrice: doublePrecision("sale_price"), // Special sale price if applicable
  wholesalePrice: doublePrecision("wholesale_price"), // Price for wholesale customers
  
  // Categorization
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  brand: text("brand"),
  condition: text("condition").notNull().default(ItemCondition.NEW),
  
  // Inventory management
  quantity: integer("quantity").notNull().default(1), // Current inventory quantity
  lowStockThreshold: integer("low_stock_threshold").default(5), // Threshold for low stock alerts
  reorderPoint: integer("reorder_point").default(3), // When to reorder
  reorderQuantity: integer("reorder_quantity").default(10), // How many to reorder
  stockAlerts: boolean("stock_alerts").default(true), // Whether to send alerts
  lastRestockDate: timestamp("last_restock_date"), // When the item was last restocked
  
  // Product identification
  barcode: text("barcode"), // Store barcode data (can be UPC, EAN, etc.)
  qrCode: text("qr_code"), // Store QR code data
  mpn: text("mpn"), // Manufacturer Part Number
  gtin: text("gtin"), // Global Trade Item Number
  
  // Status and metadata
  status: text("status").notNull().default("draft"), // draft, active, archived, discontinued
  visibility: text("visibility").notNull().default("visible"), // visible, hidden
  featured: boolean("featured").default(false), // Featured product 
  
  // Media and content
  images: json("images").notNull().default([]), // Array of image URLs
  videos: json("videos").default([]), // Array of video URLs
  documents: json("documents").default([]), // Manuals, specifications, etc.
  
  // Attributes and tagging
  tags: json("tags").notNull().default([]), // Array of tags
  attributes: json("attributes").notNull().default({}), // Product-specific attributes (color, size, etc.)
  dimensions: json("dimensions").default({}), // Product dimensions (length, width, height)
  
  // Marketplace integration
  marketplace: json("marketplace").notNull().default([]), // Array of marketplace identifiers
  syncedToMarketplaces: json("synced_to_marketplaces").notNull().default([]), // Which marketplaces this is synced to
  marketplaceIds: json("marketplace_ids").default({}), // IDs in different marketplaces {shopify: "123", ebay: "456"}
  
  // Fields for bundling and kitting
  itemType: text("item_type").notNull().default(ItemType.REGULAR), // regular, bundle, component
  weight: doublePrecision("weight"), // Weight for shipping
  weightUnit: text("weight_unit").default("g"), // g, oz, lb, kg
  processingStatus: text("processing_status").notNull().default(ProcessingStatus.NONE), // none, waiting, in_progress, completed
  sourceItemId: integer("source_item_id"), // Reference to parent item if this is a component
  bundlePlan: json("bundle_plan").default([]), // Array of planned component items
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schema
export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const itemFormSchema = insertItemSchema.extend({
  files: z.array(z.any()).optional(),
  sku: z.string().optional(), // SKU becomes optional in the form (will be auto-generated)
  barcode: z.string().optional(), // Will be auto-generated
  qrCode: z.string().optional(), // Will be auto-generated
});

// Export types
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type ItemForm = z.infer<typeof itemFormSchema>;

// Marketplace Schema
export const marketplaces = pgTable("marketplaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("general"), // shopify, ebay, etsy, amazon, etc.
  isConnected: boolean("is_connected").notNull().default(false),
  credentials: json("credentials").notNull().default({}),
  apiEndpoint: text("api_endpoint"), // API URL for the marketplace
  storeUrl: text("store_url"), // URL of the store/seller account
  syncEnabled: boolean("sync_enabled").default(false), // Whether automatic syncing is enabled
  syncInterval: integer("sync_interval").default(60), // Minutes between syncs
  lastSyncDate: timestamp("last_sync_date"), // When the marketplace was last synced
  syncLog: json("sync_log").default([]), // Log of sync activities
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMarketplaceSchema = createInsertSchema(marketplaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Marketplace = typeof marketplaces.$inferSelect;
export type InsertMarketplace = z.infer<typeof insertMarketplaceSchema>;

// CSV Export Schema
export const csvExportSchema = z.object({
  marketplaces: z.array(z.string()).min(1, "Select at least one marketplace"),
  items: z.array(z.number()).min(1, "Select at least one item"),
});

export type CSVExport = z.infer<typeof csvExportSchema>;

// Affiliates Schema
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  code: text("code").notNull().unique(), // Unique affiliate code
  commissionRate: doublePrecision("commission_rate").notNull().default(0.04), // 4% default commission rate
  status: text("status").notNull().default("active"), // active, inactive, suspended
  paymentDetails: json("payment_details").notNull().default({}), // Payment method details
  notes: text("notes"),
  totalEarnings: doublePrecision("total_earnings").notNull().default(0),
  totalSales: integer("total_sales").notNull().default(0),
  // Stripe integration fields
  stripeAccountId: text("stripe_account_id"), // Stripe Connect account ID
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(false), // Whether Stripe onboarding is complete
  payoutSchedule: text("payout_schedule").default("monthly"), // daily, weekly, biweekly, monthly
  lastPayoutDate: timestamp("last_payout_date"), // When the affiliate was last paid out
  pendingPayout: doublePrecision("pending_payout").notNull().default(0), // Amount awaiting payout
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalEarnings: true,
  totalSales: true,
});

export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;

// QR Code Schema
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(), // Reference to the affiliate
  code: text("code").notNull().unique(), // Unique tracking code
  url: text("url").notNull(), // Target URL with affiliate tracking
  type: text("type").notNull().default("affiliate"), // affiliate, product, campaign
  title: text("title").notNull(), // Name/title for the QR code
  description: text("description"),
  imageUrl: text("image_url"), // URL to the generated QR code image
  scans: integer("scans").notNull().default(0), // Number of scans/uses
  conversions: integer("conversions").notNull().default(0), // Number of actual purchases
  status: text("status").notNull().default("active"), // active, inactive
  lastScannedAt: timestamp("last_scanned_at"), // When the QR code was last scanned
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  scans: true,
  conversions: true,
});

export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;

// Sales schema with affiliate tracking fields
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(), // Foreign key to items table
  quantity: integer("quantity").notNull().default(1),
  salePrice: doublePrecision("sale_price").notNull(), // Actual selling price (may differ from item price)
  marketplace: text("marketplace").notNull(), // Which marketplace it was sold on
  orderNumber: text("order_number"), // External order number/reference
  trackingNumber: text("tracking_number"), // Shipping tracking number
  buyerInfo: json("buyer_info").notNull().default({}), // Buyer details (JSON)
  saleDate: date("sale_date").notNull().defaultNow(), // When the sale occurred
  shippingCost: doublePrecision("shipping_cost").default(0), // Cost of shipping
  fees: doublePrecision("fees").default(0), // Platform fees
  affiliateCode: text("affiliate_code"), // The affiliate code used for the sale
  commissionRate: doublePrecision("commission_rate"), // Commission rate for this sale
  commissionAmount: doublePrecision("commission_amount"), // Calculated commission amount
  status: text("status").notNull().default("completed"), // completed, refunded, cancelled
  notes: text("notes"), // Any additional notes about the sale
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  commissionAmount: true, // This will be calculated on the server
});

export const saleFormSchema = insertSaleSchema.extend({
  itemSku: z.string().optional(), // Allow looking up by SKU instead of ID
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type SaleForm = z.infer<typeof saleFormSchema>;

// Affiliate Transactions Schema
export const affiliateTransactions = pgTable("affiliate_transactions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(), // Reference to the affiliate
  saleId: integer("sale_id"), // Optional reference to the sale (if applicable)
  transactionType: text("transaction_type").notNull(), // commission, payout, adjustment
  amount: doublePrecision("amount").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, processed, canceled
  // Stripe integration fields
  stripeTransferId: text("stripe_transfer_id"), // Stripe transfer ID for payouts
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment intent ID for sales
  payoutBatchId: text("payout_batch_id"), // For grouping transactions in the same payout batch
  feeAmount: doublePrecision("fee_amount").default(0), // Any fees charged by payment processor
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAffiliateTransactionSchema = createInsertSchema(affiliateTransactions).omit({
  id: true,
  createdAt: true,
});

export type AffiliateTransaction = typeof affiliateTransactions.$inferSelect;
export type InsertAffiliateTransaction = z.infer<typeof insertAffiliateTransactionSchema>;

// Analytics Report Schema
export const reportSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  marketplaces: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  groupBy: z.enum(["day", "week", "month", "marketplace", "category"]).default("day"),
});

export type ReportParams = z.infer<typeof reportSchema>;

// Report types
export interface ReportSummary {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  bestSellingItem: {
    id: number;
    name: string;
    quantity: number;
    revenue: number;
  } | null;
  bestMarketplace: {
    name: string;
    sales: number;
    revenue: number;
  } | null;
  topCategory: {
    name: string;
    sales: number;
    revenue: number;
  } | null;
}

export interface TimeSeriesData {
  label: string; // Date string or category name
  sales: number;
  revenue: number;
  profit: number;
  isForecasted: boolean; // Flag to indicate if this is a forecasted data point
  metadata?: Record<string, any>; // Additional metadata for filtering (category, packageSize, etc)
}

export interface SalesReport {
  summary: ReportSummary;
  timeSeries: TimeSeriesData[];
  categoryBreakdown: { name: string; value: number; percentage: number }[];
  marketplaceBreakdown: { name: string; value: number; percentage: number }[];
  topProducts: {
    id: number;
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
  }[];
  forecast?: {
    timeSeries: TimeSeriesData[];
    kpis: {
      historicalMetrics: {
        totalSales: number;
        totalRevenue: number;
        totalProfit: number;
        avgMonthlySales: number;
      };
      forecastedMetrics: {
        totalSales: number;
        totalRevenue: number;
        totalProfit: number;
        avgMonthlySales: number;
      };
      growthMetrics: {
        salesGrowth: number;
        revenueGrowth: number;
        profitGrowth: number;
      };
      inventoryMetrics: {
        suggestedInventoryLevel: number;
      };
    };
    categoryForecasts?: {
      [category: string]: {
        timeSeries: TimeSeriesData[];
        suggestedInventoryLevel: number;
      };
    };
    weightForecasts?: {
      [weight: string]: {
        timeSeries: TimeSeriesData[];
        suggestedInventoryLevel: number;
      };
    };
  };
}

// Forecast request schema
export const forecastRequestSchema = z.object({
  historicalPeriods: z.number().int().positive().default(3),
  forecastPeriods: z.number().int().positive().default(3),
  categories: z.array(z.string()).optional(),
  weights: z.array(z.string()).optional(),
  groupBy: z.enum(["day", "week", "month"]).default("month"),
});

// Employees Schema
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 10 }).notNull().unique(), // Unique employee identifier
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("staff"), // admin, manager, staff
  department: text("department").notNull().default("general"),
  active: boolean("active").notNull().default(true),
  pin: varchar("pin", { length: 6 }), // Optional PIN for scanner authentication
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

// Inventory Actions Schema - track who does what with inventory items
export const inventoryActions = pgTable("inventory_actions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(), // Reference to the item
  employeeId: integer("employee_id").notNull(), // Reference to the employee
  actionType: text("action_type").notNull(), // create, update, scan, list, ship, etc.
  actionDetails: json("action_details").notNull().default({}), // Additional details about the action
  quantity: integer("quantity").default(1), // Quantity affected if applicable
  notes: text("notes"), // Any additional notes
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertInventoryActionSchema = createInsertSchema(inventoryActions).omit({
  id: true,
  timestamp: true,
});

export type InventoryAction = typeof inventoryActions.$inferSelect;
export type InsertInventoryAction = z.infer<typeof insertInventoryActionSchema>;

// Product Processing Schema (renamed from Product Breakdown)
export const productBreakdowns = pgTable("product_breakdowns", {
  id: serial("id").primaryKey(),
  bulkItemId: integer("bulk_item_id").notNull(), // Reference to the bulk item
  status: text("status").notNull().default(ProcessingStatus.WAITING), // waiting, in_progress, completed
  employeeId: integer("employee_id"), // Employee who initiated or completed the breakdown
  targetProducts: json("target_products").notNull().default([]), // Array of planned breakdown products
  completedProducts: json("completed_products").notNull().default([]), // Array of created breakdown products
  notes: text("notes"), // Notes about the breakdown process
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertBreakdownSchema = createInsertSchema(productBreakdowns).omit({
  id: true,
  completedAt: true,
});

export type ProductBreakdown = typeof productBreakdowns.$inferSelect;
export type InsertProductBreakdown = z.infer<typeof insertBreakdownSchema>;

// Component target product schema (renamed from Breakdown target)
export const breakdownTargetSchema = z.object({
  name: z.string(),
  weight: z.number(),
  weightUnit: z.string().default("g"),
  quantity: z.number().int().positive(),
  sku: z.string().optional(),
  price: z.number().positive(),
  status: z.string().default(ProcessingStatus.WAITING),
  resultItemId: z.number().optional(), // ID of the created item when completed
});

export type BreakdownTarget = z.infer<typeof breakdownTargetSchema>;

// Define the relationships
export const inventoryActionsRelations = relations(inventoryActions, ({ one }) => ({
  item: one(items, {
    fields: [inventoryActions.itemId],
    references: [items.id],
  }),
  employee: one(employees, {
    fields: [inventoryActions.employeeId],
    references: [employees.id],
  }),
}));

export const productBreakdownsRelations = relations(productBreakdowns, ({ one }) => ({
  bulkItem: one(items, {
    fields: [productBreakdowns.bulkItemId],
    references: [items.id],
  }),
  employee: one(employees, {
    fields: [productBreakdowns.employeeId],
    references: [employees.id],
  }),
}));

export const itemsRelations = relations(items, ({ many, one }) => ({
  inventoryActions: many(inventoryActions),
  sales: many(sales),
  breakdowns: many(productBreakdowns),
  sourceItem: one(items, {
    fields: [items.sourceItemId],
    references: [items.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  item: one(items, {
    fields: [sales.itemId],
    references: [items.id],
  }),
}));

export const affiliatesRelations = relations(affiliates, ({ many }) => ({
  transactions: many(affiliateTransactions),
  qrCodes: many(qrCodes),
}));

export const affiliateTransactionsRelations = relations(affiliateTransactions, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateTransactions.affiliateId],
    references: [affiliates.id],
  }),
  sale: one(sales, {
    fields: [affiliateTransactions.saleId],
    references: [sales.id],
  }),
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [qrCodes.affiliateId],
    references: [affiliates.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  inventoryActions: many(inventoryActions),
  breakdowns: many(productBreakdowns),
}));