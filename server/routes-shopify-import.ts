import { Request, Response } from 'express';
import { importShopifyCSV } from './services/shopify-import';
import { IStorage } from './storage';
import { generateBarcodeData } from './services/barcode';
import { generateQRCodeDataURL } from './services/qrcode';
import multer from 'multer';
import { createShopifyClient } from './services/shopify-auth';

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Register Shopify import routes
 */
export function registerShopifyImportRoutes(app: any, storage: IStorage) {
  // Special endpoint just for Shopify imports with robust CSV parsing
  app.post("/api/items/import-shopify", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      console.log("Starting Shopify CSV import process...");
      
      // Parse CSV with robust parser
      const csvContent = req.file.buffer.toString('utf-8');
      console.log(`First 5 lines of raw CSV: ${JSON.stringify(csvContent.split('\n').slice(0, 5))}`);
      
      // Import the existing CSV parser
      const { parseRobustCSV, extractProductFromRow, extractInventoryFromRow } = await import('./services/shopify-import');
      
      console.log("Using robust CSV parser...");
      const parseResult = parseRobustCSV(csvContent);
      
      console.log(`Robust CSV parsed with ${parseResult.headers.length} headers and ${parseResult.rows.length} data rows`);
      console.log(`Format detected: ${parseResult.format}`);
      console.log(`Parse success: ${parseResult.success}`);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Import failed",
          message: "CSV parsing failed",
          details: parseResult.errors
        });
      }
      
      if (parseResult.format === 'unknown') {
        return res.status(400).json({
          error: "Import failed", 
          message: "Unrecognized CSV format. Please ensure you're uploading a Shopify product or inventory export.",
          headers: parseResult.headers
        });
      }
      
      // Process rows based on detected format
      const importedItems = [];
      const errors = [];
      
      for (let i = 0; i < parseResult.rows.length; i++) {
        try {
          const row = parseResult.rows[i];
          let itemData;
          
          if (parseResult.format === 'product') {
            itemData = extractProductFromRow(parseResult.headers, row);
          } else if (parseResult.format === 'inventory') {
            itemData = extractInventoryFromRow(parseResult.headers, row);
          } else {
            continue;
          }
          
          // Skip rows without essential data
          if (!itemData.name && !itemData.sku) {
            continue;
          }
          
          // Generate missing data
          if (!itemData.sku) {
            itemData.sku = `IMPORT-${Date.now()}-${i}`;
          }
          
          if (!itemData.name) {
            itemData.name = `Imported Item ${i}`;
          }
          
          if (!itemData.basePrice) {
            itemData.basePrice = "0.00";
          }
          
          // Generate barcode and QR code
          if (!itemData.barcode) {
            itemData.barcode = generateBarcodeData(itemData.sku);
          }
          
          itemData.qrCode = await generateQRCodeDataURL({
            id: Date.now() + i,
            name: itemData.name,
            sku: itemData.sku
          });
          
          // Set defaults
          itemData.status = itemData.status || 'active';
          itemData.category = itemData.category || 'Imported';
          itemData.quantity = itemData.quantity || 0;
          
          // Create item in storage
          const createdItem = await storage.createItem(itemData);
          importedItems.push(createdItem);
          
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      res.json({ 
        success: true,
        message: `Successfully imported ${importedItems.length} items from Shopify ${parseResult.format} export`,
        imported: importedItems.length,
        items: importedItems,
        totalErrors: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        format: parseResult.format
      });
      
    } catch (error) {
      console.error("Failed to import Shopify CSV:", error);
      res.status(500).json({ 
        error: "Failed to import Shopify CSV", 
        message: error instanceof Error ? error.message : "Unknown server error"
      });
    }
  });

  // Endpoint to find and view a product on Shopify store
  app.get("/api/items/:id/shopify-store-view", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      // Get the item from storage
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Initialize Shopify client
      const shopifyClient = await createShopifyClient();
      if (!shopifyClient) {
        return res.status(500).json({ error: "Failed to connect to Shopify" });
      }

      // Search for the product by SKU in Shopify
      try {
        // Different approach depending on whether we got a real or mock client
        if (shopifyClient.isMock) {
          // For mock client, return simulated results
          return res.json({
            success: true,
            productInfo: {
              title: `${item.name} (Mock)`,
              handle: item.name.toLowerCase().replace(/\s+/g, '-'),
              storeUrl: `https://example.myshopify.com/products/${item.name.toLowerCase().replace(/\s+/g, '-')}`,
              imageUrl: (item.images as string[])[0] || null,
              id: `gid://shopify/Product/${item.id}`,
              note: "This is a mock preview as Shopify credentials are not configured"
            }
          });
        }

        // For real client, use the GraphQL API
        const query = `
          {
            products(first: 1, query: "sku:${item.sku}") {
              edges {
                node {
                  id
                  title
                  handle
                  onlineStoreUrl
                  images(first: 1) {
                    edges {
                      node {
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        // First, try using the GraphQL API if available
        let graphqlResult;
        
        // Check if the client has graphql method
        if (typeof shopifyClient.shopify.graphql === 'function') {
          graphqlResult = await shopifyClient.shopify.graphql(query);
        }
        
        if (graphqlResult && 
            graphqlResult.products && 
            graphqlResult.products.edges && 
            graphqlResult.products.edges.length > 0) {
          
          const product = graphqlResult.products.edges[0].node;
          const storeDomain = process.env.SHOPIFY_STORE?.replace(".myshopify.com", "") || "";
          
          // Get the online store URL or construct one
          let storeUrl = product.onlineStoreUrl;
          if (!storeUrl && product.handle) {
            storeUrl = `https://${storeDomain}.myshopify.com/products/${product.handle}`;
          }
          
          // Get the product image if available
          let imageUrl = null;
          if (product.images && 
              product.images.edges && 
              product.images.edges.length > 0) {
            imageUrl = product.images.edges[0].node.url;
          }
          
          return res.json({
            success: true,
            productInfo: {
              title: product.title,
              handle: product.handle,
              storeUrl,
              imageUrl,
              id: product.id
            }
          });
        }
        
        // If GraphQL doesn't return results, try the REST API if available
        console.log("GraphQL search failed or not available, trying another approach...");
        
        // Check if the client has REST API available
        let products;
        try {
          if (shopifyClient.shopify.rest && typeof shopifyClient.shopify.rest.Product?.all === 'function') {
            products = await shopifyClient.shopify.rest.Product.all({
              query: `sku:${item.sku}`
            });
          } else {
            // For clients without standard REST API, try another approach
            // This is a simplified fallback that returns a generic response
            return res.json({
              success: false,
              message: "Cannot search products. Shopify API client doesn't have REST product search capability.",
              item: {
                id: item.id,
                name: item.name,
                sku: item.sku
              }
            });
          }
        } catch (restError) {
          console.error("REST API error:", restError);
          return res.json({
            success: false,
            message: "Error searching for product in Shopify",
            item: {
              id: item.id,
              name: item.name,
              sku: item.sku
            }
          });
        }
        
        if (products && products.data && products.data.length > 0) {
          const product = products.data[0];
          const storeDomain = process.env.SHOPIFY_STORE?.replace(".myshopify.com", "") || "";
          
          // Construct the store URL
          const storeUrl = `https://${storeDomain}.myshopify.com/products/${product.handle}`;
          
          // Get the product image if available
          let imageUrl = null;
          if (product.images && product.images.length > 0) {
            imageUrl = product.images[0].src;
          }
          
          return res.json({
            success: true,
            productInfo: {
              title: product.title,
              handle: product.handle,
              storeUrl,
              imageUrl,
              id: product.id
            }
          });
        }
        
        // If no product found by SKU, try searching by name if REST API is available
        let nameProducts;
        if (shopifyClient.shopify.rest && typeof shopifyClient.shopify.rest.Product?.all === 'function') {
          nameProducts = await shopifyClient.shopify.rest.Product.all({
            query: `title:${item.name}`
          });
        } else {
          nameProducts = { data: [] };
        }
        
        if (nameProducts && nameProducts.data && nameProducts.data.length > 0) {
          const product = nameProducts.data[0];
          const storeDomain = process.env.SHOPIFY_STORE?.replace(".myshopify.com", "") || "";
          
          // Construct the store URL
          const storeUrl = `https://${storeDomain}.myshopify.com/products/${product.handle}`;
          
          // Get the product image if available
          let imageUrl = null;
          if (product.images && product.images.length > 0) {
            imageUrl = product.images[0].src;
          }
          
          return res.json({
            success: true,
            productInfo: {
              title: product.title,
              handle: product.handle,
              storeUrl,
              imageUrl,
              id: product.id,
              note: "Found by name match, not exact SKU match"
            }
          });
        }
        
        // No product found
        return res.json({
          success: false,
          message: "Product not found in Shopify store",
          item: {
            id: item.id,
            name: item.name,
            sku: item.sku
          }
        });
        
      } catch (searchError) {
        console.error("Error searching Shopify:", searchError);
        return res.status(500).json({ 
          error: "Failed to search Shopify", 
          message: searchError instanceof Error ? searchError.message : "Unknown error in Shopify search" 
        });
      }
    } catch (error) {
      console.error("Error in shopify-store-view endpoint:", error);
      return res.status(500).json({ 
        error: "Failed to get Shopify store view", 
        message: error instanceof Error ? error.message : "Unknown server error" 
      });
    }
  });
}