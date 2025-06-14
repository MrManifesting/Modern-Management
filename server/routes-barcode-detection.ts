import type { Express, Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { GoogleAuth } from "google-auth-library";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Configure multer for image uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Enhanced barcode detection routes
 */
export function registerBarcodeDetectionRoutes(app: Express) {
  
  // Enhanced barcode detection endpoint
  app.post("/api/barcode/detect", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: "No image file provided" 
        });
      }

      console.log(`Processing barcode detection for file: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Process image with Sharp for better detection
      const processedImageBuffer = await sharp(req.file.buffer)
        .greyscale()
        .normalize()
        .sharpen()
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .png()
        .toBuffer();

      console.log(`Image processed, new size: ${processedImageBuffer.length} bytes`);

      // Try multiple detection methods
      const detectionResults = await Promise.allSettled([
        detectWithGoogleVision(processedImageBuffer),
        detectWithPatternMatching(processedImageBuffer),
        detectWithOCR(processedImageBuffer)
      ]);

      console.log(`Detection methods completed: ${detectionResults.length} results`);

      // Collect all detected codes
      const detectedCodes: string[] = [];
      const methods: string[] = [];

      detectionResults.forEach((result, index) => {
        const methodNames = ['Google Vision', 'Pattern Matching', 'OCR Analysis'];
        if (result.status === 'fulfilled' && result.value) {
          detectedCodes.push(...result.value);
          methods.push(methodNames[index]);
          console.log(`${methodNames[index]} detected: ${result.value.join(', ')}`);
        } else if (result.status === 'rejected') {
          console.log(`${methodNames[index]} failed:`, result.reason);
        }
      });

      // Remove duplicates and filter valid codes
      const uniqueCodes = [...new Set(detectedCodes)]
        .filter(code => code && code.length >= 6)
        .sort((a, b) => b.length - a.length); // Prefer longer codes

      console.log(`Final detected codes: ${uniqueCodes.join(', ')}`);

      if (uniqueCodes.length > 0) {
        return res.json({
          success: true,
          detectedCodes: uniqueCodes,
          primaryCode: uniqueCodes[0],
          detectionMethods: methods,
          confidence: uniqueCodes.length > 1 ? 'high' : 'medium'
        });
      } else {
        return res.json({
          success: false,
          error: "No barcode detected in image",
          suggestion: "Try taking a clearer photo with better lighting or use manual entry"
        });
      }

    } catch (error) {
      console.error("Barcode detection error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to process image for barcode detection",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

}

/**
 * Google Vision API barcode detection
 */
async function detectWithGoogleVision(imageBuffer: Buffer): Promise<string[]> {
  try {
    // Check if Google Vision credentials are available
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
      console.log("Google Vision not configured, skipping");
      return [];
    }

    const client = new ImageAnnotatorClient();
    const [result] = await client.textDetection({
      image: { content: imageBuffer }
    });

    const detections = result.textAnnotations || [];
    const codes: string[] = [];

    // Look for barcode patterns in detected text
    detections.forEach(detection => {
      if (detection.description) {
        const text = detection.description;
        // Common barcode patterns: UPC, EAN, Code128, etc.
        const barcodePatterns = [
          /\b\d{12,14}\b/g, // UPC/EAN patterns
          /\b[A-Z0-9]{8,}\b/g, // Alphanumeric codes
          /\b\d{8,}\b/g // Numeric codes
        ];

        barcodePatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            codes.push(...matches);
          }
        });
      }
    });

    return codes;
  } catch (error) {
    console.log("Google Vision detection failed:", error);
    return [];
  }
}

/**
 * Pattern matching barcode detection
 */
async function detectWithPatternMatching(imageBuffer: Buffer): Promise<string[]> {
  try {
    // Convert to base64 for client-side processing simulation
    const base64 = imageBuffer.toString('base64');
    
    // Simulate basic pattern detection
    // In a real implementation, this would use image processing libraries
    // to detect barcode patterns directly from the image
    
    return []; // Placeholder - would implement actual pattern detection
  } catch (error) {
    console.log("Pattern matching failed:", error);
    return [];
  }
}

/**
 * OCR-based text extraction and analysis
 */
async function detectWithOCR(imageBuffer: Buffer): Promise<string[]> {
  try {
    // Use existing analyze-image endpoint logic
    const sharp_instance = sharp(imageBuffer);
    const metadata = await sharp_instance.metadata();
    
    // Extract text-like regions that could be barcodes
    const codes: string[] = [];
    
    // This is a simplified version - would integrate with OCR library
    // For now, return empty to avoid errors
    return codes;
  } catch (error) {
    console.log("OCR detection failed:", error);
    return [];
  }
}