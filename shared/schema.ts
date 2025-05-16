import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  json,
  doublePrecision,
  numeric,
  jsonb,
  primaryKey,
  date,
  index,
  foreignKey
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(),
  password: varchar("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Item table for inventory management
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  sku: varchar("sku").unique(),
  brand: varchar("brand"),
  costPrice: numeric("cost_price").default("0"),
  basePrice: numeric("base_price").default("0"),
  salePrice: numeric("sale_price"),
  wholesalePrice: numeric("wholesale_price"),
  category: varchar("category").default("general"),
  tags: text("tags").array(),
  quantity: integer("quantity").default(0),
  status: varchar("status").default("active"),
  images: text("images").array(),
  barcode: varchar("barcode"),
  weight: numeric("weight"),
  dimensions: varchar("dimensions"),
  condition: varchar("condition"),
  packageSize: varchar("package_size"),
  qrCode: text("qr_code"),
  marketplaceId: integer("marketplace_id"),
  publishStatus: varchar("publish_status").default("draft"),
  externalId: varchar("external_id"),
  marketplaceUrl: varchar("marketplace_url"),
  marketplace: json("marketplace").default([]),
  location: varchar("location"),
  tier: varchar("tier"),
  strainType: varchar("strain_type"),
  publishedToShopify: boolean("published_to_shopify").default(false),
  shopifyId: varchar("shopify_id"),
  shopifyUrl: varchar("shopify_url"),
  shopifyVariantId: varchar("shopify_variant_id"),
  metadata: json("metadata").default({}),
  itemType: varchar("item_type").default("standard"), // standard, bulk, breakdown
  visibility: varchar("visibility").default("visible"), // visible, hidden, archived
  processingStatus: varchar("processing_status"),
  assignedEmployeeId: integer("assigned_employee_id"),
  parentItemId: integer("parent_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

// Marketplace table for tracking external platforms
export const marketplaces = pgTable("marketplaces", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  apiKey: varchar("api_key"),
  apiSecret: varchar("api_secret"),
  storeUrl: varchar("store_url"),
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync"),
  lastPush: timestamp("last_push"),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  settings: json("settings").default({}),
  pullInterval: integer("pull_interval").default(15), // minutes
  pushInterval: integer("push_interval").default(30), // minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Marketplace = typeof marketplaces.$inferSelect;
export type InsertMarketplace = typeof marketplaces.$inferInsert;

// Sales table
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  customerName: varchar("customer_name"),
  customerEmail: varchar("customer_email"),
  customerPhone: varchar("customer_phone"),
  items: json("items").notNull(),
  subtotal: numeric("subtotal").notNull(),
  tax: numeric("tax").default("0"),
  shipping: numeric("shipping").default("0"),
  discount: numeric("discount").default("0"),
  total: numeric("total").notNull(),
  status: varchar("status").default("completed"),
  paymentMethod: varchar("payment_method"),
  marketplaceId: integer("marketplace_id"),
  externalOrderId: varchar("external_order_id"),
  shippingAddress: json("shipping_address"),
  notes: text("notes"),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// Employee table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  position: varchar("position"),
  departmentId: integer("department_id"),
  managerId: integer("manager_id"),
  hireDate: date("hire_date"),
  status: varchar("status").default("active"),
  permissions: json("permissions").default({}),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// Inventory action table to track employee interactions with inventory
export const inventoryActions = pgTable("inventory_actions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  actionType: varchar("action_type").notNull(), // "receive", "adjust", "move", "breakdown", etc.
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity"),
  notes: text("notes"),
  locationFrom: varchar("location_from"),
  locationTo: varchar("location_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InventoryAction = typeof inventoryActions.$inferSelect;
export type InsertInventoryAction = typeof inventoryActions.$inferInsert;

// Product breakdown table for tracking bulk item processing
export const productBreakdowns = pgTable("product_breakdowns", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  sourceItemId: integer("source_item_id").notNull(),
  assignedEmployeeId: integer("assigned_employee_id"),
  status: varchar("status").default("pending"), // pending, in_progress, completed, cancelled
  startWeight: numeric("start_weight"),
  weightUnit: varchar("weight_unit").default("g"),
  targetProducts: json("target_products").default([]),
  completedProducts: json("completed_products").default([]),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ProductBreakdown = typeof productBreakdowns.$inferSelect;
export type InsertProductBreakdown = typeof productBreakdowns.$inferInsert;

// Affiliate table for tracking partners and sales representatives
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  address: json("address"),
  code: varchar("code").unique().notNull(),
  commissionRate: numeric("commission_rate").default("0.1"), // 10% default
  paymentMethod: varchar("payment_method").default("paypal"),
  paymentDetails: json("payment_details").default({}),
  notes: text("notes"),
  status: varchar("status").default("active"),
  totalSales: integer("total_sales").default(0),
  totalEarnings: numeric("total_earnings").default("0"),
  pendingPayout: numeric("pending_payout").default("0"),
  stripeAccountId: varchar("stripe_account_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = typeof affiliates.$inferInsert;

// QR code table for tracking affiliate marketing codes
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(),
  code: varchar("code").unique().notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").default("general"), // general, product-specific, event, etc.
  targetUrl: varchar("target_url").notNull(),
  imageUrl: text("image_url"),
  scans: integer("scans").default(0),
  conversions: integer("conversions").default(0),
  lastScannedAt: timestamp("last_scanned_at"),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = typeof qrCodes.$inferInsert;

// Affiliate transaction table for tracking commissions and payouts
export const affiliateTransactions = pgTable("affiliate_transactions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(),
  amount: numeric("amount").notNull(),
  type: varchar("type").notNull(), // "commission", "payout"
  status: varchar("status").default("pending"), // "pending", "processed", "failed"
  description: text("description"),
  saleId: varchar("sale_id"),
  stripeTransferId: varchar("stripe_transfer_id"),
  paypalPayoutId: varchar("paypal_payout_id"),
  paypalOrderId: varchar("paypal_order_id"),
  paypalCaptureId: varchar("paypal_capture_id"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AffiliateTransaction = typeof affiliateTransactions.$inferSelect;
export type InsertAffiliateTransaction = typeof affiliateTransactions.$inferInsert;

// Export enums for use in application code
export enum ItemType {
  STANDARD = "standard",
  BULK = "bulk",
  BREAKDOWN = "breakdown"
}

export enum ProcessingStatus {
  NONE = "none",
  WAITING = "waiting",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed"
}

export enum ItemCondition {
  NEW = "new",
  USED = "used",
  REFURBISHED = "refurbished",
  BROKEN = "broken"
}

export enum BreakdownStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress", 
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

// Zod schemas for request validation
export const insertItemSchema = createInsertSchema(items);
export const insertMarketplaceSchema = createInsertSchema(marketplaces);
export const insertSaleSchema = createInsertSchema(sales);
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertInventoryActionSchema = createInsertSchema(inventoryActions);
export const insertBreakdownSchema = createInsertSchema(productBreakdowns);
export const insertUserSchema = createInsertSchema(users);
export const insertAffiliateSchema = createInsertSchema(affiliates);
export const insertQrCodeSchema = createInsertSchema(qrCodes);
export const insertAffiliateTransactionSchema = createInsertSchema(affiliateTransactions);

// Custom schemas for specific operations
export const breakdownTargetSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  weight: z.number().positive(),
  weightUnit: z.string(),
  sku: z.string().optional(),
  price: z.number().optional()
});

export type BreakdownTarget = z.infer<typeof breakdownTargetSchema>;

export const csvExportSchema = z.object({
  type: z.enum(['products', 'inventory', 'sales']),
  format: z.enum(['csv', 'json']).default('csv'),
  fields: z.array(z.string()).optional(),
  filter: z.record(z.any()).optional()
});

export const reportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  marketplaceId: z.number().optional(),
  category: z.string().optional()
});

export type ReportParams = z.infer<typeof reportSchema>;

export type SalesReport = {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  productsSold: number;
  topProducts: {id: number, name: string, quantity: number, revenue: number}[];
  recentSales: Sale[];
  salesByDay: {date: string, sales: number, revenue: number}[];
};

export const forecastRequestSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
  item_id: z.number().optional(),
  category: z.string().optional(),
  includeHistorical: z.boolean().default(true)
});

export type TimeSeriesData = {
  label: string;
  sales: number;
  revenue: number;
  profit: number;
  isForecasted?: boolean;
  metadata?: any;
};

// Item form schema for the client-side form validation
export const itemFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  costPrice: z.string().optional().nullable(),
  basePrice: z.string().optional().nullable(),
  salePrice: z.string().optional().nullable(),
  wholesalePrice: z.string().optional().nullable(),
  category: z.string().default("general"),
  tags: z.array(z.string()).optional().nullable(),
  quantity: z.string().optional().nullable().transform(val => val ? Number(val) : 0),
  status: z.string().default("active"),
  barcode: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  tier: z.string().optional().nullable(),
  strainType: z.string().optional().nullable(),
  itemType: z.string().default("standard"),
  visibility: z.string().default("visible"),
});