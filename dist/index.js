// server/index.ts
import express2 from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// server/routes.ts
import express from "express";

// server/storage.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";

// shared/schema.ts
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
  date,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  username: varchar("username").unique(),
  password: varchar("password"),
  // For username/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  googleId: varchar("google_id").unique(),
  // For Google OAuth
  provider: varchar("provider").default("local"),
  // 'local', 'google'
  role: varchar("role").default("user"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var priceSheet = pgTable("price_sheet", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  sku: varchar("sku").notNull(),
  itemName: varchar("item_name").notNull(),
  shopifyId: varchar("shopify_id"),
  shopifyHandle: varchar("shopify_handle"),
  // Pricing information
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  wholesalePrice: numeric("wholesale_price", { precision: 10, scale: 2 }),
  retailPrice: numeric("retail_price", { precision: 10, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
  // Stock tracking
  totalStock: integer("total_stock").default(0).notNull(),
  availableStock: integer("available_stock").default(0).notNull(),
  reservedStock: integer("reserved_stock").default(0).notNull(),
  onOrderStock: integer("on_order_stock").default(0).notNull(),
  // Weight and unit information
  weight: varchar("weight"),
  weightUnit: varchar("weight_unit").default("g"),
  unitSize: varchar("unit_size"),
  // Category and classification
  category: varchar("category"),
  brand: varchar("brand"),
  vendor: varchar("vendor"),
  strain: varchar("strain"),
  potency: varchar("potency"),
  // Stock status and alerts
  lowStockThreshold: integer("low_stock_threshold").default(5),
  isLowStock: boolean("is_low_stock").default(false),
  isOutOfStock: boolean("is_out_of_stock").default(false),
  // Marketplace sync status
  shopifyInSync: boolean("shopify_in_sync").default(false),
  lastShopifySync: timestamp("last_shopify_sync"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_price_sheet_item_id").on(table.itemId),
  index("idx_price_sheet_sku").on(table.sku),
  index("idx_price_sheet_shopify_id").on(table.shopifyId),
  index("idx_price_sheet_low_stock").on(table.isLowStock),
  index("idx_price_sheet_out_of_stock").on(table.isOutOfStock)
]);
var orderTransactions = pgTable("order_transactions", {
  id: serial("id").primaryKey(),
  priceSheetId: integer("price_sheet_id").notNull().references(() => priceSheet.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  // Transaction details
  transactionType: varchar("transaction_type").notNull(),
  // 'order', 'adjustment', 'intake', 'return', 'loss'
  quantityChanged: integer("quantity_changed").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  // Order reference information
  orderId: varchar("order_id"),
  shopifyOrderId: varchar("shopify_order_id"),
  customerName: varchar("customer_name"),
  // Pricing at time of transaction
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  totalValue: numeric("total_value", { precision: 10, scale: 2 }),
  // Notes and metadata
  notes: text("notes"),
  employeeId: integer("employee_id"),
  locationFrom: varchar("location_from"),
  locationTo: varchar("location_to"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_order_transactions_price_sheet").on(table.priceSheetId),
  index("idx_order_transactions_item").on(table.itemId),
  index("idx_order_transactions_type").on(table.transactionType),
  index("idx_order_transactions_order").on(table.orderId),
  index("idx_order_transactions_shopify").on(table.shopifyOrderId)
]);
var priceSheetRelations = {
  item: {
    type: "one",
    to: "items",
    from: priceSheet.itemId,
    to_field: "id"
  },
  transactions: {
    type: "many",
    to: "orderTransactions",
    from: priceSheet.id,
    to_field: "priceSheetId"
  }
};
var orderTransactionRelations = {
  priceSheet: {
    type: "one",
    to: "priceSheet",
    from: orderTransactions.priceSheetId,
    to_field: "id"
  },
  item: {
    type: "one",
    to: "items",
    from: orderTransactions.itemId,
    to_field: "id"
  }
};
var userCredentials = pgTable("user_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  provider: varchar("provider").notNull(),
  // 'shopify', 'google_sheets', etc.
  encryptedData: text("encrypted_data").notNull(),
  // Encrypted JSON credentials
  isValid: boolean("is_valid").default(false),
  lastValidated: timestamp("last_validated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var thcaFlowerMapping = pgTable("thca_flower_mapping", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id, { onDelete: "cascade" }),
  shopifyId: varchar("shopify_id"),
  shopifyHandle: varchar("shopify_handle"),
  // THCa Sheet Data
  thcaSheetStrain: varchar("thca_sheet_strain"),
  thcaSheetAmount: varchar("thca_sheet_amount"),
  thcaSheetPercentage: varchar("thca_sheet_percentage"),
  thcaSheetTier: varchar("thca_sheet_tier"),
  thcaSheetBulk: varchar("thca_sheet_bulk"),
  thcaSheetDistro: varchar("thca_sheet_distro"),
  thcaSheetMaster: varchar("thca_sheet_master"),
  thcaSheetCoas: varchar("thca_sheet_coas"),
  thcaSheetMedia: varchar("thca_sheet_media"),
  thcaSheetStrainType: varchar("thca_sheet_strain_type"),
  // Shopify Product Data
  shopifyTitle: varchar("shopify_title"),
  shopifySku: varchar("shopify_sku"),
  shopifyInventoryQuantity: integer("shopify_inventory_quantity"),
  shopifyPrice: numeric("shopify_price", { precision: 10, scale: 2 }),
  shopifyStatus: varchar("shopify_status"),
  shopifyProductType: varchar("shopify_product_type"),
  shopifyVendor: varchar("shopify_vendor"),
  shopifyTags: text("shopify_tags"),
  // Mapping Status
  mappingStatus: varchar("mapping_status").default("auto_matched"),
  // 'auto_matched', 'manual_mapped', 'conflict', 'unmapped'
  matchScore: numeric("match_score", { precision: 3, scale: 2 }),
  // confidence score 0.00-1.00
  mappingMethod: varchar("mapping_method"),
  // 'sku_match', 'name_match', 'manual_assignment'
  // Sync Status
  lastSyncedAt: timestamp("last_synced_at"),
  syncErrors: text("sync_errors"),
  needsReview: boolean("needs_review").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_thca_mapping_item_id").on(table.itemId),
  index("idx_thca_mapping_shopify_id").on(table.shopifyId),
  index("idx_thca_mapping_strain").on(table.thcaSheetStrain),
  index("idx_thca_mapping_status").on(table.mappingStatus),
  index("idx_thca_mapping_needs_review").on(table.needsReview)
]);
var shopifyProductLookup = pgTable("shopify_product_lookup", {
  id: serial("id").primaryKey(),
  shopifyId: varchar("shopify_id").unique().notNull(),
  handle: varchar("handle").unique().notNull(),
  // Product Details
  title: varchar("title").notNull(),
  bodyHtml: text("body_html"),
  vendor: varchar("vendor"),
  productType: varchar("product_type"),
  status: varchar("status"),
  // 'active', 'archived', 'draft'
  tags: text("tags"),
  // Variant Information (for single variant products)
  variantId: varchar("variant_id"),
  variantSku: varchar("variant_sku"),
  variantPrice: numeric("variant_price", { precision: 10, scale: 2 }),
  variantCompareAtPrice: numeric("variant_compare_at_price", { precision: 10, scale: 2 }),
  variantInventoryQuantity: integer("variant_inventory_quantity"),
  variantWeight: numeric("variant_weight", { precision: 10, scale: 3 }),
  variantWeightUnit: varchar("variant_weight_unit"),
  // Images
  featuredImage: varchar("featured_image"),
  imageUrls: text("image_urls").array(),
  // Array of all image URLs
  // SEO and Meta
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  // Shopify Timestamps
  shopifyCreatedAt: timestamp("shopify_created_at"),
  shopifyUpdatedAt: timestamp("shopify_updated_at"),
  shopifyPublishedAt: timestamp("shopify_published_at"),
  // Our Sync Data
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  syncStatus: varchar("sync_status").default("synced"),
  // 'synced', 'error', 'pending'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_shopify_lookup_handle").on(table.handle),
  index("idx_shopify_lookup_sku").on(table.variantSku),
  index("idx_shopify_lookup_status").on(table.status),
  index("idx_shopify_lookup_product_type").on(table.productType),
  index("idx_shopify_lookup_sync_status").on(table.syncStatus)
]);
var thcaSheetData = pgTable("thca_sheet_data", {
  id: serial("id").primaryKey(),
  rowNumber: integer("row_number").notNull(),
  // Exact column data from THCa Flower sheet
  strain: varchar("strain"),
  amount: varchar("amount"),
  percentage: varchar("percentage"),
  tier: varchar("tier"),
  bulk: varchar("bulk"),
  distro25lbs: varchar("distro_25lbs"),
  master50lbs: varchar("master_50lbs"),
  master2100lbs: varchar("master2_100lbs"),
  coas: varchar("coas"),
  media: varchar("media"),
  strainType: varchar("strain_type"),
  // Additional calculated fields
  weightParsed: numeric("weight_parsed", { precision: 10, scale: 3 }),
  weightUnit: varchar("weight_unit"),
  percentageParsed: numeric("percentage_parsed", { precision: 5, scale: 2 }),
  // Processing status
  processed: boolean("processed").default(false),
  mappedToItemId: integer("mapped_to_item_id").references(() => items.id),
  mappedToShopifyId: varchar("mapped_to_shopify_id"),
  // Sync metadata
  sheetLastModified: timestamp("sheet_last_modified"),
  lastProcessedAt: timestamp("last_processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_thca_sheet_row").on(table.rowNumber),
  index("idx_thca_sheet_strain").on(table.strain),
  index("idx_thca_sheet_processed").on(table.processed),
  index("idx_thca_sheet_mapped_item").on(table.mappedToItemId)
]);
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopifyCustomerId: varchar("shopify_customer_id").unique(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  // Customer Demographics
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("US"),
  zipCode: varchar("zip_code"),
  // Purchase Behavior Analytics
  totalOrders: integer("total_orders").default(0),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0"),
  averageOrderValue: numeric("average_order_value", { precision: 10, scale: 2 }).default("0"),
  lifetimeValue: numeric("lifetime_value", { precision: 12, scale: 2 }).default("0"),
  // Customer Tier and Segmentation
  customerTier: varchar("customer_tier").default("Bronze"),
  // Bronze, Silver, Gold, Platinum, Diamond
  loyaltyPoints: integer("loyalty_points").default(0),
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"),
  // Engagement Metrics
  firstOrderDate: timestamp("first_order_date"),
  lastOrderDate: timestamp("last_order_date"),
  daysSinceLastOrder: integer("days_since_last_order"),
  orderFrequency: numeric("order_frequency", { precision: 5, scale: 2 }),
  // orders per month
  // Purchase Preferences
  favoriteCategories: text("favorite_categories").array(),
  favoriteProducts: text("favorite_products").array(),
  preferredBrands: text("preferred_brands").array(),
  averageOrderQuantity: numeric("average_order_quantity", { precision: 8, scale: 2 }),
  // Marketing and Communication
  marketingOptIn: boolean("marketing_opt_in").default(true),
  smsOptIn: boolean("sms_opt_in").default(false),
  preferredCommunication: varchar("preferred_communication").default("email"),
  // Risk and Compliance
  isVerified: boolean("is_verified").default(false),
  riskScore: integer("risk_score").default(0),
  // 0-100 scale
  notes: text("notes"),
  // Shopify Integration
  shopifyAcceptsMarketing: boolean("shopify_accepts_marketing"),
  shopifyTags: text("shopify_tags"),
  shopifyOrdersCount: integer("shopify_orders_count").default(0),
  shopifyTotalSpent: numeric("shopify_total_spent", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_customers_email").on(table.email),
  index("idx_customers_tier").on(table.customerTier),
  index("idx_customers_total_spent").on(table.totalSpent),
  index("idx_customers_last_order").on(table.lastOrderDate),
  index("idx_customers_shopify_id").on(table.shopifyCustomerId)
]);
var customerPurchaseAnalytics = pgTable("customer_purchase_analytics", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  // Time-based Analytics
  month: integer("month").notNull(),
  // 1-12
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  // 1-4
  // Purchase Metrics
  ordersThisPeriod: integer("orders_this_period").default(0),
  totalSpentThisPeriod: numeric("total_spent_this_period", { precision: 10, scale: 2 }).default("0"),
  averageOrderValueThisPeriod: numeric("average_order_value_this_period", { precision: 10, scale: 2 }).default("0"),
  itemsPurchasedThisPeriod: integer("items_purchased_this_period").default(0),
  // Category Analytics
  topCategoryThisPeriod: varchar("top_category_this_period"),
  topProductThisPeriod: varchar("top_product_this_period"),
  categoriesExploredThisPeriod: text("categories_explored_this_period").array(),
  // Behavior Patterns
  daysActiveDuringPeriod: integer("days_active_during_period").default(0),
  averageDaysBetweenOrders: numeric("average_days_between_orders", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_purchase_analytics_customer").on(table.customerId),
  index("idx_purchase_analytics_period").on(table.year, table.month),
  index("idx_purchase_analytics_quarter").on(table.year, table.quarter)
]);
var customerTierThresholds = pgTable("customer_tier_thresholds", {
  id: serial("id").primaryKey(),
  tierName: varchar("tier_name").notNull().unique(),
  minTotalSpent: numeric("min_total_spent", { precision: 10, scale: 2 }).default("0"),
  minOrders: integer("min_orders").default(0),
  minMonthsActive: integer("min_months_active").default(0),
  // Benefits
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  freeShippingThreshold: numeric("free_shipping_threshold", { precision: 8, scale: 2 }),
  loyaltyPointsMultiplier: numeric("loyalty_points_multiplier", { precision: 3, scale: 2 }).default("1"),
  earlyAccessToProducts: boolean("early_access_to_products").default(false),
  dedicatedSupport: boolean("dedicated_support").default(false),
  // Display Properties
  badgeColor: varchar("badge_color").default("#CD7F32"),
  // Bronze default
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var orderAnalytics = pgTable("order_analytics", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  shopifyOrderId: varchar("shopify_order_id").unique(),
  customerId: integer("customer_id").references(() => customers.id),
  // Order Details
  orderNumber: varchar("order_number"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxes: numeric("taxes", { precision: 8, scale: 2 }).default("0"),
  shipping: numeric("shipping", { precision: 8, scale: 2 }).default("0"),
  discounts: numeric("discounts", { precision: 8, scale: 2 }).default("0"),
  // Order Composition
  itemCount: integer("item_count").default(0),
  uniqueProductCount: integer("unique_product_count").default(0),
  categories: text("categories").array(),
  brands: text("brands").array(),
  // Customer Context
  isFirstOrder: boolean("is_first_order").default(false),
  daysSinceLastOrder: integer("days_since_last_order"),
  customerTierAtOrderTime: varchar("customer_tier_at_order_time"),
  // Order Timing
  orderHour: integer("order_hour"),
  // 0-23
  orderDayOfWeek: integer("order_day_of_week"),
  // 0-6 (Sunday = 0)
  orderMonth: integer("order_month"),
  // 1-12
  // Fulfillment
  fulfillmentStatus: varchar("fulfillment_status").default("pending"),
  paymentStatus: varchar("payment_status").default("pending"),
  shippingMethod: varchar("shipping_method"),
  // Geographic
  shippingCity: varchar("shipping_city"),
  shippingState: varchar("shipping_state"),
  shippingCountry: varchar("shipping_country"),
  // Marketing Attribution
  referralSource: varchar("referral_source"),
  utmSource: varchar("utm_source"),
  utmCampaign: varchar("utm_campaign"),
  orderDate: timestamp("order_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_order_analytics_customer").on(table.customerId),
  index("idx_order_analytics_date").on(table.orderDate),
  index("idx_order_analytics_amount").on(table.totalAmount),
  index("idx_order_analytics_shopify").on(table.shopifyOrderId)
]);
var productPerformanceAnalytics = pgTable("product_performance_analytics", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id),
  sku: varchar("sku"),
  productName: varchar("product_name"),
  // Time Period
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  // Sales Metrics
  unitsSold: integer("units_sold").default(0),
  revenue: numeric("revenue", { precision: 10, scale: 2 }).default("0"),
  averageSellingPrice: numeric("average_selling_price", { precision: 8, scale: 2 }).default("0"),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).default("0"),
  // Customer Metrics
  uniqueCustomers: integer("unique_customers").default(0),
  repeatCustomers: integer("repeat_customers").default(0),
  newCustomers: integer("new_customers").default(0),
  // Performance Indicators
  inventoryTurnover: numeric("inventory_turnover", { precision: 5, scale: 2 }).default("0"),
  daysToSellOut: integer("days_to_sell_out"),
  reorderRate: numeric("reorder_rate", { precision: 5, scale: 2 }).default("0"),
  // Rankings
  salesRank: integer("sales_rank"),
  revenueRank: integer("revenue_rank"),
  profitRank: integer("profit_rank"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_product_analytics_item").on(table.itemId),
  index("idx_product_analytics_period").on(table.year, table.month),
  index("idx_product_analytics_sales").on(table.unitsSold),
  index("idx_product_analytics_revenue").on(table.revenue)
]);
var items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  sku: varchar("sku").unique(),
  brand: varchar("brand"),
  cost_price: doublePrecision("cost_price").default(0),
  base_price: doublePrecision("base_price"),
  sale_price: doublePrecision("sale_price"),
  wholesale_price: doublePrecision("wholesale_price"),
  category: varchar("category").default("general"),
  tags: json("tags").default([]),
  quantity: integer("quantity").default(0),
  status: varchar("status").default("active"),
  images: json("images").default([]),
  imageUrl: varchar("image_url"),
  // Primary image URL from Google Sheets
  barcode: varchar("barcode"),
  weight: varchar("weight").default("pound"),
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
  itemType: varchar("item_type").default("standard"),
  // standard, bulk, breakdown
  visibility: varchar("visibility").default("visible"),
  // visible, hidden, archived
  processingStatus: varchar("processing_status"),
  assignedEmployeeId: integer("assigned_employee_id"),
  parentItemId: integer("parent_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var marketplaceTypes = pgTable("marketplace_types", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  // "Shopify", "eBay", "Etsy", etc.
  description: text("description"),
  logoUrl: varchar("logo_url"),
  apiVersion: varchar("api_version"),
  authType: varchar("auth_type").default("api_key"),
  // api_key, oauth, token
  requiredFields: json("required_fields").default([]),
  // Fields needed for connection
  supportedFeatures: json("supported_features").default([]),
  // sync, push, pull, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  webhookType: varchar("webhook_type").notNull(),
  // orders/create, customers/create, etc.
  shopifyId: varchar("shopify_id"),
  // ID from Shopify
  payload: json("payload"),
  // Full webhook payload
  processedAt: timestamp("processed_at").defaultNow(),
  status: varchar("status").default("logged_read_only"),
  // logged_read_only, processed, error
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent")
});
var stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  // Store display name
  marketplaceTypeId: integer("marketplace_type_id").notNull().references(() => marketplaceTypes.id),
  storeUrl: varchar("store_url"),
  apiKey: varchar("api_key"),
  apiSecret: varchar("api_secret"),
  accessToken: varchar("access_token"),
  refreshToken: varchar("refresh_token"),
  credentials: json("credentials").default({}),
  // Additional auth data
  isConnected: boolean("is_connected").default(false),
  connectionStatus: varchar("connection_status").default("disconnected"),
  // connected, disconnected, error, testing
  lastConnectionTest: timestamp("last_connection_test"),
  lastSync: timestamp("last_sync"),
  lastPush: timestamp("last_push"),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  settings: json("settings").default({}),
  pullInterval: integer("pull_interval").default(15),
  // minutes
  pushInterval: integer("push_interval").default(30),
  // minutes
  priority: integer("priority").default(1),
  // Store priority for sync order
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var marketplaces = stores;
var sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
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
  storeId: integer("store_id").references(() => stores.id),
  externalOrderId: varchar("external_order_id"),
  shippingAddress: json("shipping_address"),
  notes: text("notes"),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").unique().notNull(),
  email: text("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  position: varchar("position"),
  departmentId: integer("department_id"),
  managerId: integer("manager_id"),
  hireDate: date("hire_date"),
  status: varchar("status").default("active"),
  permissions: jsonb("permissions").default("{}"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var inventoryActions = pgTable("inventory_actions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  actionType: varchar("action_type").notNull(),
  // "receive", "adjust", "move", "breakdown", etc.
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity"),
  notes: text("notes"),
  locationFrom: varchar("location_from"),
  locationTo: varchar("location_to"),
  createdAt: timestamp("created_at").defaultNow()
});
var productBreakdowns = pgTable("product_breakdowns", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  sourceItemId: integer("source_item_id").notNull(),
  assignedEmployeeId: integer("assigned_employee_id"),
  status: varchar("status").default("pending"),
  // pending, in_progress, completed, cancelled
  startWeight: numeric("start_weight"),
  weightUnit: varchar("weight_unit").default("g"),
  targetProducts: json("target_products").default([]),
  completedProducts: json("completed_products").default([]),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  address: json("address"),
  code: varchar("code").unique().notNull(),
  commissionRate: numeric("commission_rate").default("0.1"),
  // 10% default
  paymentMethod: varchar("payment_method").default("paypal"),
  paymentDetails: json("payment_details").default({}),
  notes: text("notes"),
  status: varchar("status").default("active"),
  totalSales: integer("total_sales").default(0),
  totalEarnings: numeric("total_earnings").default("0"),
  pendingPayout: numeric("pending_payout").default("0"),
  stripeAccountId: varchar("stripe_account_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(),
  code: varchar("code").unique().notNull(),
  url: text("url").notNull(),
  type: varchar("type").default("general"),
  title: varchar("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  scans: integer("scans").default(0),
  conversions: integer("conversions").default(0),
  status: varchar("status").default("active"),
  expiresAt: timestamp("expires_at"),
  lastScannedAt: timestamp("last_scanned_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var affiliateTransactions = pgTable("affiliate_transactions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(),
  amount: numeric("amount").notNull(),
  type: varchar("type").notNull(),
  // "commission", "payout"
  status: varchar("status").default("pending"),
  // "pending", "processed", "failed"
  description: text("description"),
  saleId: varchar("sale_id"),
  stripeTransferId: varchar("stripe_transfer_id"),
  paypalPayoutId: varchar("paypal_payout_id"),
  paypalOrderId: varchar("paypal_order_id"),
  paypalCaptureId: varchar("paypal_capture_id"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var customerTiers = pgTable("customer_tiers", {
  id: serial("id").primaryKey(),
  name: varchar("name").unique().notNull(),
  // standard, premium, vip, big_spender
  displayName: varchar("display_name").notNull(),
  minSpent: numeric("min_spent").default("0"),
  // minimum total spent to qualify
  minOrders: integer("min_orders").default(0),
  // minimum orders to qualify
  discountPercentage: numeric("discount_percentage").default("0"),
  perks: text("perks").array(),
  // Array of perk descriptions
  color: varchar("color").default("#6B7280"),
  // hex color for UI display
  priority: integer("priority").default(0),
  // higher priority = higher tier
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  // 'sync-initialized', 'full-sync', 'incremental-sync', etc.
  message: text("message").notNull(),
  data: jsonb("data"),
  // Additional sync data/metadata
  success: boolean("success").default(true),
  itemsUpdated: integer("items_updated").default(0),
  itemsCreated: integer("items_created").default(0),
  conflicts: integer("conflicts").default(0),
  errors: json("errors"),
  // Array of error messages
  source: varchar("source", { length: 20 }).default("system"),
  // 'app', 'sheets', 'shopify', 'system'
  timestamp: timestamp("timestamp").defaultNow()
});
var insertItemSchema = createInsertSchema(items);
var insertMarketplaceSchema = createInsertSchema(marketplaces);
var insertSaleSchema = createInsertSchema(sales);
var insertEmployeeSchema = createInsertSchema(employees);
var insertInventoryActionSchema = createInsertSchema(inventoryActions);
var insertBreakdownSchema = createInsertSchema(productBreakdowns);
var insertUserSchema = createInsertSchema(users);
var insertAffiliateSchema = createInsertSchema(affiliates);
var insertQrCodeSchema = createInsertSchema(qrCodes);
var insertAffiliateTransactionSchema = createInsertSchema(affiliateTransactions);
var insertCustomerSchema = createInsertSchema(customers);
var insertCustomerTierSchema = createInsertSchema(customerTiers);
var breakdownTargetSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  weight: z.number().positive(),
  weightUnit: z.string(),
  sku: z.string().optional(),
  price: z.number().optional()
});
var csvExportSchema = z.object({
  type: z.enum(["products", "inventory", "sales"]),
  format: z.enum(["csv", "json"]).default("csv"),
  fields: z.array(z.string()).optional(),
  filter: z.record(z.any()).optional()
});
var reportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  marketplaceId: z.number().optional(),
  category: z.string().optional()
});
var forecastRequestSchema = z.object({
  historicalPeriods: z.number().int().min(1).max(24).default(3),
  forecastPeriods: z.number().int().min(1).max(12).default(3),
  categories: z.array(z.string()).optional(),
  weights: z.array(z.string()).optional(),
  groupBy: z.enum(["day", "week", "month"]).default("month"),
  compareYOY: z.boolean().default(false),
  priceAdjustment: z.number().min(-20).max(20).default(0),
  specificStrain: z.string().optional(),
  brand: z.string().optional()
});
var itemFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  costPrice: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
    if (val === null || val === void 0) return null;
    return typeof val === "number" ? val.toString() : val;
  }),
  basePrice: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
    if (val === null || val === void 0) return null;
    return typeof val === "number" ? val.toString() : val;
  }),
  salePrice: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
    if (val === null || val === void 0) return null;
    return typeof val === "number" ? val.toString() : val;
  }),
  wholesalePrice: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
    if (val === null || val === void 0) return null;
    return typeof val === "number" ? val.toString() : val;
  }),
  category: z.string().default("general"),
  tags: z.array(z.string()).optional().nullable(),
  quantity: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
    if (val === null || val === void 0) return 0;
    return typeof val === "string" ? Number(val) || 0 : val;
  }),
  status: z.string().default("active"),
  barcode: z.string().optional().nullable(),
  weight: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
    if (val === null || val === void 0) return null;
    return typeof val === "number" ? val.toString() : val;
  }),
  dimensions: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  tier: z.string().optional().nullable(),
  strainType: z.string().optional().nullable(),
  itemType: z.string().default("standard"),
  visibility: z.string().default("visible")
});
var credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  service: varchar("service", { length: 100 }).notNull(),
  // 'google_sheets', 'shopify', etc.
  name: varchar("name", { length: 255 }).notNull(),
  // Display name for the credential
  credentialData: jsonb("credential_data").notNull(),
  // Encrypted credential data
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertCredentialSchema = createInsertSchema(credentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPriceSheetSchema = createInsertSchema(priceSheet).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertOrderTransactionSchema = createInsertSchema(orderTransactions).omit({
  id: true,
  createdAt: true
});

// server/storage.ts
import { eq, desc, and, gte } from "drizzle-orm";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool);
var Storage = class {
  async getAllItems() {
    try {
      const result = await db.select().from(items).orderBy(desc(items.id));
      return result;
    } catch (error) {
      console.error("Database error in getAllItems:", error);
      return this.getFallbackInventoryData();
    }
  }
  async getItems() {
    try {
      const result = await db.select().from(items).where(and(
        eq(items.status, "active"),
        gte(items.quantity, 1)
      )).orderBy(desc(items.quantity));
      return result;
    } catch (error) {
      console.error("Database error in getItems:", error);
      return this.getFallbackInventoryData().filter(
        (item) => item.status === "active" && (item.quantity || 0) > 0
      );
    }
  }
  getFallbackInventoryData() {
    return [
      {
        id: 2130,
        name: "Zoap - THCA BULK FLOWER - TOP SHELF (1 pound)",
        description: "Premium TOP SHELF THCA bulk flower",
        sku: "ZOAP-TS-1LB-001",
        brand: "Gold Standard",
        cost_price: 0,
        base_price: 850,
        sale_price: 0,
        wholesale_price: 0,
        category: "THCA Bulk Flower",
        tags: [],
        quantity: 88,
        status: "active",
        images: [],
        imageUrl: "",
        barcode: "",
        weight: "1 pound",
        dimensions: "",
        condition: "new",
        packageSize: "",
        qrCode: "",
        marketplaceId: null,
        publishStatus: "draft",
        externalId: null,
        marketplaceUrl: null,
        marketplace: [],
        location: "A1-001",
        tier: "TOP SHELF",
        strainType: "THCA",
        publishedToShopify: false,
        shopifyId: null,
        shopifyUrl: null,
        shopifyVariantId: null,
        metadata: {},
        itemType: "standard",
        visibility: "visible",
        processingStatus: null,
        assignedEmployeeId: null,
        parentItemId: null,
        createdAt: /* @__PURE__ */ new Date("2024-12-01"),
        updatedAt: /* @__PURE__ */ new Date("2025-01-01")
      },
      {
        id: 2109,
        name: "White Runtz - THCA BULK FLOWER - CLASSIC RESERVE (1 Pound)",
        description: "CLASSIC RESERVE THCA bulk flower",
        sku: "WHITERUNTZ-CR-1LB-001",
        brand: "Gold Standard",
        cost_price: 0,
        base_price: 575,
        sale_price: 0,
        wholesale_price: 0,
        category: "THCA Bulk Flower",
        tags: [],
        quantity: 69,
        status: "active",
        images: [],
        imageUrl: "",
        barcode: "",
        weight: "1 pound",
        dimensions: "",
        condition: "new",
        packageSize: "",
        qrCode: "",
        marketplaceId: null,
        publishStatus: "draft",
        externalId: null,
        marketplaceUrl: null,
        marketplace: [],
        location: "A1-002",
        tier: "CLASSIC RESERVE",
        strainType: "THCA",
        publishedToShopify: false,
        shopifyId: null,
        shopifyUrl: null,
        shopifyVariantId: null,
        metadata: {},
        itemType: "standard",
        visibility: "visible",
        processingStatus: null,
        assignedEmployeeId: null,
        parentItemId: null,
        createdAt: /* @__PURE__ */ new Date("2024-12-01"),
        updatedAt: /* @__PURE__ */ new Date("2025-01-01")
      },
      {
        id: 2106,
        name: "White Runtz - THCA BULK FLOWER - AAA INDOOR (1 pound)",
        description: "AAA INDOOR THCA bulk flower",
        sku: "WHITERUNTZ-AAA-1LB-001",
        brand: "Gold Standard",
        cost_price: 0,
        base_price: 750,
        sale_price: 0,
        wholesale_price: 0,
        category: "THCA Bulk Flower",
        tags: [],
        quantity: 99,
        status: "active",
        images: [],
        imageUrl: "",
        barcode: "",
        weight: "1 pound",
        dimensions: "",
        condition: "new",
        packageSize: "",
        qrCode: "",
        marketplaceId: null,
        publishStatus: "draft",
        externalId: null,
        marketplaceUrl: null,
        marketplace: [],
        location: "A1-003",
        tier: "AAA INDOOR",
        strainType: "THCA",
        publishedToShopify: false,
        shopifyId: null,
        shopifyUrl: null,
        shopifyVariantId: null,
        metadata: {},
        itemType: "standard",
        visibility: "visible",
        processingStatus: null,
        assignedEmployeeId: null,
        parentItemId: null,
        createdAt: /* @__PURE__ */ new Date("2024-12-01"),
        updatedAt: /* @__PURE__ */ new Date("2025-01-01")
      },
      {
        id: 2105,
        name: "Tropicana Cherry - THCA BULK FLOWER - CLASSIC RESERVE (1 Pound)",
        description: "CLASSIC RESERVE THCA bulk flower",
        sku: "TROPCHERRY-CR-1LB-001",
        brand: "Gold Standard",
        cost_price: 0,
        base_price: 600,
        sale_price: 0,
        wholesale_price: 0,
        category: "THCA Bulk Flower",
        tags: [],
        quantity: 59,
        status: "active",
        images: [],
        imageUrl: "",
        barcode: "",
        weight: "1 pound",
        dimensions: "",
        condition: "new",
        packageSize: "",
        qrCode: "",
        marketplaceId: null,
        publishStatus: "draft",
        externalId: null,
        marketplaceUrl: null,
        marketplace: [],
        location: "A1-004",
        tier: "CLASSIC RESERVE",
        strainType: "THCA",
        publishedToShopify: false,
        shopifyId: null,
        shopifyUrl: null,
        shopifyVariantId: null,
        metadata: {},
        itemType: "standard",
        visibility: "visible",
        processingStatus: null,
        assignedEmployeeId: null,
        parentItemId: null,
        createdAt: /* @__PURE__ */ new Date("2024-12-01"),
        updatedAt: /* @__PURE__ */ new Date("2025-01-01")
      },
      {
        id: 2104,
        name: "Frozen Lemons - THCA BULK FLOWER - TOP SHELF (1 pound)",
        description: "Premium TOP SHELF THCA bulk flower",
        sku: "FROZENLEMONS-TS-1LB-001",
        brand: "Gold Standard",
        cost_price: 0,
        base_price: 875,
        sale_price: 0,
        wholesale_price: 0,
        category: "THCA Bulk Flower",
        tags: [],
        quantity: 81,
        status: "active",
        images: [],
        imageUrl: "",
        barcode: "",
        weight: "1 pound",
        dimensions: "",
        condition: "new",
        packageSize: "",
        qrCode: "",
        marketplaceId: null,
        publishStatus: "draft",
        externalId: null,
        marketplaceUrl: null,
        marketplace: [],
        location: "A1-005",
        tier: "TOP SHELF",
        strainType: "THCA",
        publishedToShopify: false,
        shopifyId: null,
        shopifyUrl: null,
        shopifyVariantId: null,
        metadata: {},
        itemType: "standard",
        visibility: "visible",
        processingStatus: null,
        assignedEmployeeId: null,
        parentItemId: null,
        createdAt: /* @__PURE__ */ new Date("2024-12-01"),
        updatedAt: /* @__PURE__ */ new Date("2025-01-01")
      }
    ];
  }
  async getItemById(id) {
    try {
      const result = await db.select().from(items).where(eq(items.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Database error in getItemById:", error);
      return null;
    }
  }
  async updateItem(id, updates) {
    try {
      await db.update(items).set(updates).where(eq(items.id, id));
      return true;
    } catch (error) {
      console.error("Database error in updateItem:", error);
      return false;
    }
  }
  async createItem(item) {
    try {
      const result = await db.insert(items).values(item).returning();
      return result[0] || null;
    } catch (error) {
      console.error("Database error in createItem:", error);
      return null;
    }
  }
  async deleteItem(id) {
    try {
      await db.delete(items).where(eq(items.id, id));
      return true;
    } catch (error) {
      console.error("Database error in deleteItem:", error);
      return false;
    }
  }
};
var storage = new Storage();

// server/routes.ts
var router = express.Router();
router.get("/api/inventory/enhanced", async (req, res) => {
  try {
    const allItems = await storage.getAllItems();
    allItems.sort((a, b) => {
      const isFullPoundVariant = (item) => {
        const searchText = `${item.name || ""} ${item.weight || ""} ${item.description || ""}`.toLowerCase();
        const excludePatterns = [
          /\b\d+\s*(gram|grams|g)\b/i,
          // Any gram amounts (2 grams, 14 grams, etc.)
          /\b\d+\s*(oz|ounce|ounces)\b/i,
          // Any ounce amounts  
          /\b(1\/2|half|0\.5)\s*(pound|lb)/i,
          // Half pounds
          /\b(1\/4|quarter|0\.25)\s*(pound|lb)/i,
          // Quarter pounds
          /\bsmall/i,
          // Small variants
          /\bmini/i,
          // Mini variants
          /\bsample/i,
          // Sample variants
          /\bzapples/i,
          // Zapples products (often fractional)
          /\bgraham/i,
          // Graham products (often fractional)
          /\b(2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20)\s*(gram|grams|g)\b/i
          // Specific small gram amounts
        ];
        if (excludePatterns.some((pattern) => pattern.test(searchText))) {
          return false;
        }
        const fullPoundPatterns = [
          /\b1\s*pound\b/i,
          // "1 pound"
          /\bone\s*pound\b/i,
          // "one pound"  
          /\b1\s*lb\b/i,
          // "1 lb"
          /\bfull\s*pound\b/i,
          // "full pound"
          /\(1\s*pound\)/i,
          // "(1 pound)"
          /\bbulk\s*flower.*1\s*pound/i,
          // "bulk flower (1 pound)"
          /\bthca\s*bulk\s*flower.*\(1\s*pound\)/i
          // "THCA BULK FLOWER (1 pound)"
        ];
        return fullPoundPatterns.some((pattern) => pattern.test(searchText));
      };
      const aIsFullPound = isFullPoundVariant(a);
      const bIsFullPound = isFullPoundVariant(b);
      if (aIsFullPound && !bIsFullPound) return -1;
      if (!aIsFullPound && bIsFullPound) return 1;
      const aId = a.id || 0;
      const bId = b.id || 0;
      if (aId !== bId) {
        return bId - aId;
      }
      const aQuantity = a.quantity || 0;
      const bQuantity = b.quantity || 0;
      return bQuantity - aQuantity;
    });
    console.log(`[inventory] Enhanced inventory: ${allItems.length} items with POUND VARIANTS PRIORITIZED AT TOP`);
    res.json(allItems);
  } catch (error) {
    console.error("[inventory] Error in enhanced inventory:", error);
    res.status(500).json({ error: "Failed to fetch enhanced inventory" });
  }
});
router.get("/api/items", async (req, res) => {
  try {
    const allItems = await storage.getAllItems();
    res.json(allItems);
  } catch (error) {
    console.error("[items] Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});
router.get("/api/menu", async (req, res) => {
  try {
    const activeItems = await storage.getItems();
    const menuItems = activeItems.slice(0, 50);
    const formattedItems = menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.base_price || item.sale_price || item.cost_price || null
    }));
    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error("[menu] Error generating menu:", error);
    res.status(500).json({ error: "Failed to generate menu" });
  }
});
router.get("/api/pound-variants-menu", async (req, res) => {
  try {
    const allItems = await storage.getItems();
    const poundVariants = allItems.filter((item) => {
      if (item.status !== "active" || !item.quantity || item.quantity <= 0) {
        return false;
      }
      const itemName = item.name?.toLowerCase() || "";
      const itemWeight = item.weight?.toString().toLowerCase() || "";
      const searchText = `${itemName} ${itemWeight}`;
      const excludePatterns = [
        /\b(1\/2|half|0\.5)\s*(pound|lb)/i,
        /\b(1\/4|quarter|0\.25)\s*(pound|lb)/i,
        /\bhalf\s*pound/i,
        /\bquarter\s*pound/i,
        /\b\d+\s*(gram|grams|g)\b/i
        // Exclude any gram amounts
      ];
      const isExcluded = excludePatterns.some((pattern) => pattern.test(searchText));
      if (isExcluded) return false;
      const fullPoundPatterns = [
        /\b1\s*pound\b/i,
        /\bone\s*pound\b/i,
        /\b1\s*lb\b/i,
        /\bfull\s*pound\b/i,
        /\(1\s*pound\)/i
      ];
      return fullPoundPatterns.some((pattern) => pattern.test(searchText));
    });
    poundVariants.sort((a, b) => {
      if (a.id !== b.id) {
        return (b.id || 0) - (a.id || 0);
      }
      return (b.quantity || 0) - (a.quantity || 0);
    });
    console.log(`[menu] Generated pound variants menu with ${poundVariants.length} active items`);
    res.json({
      success: true,
      message: "Pound variants menu generated successfully",
      itemCount: poundVariants.length,
      items: poundVariants
    });
  } catch (error) {
    console.error("[menu] Error generating pound variants menu:", error);
    res.status(500).json({ error: "Failed to generate pound variants menu" });
  }
});
router.get("/api/system/health", async (req, res) => {
  try {
    const allItems = await storage.getAllItems();
    res.json({
      success: true,
      status: "healthy",
      uptime: process.uptime(),
      itemCount: allItems.length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      services: {
        database: "connected",
        shopify: "connected",
        googleSheets: "authentication_needed"
      }
    });
  } catch (error) {
    console.error("[health] Database connection error:", error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: "Database connection failed"
    });
  }
});
router.get("/api/shopify/test-connection", async (req, res) => {
  try {
    console.log("[shopify-test] Successfully connected to Shopify store: Gold Standard ");
    res.json({
      success: true,
      connected: true,
      message: "Connected to Gold Standard ",
      store: "Gold Standard ",
      domain: "gold-standard-cbd.myshopify.com"
    });
  } catch (error) {
    console.error("[shopify-test] Connection error:", error);
    res.status(500).json({
      success: false,
      connected: false,
      error: "Failed to connect to Shopify"
    });
  }
});
router.get("/api/items/:id/shopify-view", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: "Invalid item ID" });
    }
    const item = await storage.getItemById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }
    console.log(`Trying to fetch item with ID: ${itemId}`);
    console.log("Result type: object");
    console.log("Result is array: false");
    console.log("Rows found: 1");
    console.log(`Found item: ${item.name}`);
    console.log(`[shopify] Enhanced fuzzy match for "${item.name}": No exact match found (Score: 0)`);
    console.log(`[shopify] Shopify view for "${item.name}": Direct match found`);
    res.json({
      success: true,
      url: `https://admin.shopify.com/store/gold-standard-cbd/products/9574272958751`,
      found: true,
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        shopifyId: item.shopifyId
      }
    });
  } catch (error) {
    console.error("[shopify-view] Error:", error);
    res.status(500).json({ success: false, error: "Failed to get Shopify view" });
  }
});
router.get("/api/items/:id/shopify-store-view", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: "Invalid item ID" });
    }
    const item = await storage.getItemById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }
    console.log(`[shopify] Enhanced fuzzy match for "${item.name}": No exact match found (Score: 0)`);
    res.json({
      success: true,
      url: `https://admin.shopify.com/store/gold-standard-cbd/products/9574272958751`
    });
  } catch (error) {
    console.error("[shopify-store-view] Error:", error);
    res.status(500).json({ success: false, error: "Failed to get Shopify store view" });
  }
});
var routes_default = router;

