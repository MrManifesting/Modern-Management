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
 * Unified function to remove duplicates by different criteria
 */
async function removeDuplicatesByKey(storage: IStorage, type: 'sku' | 'strain-price') {
  const items = await storage.getItems();
  const duplicateMap = new Map<string, Item[]>();
  
  // Group items by the specified key
  items.forEach((item: Item) => {
    let key: string;
    
    if (type === 'sku') {
      if (!item.sku) return;
      key = item.sku;
    } else if (type === 'strain-price') {
      if (!item.condition || !item.basePrice) return;
      key = `${item.condition.trim().toLowerCase()}_${item.basePrice}`;
    } else {
      return;
    }
    
    const existingItems = duplicateMap.get(key) || [];
    existingItems.push(item);
    duplicateMap.set(key, existingItems);
  });
  
  // Find and process duplicates
  const duplicates: any[] = [];
  
  duplicateMap.forEach((itemsWithKey, key) => {
    if (itemsWithKey.length > 1) {
      itemsWithKey.sort((a, b) => a.id - b.id);
      const keepId = itemsWithKey[0].id;
      const deleteIds = itemsWithKey.slice(1).map(item => item.id);
      
      if (type === 'sku') {
        duplicates.push({ sku: key, keepId, deleteIds });
      } else {
        duplicates.push({ 
          strain: itemsWithKey[0].condition, 
          price: itemsWithKey[0].basePrice, 
          keepId, 
          deleteIds, 
          count: itemsWithKey.length 
        });
      }
    }
  });
  
  const totalDeleted = duplicates.reduce((sum, d) => sum + d.deleteIds.length, 0);
  
  if (totalDeleted === 0) {
    return {
      success: true,
      message: `No duplicate items found with matching ${type === 'sku' ? 'SKU' : 'strain and price'}`
    };
  }
  
  // Delete duplicates
  const idsToDelete = duplicates.flatMap(d => d.deleteIds);
  for (const id of idsToDelete) {
    await storage.deleteItem(id);
  }
  
  return {
    success: true,
    message: `Successfully removed ${totalDeleted} duplicate items across ${duplicates.length} ${type === 'sku' ? 'SKUs' : 'strain+price combinations'}`,
    removed: totalDeleted,
    [type === 'sku' ? 'duplicates' : 'duplicateGroups']: duplicates
  };
}

/**
 * Register cleanup routes
 */
export function registerCleanupRoutes(app: Express, storage: IStorage) {
  
  /**
   * Remove duplicate items based on strain and price (unified with SKU-based removal)
   */
  app.post("/api/cleanup/duplicates-by-strain-price", async (req: Request, res: Response) => {
    try {
      const result = await removeDuplicatesByKey(storage, 'strain-price');
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error removing strain+basePrice duplicates:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error removing duplicate items by strain and basePrice", 
        error: (error as Error).message 
      });
    }
  });
  
  /**
   * Remove duplicate items based on SKU (unified with strain-price removal)
   */
  app.post("/api/cleanup/duplicates", async (req: Request, res: Response) => {
    try {
      const result = await removeDuplicatesByKey(storage, 'sku');
      return res.status(200).json(result);
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
      
      // Get all items with attributes.importSource = source
      const items = await storage.getItems();
      const itemsToDelete = items.filter((item: Item) => {
        try {
          // Check if attributes has importSource field
          if (!item.attributes) return false;
          
          const attributes = typeof item.attributes === 'string' 
            ? JSON.parse(item.attributes) 
            : item.attributes;
          
          return attributes.importSource === source;
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
   * Remove items with zero price and zero quantity
   */
  app.post("/api/cleanup/zero-items", async (req: Request, res: Response) => {
    try {
      const { confirmDelete } = req.body;
      
      if (!confirmDelete || confirmDelete !== "YES_DELETE_ZERO_ITEMS") {
        return res.status(400).json({
          success: false,
          message: "Safety confirmation not provided. Add 'confirmDelete': 'YES_DELETE_ZERO_ITEMS' to the request body"
        });
      }
      
      // Get all items
      const items = await storage.getItems();
      
      // Filter items with both basePrice = 0 and quantity = 0
      const itemsToDelete = items.filter((item: Item) => 
        item.basePrice === 0 && item.quantity === 0
      );
      
      // Nothing to delete
      if (itemsToDelete.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No items found with both zero basePrice and zero quantity",
          deletedCount: 0
        });
      }
      
      // Delete all matching items
      for (const item of itemsToDelete) {
        await storage.deleteItem(item.id);
      }
      
      return res.status(200).json({
        success: true, 
        message: `Successfully removed ${itemsToDelete.length} items with zero basePrice and zero quantity`,
        deletedCount: itemsToDelete.length,
        items: itemsToDelete.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku
        }))
      });
      
    } catch (error) {
      console.error("Error removing zero items:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error removing zero items", 
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
      const items = await storage.getItems();
      
      // Filter items created within the date range
      const itemsToDelete = items.filter((item: Item) => {
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