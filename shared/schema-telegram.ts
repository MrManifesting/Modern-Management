import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Schema for telegram photos
 * Stores photos received from the Telegram bot
 */
export const telegramPhotos = pgTable("telegram_photos", {
  id: serial("id").primaryKey(),
  fileId: varchar("file_id", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 255 }).notNull(),
  caption: text("caption"),
  associatedItemId: integer("associated_item_id"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TelegramPhoto = typeof telegramPhotos.$inferSelect;
export type InsertTelegramPhoto = typeof telegramPhotos.$inferInsert;

export const insertTelegramPhotoSchema = createInsertSchema(telegramPhotos, {
  fileId: z.string().min(1, "File ID is required"),
  filePath: z.string().min(1, "File path is required"),
  caption: z.string().nullable().optional(),
  associatedItemId: z.number().int().positive().nullable().optional(),
});