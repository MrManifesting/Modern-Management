import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  text
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

// Telegram photos table for storing photos received from Telegram
export const telegramPhotos = pgTable("telegram_photos", {
  id: serial("id").primaryKey(),
  fileId: varchar("file_id").notNull(),
  filePath: varchar("file_path").notNull(),
  caption: text("caption"),
  associatedItemId: integer("associated_item_id"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TelegramPhoto = typeof telegramPhotos.$inferSelect;
export type InsertTelegramPhoto = typeof telegramPhotos.$inferInsert;

// Create insert schema with zod validation
export const insertTelegramPhotoSchema = createInsertSchema(telegramPhotos, {
  caption: (schema) => schema.caption.optional(),
  associatedItemId: (schema) => schema.associatedItemId.optional(),
});