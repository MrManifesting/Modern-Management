import { pgTable, text, serial, integer, doublePrecision, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Item Schema
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  category: text("category").notNull(),
  condition: text("condition").notNull(),
  sku: text("sku").notNull(), // Unique Stock Keeping Unit
  quantity: integer("quantity").notNull().default(1), // Current inventory quantity
  barcode: text("barcode"), // Store barcode data (can be UPC, EAN, etc.)
  qrCode: text("qr_code"), // Store QR code data
  status: text("status").notNull().default("draft"), // draft, listed, sold
  images: json("images").notNull().default([]), // Array of image URLs
  tags: json("tags").notNull().default([]), // Array of tags
  marketplace: json("marketplace").notNull().default([]), // Array of marketplace identifiers (ebay, etsy, etc)
  aiEnhanced: boolean("ai_enhanced").notNull().default(false),
  aiTags: json("ai_tags").notNull().default([]), // Keywords suggested by AI
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
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
  isConnected: boolean("is_connected").notNull().default(false),
  credentials: json("credentials").notNull().default({}),
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

// AI Analysis Response Schema
export const aiAnalysisSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
  suggestedPrice: z.number().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;

// CSV Export Schema
export const csvExportSchema = z.object({
  marketplaces: z.array(z.string()).min(1, "Select at least one marketplace"),
  items: z.array(z.number()).min(1, "Select at least one item"),
});

export type CSVExport = z.infer<typeof csvExportSchema>;
