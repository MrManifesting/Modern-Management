import { Request, Response } from 'express';
import { importShopifyCSV } from './services/shopify-import';
import { IStorage } from './storage';
import { generateBarcodeData, generateQRCodeDataURL } from './services/barcode';
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
  // Special endpoint just for Shopify imports
  app.post("/api/items/import-shopify", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      
      // Process the CSV content
      const result = await importShopifyCSV(
        csvContent, 
        storage,
        generateBarcodeData,
        generateQRCodeDataURL
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: "Import failed",
          message: result.message,
          errors: result.errors.slice(0, 5) // Just show the first 5 errors
        });
      }
      
      res.json({ 
        success: true,
        message: result.message,
        items: result.items,
        totalErrors: result.errors.length,
        errors: result.errors.length > 0 ? result.errors.slice(0, 5) : undefined
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
      const shopify = await createShopifyClient();
      if (!shopify) {
        return res.status(500).json({ error: "Failed to connect to Shopify" });
      }

      // Search for the product by SKU in Shopify
      try {
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

        // First, try using the GraphQL API
        const graphqlResult = await shopify.graphql(query);
        
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
        
        // If GraphQL doesn't return results, try the REST API
        console.log("GraphQL search failed, falling back to REST API...");
        const products = await shopify.rest.Product.all({
          query: `sku:${item.sku}`
        });
        
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
        
        // If no product found by SKU, try searching by name
        const nameProducts = await shopify.rest.Product.all({
          query: `title:${item.name}`
        });
        
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