/**
 * Routes for database cleanup operations
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { items } from "../shared/schema";
import { Item } from "../shared/schema";
import { IStorage } from "./storage";
import { eq } from "drizzle-orm";

/**
 * Register cleanup routes
 */
export function registerCleanupRoutes(app: Express, storage: IStorage) {
  
  /**
   * Remove duplicate items based on SKU
   * Keeps the first item (by ID) and removes duplicates
   */
  app.post("/api/cleanup/duplicates", async (req: Request, res: Response) => {
    try {
      // Get all items grouped by SKU
      const items = await storage.getItems();
      
      // Find SKUs that have duplicates
      const skuMap = new Map<string, Item[]>();
      
      // Group items by SKU
      items.forEach((item: Item) => {
        if (item.sku) {
          const existingItems = skuMap.get(item.sku) || [];
          existingItems.push(item);
          skuMap.set(item.sku, existingItems);
        }
      });
      
      // Find SKUs with duplicates
      const duplicates: { sku: string, deleteIds: number[], keepId: number }[] = [];
      
      skuMap.forEach((itemsWithSku, sku) => {
        if (itemsWithSku.length > 1) {
          // Sort by ID (oldest first)
          itemsWithSku.sort((a, b) => a.id - b.id);
          
          // Keep the first one, delete the rest
          const keepId = itemsWithSku[0].id;
          const deleteIds = itemsWithSku.slice(1).map(item => item.id);
          
          duplicates.push({
            sku,
            keepId,
            deleteIds
          });
        }
      });
      
      // Delete all duplicate items
      const totalDeletedItems = duplicates.reduce((sum, d) => sum + d.deleteIds.length, 0);
      const affectedSkus = duplicates.length;
      
      // If no duplicates found, return
      if (totalDeletedItems === 0) {
        return res.status(200).json({ 
          success: true, 
          message: "No duplicate items found" 
        });
      }
      
      // Delete all duplicates in one operation
      const idsToDelete = duplicates.flatMap(d => d.deleteIds);
      
      for (const id of idsToDelete) {
        await storage.deleteItem(id);
      }
      
      return res.status(200).json({
        success: true,
        message: `Successfully removed ${totalDeletedItems} duplicate items across ${affectedSkus} SKUs`,
        duplicates
      });
      
    } catch (error) {
      console.error("Error removing duplicates:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error removing duplicate items", 
        error: (error as Error).message 
      });
    }
  });
  
  /**
   * Remove all items (DANGER: only to be used for development/testing)
   */
  app.post("/api/cleanup/all-items", async (req: Request, res: Response) => {
    try {
      // Confirm with a safety check in the request body
      const { confirmDelete } = req.body;
      
      if (!confirmDelete || confirmDelete !== "YES_DELETE_ALL_ITEMS") {
        return res.status(400).json({
          success: false,
          message: "Safety confirmation not provided. Add 'confirmDelete': 'YES_DELETE_ALL_ITEMS' to the request body"
        });
      }
      
      // Count items before deletion
      const items = await storage.getItems();
      const itemCount = items.length;
      
      // Delete items one by one using storage interface
      for (const item of items) {
        await storage.deleteItem(item.id);
      }
      
      return res.status(200).json({
        success: true,
        message: `Successfully removed all ${itemCount} items from database`,
        deletedCount: itemCount
      });
      
    } catch (error) {
      console.error("Error removing all items:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error removing all items", 
        error: (error as Error).message 
      });
    }
  });

  /**
   * Remove items imported from a specific source
   */
  app.post("/api/cleanup/import-batch", async (req: Request, res: Response) => {
    try {
      const { source, confirmDelete } = req.body;
      
      if (!source) {
        return res.status(400).json({
          success: false, 
          message: "Source parameter required"
        });
      }
      
      if (!confirmDelete || confirmDelete !== `YES_DELETE_IMPORT_${source.toUpperCase()}`) {
        return res.status(400).json({
          success: false,
          message: `Safety confirmation not provided. Add 'confirmDelete': 'YES_DELETE_IMPORT_${source.toUpperCase()}' to the request body`
        });
      }
      
      // Get all items with metadata.importSource = source
      const items = await storage.getItems();
      const itemsToDelete = items.filter((item: Item) => {
        if (!item.metadata) return false;
        try {
          const metadata = typeof item.metadata === 'string' 
            ? JSON.parse(item.metadata) 
            : item.metadata;
          
          return metadata.importSource === source;
        } catch (e) {
          return false;
        }
      });
      
      // Nothing to delete
      if (itemsToDelete.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No items found with import source: ${source}`,
          deletedCount: 0
        });
      }
      
      // Delete all matching items
      for (const item of itemsToDelete) {
        await storage.deleteItem(item.id);
      }
      
      return res.status(200).json({
        success: true, 
        message: `Successfully removed ${itemsToDelete.length} items imported from ${source}`,
        deletedCount: itemsToDelete.length
      });
      
    } catch (error) {
      console.error("Error removing import batch:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error removing import batch", 
        error: (error as Error).message 
      });
    }
  });
  
  /**
   * Remove items by date range
   */
  app.post("/api/cleanup/by-date", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, confirmDelete } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false, 
          message: "Both startDate and endDate parameters are required"
        });
      }
      
      if (!confirmDelete || confirmDelete !== "YES_DELETE_BY_DATE_RANGE") {
        return res.status(400).json({
          success: false,
          message: "Safety confirmation not provided. Add 'confirmDelete': 'YES_DELETE_BY_DATE_RANGE' to the request body"
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false, 
          message: "Invalid date format. Use ISO format (YYYY-MM-DD)"
        });
      }
      
      // Get all items
      const items = await storage.getAllItems();
      
      // Filter items created within the date range
      const itemsToDelete = items.filter(item => {
        const createdAt = new Date(item.createdAt);
        return createdAt >= start && createdAt <= end;
      });
      
      // Nothing to delete
      if (itemsToDelete.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No items found within date range ${startDate} to ${endDate}`,
          deletedCount: 0
        });
      }
      
      // Delete all matching items
      for (const item of itemsToDelete) {
        await storage.deleteItem(item.id);
      }
      
      return res.status(200).json({
        success: true, 
        message: `Successfully removed ${itemsToDelete.length} items created between ${startDate} and ${endDate}`,
        deletedCount: itemsToDelete.length
      });
      
    } catch (error) {
      console.error("Error removing items by date range:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error removing items by date range", 
        error: (error as Error).message 
      });
    }
  });
}