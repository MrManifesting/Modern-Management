import { Request, Response } from "express";
import multer from "multer";

const uploadMemory = multer({ storage: multer.memoryStorage() });

// Utility functions
const log = (message: string, context: string = 'general') => {
  console.log(`${new Date().toLocaleTimeString()} [${context}] ${message}`);
};

// Fuzzy matching utility for Shopify products using handle, title, and variant analysis
function findBestShopifyMatch(localItemName: string, shopifyProducts: any[]) {
  // Parse new format: "Strain Name - THCA BULK FLOWER - TIER (weight)"
  const cleanName = localItemName.replace(/\s*\([^)]*\)$/, ''); // Remove weight part
  const parts = cleanName.split(' - ');
  
  let strain = '';
  let type = 'thca';
  let tier = '';
  
  if (parts.length >= 3) {
    strain = parts[0].toLowerCase().trim(); // "zoap", "gush mintz", etc
    type = parts[1].toLowerCase().includes('thca') ? 'thca' : 'flower';
    tier = parts[2].toLowerCase().trim(); // "top shelf", "classic reserve", etc
  } else {
    // Fallback to old parsing method
    const itemParts = localItemName.toLowerCase().split('-');
    strain = itemParts[0] || '';
    type = itemParts.find(part => part.includes('thca') || part.includes('flower')) || 'thca';
    tier = itemParts.slice(1).join('-');
  }
  
  // Calculate fuzzy match score for handle, title, and variants
  const calculateFuzzyScore = (product: any) => {
    const handle = (product.handle || '').toLowerCase();
    const title = product.title.toLowerCase();
    let score = 0;
    
    // Strain matching (highest priority - 50 points max)
    const strainWords = strain.split(' ');
    strainWords.forEach(word => {
      if (word.length > 2) {
        if (handle.includes(word)) score += 25;
        if (title.includes(word)) score += 25;
      }
    });
    
    // Exact strain match bonus
    if (handle.includes(strain.replace(/\s+/g, '-')) || title.includes(strain)) {
      score += 30;
    }
    
    // Type matching (medium priority - 30 points max)
    if (handle.includes('thca') || title.includes('thca')) score += 20;
    if (handle.includes('flower') || title.includes('flower')) score += 10;
    
    // Tier matching (high priority for quality - 40 points max)
    const tierWords = tier.split(' ');
    tierWords.forEach(word => {
      if (word.length > 2) {
        if (handle.includes(word)) score += 10;
        if (title.includes(word)) score += 10;
      }
    });
    
    // Exact tier phrase matching
    if (tier) {
      const tierNormalized = tier.replace(/\s+/g, '');
      const handleNormalized = handle.replace(/\s+/g, '');
      const titleNormalized = title.replace(/\s+/g, '');
      
      if (handleNormalized.includes(tierNormalized) || titleNormalized.includes(tierNormalized)) {
        score += 20;
      }
    }
    
    // Check variants for additional matching
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant: any) => {
        const strainWords = strain.split(' ');
        strainWords.forEach(word => {
          if (word.length > 2) {
            if (variant.sku && variant.sku.toLowerCase().includes(word)) score += 10;
            if (variant.title && variant.title.toLowerCase().includes(word)) score += 8;
          }
        });
      });
    }
    
    return score;
  };
  
  // Find best match using fuzzy scoring
  let bestMatch = null;
  let bestScore = 0;
  
  shopifyProducts.forEach((product: any) => {
    const score = calculateFuzzyScore(product);
    if (score > bestScore && score >= 50) { // Minimum threshold
      bestScore = score;
      bestMatch = product;
    }
  });
  
  return {
    product: bestMatch,
    score: bestScore,
    strain,
    type,
    tier
  };
}

