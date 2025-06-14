/**
 * Routes for barcode scanning and inventory fulfillment
 * Automatically subtracts scanned items from stock
 */

import { Request, Response, Express } from 'express';
import { IStorage } from './storage';
import { z } from 'zod';

const barcodeSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").default(1),
  employeeId: z.number().optional(),
  notes: z.string().optional()
});

type BarcodeScanRequest = z.infer<typeof barcodeSchema>;

/**
 * Register barcode fulfillment routes
 */
export function registerBarcodeFulfillmentRoutes(app: Express, storage: IStorage) {
  
  /**
   * Scan barcode and subtract from inventory
   */
  app.post("/api/barcode/scan-fulfill", async (req: Request, res: Response) => {
    try {
      const scanData = barcodeSchema.parse(req.body);
      
      // Find item by SKU
      const items = await storage.getItems();
      const item = items.find(i => i.sku === scanData.sku);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message: `No item found with SKU: ${scanData.sku}`
        });
      }
      
      // Check if sufficient stock available
      if (item.quantity < scanData.quantity) {
        return res.status(400).json({
          success: false,
          error: "Insufficient stock",
          message: `Only ${item.quantity} units available, cannot fulfill ${scanData.quantity} units`,
          availableQuantity: item.quantity
        });
      }
      
      // Calculate new quantity
      const newQuantity = item.quantity - scanData.quantity;
      
      // Update item quantity
      const updatedItem = await storage.updateItem(item.id, { 
        quantity: newQuantity 
      });
      
      if (!updatedItem) {
        return res.status(500).json({
          success: false,
          error: "Failed to update inventory"
        });
      }
      
      // Log inventory action
      if (scanData.employeeId) {
        await storage.createInventoryAction({
          itemId: item.id,
          employeeId: scanData.employeeId,
          actionType: 'fulfillment_scan',
          quantityBefore: item.quantity,
          quantityAfter: newQuantity,
          notes: scanData.notes || `Barcode scan fulfillment: ${scanData.sku}`
        });
      }
      
      res.json({
        success: true,
        message: "Item successfully scanned and inventory updated",
        item: {
          id: updatedItem.id,
          name: updatedItem.name,
          sku: updatedItem.sku,
          previousQuantity: item.quantity,
          newQuantity: newQuantity,
          quantityFulfilled: scanData.quantity
        }
      });
      
    } catch (error) {
      console.error("Error processing barcode scan:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid scan data",
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to process barcode scan"
      });
    }
  });
  
  /**
   * Batch scan multiple barcodes for fulfillment
   */
  app.post("/api/barcode/batch-scan-fulfill", async (req: Request, res: Response) => {
    try {
      const { scans, employeeId } = req.body;
      
      if (!Array.isArray(scans)) {
        return res.status(400).json({
          success: false,
          error: "Scans must be an array"
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const scanData of scans) {
        try {
          const validatedScan = barcodeSchema.parse({
            ...scanData,
            employeeId
          });
          
          // Find item by SKU
          const items = await storage.getItems();
          const item = items.find(i => i.sku === validatedScan.sku);
          
          if (!item) {
            errors.push({
              sku: validatedScan.sku,
              error: "Item not found"
            });
            continue;
          }
          
          // Check stock
          if (item.quantity < validatedScan.quantity) {
            errors.push({
              sku: validatedScan.sku,
              error: `Insufficient stock: ${item.quantity} available, ${validatedScan.quantity} requested`
            });
            continue;
          }
          
          // Update inventory
          const newQuantity = item.quantity - validatedScan.quantity;
          const updatedItem = await storage.updateItem(item.id, { 
            quantity: newQuantity 
          });
          
          if (updatedItem) {
            // Log action
            if (employeeId) {
              await storage.createInventoryAction({
                itemId: item.id,
                employeeId,
                actionType: 'fulfillment_scan',
                quantityBefore: item.quantity,
                quantityAfter: newQuantity,
                notes: `Batch scan fulfillment: ${validatedScan.sku}`
              });
            }
            
            results.push({
              sku: validatedScan.sku,
              name: updatedItem.name,
              previousQuantity: item.quantity,
              newQuantity: newQuantity,
              quantityFulfilled: validatedScan.quantity
            });
          } else {
            errors.push({
              sku: validatedScan.sku,
              error: "Failed to update inventory"
            });
          }
          
        } catch (scanError) {
          errors.push({
            sku: scanData.sku || "unknown",
            error: "Invalid scan data"
          });
        }
      }
      
      res.json({
        success: results.length > 0,
        message: `Processed ${results.length} scans successfully`,
        results,
        errors,
        summary: {
          totalScans: scans.length,
          successful: results.length,
          failed: errors.length
        }
      });
      
    } catch (error) {
      console.error("Error processing batch barcode scan:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process batch barcode scan"
      });
    }
  });
  
  /**
   * Get scan history for an item
   */
  app.get("/api/barcode/scan-history/:sku", async (req: Request, res: Response) => {
    try {
      const { sku } = req.params;
      
      // Find item by SKU
      const items = await storage.getItems();
      const item = items.find(i => i.sku === sku);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found"
        });
      }
      
      // Get inventory actions for this item (fulfillment scans)
      const actions = await storage.getInventoryActionsByItem(item.id);
      const scanActions = actions.filter(action => 
        action.actionType === 'fulfillment_scan'
      );
      
      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          currentQuantity: item.quantity
        },
        scanHistory: scanActions.map(action => ({
          id: action.id,
          timestamp: action.timestamp,
          quantityBefore: action.quantityBefore,
          quantityAfter: action.quantityAfter,
          quantityFulfilled: action.quantityBefore - action.quantityAfter,
          employeeId: action.employeeId,
          notes: action.notes
        }))
      });
      
    } catch (error) {
      console.error("Error fetching scan history:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch scan history"
      });
    }
  });
  
  /**
   * Verify barcode before scanning (check item exists and has stock)
   */
  app.post("/api/barcode/verify", async (req: Request, res: Response) => {
    try {
      const { sku, quantity = 1 } = req.body;
      
      if (!sku) {
        return res.status(400).json({
          success: false,
          error: "SKU is required"
        });
      }
      
      // Find item by SKU
      const items = await storage.getItems();
      const item = items.find(i => i.sku === sku);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message: `No item found with SKU: ${sku}`
        });
      }
      
      const canFulfill = item.quantity >= quantity;
      
      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          currentQuantity: item.quantity,
          price: item.price
        },
        verification: {
          canFulfill,
          requestedQuantity: quantity,
          availableQuantity: item.quantity,
          shortfall: canFulfill ? 0 : quantity - item.quantity
        }
      });
      
    } catch (error) {
      console.error("Error verifying barcode:", error);
      res.status(500).json({
        success: false,
        error: "Failed to verify barcode"
      });
    }
  });
}