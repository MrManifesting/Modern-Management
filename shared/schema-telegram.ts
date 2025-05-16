import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Schema for telegram photos
 * Stores photos received from the Telegram bot
 */
export const telegramPhotos = pgTable("telegram_photos", {
  id: serial("id").primaryKey(),
  fileId: text("file_id").notNull(),
  filePath: text("file_path").notNull(),
  caption: text("caption"),
  associatedItemId: integer("associated_item_id"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TelegramPhoto = typeof telegramPhotos.$inferSelect;
export type InsertTelegramPhoto = typeof telegramPhotos.$inferInsert;

// Schema for inserting a new telegram photo
export const insertTelegramPhotoSchema = createInsertSchema(telegramPhotos, {
  caption: z.string().optional(),
  associatedItemId: z.number().optional(),
});