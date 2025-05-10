/**
 * Routes for handling CSV imports
 */
import { Request, Response } from 'express';
import { IStorage } from './storage';
import multer from 'multer';
import { isShopifyConfigured } from './services/shopify';
import { getShopifyCredentials } from './services/shopify-auth';
import { generateBarcodeData } from './services/barcode';
import { generateQRCodeDataURL } from './services/qrcode';
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
  
  console.log(`Parsing CSV with ${lines.length} lines`);
  
  for (const line of lines) {
    if (!line.trim()) {
      console.log('Skipping empty line');
      continue;
    }
    
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
  
  // Add better logging
  const headers = rows[0]?.map(h => h.trim().toLowerCase()) || [];
  console.log(`CSV Headers (${headers.length}): ${headers.join(', ')}`);
  
  if (rows.length > 1) {
    console.log(`First row data (${rows[1].length} columns):`);
    rows[1].forEach((cell, index) => {
      if (headers[index]) {
        console.log(`  ${headers[index]}: ${cell}`);
      } else {
        console.log(`  Column ${index}: ${cell}`);
      }
    });
  }
  
  return { 
    headers: headers,
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
      
      // Map required field indexes with more extensive matching
      const nameIndex = headers.findIndex(h => 
        h === 'name' || h === 'product name' || h === 'title' || 
        h === 'product title' || h === 'item name' || h === 'item title' ||
        h === 'product' || h === 'handle' || h.includes('product') && h.includes('name'));
        
      const skuIndex = headers.findIndex(h => 
        h === 'sku' || h === 'product sku' || h === 'item sku' || 
        h === 'stock keeping unit' || h === 'variant sku');
        
      const categoryIndex = headers.findIndex(h => 
        h === 'category' || h === 'product category' || h === 'item category' || 
        h === 'product type' || h === 'type' || h === 'collection');
        
      const priceIndex = headers.findIndex(h => 
        h === 'price' || h === 'product price' || h === 'item price' || 
        h === 'base price' || h === 'baseprice' || h === 'retail price' || 
        h === 'sale price' || h === 'selling price' || h === 'variant price' ||
        h === 'retail' || h === 'msrp');
        
      const quantityIndex = headers.findIndex(h => 
        h === 'quantity' || h === 'stock' || h === 'inventory' || 
        h === 'available' || h === 'stock quantity' || h === 'inventory quantity' || 
        h === 'qty' || h === 'amount' || h === 'count');
        
      const sizeIndex = headers.findIndex(h => 
        h === 'size' || h === 'product size' || h === 'item size' || 
        h === 'variant' || h === 'option' || h === 'weight' || 
        h === 'dimensions' || h === 'option1');
        
      const descriptionIndex = headers.findIndex(h => 
        h === 'description' || h === 'product description' || h === 'item description' || 
        h === 'details' || h === 'product details' || h === 'body');
        
      const wholesalePriceIndex = headers.findIndex(h => 
        h === 'wholesale price' || h === 'wholesaleprice' || h === 'wholesale' || 
        h === 'distributor price' || h === 'cost' || h === 'unit cost');
        
      const retailPriceIndex = headers.findIndex(h => 
        h === 'retail price' || h === 'retailprice' || h === 'retail' || 
        h === 'msrp' || h === 'srp' || h === 'suggested retail price');
      
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
          // Extract and clean product name
          let productName = "";
          if (nameIndex >= 0 && row[nameIndex]) {
            productName = row[nameIndex].trim();
            // Log the product name we found
            console.log(`Found product name in CSV: "${productName}"`);
          } else {
            productName = `Product ${i+1}`;
            console.log(`No product name found, using default: "${productName}"`);
          }
          
          // Extract and clean price
          let productPrice = 0;
          if (priceIndex >= 0 && row[priceIndex]) {
            const priceString = row[priceIndex].trim();
            console.log(`Found price string: "${priceString}"`);
            
            // Remove currency symbols and non-numeric characters except decimal point
            const cleanedPrice = priceString.replace(/[^0-9.]/g, '');
            console.log(`Cleaned price string: "${cleanedPrice}"`);
            
            if (cleanedPrice) {
              productPrice = parseFloat(cleanedPrice);
              if (isNaN(productPrice)) {
                console.warn(`Warning: Could not parse price "${priceString}" - defaulting to 0`);
                productPrice = 0;
              } else {
                console.log(`Parsed price value: ${productPrice}`);
              }
            }
          } else {
            console.log(`No price column found at index ${priceIndex}`);
          }
          
          // Create item data with proper values
          const itemData: any = {
            name: productName,
            sku: skuIndex >= 0 && row[skuIndex] ? row[skuIndex].trim() : `SKU-${Date.now()}-${i+1}`,
            category: categoryIndex >= 0 && row[categoryIndex] ? row[categoryIndex].trim() : "Uncategorized",
            basePrice: productPrice,
            quantity: quantityIndex >= 0 && row[quantityIndex] ? parseInt(row[quantityIndex], 10) : 0,
            size: sizeIndex >= 0 && row[sizeIndex] ? row[sizeIndex].trim() : "",
            description: descriptionIndex >= 0 && row[descriptionIndex] ? row[descriptionIndex].trim() : "",
            visibility: "visible",
            itemType: "product",
            status: "active"
          };
          
          // Add optional prices if available
          if (wholesalePriceIndex >= 0 && row[wholesalePriceIndex]) {
            const wholesalePriceString = row[wholesalePriceIndex].trim();
            const cleanedWholesalePrice = wholesalePriceString.replace(/[^0-9.]/g, '');
            itemData.wholesalePrice = cleanedWholesalePrice ? parseFloat(cleanedWholesalePrice) : null;
            console.log(`Wholesale price: ${itemData.wholesalePrice}`);
          }
          
          if (retailPriceIndex >= 0 && row[retailPriceIndex]) {
            const retailPriceString = row[retailPriceIndex].trim();
            const cleanedRetailPrice = retailPriceString.replace(/[^0-9.]/g, '');
            itemData.retailPrice = cleanedRetailPrice ? parseFloat(cleanedRetailPrice) : null;
            console.log(`Retail price: ${itemData.retailPrice}`);
          }
          
          // Log the final item data we're about to insert
          console.log(`Creating item with name "${itemData.name}" and basePrice ${itemData.basePrice}`);
          
          // Safety check - don't create items with default/empty values unless explicitly allowed
          if (itemData.name === `Product ${i+1}` && itemData.basePrice === 0) {
            console.warn(`Warning: Row ${i+1} has default name and zero price. Checking if it has other valid data...`);
            
            // Only create this item if it has at least some valid data in other fields
            const hasValidData = 
              (skuIndex >= 0 && row[skuIndex]) || 
              (quantityIndex >= 0 && row[quantityIndex]) ||
              (descriptionIndex >= 0 && row[descriptionIndex]);
              
            if (!hasValidData) {
              console.warn(`Skipping row ${i+1} due to insufficient data`);
              continue; // Skip this row
            }
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
      
      // Process barcodes and QR codes for the newly created items
      for (let i = 0; i < importedItems.length; i++) {
        try {
          const item = importedItems[i];
          
          // Generate barcode data
          const barcode = generateBarcodeData(item.sku);
          
          // Generate QR code URL for the item
          const qrCode = await generateQRCodeDataURL(item);
          
          // Update the item with barcode and QR code
          await storage.updateItem(item.id, {
            barcode,
            qrCode
          });
          
          // Update our local copy for marketplace synchronization
          importedItems[i] = await storage.getItem(item.id) || item;
        } catch (err) {
          console.error(`Error generating barcode/QR code for item ${importedItems[i].id}:`, err);
        }
      }
      
      // Check if we need to sync with Shopify
      const syncWithShopify = req.body.syncWithShopify === 'true' || req.body.syncWithShopify === true;
      let syncResults = { success: 0, failures: 0 };
      
      if (syncWithShopify && importedItems.length > 0) {
        // Check if Shopify is configured
        const shopifyConfigured = await isShopifyConfigured();
        
        if (shopifyConfigured) {
          console.log(`Syncing ${importedItems.length} imported items with Shopify through existing service`);
          
          // Use the existing Shopify service through the prepareItemForShopify and pushItemToShopify functions
          for (const item of importedItems) {
            try {
              // Get Shopify credentials from the auth service
              const credentials = await getShopifyCredentials();
              
              if (credentials && credentials.accessToken && credentials.storeUrl) {
                // Log the Shopify credentials details (safely)
                console.log(`Using Shopify credentials for store: ${credentials.storeUrl}`);
                console.log(`Creating Shopify service for item: ${item.name} (${item.sku})`);
                
                // Create a Shopify service instance
                const shopifyService = new ShopifyService({
                  shopName: credentials.storeUrl,
                  accessToken: credentials.accessToken,
                });
                
                // Use the service to create the product
                console.log(`Pushing item ${item.id} (${item.sku}) to Shopify...`);
                const result = await shopifyService.createProduct(item);
                console.log(`Shopify push result for item ${item.sku}: ${result.success ? 'Success' : 'Failed'}, ID: ${result.id || 'none'}`);
                
                if (result.success) {
                  syncResults.success++;
                  
                  // Update the item with Shopify product ID and add marketplace entry
                  await storage.updateItem(item.id, {
                    shopifySyncStatus: "synced",
                    marketplace: [
                      ...(item.marketplace || []),
                      { name: 'Shopify', isListed: true }
                    ]
                  });
                } else {
                  syncResults.failures++;
                  console.error(`Failed to push item ${item.sku} to Shopify: ${result.message || 'Unknown error'}`);
                }
              } else {
                syncResults.failures++;
                console.error(`Shopify credentials not available for item ${item.sku}`);
              }
            } catch (err) {
              console.error(`Error syncing item ${item.id} to Shopify:`, err);
              syncResults.failures++;
            }
          }
        } else {
          console.warn("Shopify sync requested but Shopify is not configured");
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