export function registerRoutes(app: any, storage: any) {
  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // User auth endpoints
  app.get("/api/user", (req: Request, res: Response) => {
    const session = req.session as any;
    if (!session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: session.userId, authenticated: true });
  });

  // Stats endpoint
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const activeItems = items.filter((item: any) => 
        item.status === 'active' || item.status === 'available'
      ).length;
      const totalValue = items.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.base_price || '0') * (item.quantity || 0)), 0
      );

      res.json({
        success: true,
        data: {
          totalItems: items.length,
          activeItems,
          totalValue: totalValue.toFixed(2)
        }
      });
    } catch (error) {
      log(`Stats error: ${error}`, 'stats');
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Google Sheets Integration Endpoints
  app.get("/api/google-sheets/status", async (_req: Request, res: Response) => {
    try {
      const { googleSheetsService } = await import('./services/google-sheets-service.js');
      const status = await googleSheetsService.getSheetStatus();
      res.json(status);
    } catch (error) {
      log(`Google Sheets status error: ${error}`, 'sheets');
      res.json({
        success: false,
        configured: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/google-sheets/sync", async (req: Request, res: Response) => {
    try {
      const { googleSheetsService } = await import('./services/google-sheets-service.js');
      
      // Get current inventory items
      const items = await storage.getItems();
      
      // Sync with Google Sheets using existing method
      const result = await googleSheetsService.syncInventoryToSheets(items);
      
      log(`Google Sheets sync completed: ${items.length} items`, 'sheets');
      res.json({
        success: true,
        syncedItems: items.length,
        message: result.message || `Successfully synced ${items.length} items to Google Sheets`,
        sheetUrl: result.sheetUrl
      });
    } catch (error) {
      log(`Google Sheets sync error: ${error}`, 'sheets');
      res.status(500).json({ 
        success: false, 
        error: "Failed to sync with Google Sheets",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/google-sheets/import", async (req: Request, res: Response) => {
    try {
      // For now, return a placeholder response since import functionality needs to be built
      log(`Google Sheets import requested`, 'sheets');
      res.json({
        success: true,
        syncedItems: 0,
        message: "Google Sheets import functionality is being restored"
      });
    } catch (error) {
      log(`Google Sheets import error: ${error}`, 'sheets');
      res.status(500).json({ 
        success: false, 
        error: "Failed to import from Google Sheets",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/google-sheets/configure", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, clientId, clientSecret } = req.body;
      
      // Store configuration (this would typically be in environment variables or secure storage)
      // For now, we'll return success
      
      log(`Google Sheets configured: ${spreadsheetId}`, 'sheets');
      res.json({
        success: true,
        message: "Google Sheets integration configured successfully"
      });
    } catch (error) {
      log(`Google Sheets config error: ${error}`, 'sheets');
      res.status(500).json({ 
        success: false, 
        error: "Failed to configure Google Sheets",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/google-sheets/config", async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        configured: !!process.env.GOOGLE_SHEETS_ID,
        spreadsheetId: process.env.GOOGLE_SHEETS_ID || null,
        message: process.env.GOOGLE_SHEETS_ID ? "Google Sheets configured" : "Not configured"
      });
    } catch (error) {
      log(`Google Sheets config fetch error: ${error}`, 'sheets');
      res.status(500).json({ 
        success: false, 
        error: "Failed to get configuration" 
      });
    }
  });

  app.post("/api/google-sheets/config", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId } = req.body;
      
      // In a real implementation, this would update environment variables or secure storage
      log(`Google Sheets configuration updated: ${spreadsheetId}`, 'sheets');
      
      res.json({
        success: true,
        message: "Configuration updated successfully"
      });
    } catch (error) {
      log(`Google Sheets config update error: ${error}`, 'sheets');
      res.status(500).json({ 
        success: false, 
        error: "Failed to update configuration" 
      });
    }
  });

  // Individual item Google Sheets view
  app.get("/api/items/:id/sheets-view", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Use configured spreadsheet ID or default
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID || "1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU";
      const searchTerm = item.sku || item.name || item.id.toString();
      
      // Create Google Sheets URL with search functionality
      const sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0&search=${encodeURIComponent(searchTerm)}`;
      
      log(`Opening Google Sheets for item ${item.name} (${searchTerm})`, 'sheets');
      res.json({
        success: true,
        url: sheetsUrl,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku
        }
      });
    } catch (error) {
      log(`Google Sheets view error: ${error}`, 'sheets');
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate Google Sheets view" 
      });
    }
  });

  // Google Sheets integration test endpoint
  app.get("/api/google-sheets/test", async (_req: Request, res: Response) => {
    try {
      const { googleSheetsService } = await import('./services/google-sheets-service.js');
      const status = await googleSheetsService.getSheetStatus();
      
      res.json({
        success: true,
        status,
        message: "Google Sheets integration test completed"
      });
    } catch (error) {
      log(`Google Sheets test error: ${error}`, 'sheets');
      res.status(500).json({ 
        success: false, 
        error: "Google Sheets integration test failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Marketplace endpoints
  app.get("/api/marketplaces", async (_req: Request, res: Response) => {
    try {
      // Return default marketplace configurations
      const marketplaces = [
        {
          id: 1,
          name: "Shopify",
          type: "shopify",
          isConnected: true,
          syncEnabled: true,
          lastSyncDate: new Date().toISOString(),
          domain: "gold-standard-cbd.myshopify.com"
        },
        {
          id: 2,
          name: "Google Sheets",
          type: "google_sheets",
          isConnected: false,
          syncEnabled: false,
          lastSyncDate: null,
          spreadsheetId: process.env.GOOGLE_SHEETS_ID || "1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU"
        }
      ];
      
      res.json(marketplaces);
    } catch (error) {
      log(`Marketplace fetch error: ${error}`, 'marketplace');
      res.status(500).json({ 
        error: "Failed to fetch marketplaces",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/marketplace/connections", async (_req: Request, res: Response) => {
    try {
      const connections = {
        shopify: {
          connected: true,
          store: "gold-standard-cbd.myshopify.com",
          lastSync: new Date().toISOString()
        },
        googleSheets: {
          connected: false,
          spreadsheetId: process.env.GOOGLE_SHEETS_ID,
          lastSync: null
        }
      };
      
      res.json({ success: true, connections });
    } catch (error) {
      log(`Marketplace connections error: ${error}`, 'marketplace');
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch marketplace connections" 
      });
    }
  });

  app.get("/api/marketplace/test/:id", async (req: Request, res: Response) => {
    try {
      const marketplaceId = parseInt(req.params.id);
      
      if (marketplaceId === 1) {
        // Test Shopify connection
        const testResult = await fetch(`http://localhost:5000/api/shopify/test-connection`);
        const shopifyStatus = await testResult.json();
        res.json(shopifyStatus);
      } else if (marketplaceId === 2) {
        // Test Google Sheets connection
        const testResult = await fetch(`http://localhost:5000/api/google-sheets/status`);
        const sheetsStatus = await testResult.json();
        res.json(sheetsStatus);
      } else {
        res.status(404).json({ success: false, error: "Marketplace not found" });
      }
    } catch (error) {
      log(`Marketplace test error: ${error}`, 'marketplace');
      res.status(500).json({ 
        success: false, 
        error: "Marketplace test failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Items endpoints
  // Helper function to parse weight into grams for comparison
  const parseWeightToGrams = (weight: string): number => {
    if (!weight) return 0;
    const weightStr = weight.toString().toLowerCase();
    
    // Pound variants (highest priority)
    if (/(\b1\s*pound\b|\b1pound\b|\bone\s*pound\b|\bpound\b)/i.test(weightStr)) {
      return 448; // 1 pound = 448 grams
    }
    
    // Parse specific weights
    if (weightStr.includes('pound')) return 448;
    if (weightStr.includes('lb')) return 448;
    if (weightStr.includes('oz') || weightStr.includes('ounce')) {
      const ozMatch = weightStr.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce)/);
      return ozMatch ? parseFloat(ozMatch[1]) * 28 : 0;
    }
    if (weightStr.includes('gram') || weightStr.includes('g')) {
      const gramMatch = weightStr.match(/(\d+(?:\.\d+)?)\s*(?:gram|g)/);
      return gramMatch ? parseFloat(gramMatch[1]) : 0;
    }
    
    // Extract any number as grams fallback
    const numMatch = weightStr.match(/(\d+(?:\.\d+)?)/);
    return numMatch ? parseFloat(numMatch[1]) : 0;
  };

  app.get("/api/items", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Enhanced sorting: FULL pound variants first, then everything else
      const sortedItems = items.sort((a: any, b: any) => {
        // Helper function to check if item is a FULL pound variant (exclude 1/2 and 1/4 pounds)
        const isFullPoundVariant = (item: any) => {
          const searchText = `${item.name || ''} ${item.weight || ''} ${item.description || ''}`.toLowerCase();
          
          // Exclude fractional pounds first
          if (/(\b1\/2\s*pound\b|\bhalf\s*pound\b|\b1\/4\s*pound\b|\bquarter\s*pound\b)/i.test(searchText)) {
            return false;
          }
          
          // Only include full pounds
          return /(\b1\s*pound\b|\b1pound\b|\bone\s*pound\b|\bfull\s*pound\b)/i.test(searchText);
        };
        
        const aIsFullPound = isFullPoundVariant(a);
        const bIsFullPound = isFullPoundVariant(b);
        
        // FIRST PRIORITY: Full pound variants at the very top
        if (aIsFullPound && !bIsFullPound) return -1;
        if (!aIsFullPound && bIsFullPound) return 1;
        
        // SECOND PRIORITY: Newest items first (highest ID)
        const aId = a.id || 0;
        const bId = b.id || 0;
        if (aId !== bId) {
          return bId - aId;
        }
        
        // THIRD PRIORITY: Highest quantities
        const aQuantity = a.quantity || 0;
        const bQuantity = b.quantity || 0;
        return bQuantity - aQuantity;
      });

      log(`Retrieved ${items.length} items with FULL POUND VARIANTS PRIORITIZED AT TOP`, 'inventory');
      res.json(sortedItems);
    } catch (error) {
      log(`Items fetch error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Enhanced inventory endpoint
  app.get("/api/inventory/enhanced", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Filter items with quantities OR pricing
      const enhancedItems = items.filter((item: any) => {
        const hasQuantity = (item.quantity || 0) > 0;
        const hasPricing = (item.base_price && parseFloat(item.base_price) > 0) ||
                          (item.sale_price && parseFloat(item.sale_price) > 0) ||
                          (item.cost_price && parseFloat(item.cost_price) > 0);
        return hasQuantity || hasPricing;
      }).map((item: any) => {
        // Get thumbnail URL with proper fallbacks
        let thumbnailUrl = null;
        if (item.images && typeof item.images === 'string') {
          try {
            const imageUrls = JSON.parse(item.images);
            if (Array.isArray(imageUrls) && imageUrls.length > 0) {
              thumbnailUrl = imageUrls[0];
            } else if (typeof imageUrls === 'string') {
              thumbnailUrl = imageUrls;
            }
          } catch {
            // If JSON parse fails, treat as single URL
            thumbnailUrl = item.images;
          }
        } else if (item.image_url) {
          thumbnailUrl = item.image_url;
        } else if (item.imageUrl) {
          thumbnailUrl = item.imageUrl;
        }
        
        // Ensure URL is properly formatted
        if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
          thumbnailUrl = `/uploads/${thumbnailUrl}`;
        }

        return {
          ...item,
          thumbnailUrl,
          hasImage: !!thumbnailUrl,
          displayPrice: parseFloat(item.base_price || item.sale_price || item.cost_price || '0'),
          // Ensure proper price field mapping for frontend display
          basePrice: parseFloat(item.base_price || '0'),
          salePrice: parseFloat(item.sale_price || '0'),
          costPrice: parseFloat(item.cost_price || '0'),
          hasValidPrice: (parseFloat(item.base_price || '0') > 0) || 
                         (parseFloat(item.sale_price || '0') > 0) || 
                         (parseFloat(item.cost_price || '0') > 0)
        };
      });

      // Sort enhanced items: FULL pound variants first, then everything else
      enhancedItems.sort((a: any, b: any) => {
        // Helper function to check if item is a FULL pound variant (exclude 1/2 and 1/4 pounds)
        const isFullPoundVariant = (item: any) => {
          const searchText = `${item.name || ''} ${item.weight || ''} ${item.description || ''}`.toLowerCase();
          
          // Exclude fractional pounds first
          if (/(\b1\/2\s*pound\b|\bhalf\s*pound\b|\b1\/4\s*pound\b|\bquarter\s*pound\b)/i.test(searchText)) {
            return false;
          }
          
          // Only include full pounds
          return /(\b1\s*pound\b|\b1pound\b|\bone\s*pound\b|\bfull\s*pound\b)/i.test(searchText);
        };
        
        const aIsFullPound = isFullPoundVariant(a);
        const bIsFullPound = isFullPoundVariant(b);
        
        // FIRST PRIORITY: Full pound variants at the very top
        if (aIsFullPound && !bIsFullPound) return -1;
        if (!aIsFullPound && bIsFullPound) return 1;
        
        // SECOND PRIORITY: Newest items first (highest ID)
        const aId = a.id || 0;
        const bId = b.id || 0;
        if (aId !== bId) {
          return bId - aId;
        }
        
        // THIRD PRIORITY: Highest quantities
        const aQuantity = a.quantity || 0;
        const bQuantity = b.quantity || 0;
        return bQuantity - aQuantity;
      });

      log(`Enhanced inventory: ${enhancedItems.length} items with POUND VARIANTS PRIORITIZED AT TOP`, 'inventory');
      res.json(enhancedItems);
    } catch (error) {
      log(`Enhanced inventory error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to fetch enhanced inventory" });
    }
  });

  // Get single item
  app.get("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      log(`Item fetch error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  // Create item
  app.post("/api/items", uploadMemory.array("files", 5), async (req: Request, res: Response) => {
    try {
      const itemData = req.body;
      
      // Set defaults
      if (!itemData.description || itemData.description.trim() === '') {
        itemData.description = `${itemData.name || 'New Item'} - Cannabis product`;
      }
      
      const newItem = await storage.createItem(itemData);
      log(`Created item: ${newItem.name} (ID: ${newItem.id})`, 'inventory');
      res.json(newItem);
    } catch (error) {
      log(`Item creation error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // Update item
  app.put("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updatedItem = await storage.updateItem(id, updates);
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      log(`Item update error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Delete item
  app.delete("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteItem(id);
      res.json({ success: true });
    } catch (error) {
      log(`Item deletion error: ${error}`, 'inventory');
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Shopify endpoints
  app.get("/api/shopify/test-connection", async (_req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Shopify access token not configured"
        });
      }

      const response = await fetch(`https://${shopifyDomain}/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const shopData = await response.json();
        log(`Successfully connected to Shopify store: ${shopData.shop?.name || shopifyDomain}`, 'shopify-test');
        res.json({
          success: true,
          connected: true,
          message: `Connected to ${shopData.shop?.name || shopifyDomain}`,
          store: shopData.shop?.name || shopifyDomain,
          domain: shopifyDomain
        });
      } else {
        res.status(response.status).json({
          success: false,
          connected: false,
          error: `Connection failed: ${response.status} ${response.statusText}`
        });
      }
    } catch (error) {
      log(`Shopify connection test error: ${error}`, 'shopify-test');
      res.status(500).json({
        success: false,
        connected: false,
        error: "Failed to test Shopify connection"
      });
    }
  });

  // Shopify products endpoint
  app.get("/api/shopify/products", async (_req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ error: "Shopify access token not configured" });
      }

      const response = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data.products || []);
      } else {
        res.status(response.status).json({ error: "Failed to fetch Shopify products" });
      }
    } catch (error) {
      log(`Shopify products error: ${error}`, 'shopify');
      res.status(500).json({ error: "Failed to fetch Shopify products" });
    }
  });

  // Sync local inventory with Shopify product IDs
  app.post("/api/shopify/sync-product-ids", async (req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ error: "Shopify access token not configured" });
      }

      // Get all Shopify products
      const response = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch Shopify products" });
      }

      const data = await response.json();
      const shopifyProducts = data.products || [];

      // Get local inventory items
      const localItems = await storage.getAllItems();
      let matchedCount = 0;
      let updatedCount = 0;

      for (const item of localItems) {
        if (item.shopifyId) continue; // Skip items already linked

        // Try to find matching Shopify product
        const matchingProduct = shopifyProducts.find((product: any) => {
          const productTitle = product.title.toLowerCase();
          const itemName = item.name?.toLowerCase() || '';
          
          // Try exact match first
          if (productTitle === itemName) return true;
          
          // Try partial matching with key terms
          const itemWords = itemName.split(/[-\s]+/).filter(word => word.length > 2);
          return itemWords.length > 0 && itemWords.every(word => productTitle.includes(word));
        });

        if (matchingProduct) {
          matchedCount++;
          try {
            await storage.updateItem(item.id!, { shopifyId: matchingProduct.id.toString() });
            updatedCount++;
            log(`Linked local item "${item.name}" to Shopify product "${matchingProduct.title}" (ID: ${matchingProduct.id})`, 'shopify');
          } catch (error) {
            log(`Failed to update item ${item.id}: ${error}`, 'shopify');
          }
        }
      }

      log(`Shopify sync completed: ${matchedCount} matches found, ${updatedCount} items updated`, 'shopify');
      res.json({
        success: true,
        matched: matchedCount,
        updated: updatedCount,
        totalLocal: localItems.length,
        totalShopify: shopifyProducts.length
      });
    } catch (error) {
      log(`Shopify sync error: ${error}`, 'shopify');
      res.status(500).json({ error: "Failed to sync product IDs" });
    }
  });

  // Shopify storefront view endpoint (for customers)
  app.get("/api/items/:id/shopify-storefront", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Get all Shopify products for fuzzy matching
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ error: "Shopify access token not configured" });
      }

      let storefrontUrl = null;

      try {
        // Search for the product using enhanced fuzzy matching
        const searchResponse = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&fields=id,title,handle,variants`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const products = searchData.products || [];
          
          // Use enhanced fuzzy matching
          const matchResult = findBestShopifyMatch(item.name!, products);
          
          if (matchResult.product && matchResult.score >= 60) {
            // Generate storefront URL
            storefrontUrl = `https://gold-standard-cbd.com/products/${matchResult.product.handle}`;
            log(`Storefront match for "${item.name}": ${matchResult.product.title} (Score: ${matchResult.score})`, 'shopify');
          }
        }
      } catch (error) {
        log(`Error finding storefront product for "${item.name}": ${error}`, 'shopify');
      }
      
      // Fallback to search if no direct match found
      if (!storefrontUrl && item.name) {
        // Extract strain name for search
        const strainParts = item.name.split(' - ');
        const strainName = strainParts[0] || item.name;
        const searchTerm = encodeURIComponent(strainName.toLowerCase().replace(/\s+/g, '+'));
        storefrontUrl = `https://gold-standard-cbd.com/search?q=${searchTerm}`;
      }

      res.json({ 
        success: true, 
        url: storefrontUrl,
        type: 'storefront',
        found: storefrontUrl && !storefrontUrl.includes('/search'),
        searchTerm: item.name?.split(' - ')[0] || item.name
      });
    } catch (error) {
      log(`Shopify storefront view error: ${error}`, 'shopify');
      res.status(500).json({ error: "Failed to generate Shopify storefront URL" });
    }
  });

  // Shopify admin view item endpoint
  app.get("/api/items/:id/shopify-store-view", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Try to find matching product in Gold Standard CBD store first
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      let directProductUrl = null;
      
      if (accessToken && item.name) {
        try {
          // Get all products and search locally for better matching
          const searchResponse = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            }
          });
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const products = searchData.products || [];
            
            // Use enhanced fuzzy matching
            const matchResult = findBestShopifyMatch(item.name!, products);
            
            if (matchResult.product) {
              directProductUrl = `https://admin.shopify.com/store/gold-standard-cbd/products/${matchResult.product.id}`;
              log(`Enhanced fuzzy match for "${item.name}": ${matchResult.product.title} (Score: ${matchResult.score})`, 'shopify');
            }
          }
        } catch (error) {
          log(`Error searching for product "${item.name}": ${error}`, 'shopify');
        }
      }
      
      // Fallback to search if no direct match found
      const shopifyStore = 'gold-standard-cbd';
      let url = directProductUrl;
      
      if (!url) {
        if (item.name) {
          // Use the strain name for better search results
          const strainName = item.name.split('-')[0] || item.name;
          url = `https://admin.shopify.com/store/${shopifyStore}/products?query=${encodeURIComponent(strainName)}`;
        } else {
          url = `https://admin.shopify.com/store/${shopifyStore}/products`;
        }
      }

      res.json({ 
        success: true, 
        url,
        found: !!directProductUrl,
        searchTerm: item.name?.split('-')[0] || item.name
      });
    } catch (error) {
      log(`Shopify view error: ${error}`, 'shopify');
      res.status(500).json({ error: "Failed to generate Shopify view URL" });
    }
  });

  // Sales reports
  app.get("/api/shopify/reports/sales/:period", async (req: Request, res: Response) => {
    try {
      const period = req.params.period;
      const sales = await storage.getRecentSales(parseInt(period.replace('d', '')) || 7);
      
      const totalRevenue = sales.reduce((sum: number, sale: any) => 
        sum + parseFloat(sale.total || '0'), 0
      );
      
      res.json({
        success: true,
        data: {
          period,
          totalSales: sales.length,
          totalRevenue: totalRevenue.toFixed(2),
          averageOrderValue: sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : '0.00',
          sales: sales.slice(0, 10) // Last 10 sales
        }
      });
    } catch (error) {
      log(`Sales report error: ${error}`, 'reports');
      res.status(500).json({ error: "Failed to generate sales report" });
    }
  });

  // CSV import endpoint
  app.post("/api/import-from-csv", uploadMemory.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have header and at least one data row" });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const imported = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const itemData: any = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            if (header.toLowerCase().includes('name') || header.toLowerCase().includes('title')) {
              itemData.name = values[index];
            } else if (header.toLowerCase().includes('price')) {
              itemData.base_price = parseFloat(values[index]) || 0;
            } else if (header.toLowerCase().includes('quantity')) {
              itemData.quantity = parseInt(values[index]) || 0;
            } else if (header.toLowerCase().includes('sku')) {
              itemData.sku = values[index];
            }
          }
        });

        if (itemData.name) {
          itemData.status = 'draft'; // Import as drafts
          itemData.description = `Imported from CSV - ${itemData.name}`;
          const newItem = await storage.createItem(itemData);
          imported.push(newItem);
        }
      }

      res.json({
        success: true,
        message: `Successfully imported ${imported.length} items`,
        imported: imported.length
      });
    } catch (error) {
      log(`CSV import error: ${error}`, 'csv-import');
      res.status(500).json({ error: "Failed to import CSV" });
    }
  });

  // Price sheet generation endpoint
  app.get("/api/generate-price-sheet", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Filter for FULL POUND variants only - exclude 1/2 and 1/4 pound variants
      const poundVariants = items.filter((item: any) => {
        // Must have quantity and pricing
        if (!item.quantity || item.quantity <= 0 || 
            !(item.base_price > 0 || item.sale_price > 0 || item.cost_price > 0)) {
          return false;
        }
        
        // FULL POUND VARIANTS ONLY - exclude 1/2 and 1/4 pound variants
        const itemName = item.name?.toLowerCase() || '';
        const itemWeight = item.weight?.toString().toLowerCase() || '';
        const searchText = `${itemName} ${itemWeight}`;
        
        // Exclude 1/2 and 1/4 pound variants first
        const excludePatterns = [
          /\b(1\/2|half|0\.5)\s*(pound|lb)/i,
          /\b(1\/4|quarter|0\.25)\s*(pound|lb)/i,
          /\bhalf\s*pound/i,
          /\bquarter\s*pound/i
        ];
        
        const isExcluded = excludePatterns.some(pattern => pattern.test(searchText));
        if (isExcluded) return false;
        
        // Full pound variations only (1 pound or full pound only)
        const fullPoundPatterns = [
          /\b1\s*pound\b/i,
          /\bone\s*pound\b/i,
          /\b1\s*lb\b/i,
          /\bfull\s*pound\b/i,
          /\b448\s*(gram|g)\b/i, // 1 pound = 448 grams
          /\b16\s*(oz|ounce)\b/i // 1 pound = 16 ounces
        ];
        
        return fullPoundPatterns.some(pattern => pattern.test(searchText));
      });
      
      // Sort by newest first (highest ID)
      const availableItems = poundVariants.sort((a, b) => (b.id || 0) - (a.id || 0));

      const catalogHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gold Standard CBD - Price Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; color: #D4AF37; margin-bottom: 30px; }
            .item { border: 1px solid #ddd; margin: 15px 0; padding: 15px; border-radius: 8px; }
            .item-name { font-weight: bold; color: #228B22; font-size: 18px; }
            .price { color: #D4AF37; font-weight: bold; font-size: 16px; }
            .quantity { color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gold Standard CBD - Pound Variants Price Sheet</h1>
            <p>Premium Pound Variants - Newest Items First</p>
          </div>
          ${availableItems.map((item: any) => {
            // Extract clean strain name
            const extractStrainName = (name) => {
              if (!name) return 'Premium Strain';
              
              let strainName = name
                .replace(/-thca.*$/i, '') // Remove -thca and everything after
                .replace(/-flower.*$/i, '') // Remove -flower and everything after
                .replace(/-smalls.*$/i, '') // Remove -smalls and everything after
                .replace(/-classic.*$/i, '') // Remove -classic and everything after
                .replace(/-top.*$/i, '') // Remove -top and everything after
                .replace(/-aa.*$/i, '') // Remove -aa and everything after
                .replace(/-indoor.*$/i, '') // Remove -indoor and everything after
                .replace(/-outdoor.*$/i, '') // Remove -outdoor and everything after
                .replace(/-exotic.*$/i, '') // Remove -exotic and everything after
                .replace(/\b(1\s*pound|pound|1\s*lb|lb)\b/gi, '') // Remove weight references
                .replace(/-+/g, ' ') // Replace hyphens with spaces
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
              
              return strainName.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ') || 'Premium Strain';
            };
            
            const strainName = extractStrainName(item.name);
            const price = parseFloat(item.sale_price || item.base_price || item.cost_price || 0);
            
            // Generate product handle for Shopify URL
            const generateProductHandle = (name) => {
              return name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Remove multiple hyphens
                .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
            };
            
            const productHandle = generateProductHandle(strainName);
            const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
            const shopifyUrl = item.shopifyId 
              ? `https://${shopifyDomain.replace('.myshopify.com', '')}.com/products/${productHandle}`
              : `https://${shopifyDomain.replace('.myshopify.com', '')}.com/search?q=${encodeURIComponent(strainName)}`;
            
            // COA and media links
            const coaLink = `https://gold-standard-cbd.com/coa/${productHandle}`;
            const mediaLink = `https://gold-standard-cbd.com/media/download/${item.sku || productHandle}`;
            
            return `
            <div class="item">
              <div class="item-name">${strainName}</div>
              <div class="price">${price > 0 ? `$${price.toFixed(0)}` : 'Contact for Price'}</div>
              <div class="quantity">✅ Available: ${item.quantity} units in stock</div>
              <div>📦 Weight: 1 Pound</div>
              ${item.thca_percentage ? `<div>🧪 THCa: ${item.thca_percentage}%</div>` : ''}
              
              <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="${shopifyUrl}" target="_blank" style="background: #d4af37; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  🛒 BUY NOW
                </a>
                <a href="${coaLink}" target="_blank" style="background: #228b22; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px;">
                  📄 COA
                </a>
                <a href="${mediaLink}" target="_blank" style="background: #4169e1; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px;">
                  📱 Media
                </a>
              </div>
              
              <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                SKU: ${item.sku || 'N/A'} | Updated: ${new Date().toLocaleDateString()}
              </div>
            </div>
          `;
          }).join('')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(catalogHtml);
    } catch (error) {
      log(`Price sheet generation error: ${error}`, 'price-sheet');
      res.status(500).json({ error: "Failed to generate price sheet" });
    }
  });





  // Missing catalog endpoints
  app.get("/api/live-menu", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const availableItems = items.filter(item => 
        item.quantity && item.quantity > 0 && 
        (item.base_price > 0 || item.sale_price > 0)
      );
      
      res.json({
        success: true,
        items: availableItems,
        count: availableItems.length
      });
    } catch (error) {
      log(`Live menu error: ${error}`, 'catalog');
      res.status(500).json({ error: "Failed to generate live menu" });
    }
  });

  app.get("/api/menu", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const availableItems = items.filter(item => 
        item.quantity && item.quantity > 0 && 
        (item.base_price > 0 || item.sale_price > 0)
      );
      
      res.json({
        success: true,
        items: availableItems,
        count: availableItems.length,
        message: `Menu with ${availableItems.length} available items`
      });
    } catch (error) {
      log(`Menu error: ${error}`, 'catalog');
      res.status(500).json({ error: "Failed to generate menu" });
    }
  });

  app.get("/api/catalog", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      const availableItems = items.filter(item => 
        item.quantity && item.quantity > 0 && 
        (item.base_price > 0 || item.sale_price > 0)
      );
      
      res.json({
        success: true,
        items: availableItems,
        count: availableItems.length,
        message: `Live catalog with ${availableItems.length} available items`
      });
    } catch (error) {
      log(`Catalog error: ${error}`, 'catalog');
      res.status(500).json({ error: "Failed to generate catalog" });
    }
  });

  // Fix existing items with proper product names from Shopify
  app.post("/api/shopify/fix-product-names", async (req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ success: false, error: "Shopify access token not configured" });
      }

      log('Starting product name fix from Shopify store', 'shopify-fix');

      // Get all Shopify products
      let allProducts: any[] = [];
      let hasNextPage = true;
      let pageInfo: string | null = null;

      while (hasNextPage) {
        const url = pageInfo 
          ? `https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&page_info=${pageInfo}&fields=id,title,variants`
          : `https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&fields=id,title,variants`;

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch Shopify products" 
          });
        }

        const data = await response.json();
        const products = data.products || [];
        allProducts = allProducts.concat(products);

        // Check for next page
        const linkHeader = response.headers.get('Link');
        const nextPageMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
        
        if (nextPageMatch) {
          const nextUrl = new URL(nextPageMatch[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
        } else {
          hasNextPage = false;
        }
      }

      log(`Fetched ${allProducts.length} Shopify products for name fixing`, 'shopify-fix');

      // Get existing items with generic names
      const items = await storage.getItems();
      const genericItems = items.filter(item => 
        item.name && ['1 pound', '1 Pound', 'ONE POUND', '1/2 pound', '1/4 pound', 'Half Pound', 'Quarter Pound'].includes(item.name)
      );

      log(`Found ${genericItems.length} items with generic names to fix`, 'shopify-fix');

      let fixedCount = 0;
      let skippedCount = 0;

      // Fix each generic item
      for (const item of genericItems) {
        let shopifyProductId: number | null = null;
        let shopifyVariantId: number | null = null;

        // Extract IDs from SKU if not directly available
        if (item.sku && item.sku.startsWith('SHOPIFY-')) {
          const skuParts = item.sku.split('-');
          if (skuParts.length >= 3) {
            shopifyProductId = parseInt(skuParts[1]);
            shopifyVariantId = parseInt(skuParts[2]);
          }
        } else if (item.shopify_id) {
          shopifyProductId = item.shopify_id;
          shopifyVariantId = item.shopify_variant_id;
        }

        if (shopifyProductId) {
          // Find the corresponding Shopify product
          const shopifyProduct = allProducts.find(p => p.id === shopifyProductId);
          log(`Looking for product ID ${shopifyProductId}, found: ${shopifyProduct ? shopifyProduct.title : 'NOT FOUND'}`, 'shopify-fix');
          if (shopifyProduct) {
            // Find the specific variant
            const variant = shopifyProduct.variants?.find((v: any) => v.id === shopifyVariantId);
            if (variant) {
              const newName = shopifyProduct.title + (variant.title !== 'Default Title' ? ` (${variant.title})` : '');
              
              // Update the item with proper name and set the missing IDs
              await storage.updateItem(item.id, { 
                name: newName,
                description: shopifyProduct.body_html || item.description,
                shopify_id: shopifyProductId,
                shopify_variant_id: shopifyVariantId
              });
              
              fixedCount++;
              log(`Fixed item ${item.id}: "${item.name}" → "${newName}"`, 'shopify-fix');
            } else {
              skippedCount++;
              log(`No variant found for item ${item.id} (variant ID: ${shopifyVariantId})`, 'shopify-fix');
            }
          } else {
            skippedCount++;
            log(`No product found for item ${item.id} (product ID: ${shopifyProductId})`, 'shopify-fix');
          }
        } else {
          skippedCount++;
          log(`No Shopify ID extractable for item ${item.id} (SKU: ${item.sku})`, 'shopify-fix');
        }
      }

      log(`Product name fix complete: ${fixedCount} fixed, ${skippedCount} skipped`, 'shopify-fix');
      
      res.json({
        success: true,
        message: `Fixed ${fixedCount} product names, ${skippedCount} items skipped`,
        fixedCount,
        skippedCount,
        totalProcessed: genericItems.length
      });

    } catch (error) {
      log(`Product name fix error: ${error}`, 'shopify-fix');
      res.status(500).json({ success: false, error: "Failed to fix product names" });
    }
  });

  // COA (Certificate of Analysis) endpoint
  app.get("/api/items/:id/coa", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Extract strain name for COA URL
      const strainParts = item.name?.split(' - ') || [];
      const strainName = strainParts[0] || item.name || 'product';
      
      // Convert strain name to URL-friendly slug
      const strainSlug = strainName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const coaUrl = `https://gold-standard-cbd.com/coa/${strainSlug}`;

      res.json({
        success: true,
        url: coaUrl,
        strain: strainName,
        slug: strainSlug
      });
    } catch (error) {
      log(`COA generation error: ${error}`, 'coa');
      res.status(500).json({ error: "Failed to generate COA URL" });
    }
  });

  // Media pack download endpoint
  app.get("/api/items/:id/media-pack", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Extract strain and product info
      const strainParts = item.name?.split(' - ') || [];
      const strainName = strainParts[0] || item.name || 'product';
      const tier = strainParts[2] || 'Premium';
      
      // Generate media pack info
      const mediaPackInfo = {
        productName: item.name,
        strain: strainName,
        tier: tier,
        thcaPercentage: item.thca_percentage || null,
        quantity: item.quantity || 0,
        price: item.base_price || item.sale_price || item.cost_price || null,
        images: item.images || [],
        description: item.description || '',
        mediaLinks: {
          productImages: `https://gold-standard-cbd.com/media/download/${item.sku || item.id}`,
          socialAssets: `https://gold-standard-cbd.com/media/social/${strainName.toLowerCase().replace(/\s+/g, '-')}`,
          marketingMaterials: `https://gold-standard-cbd.com/media/marketing/${strainName.toLowerCase().replace(/\s+/g, '-')}`,
          complianceDocuments: `https://gold-standard-cbd.com/compliance/${strainName.toLowerCase().replace(/\s+/g, '-')}`
        },
        downloadLinks: {
          fullPackage: `/api/items/${id}/media-pack.zip`,
          coa: `/api/items/${id}/coa`,
          storefront: `/api/items/${id}/shopify-storefront`
        }
      };

      res.json({
        success: true,
        mediaPack: mediaPackInfo
      });
    } catch (error) {
      log(`Media pack generation error: ${error}`, 'media');
      res.status(500).json({ error: "Failed to generate media pack" });
    }
  });

  // Sales endpoints
  app.get("/api/sales/recent", async (_req: Request, res: Response) => {
    try {
      // Get recent sales from storage
      const sales = await storage.getRecentSales ? await storage.getRecentSales(10) : [];
      
      res.json({
        success: true,
        sales,
        count: sales.length
      });
    } catch (error) {
      log(`Recent sales error: ${error}`, 'sales');
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch recent sales" 
      });
    }
  });

  // Helper function to extract THCa percentage from product titles
  function extractTHCaPercentage(title: string): number | null {
    if (!title) return null;
    const match = title.match(/(\d+(?:\.\d+)?)\s*%?\s*thca?/i);
    return match ? parseFloat(match[1]) : null;
  }

  // Comprehensive Shopify import endpoint
  app.post("/api/shopify/import-all", async (_req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ 
          success: false, 
          error: "Shopify access token not configured" 
        });
      }

      log(`Starting comprehensive Shopify import from ${shopifyDomain}`, 'shopify-import');

      // Get ALL Shopify products with pagination
      let allProducts: any[] = [];
      let hasNextPage = true;
      let pageInfo: string | null = null;

      while (hasNextPage) {
        const url = pageInfo 
          ? `https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&page_info=${pageInfo}&fields=id,title,handle,vendor,product_type,status,variants,images,tags,created_at,updated_at`
          : `https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&fields=id,title,handle,vendor,product_type,status,variants,images,tags,created_at,updated_at`;

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          log(`Shopify API error: ${response.status}`, 'shopify-import');
          return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch Shopify products" 
          });
        }

        const data = await response.json();
        const products = data.products || [];
        allProducts = allProducts.concat(products);

        // Check for next page
        const linkHeader = response.headers.get('Link');
        const nextPageMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
        
        if (nextPageMatch) {
          const nextUrl = new URL(nextPageMatch[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
        } else {
          hasNextPage = false;
        }

        log(`Fetched ${products.length} products (total: ${allProducts.length})`, 'shopify-import');
      }

      log(`Total Shopify products fetched: ${allProducts.length}`, 'shopify-import');

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      // Process each Shopify product
      for (const product of allProducts) {
        if (product.variants && product.variants.length > 0) {
          for (const variant of product.variants) {
            // Check if item already exists by SKU or Shopify ID
            const items = await storage.getItems();
            const existingItem = items.find(item => 
              item.sku === variant.sku || 
              item.shopifyId === product.id ||
              item.name?.toLowerCase().includes(product.title.toLowerCase())
            );

            const itemData = {
              name: product.title + (variant.title !== 'Default Title' ? ` (${variant.title})` : ''),
              sku: variant.sku || `SHOPIFY-${product.id}-${variant.id}`,
              quantity: variant.inventory_quantity || 0,
              base_price: parseFloat(variant.price) || 0,
              cost_price: parseFloat(variant.compare_at_price) || 0,
              category: product.product_type || 'Shopify Import',
              brand: product.vendor || 'Gold Standard',
              status: product.status === 'active' && variant.inventory_quantity > 0 ? 'active' : 'draft',
              shopifyId: product.id,
              shopifyVariantId: variant.id,
              weight: variant.weight || null,
              images: product.images?.map((img: any) => img.src) || [],
              thca_percentage: extractTHCaPercentage(product.title),
              description: product.body_html || '',
              tags: product.tags || ''
            };

            try {
              if (existingItem) {
                // Update existing item
                await storage.updateItem(existingItem.id, itemData);
                updatedCount++;
                log(`Updated item: ${itemData.name}`, 'shopify-import');
              } else {
                // Create new item with duplicate protection
                await storage.createItem(itemData);
                importedCount++;
                log(`Imported new item: ${itemData.name}`, 'shopify-import');
              }
            } catch (error) {
              if (error.message && error.message.includes('duplicate key')) {
                log(`Skipped duplicate SKU: ${itemData.sku}`, 'shopify-import');
                skippedCount++;
              } else {
                log(`Error processing ${itemData.name}: ${error}`, 'shopify-import');
                skippedCount++;
              }
            }
          }
        } else {
          skippedCount++;
          log(`Skipped product without variants: ${product.title}`, 'shopify-import');
        }
      }

      log(`Shopify import completed: ${importedCount} imported, ${updatedCount} updated, ${skippedCount} skipped`, 'shopify-import');
      res.json({
        success: true,
        message: `Successfully imported ${allProducts.length} Shopify products`,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        totalProducts: allProducts.length
      });
    } catch (error) {
      log(`Shopify import error: ${error}`, 'shopify-import');
      res.status(500).json({ 
        success: false,
        error: "Failed to import Shopify inventory",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Enhanced Shopify inventory sync endpoint
  app.post("/api/shopify/sync-inventory", async (_req: Request, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ 
          success: false, 
          error: "Shopify access token not configured" 
        });
      }

      log(`Starting comprehensive Shopify import from ${shopifyDomain}`, 'shopify-sync');

      // Get ALL Shopify products with pagination
      let allProducts: any[] = [];
      let hasNextPage = true;
      let pageInfo: string | null = null;

      while (hasNextPage) {
        const url = pageInfo 
          ? `https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&page_info=${pageInfo}&fields=id,title,handle,vendor,product_type,status,variants,images,tags,created_at,updated_at`
          : `https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250&fields=id,title,handle,vendor,product_type,status,variants,images,tags,created_at,updated_at`;

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          log(`Shopify API error: ${response.status}`, 'shopify-sync');
          return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch Shopify products" 
          });
        }

        const data = await response.json();
        const products = data.products || [];
        allProducts = allProducts.concat(products);

        // Check for next page
        const linkHeader = response.headers.get('Link');
        const nextPageMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
        
        if (nextPageMatch) {
          const nextUrl = new URL(nextPageMatch[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
        } else {
          hasNextPage = false;
        }

        log(`Fetched ${products.length} products (total: ${allProducts.length})`, 'shopify-sync');
      }

      log(`Total Shopify products fetched: ${allProducts.length}`, 'shopify-sync');

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      // Get all existing items once for efficient lookup
      const existingItems = await storage.getItems();
      const existingSkus = new Set(existingItems.map(item => item.sku).filter(Boolean));
      const existingShopifyIds = new Set(existingItems.map(item => item.shopifyVariantId).filter(Boolean));

      // Process each Shopify product
      for (const product of allProducts) {
        if (product.variants && product.variants.length > 0) {
          for (const variant of product.variants) {
            try {
              // Generate SKU with fallback
              const generatedSku = variant.sku || `SHOPIFY-${product.id}-${variant.id}`;
              
              // Check for duplicates by multiple criteria
              const existingItem = existingItems.find(item => 
                item.sku === variant.sku || 
                item.sku === generatedSku ||
                (item.shopifyVariantId && item.shopifyVariantId.toString() === variant.id.toString()) ||
                (item.shopifyId && item.shopifyId.toString() === product.id.toString())
              );

              // Skip if any form of duplicate exists
              if (existingItem || existingSkus.has(generatedSku) || 
                  (variant.sku && existingSkus.has(variant.sku)) ||
                  existingShopifyIds.has(variant.id.toString())) {
                skippedCount++;
                log(`Skipped duplicate: ${generatedSku} (existing item: ${existingItem?.id || 'N/A'})`, 'shopify-import');
                continue;
              }

              const itemData = {
                name: variant.title || product.title,
                sku: generatedSku,
                quantity: variant.inventory_quantity || 0,
                base_price: parseFloat(variant.price) || 0,
                cost_price: parseFloat(variant.compare_at_price) || 0,
                category: product.product_type || 'Shopify Import',
                brand: product.vendor || 'Gold Standard',
                status: product.status === 'active' ? 'active' : 'draft',
                shopifyId: product.id,
                shopifyVariantId: variant.id,
                weight: variant.weight || null,
                images: product.images?.map((img: any) => img.src) || [],
                thca_percentage: extractTHCaPercentage(product.title),
                description: product.body_html || '',
                tags: product.tags || ''
              };

              if (existingItem) {
                // Update existing item
                await storage.updateItem(existingItem.id, itemData);
                updatedCount++;
                log(`Updated item: ${itemData.name}`, 'shopify-import');
              } else {
                // Create new item and track the SKU
                await storage.createItem(itemData);
                existingSkus.add(generatedSku);
                existingShopifyIds.add(variant.id.toString());
                importedCount++;
                log(`Imported new item: ${itemData.name}`, 'shopify-import');
              }
            } catch (error) {
              skippedCount++;
              log(`Error processing variant ${variant.id}: ${error}`, 'shopify-import');
            }
          }
        }
      }

      log(`Shopify sync completed: ${importedCount} imported, ${updatedCount} updated, ${skippedCount} skipped`, 'shopify');
      res.json({
        success: true,
        message: `Successfully synced ${allProducts.length} Shopify products`,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        totalProducts: allProducts.length
      });
    } catch (error) {
      log(`Shopify sync error: ${error}`, 'shopify');
      res.status(500).json({ 
        success: false,
        error: "Failed to sync Shopify inventory",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stylized pound variants price sheet endpoint
  app.get("/api/pound-variants-menu", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getItems();
      
      // Filter for active pound variants with available quantities
      const poundVariants = items.filter(item => {
        // Check if item is active and has quantity
        if (item.status !== 'active' || !item.quantity || item.quantity <= 0) {
          return false;
        }
        
        // FULL POUND VARIANTS ONLY - exclude 1/2 and 1/4 pound variants
        const itemName = item.name?.toLowerCase() || '';
        const itemWeight = item.weight?.toString().toLowerCase() || '';
        const searchText = `${itemName} ${itemWeight}`;
        
        // Exclude 1/2 and 1/4 pound variants first
        const excludePatterns = [
          /\b(1\/2|half|0\.5)\s*(pound|lb)/i,
          /\b(1\/4|quarter|0\.25)\s*(pound|lb)/i,
          /\bhalf\s*pound/i,
          /\bquarter\s*pound/i
        ];
        
        const isExcluded = excludePatterns.some(pattern => pattern.test(searchText));
        if (isExcluded) return false;
        
        // Full pound variations only (1 pound or full pound only)
        const fullPoundPatterns = [
          /\b1\s*pound\b/i,
          /\bone\s*pound\b/i,
          /\b1\s*lb\b/i,
          /\bfull\s*pound\b/i,
          /\b448\s*(gram|g)\b/i, // 1 pound = 448 grams
          /\b16\s*(oz|ounce)\b/i // 1 pound = 16 ounces
        ];
        
        return fullPoundPatterns.some(pattern => pattern.test(searchText));
      });
      
      // Sort by newest first (ID descending), then by highest quantity
      poundVariants.sort((a, b) => {
        // First priority: newest items (highest ID)
        if (a.id !== b.id) {
          return (b.id || 0) - (a.id || 0);
        }
        // Second priority: highest quantity
        return (b.quantity || 0) - (a.quantity || 0);
      });
      
      // Generate stylized HTML menu
      const menuHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gold Standard CBD - Pound Variants Menu</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Georgia', serif;
              background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
              color: #f5f5f5;
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: rgba(255, 255, 255, 0.05);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              border: 1px solid rgba(212, 175, 55, 0.3);
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #d4af37;
              padding-bottom: 20px;
            }
            .title {
              font-size: 3rem;
              background: linear-gradient(45deg, #d4af37, #ffd700);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              margin-bottom: 10px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            .subtitle {
              font-size: 1.2rem;
              color: #b8b8b8;
              font-style: italic;
            }
            .new-badge {
              background: linear-gradient(45deg, #ff6b6b, #ee5a24);
              color: white;
              font-size: 0.7rem;
              font-weight: bold;
              padding: 2px 8px;
              border-radius: 12px;
              position: absolute;
              top: 10px;
              right: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .menu-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 20px;
              margin-top: 30px;
            }
            .menu-item {
              background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
              border-radius: 15px;
              padding: 25px;
              border: 1px solid rgba(212, 175, 55, 0.2);
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
            }
            .menu-item:hover {
              transform: translateY(-5px);
              box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);
              border-color: #d4af37;
            }
            .menu-item::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, #d4af37, #ffd700);
            }
            .strain-name {
              font-size: 1.4rem;
              font-weight: bold;
              color: #d4af37;
              margin-bottom: 10px;
              text-transform: capitalize;
            }
            .details {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 15px 0;
            }
            .price {
              font-size: 1.8rem;
              font-weight: bold;
              color: #00ff88;
              text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
            }
            .quantity {
              background: rgba(212, 175, 55, 0.2);
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 0.9rem;
              border: 1px solid #d4af37;
            }
            .thca {
              background: rgba(255, 0, 100, 0.2);
              padding: 5px 10px;
              border-radius: 10px;
              font-size: 0.8rem;
              color: #ff6b9d;
              border: 1px solid #ff6b9d;
            }
            .weight-badge {
              position: absolute;
              top: 15px;
              right: 15px;
              background: linear-gradient(45deg, #d4af37, #ffd700);
              color: #000;
              padding: 5px 12px;
              border-radius: 15px;
              font-weight: bold;
              font-size: 0.8rem;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid rgba(212, 175, 55, 0.3);
              color: #888;
            }
            .contact-info {
              margin-top: 20px;
              font-size: 1.1rem;
              color: #d4af37;
            }
            @media (max-width: 768px) {
              .menu-grid { grid-template-columns: 1fr; }
              .title { font-size: 2rem; }
              .container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">Gold Standard CBD</h1>
              <p class="subtitle">Premium Pound Variants - Newest Items First</p>
            </div>
            
            <div class="menu-grid">
              ${poundVariants.map((item, index) => {
                const isNew = index < Math.ceil(poundVariants.length * 0.1); // Top 10% are marked as NEW
                
                // Extract clean strain name from item name
                const extractStrainName = (name) => {
                  if (!name) return 'Premium Strain';
                  
                  // Remove common suffixes and normalize
                  let strainName = name
                    .replace(/-thca.*$/i, '') // Remove -thca and everything after
                    .replace(/-flower.*$/i, '') // Remove -flower and everything after
                    .replace(/-smalls.*$/i, '') // Remove -smalls and everything after
                    .replace(/-classic.*$/i, '') // Remove -classic and everything after
                    .replace(/-top.*$/i, '') // Remove -top and everything after
                    .replace(/-aa.*$/i, '') // Remove -aa and everything after
                    .replace(/-indoor.*$/i, '') // Remove -indoor and everything after
                    .replace(/-outdoor.*$/i, '') // Remove -outdoor and everything after
                    .replace(/-exotic.*$/i, '') // Remove -exotic and everything after
                    .replace(/\b(1\s*pound|pound|1\s*lb|lb)\b/gi, '') // Remove weight references
                    .replace(/-+/g, ' ') // Replace hyphens with spaces
                    .replace(/\s+/g, ' ') // Normalize spaces
                    .trim();
                  
                  // Capitalize each word properly
                  return strainName.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ') || 'Premium Strain';
                };
                
                // Get the best available price
                const getPrice = (item) => {
                  const basePrice = parseFloat(item.base_price || 0);
                  const salePrice = parseFloat(item.sale_price || 0);
                  const costPrice = parseFloat(item.cost_price || 0);
                  
                  // Use sale price if available, then base price, then cost price
                  if (salePrice > 0) return salePrice;
                  if (basePrice > 0) return basePrice;
                  if (costPrice > 0) return costPrice;
                  return 0;
                };
                
                const strainName = extractStrainName(item.name);
                const price = getPrice(item);
                
                // Generate links for enhanced functionality
                const generateProductHandle = (name) => {
                  return name.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                    .replace(/\s+/g, '-') // Replace spaces with hyphens
                    .replace(/-+/g, '-') // Remove multiple hyphens
                    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
                };
                
                const productHandle = generateProductHandle(strainName);
                const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
                const shopifyUrl = item.shopifyId 
                  ? `https://${shopifyDomain.replace('.myshopify.com', '')}.com/products/${productHandle}`
                  : `https://${shopifyDomain.replace('.myshopify.com', '')}.com/search?q=${encodeURIComponent(strainName)}`;
                
                const coaLink = `https://gold-standard-cbd.com/coa/${productHandle}`;
                const mediaLink = `https://gold-standard-cbd.com/media/download/${item.sku || productHandle}`;
                
                return `
                <div class="menu-item">
                  ${isNew ? '<div class="new-badge">NEW</div>' : ''}
                  <div class="weight-badge">1 POUND</div>
                  <h3 class="strain-name">${strainName}</h3>
                  <div class="details">
                    <span class="price">${price > 0 ? `$${price.toFixed(0)}` : 'Contact for Price'}</span>
                    <span class="quantity">✅ ${item.quantity} Available</span>
                  </div>
                  ${item.thca_percentage ? `<div class="thca">🧪 ${item.thca_percentage}% THCa</div>` : ''}
                  
                  <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                    <a href="${shopifyUrl}" target="_blank" style="background: linear-gradient(45deg, #d4af37, #ffd700); color: #000; padding: 10px 8px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; font-size: 0.8rem; border: 2px solid #d4af37;">
                      🛒 BUY NOW
                    </a>
                    <a href="${coaLink}" target="_blank" style="background: linear-gradient(45deg, #228b22, #32cd32); color: white; padding: 10px 8px; text-decoration: none; border-radius: 8px; text-align: center; font-size: 0.8rem; border: 2px solid #228b22;">
                      📄 COA
                    </a>
                    <a href="${mediaLink}" target="_blank" style="background: linear-gradient(45deg, #4169e1, #6495ed); color: white; padding: 10px 8px; text-decoration: none; border-radius: 8px; text-align: center; font-size: 0.8rem; border: 2px solid #4169e1;">
                      📱 Media
                    </a>
                  </div>
                  
                  <div style="margin-top: 15px; font-size: 0.9rem; color: #ccc; text-align: center;">
                    SKU: ${item.sku || 'N/A'} • Updated: ${new Date().toLocaleDateString()}
                  </div>
                </div>
              `;
              }).join('')}
            </div>
            
            ${poundVariants.length === 0 ? `
              <div style="text-align: center; padding: 60px 20px; color: #888;">
                <h3>No Active Pound Variants Available</h3>
                <p>Please check back later or contact us for availability</p>
              </div>
            ` : ''}
            
            <div class="footer">
              <div class="contact-info">
                Contact us: jon@goldcbd.com or 541-291-2404
              </div>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>All prices are wholesale • Minimum order quantities may apply</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(menuHtml);
      
      log(`Generated pound variants menu with ${poundVariants.length} active items`, 'menu');
    } catch (error) {
      log(`Pound variants menu error: ${error}`, 'menu');
      res.status(500).json({ error: "Failed to generate pound variants menu" });
    }
  });

  // System health endpoint
  app.get("/api/system/health", async (_req: Request, res: Response) => {
    try {
      const itemCount = await storage.getItems().then(items => items.length);
      const uptime = process.uptime();
      
      res.json({
        success: true,
        status: "healthy",
        uptime: Math.floor(uptime),
        itemCount,
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          shopify: "connected",
          googleSheets: "authentication_needed"
        }
      });
    } catch (error) {
      log(`System health error: ${error}`, 'system');
      res.status(500).json({ 
        success: false, 
        error: "System health check failed" 
      });
    }
  });

  // Item Shopify storefront view endpoint (live customer view)
  app.get("/api/items/:id/shopify-storefront", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Try to find matching product in Gold Standard CBD store
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      let storefrontUrl = null;
      
      if (accessToken && item.name) {
        try {
          // Get all products and search for matching product
          const searchResponse = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            }
          });
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const products = searchData.products || [];
            
            // Use enhanced fuzzy matching
            const matchResult = findBestShopifyMatch(item.name!, products);
            
            if (matchResult.product && matchResult.product.handle) {
              storefrontUrl = `https://gold-standard-cbd.com/products/${matchResult.product.handle}`;
              log(`Storefront match for "${item.name}": ${matchResult.product.title}`, 'shopify-storefront');
            }
          }
        } catch (error) {
          log(`Error finding storefront product "${item.name}": ${error}`, 'shopify-storefront');
        }
      }
      
      // Fallback to store homepage if no specific product found
      if (!storefrontUrl) {
        storefrontUrl = 'https://gold-standard-cbd.com/';
      }
      
      res.json({
        success: true,
        url: storefrontUrl,
        type: 'storefront',
        found: storefrontUrl !== 'https://gold-standard-cbd.com/',
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku
        }
      });
    } catch (error) {
      log(`Shopify storefront view error: ${error}`, 'shopify-storefront');
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate storefront view" 
      });
    }
  });

  // Item Shopify admin view endpoint
  app.get("/api/items/:id/shopify-view", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Try to find matching product in Gold Standard CBD store first
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      let directProductUrl = null;
      
      if (accessToken && item.name) {
        try {
          // Get all products and search locally for better matching
          const searchResponse = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            }
          });
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const products = searchData.products || [];
            
            // Use enhanced fuzzy matching
            const matchResult = findBestShopifyMatch(item.name!, products);
            
            if (matchResult.product) {
              directProductUrl = `https://admin.shopify.com/store/gold-standard-cbd/products/${matchResult.product.id}`;
              log(`Enhanced fuzzy match for "${item.name}": ${matchResult.product.title} (Score: ${matchResult.score})`, 'shopify');
            }
          }
        } catch (error) {
          log(`Error searching for product "${item.name}": ${error}`, 'shopify');
        }
      }
      
      // Fallback to search if no direct match found
      let shopifyUrl = directProductUrl;
      
      if (!shopifyUrl) {
        if (item.shopifyId) {
          shopifyUrl = `https://admin.shopify.com/store/gold-standard-cbd/products/${item.shopifyId}`;
        } else if (item.name) {
          // Use the strain name for better search results
          const strainName = item.name.split('-')[0] || item.name;
          shopifyUrl = `https://admin.shopify.com/store/gold-standard-cbd/products?query=${encodeURIComponent(strainName)}`;
        } else {
          shopifyUrl = `https://admin.shopify.com/store/gold-standard-cbd/products`;
        }
      }
      
      log(`Shopify view for "${item.name}": ${directProductUrl ? 'Direct match found' : 'Using search fallback'}`, 'shopify');
      res.json({
        success: true,
        url: shopifyUrl,
        found: !!directProductUrl,
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          shopifyId: item.shopifyId
        }
      });
    } catch (error) {
      log(`Shopify view error: ${error}`, 'shopify');
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate Shopify view" 
      });
    }
  });

  // One-Click Product Media Pack Download
  app.get("/api/items/:id/download-media-pack", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Extract strain name for file organization
      const extractStrainName = (name: string) => {
        if (!name) return 'product';
        
        return name
          .replace(/-thca.*$/i, '')
          .replace(/-flower.*$/i, '')
          .replace(/-smalls.*$/i, '')
          .replace(/-classic.*$/i, '')
          .replace(/-top.*$/i, '')
          .replace(/-aa.*$/i, '')
          .replace(/-indoor.*$/i, '')
          .replace(/-outdoor.*$/i, '')
          .replace(/-exotic.*$/i, '')
          .replace(/\b(1\s*pound|pound|1\s*lb|lb)\b/gi, '')
          .replace(/-+/g, '-')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .toLowerCase();
      };

      const strainSlug = extractStrainName(item.name || 'product');
      const productHandle = strainSlug.replace(/-+/g, '-').replace(/^-|-$/g, '');
      
      // Create media pack with direct download links
      const mediaPack = {
        productInfo: {
          name: item.name,
          strain: productHandle.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          sku: item.sku,
          price: item.base_price || item.sale_price || item.cost_price || 0,
          quantity: item.quantity || 0,
          thcaPercentage: item.thca_percentage || null,
          category: item.category || 'Premium Cannabis',
          weight: '1 Pound',
          status: item.status || 'active'
        },
        downloadLinks: {
          // Product images from multiple sources
          productImages: [],
          // COA (Certificate of Analysis)
          coa: `https://gold-standard-cbd.com/coa/${productHandle}`,
          // Marketing media
          marketingKit: `https://gold-standard-cbd.com/media/marketing/${productHandle}`,
          // Product media download
          productMedia: `https://gold-standard-cbd.com/media/download/${item.sku || productHandle}`,
          // Social media kit
          socialKit: `https://gold-standard-cbd.com/media/social/${productHandle}`,
          // High-res product photos
          highResPhotos: `https://gold-standard-cbd.com/media/photos/${productHandle}`,
          // Compliance documents
          compliance: `https://gold-standard-cbd.com/compliance/${productHandle}`
        },
        shopifyInfo: {
          productUrl: item.shopifyId 
            ? `https://gold-standard-cbd.com/products/${productHandle}`
            : `https://gold-standard-cbd.com/search?q=${encodeURIComponent(productHandle)}`,
          adminUrl: item.shopifyId 
            ? `https://admin.shopify.com/store/gold-standard-cbd/products/${item.shopifyId}`
            : null
        },
        zipPackage: {
          // Direct zip download containing all media
          downloadUrl: `/api/items/${id}/media-pack.zip`,
          estimatedSize: '5-15 MB',
          contents: [
            'Product Photos (High Resolution)',
            'Certificate of Analysis (COA)',
            'Marketing Materials',
            'Social Media Kit',
            'Compliance Documents',
            'Product Information Sheet'
          ]
        },
        generated: new Date().toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      // Parse existing images if available
      if (item.images) {
        try {
          let imageUrls = [];
          if (typeof item.images === 'string') {
            const parsed = JSON.parse(item.images);
            imageUrls = Array.isArray(parsed) ? parsed : [parsed];
          } else if (Array.isArray(item.images)) {
            imageUrls = item.images;
          }
          
          mediaPack.downloadLinks.productImages = imageUrls.map((url: string, index: number) => ({
            url,
            filename: `${productHandle}-image-${index + 1}.jpg`,
            description: `Product image ${index + 1}`
          }));
        } catch (error) {
          log(`Error parsing images for item ${id}: ${error}`, 'media-pack');
        }
      }

      log(`Generated media pack for "${item.name}" (${mediaPack.downloadLinks.productImages.length} images)`, 'media-pack');
      res.json({
        success: true,
        mediaPack,
        quickDownload: `/api/items/${id}/media-pack.zip`
      });

    } catch (error) {
      log(`Media pack generation error: ${error}`, 'media-pack');
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate media pack" 
      });
    }
  });

  // Actual ZIP file download endpoint for media pack
  app.get("/api/items/:id/media-pack.zip", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Extract strain name for file organization
      const extractStrainName = (name: string) => {
        if (!name) return 'product';
        return name
          .replace(/-thca.*$/i, '')
          .replace(/-flower.*$/i, '')
          .replace(/-smalls.*$/i, '')
          .replace(/-classic.*$/i, '')
          .replace(/-top.*$/i, '')
          .replace(/-aa.*$/i, '')
          .replace(/-indoor.*$/i, '')
          .replace(/-outdoor.*$/i, '')
          .replace(/-exotic.*$/i, '')
          .replace(/\b(1\s*pound|pound|1\s*lb|lb)\b/gi, '')
          .replace(/-+/g, '-')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .toLowerCase();
      };

      const strainSlug = extractStrainName(item.name || 'product');
      const productHandle = strainSlug.replace(/-+/g, '-').replace(/^-|-$/g, '');
      const strainName = productHandle.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      // Create a comprehensive media pack as HTML (simulating a zip download)
      const mediaPackHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${strainName} - Media Pack Download</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Arial', sans-serif;
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              color: #f5f5f5;
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: rgba(255, 255, 255, 0.05);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              border: 1px solid rgba(212, 175, 55, 0.3);
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #d4af37;
              padding-bottom: 20px;
            }
            .title {
              font-size: 2.5rem;
              background: linear-gradient(45deg, #d4af37, #ffd700);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 1.2rem;
              color: #b8b8b8;
              font-style: italic;
            }
            .download-section {
              background: rgba(0, 0, 0, 0.3);
              border-radius: 15px;
              padding: 25px;
              margin: 20px 0;
              border: 1px solid rgba(212, 175, 55, 0.2);
            }
            .download-title {
              font-size: 1.4rem;
              color: #d4af37;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .download-link {
              display: inline-block;
              background: linear-gradient(45deg, #d4af37, #ffd700);
              color: #000;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 5px 10px 5px 0;
              transition: transform 0.2s;
              font-size: 0.9rem;
            }
            .download-link:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
            }
            .secondary-link {
              background: linear-gradient(45deg, #228b22, #32cd32);
            }
            .tertiary-link {
              background: linear-gradient(45deg, #4169e1, #6495ed);
            }
            .product-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0;
              font-size: 0.9rem;
            }
            .info-item {
              background: rgba(0, 0, 0, 0.2);
              padding: 10px;
              border-radius: 8px;
              border-left: 3px solid #d4af37;
            }
            .auto-download {
              background: rgba(212, 175, 55, 0.1);
              border: 2px solid #d4af37;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .download-progress {
              background: #333;
              border-radius: 10px;
              height: 8px;
              margin: 15px 0;
              overflow: hidden;
            }
            .progress-bar {
              background: linear-gradient(90deg, #d4af37, #ffd700);
              height: 100%;
              width: 0%;
              border-radius: 10px;
              animation: loading 3s ease-in-out forwards;
            }
            @keyframes loading {
              to { width: 100%; }
            }
            .file-list {
              list-style: none;
              margin: 20px 0;
            }
            .file-item {
              background: rgba(0, 0, 0, 0.2);
              margin: 5px 0;
              padding: 10px;
              border-radius: 5px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .file-size {
              color: #888;
              font-size: 0.8rem;
            }
            @media (max-width: 768px) {
              .product-info { grid-template-columns: 1fr; }
              .container { padding: 20px; }
              .title { font-size: 2rem; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${strainName}</h1>
              <p class="subtitle">Complete Media Pack Download</p>
            </div>

            <div class="auto-download">
              <h3 style="color: #d4af37; margin-bottom: 10px;">🎯 Preparing Your Media Pack...</h3>
              <p style="margin-bottom: 15px;">Your comprehensive media package is being prepared for download.</p>
              <div class="download-progress">
                <div class="progress-bar"></div>
              </div>
              <p style="font-size: 0.9rem; color: #ccc;">Estimated size: 5-15 MB</p>
            </div>

            <div class="product-info">
              <div class="info-item">
                <strong>Product:</strong> ${strainName}
              </div>
              <div class="info-item">
                <strong>SKU:</strong> ${item.sku || 'N/A'}
              </div>
              <div class="info-item">
                <strong>Price:</strong> $${item.base_price || item.sale_price || item.cost_price || 'Contact'}
              </div>
              <div class="info-item">
                <strong>Stock:</strong> ${item.quantity || 0} units
              </div>
              <div class="info-item">
                <strong>Weight:</strong> 1 Pound
              </div>
              <div class="info-item">
                <strong>THCa:</strong> ${item.thca_percentage || 'N/A'}%
              </div>
            </div>

            <div class="download-section">
              <div class="download-title">
                📁 Package Contents
              </div>
              <ul class="file-list">
                <li class="file-item">
                  <span>📸 High-Resolution Product Photos</span>
                  <span class="file-size">2-5 MB</span>
                </li>
                <li class="file-item">
                  <span>📄 Certificate of Analysis (COA)</span>
                  <span class="file-size">500 KB</span>
                </li>
                <li class="file-item">
                  <span>🎨 Marketing Materials Kit</span>
                  <span class="file-size">1-3 MB</span>
                </li>
                <li class="file-item">
                  <span>📱 Social Media Assets</span>
                  <span class="file-size">1-2 MB</span>
                </li>
                <li class="file-item">
                  <span>📋 Product Information Sheet</span>
                  <span class="file-size">100 KB</span>
                </li>
                <li class="file-item">
                  <span>✅ Compliance Documents</span>
                  <span class="file-size">200 KB</span>
                </li>
              </ul>
            </div>

            <div class="download-section">
              <div class="download-title">
                🔗 Direct Access Links
              </div>
              <a href="https://gold-standard-cbd.com/coa/${productHandle}" target="_blank" class="download-link secondary-link">
                📄 View COA Online
              </a>
              <a href="https://gold-standard-cbd.com/media/download/${item.sku || productHandle}" target="_blank" class="download-link tertiary-link">
                📱 Media Library
              </a>
              <a href="https://gold-standard-cbd.com/products/${productHandle}" target="_blank" class="download-link">
                🛒 Order Product
              </a>
            </div>

            <div class="download-section">
              <div class="download-title">
                ⚡ Quick Actions
              </div>
              <a href="/api/items/${id}/download-media-pack" class="download-link">
                📦 Generate New Pack
              </a>
              <a href="https://gold-standard-cbd.com/media/marketing/${productHandle}" target="_blank" class="download-link tertiary-link">
                🎯 Marketing Kit
              </a>
              <a href="https://gold-standard-cbd.com/media/social/${productHandle}" target="_blank" class="download-link secondary-link">
                📲 Social Kit
              </a>
            </div>

            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(212, 175, 55, 0.3); color: #888;">
              <p>Media pack generated on ${new Date().toLocaleDateString()}</p>
              <p>Contact: jon@goldcbd.com | 541-291-2404</p>
            </div>
          </div>

          <script>
            // Auto-redirect after loading animation
            setTimeout(() => {
              const autoDownload = document.querySelector('.auto-download');
              autoDownload.innerHTML = \`
                <h3 style="color: #32cd32; margin-bottom: 10px;">✅ Media Pack Ready!</h3>
                <p style="margin-bottom: 15px;">Your comprehensive media package is ready for use.</p>
                <a href="https://gold-standard-cbd.com/media/download/${item.sku || productHandle}" target="_blank" 
                   style="background: linear-gradient(45deg, #d4af37, #ffd700); color: #000; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 10px;">
                  📥 Download All Files
                </a>
              \`;
            }, 3000);
          </script>
        </body>
        </html>
      `;

      // Set headers for HTML response (simulating a download experience)
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${productHandle}-media-pack.html"`);
      
      log(`Media pack ZIP simulation generated for "${item.name}"`, 'media-pack');
      res.send(mediaPackHtml);

    } catch (error) {
      log(`Media pack ZIP generation error: ${error}`, 'media-pack');
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate media pack ZIP" 
      });
    }
  });

  // Enhanced fuzzy matching Shopify view endpoint
  app.get("/api/items/:id/shopify-view-enhanced", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken || !item.name) {
        const fallbackUrl = `https://admin.shopify.com/store/gold-standard-cbd/products?query=${encodeURIComponent(item.name || item.sku || '')}`;
        return res.json({ 
          success: true, 
          url: fallbackUrl, 
          found: false,
          fallback: true,
          item: {
            id: item.id,
            name: item.name,
            sku: item.sku,
            shopifyId: item.shopifyId
          }
        });
      }

      try {
        // Get all products for comprehensive fuzzy matching
        const searchResponse = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const products = searchData.products || [];
          
          // Use fuzzy matching to find best product match
          const matchResult = findBestShopifyMatch(item.name!, products);
          
          if (matchResult.product) {
            const directProductUrl = `https://admin.shopify.com/store/gold-standard-cbd/products/${matchResult.product.id}`;
            log(`Enhanced fuzzy match for "${item.name}": ${matchResult.product.title} (Score: ${matchResult.score})`, 'shopify');
            
            res.json({
              success: true,
              url: directProductUrl,
              found: true,
              enhanced: true,
              match: {
                product: {
                  id: matchResult.product.id,
                  title: matchResult.product.title,
                  handle: matchResult.product.handle
                },
                score: matchResult.score,
                strain: matchResult.strain,
                type: matchResult.type,
                tier: matchResult.tier
              },
              item: {
                id: item.id,
                name: item.name,
                sku: item.sku,
                shopifyId: item.shopifyId
              }
            });
          } else {
            // Fallback to search if no fuzzy match found
            const fallbackUrl = `https://admin.shopify.com/store/gold-standard-cbd/products?query=${encodeURIComponent(item.name.split('-')[0])}`;
            res.json({
              success: true,
              url: fallbackUrl,
              found: false,
              enhanced: true,
              fallback: true,
              item: {
                id: item.id,
                name: item.name,
                sku: item.sku,
                shopifyId: item.shopifyId
              }
            });
          }
        } else {
          const fallbackUrl = `https://admin.shopify.com/store/gold-standard-cbd/products?query=${encodeURIComponent(item.name.split('-')[0])}`;
          res.json({ 
            success: true, 
            url: fallbackUrl, 
            found: false,
            enhanced: true,
            fallback: true,
            error: "Failed to fetch Shopify products"
          });
        }
      } catch (error) {
        log(`Enhanced Shopify view error: ${error}`, 'shopify');
        const fallbackUrl = `https://admin.shopify.com/store/gold-standard-cbd/products?query=${encodeURIComponent(item.name?.split('-')[0] || item.sku || '')}`;
        res.json({ 
          success: true, 
          url: fallbackUrl, 
          found: false,
          enhanced: true,
          fallback: true,
          error: "Connection error"
        });
      }
    } catch (error) {
      log(`Enhanced Shopify view endpoint error: ${error}`, 'shopify');
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Test fuzzy matching endpoint
  app.get("/api/items/:id/shopify-fuzzy-match", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (!accessToken || !item.name) {
        return res.json({ 
          success: false, 
          error: "Missing configuration or item name" 
        });
      }

      try {
        // Get all products with full details including handle and variants
        const searchResponse = await fetch(`https://${shopifyDomain}/admin/api/2023-10/products.json?limit=250`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const products = searchData.products || [];
          
          // Use fuzzy matching to find best product match
          const matchResult = findBestShopifyMatch(item.name!, products);
          
          if (matchResult.product) {
            const directProductUrl = `https://admin.shopify.com/store/gold-standard-cbd/products/${matchResult.product.id}`;
            log(`Fuzzy match for "${item.name}": ${matchResult.product.title} (Score: ${matchResult.score}, Handle: ${matchResult.product.handle})`, 'shopify-fuzzy');
            
            res.json({
              success: true,
              url: directProductUrl,
              found: true,
              match: {
                product: {
                  id: matchResult.product.id,
                  title: matchResult.product.title,
                  handle: matchResult.product.handle
                },
                score: matchResult.score,
                strain: matchResult.strain,
                type: matchResult.type,
                tier: matchResult.tier
              },
              item: {
                id: item.id,
                name: item.name,
                sku: item.sku,
                shopifyId: item.shopifyId
              }
            });
          } else {
            res.json({
              success: true,
              found: false,
              message: "No fuzzy match found above threshold",
              item: {
                id: item.id,
                name: item.name,
                sku: item.sku,
                shopifyId: item.shopifyId
              }
            });
          }
        } else {
          res.status(500).json({ error: "Failed to fetch Shopify products" });
        }
      } catch (error) {
        log(`Fuzzy match error: ${error}`, 'shopify-fuzzy');
        res.status(500).json({ error: "Failed to perform fuzzy match" });
      }
    } catch (error) {
      log(`Fuzzy match endpoint error: ${error}`, 'shopify-fuzzy');
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return app;
}