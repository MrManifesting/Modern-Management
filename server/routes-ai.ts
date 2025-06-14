/**
 * Routes for AI-powered features
 * These routes expose OpenAI capabilities for product analysis and inventory insights
 */

import { Request, Response, Express } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { log } from './vite';
import { 
  analyzeProductImage, 
  generateProductDescription, 
  suggestListingImprovements,
  analyzeInventoryData
} from './services/openai';
import { IStorage } from './storage';
import { ImageEnhancer } from './services/image-enhancer';

// Configure multer for file uploads
// Use import.meta.url to get the current module's URL
const moduleURL = new URL(import.meta.url);
// Convert the URL to a path and resolve relative to it
const uploadDir = path.resolve(path.dirname(moduleURL.pathname), '../uploads');
// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Register AI routes
 */
export function registerAIRoutes(app: Express, storage: IStorage) {
  
  // Check if OpenAI API is configured
  app.get('/api/ai/status', (_req: Request, res: Response) => {
    const isConfigured = !!process.env.OPENAI_API_KEY;
    res.json({
      configured: isConfigured,
      message: isConfigured 
        ? 'OpenAI API is properly configured' 
        : 'OpenAI API key is missing. Add OPENAI_API_KEY to environment variables.'
    });
  });
  
  // Analyze product image and extract details with enhanced barcode detection
  app.post('/api/ai/analyze-image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No image file uploaded' 
        });
      }
      
      log(`Processing enhanced image analysis for ${req.file.originalname}`, 'ai-routes');
      
      // Read the original file
      const originalBuffer = fs.readFileSync(req.file.path);
      
      // Try multiple enhancement techniques for better barcode detection
      try {
        const enhancedVariants = await ImageEnhancer.createMultipleEnhanced(originalBuffer);
        log(`Created ${enhancedVariants.length} enhanced image variants`, 'ai-routes');
        
        let bestResult = null;
        let extractedText = '';
        
        // Try analyzing each enhanced variant
        for (let i = 0; i < enhancedVariants.length; i++) {
          try {
            const base64Image = enhancedVariants[i].toString('base64');
            const analysis = await analyzeProductImage(base64Image);
            
            // Check if this variant extracted more text
            if (analysis.extractedText && analysis.extractedText.length > extractedText.length) {
              bestResult = analysis;
              extractedText = analysis.extractedText;
              log(`Variant ${i + 1} extracted better text: "${extractedText.substring(0, 50)}..."`, 'ai-routes');
            }
          } catch (variantError) {
            console.warn(`Analysis failed for variant ${i + 1}:`, variantError);
            continue;
          }
        }
        
        // If no enhanced variants worked, try the original
        if (!bestResult) {
          log('Enhanced variants failed, trying original image', 'ai-routes');
          const base64Image = originalBuffer.toString('base64');
          bestResult = await analyzeProductImage(base64Image);
        }
        
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        
        // Add debugging info about enhancement
        const result = {
          ...bestResult,
          debug: {
            variantsProcessed: enhancedVariants.length,
            enhancementUsed: !!extractedText,
            originalFileSize: originalBuffer.length,
            extractedTextLength: extractedText.length
          }
        };
        
        res.json(result);
        
      } catch (enhancementError) {
        log(`Image enhancement failed, falling back to original: ${enhancementError}`, 'ai-routes');
        
        // Fallback to original image if enhancement fails
        const base64Image = originalBuffer.toString('base64');
        const analysis = await analyzeProductImage(base64Image);
        
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        
        res.json({
          ...analysis,
          debug: {
            enhancementFailed: true,
            fallbackUsed: true
          }
        });
      }
      
    } catch (error: any) {
      log(`Error in image analysis: ${error.message}`, 'ai-routes-error');
      
      // Clean up file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        success: false, 
        error: `Error processing image: ${error.message}` 
      });
    }
  });
  
  // Generate product description based on details
  app.post('/api/ai/generate-description', async (req: Request, res: Response) => {
    try {
      const { productName, category, features } = req.body;
      
      if (!productName || !category) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: productName and category are required'
        });
      }
      
      log(`Generating description for ${productName}`, 'ai-routes');
      
      const result = await generateProductDescription(
        productName,
        category,
        features || []
      );
      
      res.json(result);
    } catch (error: any) {
      log(`Error generating description: ${error.message}`, 'ai-routes-error');
      res.status(500).json({
        success: false,
        error: `Error generating description: ${error.message}`
      });
    }
  });
  
  // Suggest improvements for product listings
  app.post('/api/ai/suggest-improvements', async (req: Request, res: Response) => {
    try {
      const { productName, description, category, price } = req.body;
      
      if (!productName || !description || !category || price === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: productName, description, category, and price are required'
        });
      }
      
      log(`Generating listing improvements for ${productName}`, 'ai-routes');
      
      const result = await suggestListingImprovements(
        productName,
        description,
        category,
        parseFloat(price)
      );
      
      res.json(result);
    } catch (error: any) {
      log(`Error suggesting improvements: ${error.message}`, 'ai-routes-error');
      res.status(500).json({
        success: false,
        error: `Error suggesting improvements: ${error.message}`
      });
    }
  });
  
  // Analyze inventory data for insights
  app.get('/api/ai/inventory-insights', async (_req: Request, res: Response) => {
    try {
      // Get all inventory items
      const items = await storage.getItems();
      
      if (!items || items.length === 0) {
        return res.json({
          success: true,
          insights: ['No inventory data available for analysis.'],
          recommendations: ['Add inventory items to receive AI-powered insights.'],
          trendingCategories: []
        });
      }
      
      log(`Analyzing inventory data (${items.length} items)`, 'ai-routes');
      
      const result = await analyzeInventoryData(items);
      
      res.json(result);
    } catch (error: any) {
      log(`Error analyzing inventory: ${error.message}`, 'ai-routes-error');
      res.status(500).json({
        success: false,
        error: `Error analyzing inventory: ${error.message}`
      });
    }
  });
  
  // Analyze a specific item and suggest improvements
  app.get('/api/ai/item-analysis/:id', async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid item ID'
        });
      }
      
      // Get the item
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }
      
      log(`Analyzing item: ${item.name} (ID: ${itemId})`, 'ai-routes');
      
      // Generate improved listing
      const improvements = await suggestListingImprovements(
        item.name,
        item.description,
        item.category,
        item.basePrice
      );
      
      res.json({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          category: item.category,
          description: item.description
        },
        analysis: improvements
      });
    } catch (error: any) {
      log(`Error analyzing item: ${error.message}`, 'ai-routes-error');
      res.status(500).json({
        success: false,
        error: `Error analyzing item: ${error.message}`
      });
    }
  });
}