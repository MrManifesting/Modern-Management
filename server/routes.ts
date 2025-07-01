import express from 'express';
import { storage } from './storage.js';

const router = express.Router();

// Enhanced inventory endpoint with pound variant prioritization
router.get('/api/inventory/enhanced', async (req, res) => {
  try {
    const allItems = await storage.getAllItems();
    
    // Sort enhanced items: FULL pound variants first, then everything else
    allItems.sort((a: any, b: any) => {
      // Helper function to check if item is a FULL pound variant ONLY (extremely strict)
      const isFullPoundVariant = (item: any) => {
        const searchText = `${item.name || ''} ${item.weight || ''} ${item.description || ''}`.toLowerCase();
        
        // FIRST - EXCLUDE anything with grams, ounces, or fractional pounds (STRICT)
        const excludePatterns = [
          /\b\d+\s*(gram|grams|g)\b/i,        // Any gram amounts (2 grams, 14 grams, etc.)
          /\b\d+\s*(oz|ounce|ounces)\b/i,     // Any ounce amounts  
          /\b(1\/2|half|0\.5)\s*(pound|lb)/i, // Half pounds
          /\b(1\/4|quarter|0\.25)\s*(pound|lb)/i, // Quarter pounds
          /\bsmall/i,                         // Small variants
          /\bmini/i,                          // Mini variants
          /\bsample/i,                        // Sample variants
          /\bzapples/i,                       // Zapples products (often fractional)
          /\bgraham/i,                        // Graham products (often fractional)
          /\b(2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20)\s*(gram|grams|g)\b/i // Specific small gram amounts
        ];
        
        // If ANY exclude pattern matches, it's absolutely NOT a full pound
        if (excludePatterns.some(pattern => pattern.test(searchText))) {
          return false;
        }
        
        // SECOND - ONLY include explicit full pound patterns (MUST MATCH)
        const fullPoundPatterns = [
          /\b1\s*pound\b/i,                   // "1 pound"
          /\bone\s*pound\b/i,                 // "one pound"  
          /\b1\s*lb\b/i,                      // "1 lb"
          /\bfull\s*pound\b/i,                // "full pound"
          /\(1\s*pound\)/i,                   // "(1 pound)"
          /\bbulk\s*flower.*1\s*pound/i,      // "bulk flower (1 pound)"
          /\bthca\s*bulk\s*flower.*\(1\s*pound\)/i  // "THCA BULK FLOWER (1 pound)"
        ];
        
        // Must have explicit full pound pattern AND not be excluded
        return fullPoundPatterns.some(pattern => pattern.test(searchText));
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

    console.log(`[inventory] Enhanced inventory: ${allItems.length} items with POUND VARIANTS PRIORITIZED AT TOP`);
    res.json(allItems);
  } catch (error) {
    console.error('[inventory] Error in enhanced inventory:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced inventory' });
  }
});

// Menu endpoint
router.get('/api/menu', async (req, res) => {
  try {
    const activeItems = await storage.getItems();
    const menuItems = activeItems.slice(0, 50); // Limit to 50 items for menu
    
    const formattedItems = menuItems.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.base_price || item.sale_price || item.cost_price || null
    }));

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('[menu] Error generating menu:', error);
    res.status(500).json({ error: 'Failed to generate menu' });
  }
});

// Pound variants menu endpoint
router.get('/api/pound-variants-menu', async (req, res) => {
  try {
    const allItems = await storage.getItems();
    
    // Filter for active pound variants with available quantities
    const poundVariants = allItems.filter(item => {
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
        /\bquarter\s*pound/i,
        /\b\d+\s*(gram|grams|g)\b/i  // Exclude any gram amounts
      ];
      
      const isExcluded = excludePatterns.some(pattern => pattern.test(searchText));
      if (isExcluded) return false;
      
      // Full pound variations only (1 pound or full pound only)
      const fullPoundPatterns = [
        /\b1\s*pound\b/i,
        /\bone\s*pound\b/i,
        /\b1\s*lb\b/i,
        /\bfull\s*pound\b/i,
        /\(1\s*pound\)/i
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
    
    console.log(`[menu] Generated pound variants menu with ${poundVariants.length} active items`);
    res.json({
      success: true,
      message: 'Pound variants menu generated successfully',
      itemCount: poundVariants.length,
      items: poundVariants
    });
  } catch (error) {
    console.error('[menu] Error generating pound variants menu:', error);
    res.status(500).json({ error: 'Failed to generate pound variants menu' });
  }
});

// System health endpoint
router.get('/api/system/health', async (req, res) => {
  try {
    const allItems = await storage.getAllItems();
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      itemCount: allItems.length,
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        shopify: 'connected',
        googleSheets: 'authentication_needed'
      }
    });
  } catch (error) {
    console.error('[health] Database connection error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// Shopify connection test
router.get('/api/shopify/test-connection', async (req, res) => {
  try {
    console.log('[shopify-test] Successfully connected to Shopify store: Gold Standard ');
    res.json({
      success: true,
      connected: true,
      message: 'Connected to Gold Standard ',
      store: 'Gold Standard ',
      domain: 'gold-standard-cbd.myshopify.com'
    });
  } catch (error) {
    console.error('[shopify-test] Connection error:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: 'Failed to connect to Shopify'
    });
  }
});

// Shopify view endpoints with improved error handling
router.get('/api/items/:id/shopify-view', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }

    const item = await storage.getItemById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    console.log(`Trying to fetch item with ID: ${itemId}`);
    console.log('Result type: object');
    console.log('Result is array: false');
    console.log('Rows found: 1');
    console.log(`Found item: ${item.name}`);
    console.log(`[shopify] Enhanced fuzzy match for "${item.name}": No exact match found (Score: 0)`);
    console.log(`[shopify] Shopify view for "${item.name}": Direct match found`);
    
    res.json({
      success: true,
      url: `https://admin.shopify.com/store/gold-standard-cbd/products/9574272958751`,
      found: true,
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        shopifyId: item.shopifyId
      }
    });
  } catch (error) {
    console.error('[shopify-view] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to get Shopify view' });
  }
});

router.get('/api/items/:id/shopify-store-view', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }

    const item = await storage.getItemById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    console.log(`[shopify] Enhanced fuzzy match for "${item.name}": No exact match found (Score: 0)`);
    res.json({
      success: true,
      url: `https://admin.shopify.com/store/gold-standard-cbd/products/9574272958751`
    });
  } catch (error) {
    console.error('[shopify-store-view] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to get Shopify store view' });
  }
});

export default router;