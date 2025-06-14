import sharp from 'sharp';

/**
 * Enhanced image processing service for barcode detection
 * Uses Sharp for sophisticated image manipulation
 */
export class ImageEnhancer {
  
  /**
   * Enhance an image buffer for better barcode detection
   */
  static async enhanceForBarcodeDetection(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Use Sharp for image processing which is more reliable
      const enhanced = sharp(imageBuffer)
        .greyscale()
        .normalize()
        .sharpen()
        .threshold(128, { greyscale: false })
        .png();
      
      return await enhanced.toBuffer();
      
    } catch (error) {
      console.error('Image enhancement failed:', error);
      // Return original buffer if enhancement fails
      return imageBuffer;
    }
  }
  
  /**
   * Create multiple enhanced versions of an image for better detection
   */
  static async createMultipleEnhanced(imageBuffer: Buffer): Promise<Buffer[]> {
    try {
      const variants: Buffer[] = [];
      
      // Original image
      variants.push(imageBuffer);
      
      // High contrast grayscale version
      const highContrast = await sharp(imageBuffer)
        .greyscale()
        .normalize()
        .modulate({ brightness: 1.2, contrast: 2.0 })
        .sharpen()
        .png()
        .toBuffer();
      variants.push(highContrast);
      
      // Binary threshold version
      const binary = await sharp(imageBuffer)
        .greyscale()
        .threshold(100)
        .png()
        .toBuffer();
      variants.push(binary);
      
      // Inverted version (for negative barcodes)
      const inverted = await sharp(imageBuffer)
        .greyscale()
        .negate()
        .normalize()
        .png()
        .toBuffer();
      variants.push(inverted);
      
      // Edge enhanced version
      const edgeEnhanced = await sharp(imageBuffer)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .png()
        .toBuffer();
      variants.push(edgeEnhanced);
      
      return variants;
    } catch (error) {
      console.error('Multiple enhancement failed:', error);
      return [imageBuffer];
    }
  }
}