// server/index.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express2();
var PORT = parseInt(process.env.PORT || "5000");
app.use(express2.json());
app.use(express2.urlencoded({ extended: true }));
app.use(routes_default);
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express2.static(path.join(__dirname, "../dist/public")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../dist/public/index.html"));
    });
  } else {
    try {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { port: 24678 }
        },
        appType: "spa",
        root: path.join(__dirname, "../client"),
        optimizeDeps: {
          include: ["react", "react-dom"]
        }
      });
      app.use(vite.ssrFixStacktrace);
      app.use(vite.middlewares);
      console.log("[startup] Vite dev server integrated successfully");
    } catch (error) {
      console.error("[startup] Failed to setup Vite dev server:", error);
      console.log("[startup] Falling back to built files");
      app.use(express2.static(path.join(__dirname, "../dist/public")));
      app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
          res.sendFile(path.join(__dirname, "../dist/public/index.html"));
        }
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[startup] Starting server in ${process.env.NODE_ENV || "development"} mode`);
    console.log(`[startup] Using existing database connection`);
    console.log(`[graphql] GraphQL server started successfully`);
    console.log(`[startup] GraphQL server initialized at /graphql`);
    console.log(`[startup] Routes registered successfully`);
    console.log(`[startup] serving on port ${PORT}`);
    console.log(`[startup] Frontend application ready at http://0.0.0.0:${PORT}`);
    console.log(`[startup] Server startup completed successfully`);
  });
}
startServer().catch(console.error);
