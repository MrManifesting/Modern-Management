/**
 * Routes for handling CSV imports
 */
import { Request, Response } from 'express';
import { IStorage } from './storage';
import multer from 'multer';
import { ShopifyService } from './services/marketplaces/shopify';
import { Item } from '@shared/schema';

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Parse CSV content
 */
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim().replace(/^"(.*)"$/, '$1'));
        cell = '';
      } else {
        cell += char;
      }
    }
    
    // Add the last cell
    row.push(cell.trim().replace(/^"(.*)"$/, '$1'));
    rows.push(row);
  }
  
  return { 
    headers: rows[0]?.map(h => h.trim().toLowerCase()) || [],
    rows: rows.slice(1) 
  };
}

/**
 * Register CSV import routes
 */
export function registerCSVImportRoutes(app: any, storage: IStorage) {
  // Standard CSV import endpoint
  app.post("/api/items/import", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      
      const file = req.file;
      const content = file.buffer.toString('utf8');
      
      // Parse CSV
      const { headers, rows } = parseCSV(content);
      
      if (headers.length === 0 || rows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Empty or invalid CSV file. Please check your file format." 
        });
      }
      
      // Map required field indexes
      const nameIndex = headers.findIndex(h => h === 'name' || h === 'product name' || h === 'title');
      const skuIndex = headers.findIndex(h => h === 'sku' || h === 'product sku');
      const categoryIndex = headers.findIndex(h => h === 'category' || h === 'product category');
      const priceIndex = headers.findIndex(h => h === 'price' || h === 'product price' || h === 'base price' || h === 'baseprice');
      const quantityIndex = headers.findIndex(h => h === 'quantity' || h === 'stock' || h === 'inventory');
      const sizeIndex = headers.findIndex(h => h === 'size' || h === 'product size');
      const descriptionIndex = headers.findIndex(h => h === 'description' || h === 'product description');
      const wholesalePriceIndex = headers.findIndex(h => h === 'wholesale price' || h === 'wholesaleprice' || h === 'wholesale');
      const retailPriceIndex = headers.findIndex(h => h === 'retail price' || h === 'retailprice' || h === 'retail');
      
      if (nameIndex === -1 || (skuIndex === -1 && priceIndex === -1)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid CSV format. CSV must include at least name and either SKU or price columns." 
        });
      }
      
      console.log(`Processing standard CSV import with ${rows.length} rows`);
      console.log(`CSV Headers: ${headers.join(', ')}`);
      
      // Process data rows and create items
      const importedItems: Item[] = [];
      let importedCount = 0;
      let errorCount = 0;
      
      // Start from index 0 as we already extracted headers
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length <= 1) continue; // Skip empty rows
        
        try {
          const itemData: any = {
            name: nameIndex >= 0 && row[nameIndex] ? row[nameIndex].trim() : `Product ${i+1}`,
            sku: skuIndex >= 0 && row[skuIndex] ? row[skuIndex].trim() : `SKU-${Date.now()}-${i+1}`,
            category: categoryIndex >= 0 && row[categoryIndex] ? row[categoryIndex].trim() : "Uncategorized",
            basePrice: priceIndex >= 0 && row[priceIndex] ? parseFloat(row[priceIndex].replace(/[^0-9.]/g, '')) : 0,
            quantity: quantityIndex >= 0 && row[quantityIndex] ? parseInt(row[quantityIndex], 10) : 0,
            size: sizeIndex >= 0 && row[sizeIndex] ? row[sizeIndex].trim() : "",
            description: descriptionIndex >= 0 && row[descriptionIndex] ? row[descriptionIndex].trim() : "",
            visibility: "visible",
            itemType: "product",
            status: "active"
          };
          
          // Add optional prices if available
          if (wholesalePriceIndex >= 0 && row[wholesalePriceIndex]) {
            itemData.wholesalePrice = parseFloat(row[wholesalePriceIndex].replace(/[^0-9.]/g, ''));
          }
          
          if (retailPriceIndex >= 0 && row[retailPriceIndex]) {
            itemData.retailPrice = parseFloat(row[retailPriceIndex].replace(/[^0-9.]/g, ''));
          }
          
          // Create the item in storage
          const item = await storage.createItem(itemData);
          importedItems.push(item);
          importedCount++;
        } catch (err) {
          console.error(`Error importing row ${i+1}:`, err);
          errorCount++;
        }
      }
      
      // Check if we need to sync with Shopify
      const syncWithShopify = req.body.syncWithShopify === 'true' || req.body.syncWithShopify === true;
      let syncResults = { success: 0, failures: 0 };
      
      if (syncWithShopify && importedItems.length > 0) {
        // Get Shopify credentials
        const shopifyCredentials = await storage.getShopifyCredentials();
        
        if (shopifyCredentials && shopifyCredentials.store && shopifyCredentials.accessToken) {
          // Create Shopify service
          const shopifyService = createShopifyService({
            shopName: shopifyCredentials.store,
            accessToken: shopifyCredentials.accessToken,
          });
          
          console.log(`Syncing ${importedItems.length} imported items with Shopify`);
          
          // Push items to Shopify
          for (const item of importedItems) {
            try {
              const result = await shopifyService.createProduct(item);
              if (result.success) {
                syncResults.success++;
                // Update the item with Shopify ID
                await storage.updateItem(item.id, {
                  shopifyId: result.id,
                  shopifySyncStatus: "synced",
                  marketplace: [
                    ...(item.marketplace || []),
                    { name: 'Shopify', isListed: true }
                  ]
                });
              } else {
                syncResults.failures++;
              }
            } catch (err) {
              console.error(`Error syncing item ${item.id} to Shopify:`, err);
              syncResults.failures++;
            }
          }
        } else {
          console.warn("Shopify sync requested but credentials not available");
        }
      }
      
      res.json({
        success: true,
        imported: importedCount,
        errors: errorCount,
        shopifySync: syncWithShopify ? syncResults : null,
        message: `Successfully imported ${importedCount} items${errorCount > 0 ? ` (with ${errorCount} errors)` : ''}.${
          syncWithShopify ? ` Synced ${syncResults.success} items with Shopify${
            syncResults.failures > 0 ? ` (${syncResults.failures} sync failures)` : ''
          }.` : ''
        }`
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import CSV file. " + (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });
}