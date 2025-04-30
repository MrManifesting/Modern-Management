import sharp from 'sharp';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define optimization options interface
interface OptimizationOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  generateAltText?: boolean;
}

// Define optimization result interface
interface OptimizationResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  compressionRatio: number;
  altText?: string;
}

// Define SEO analysis result interface
interface SEOAnalysisResult {
  score: number;
  size: {
    bytes: number;
    formattedSize: string;
    recommendation: string;
  };
  format: {
    current: string;
    recommended: string;
    reason: string;
  };
  dimensions: {
    width: number;
    height: number;
    recommendation: string;
  };
  altText?: string;
  suggestedAltText?: string;
  suggestedFilename?: string;
  lazyLoadingCode?: string;
  improvementSuggestions: string[];
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Generate alt text using OpenAI's Vision model
 */
export async function generateAltText(imageBuffer: Buffer): Promise<string> {
  try {
    // Convert the buffer to a base64-encoded string
    const base64Image = imageBuffer.toString('base64');

    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. 
    // do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at writing accessible, SEO-friendly alt text for product images. Keep descriptions concise (under 125 characters), factual, and descriptive, focusing on key product features. Avoid phrases like 'image of' or 'picture of'."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Generate SEO-friendly alt text for this product image. Make it concise but descriptive."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 100,
    });

    return response.choices[0].message.content?.trim() || "Product image";
  } catch (error) {
    console.error("Error generating alt text:", error);
    return "Product image";
  }
}

/**
 * Optimize an image with the given options
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  // Get original image size
  const originalSize = imageBuffer.byteLength;
  
  // Get image metadata
  let metadata;
  try {
    metadata = await sharp(imageBuffer).metadata();
  } catch (error) {
    throw new Error(`Failed to process image: ${error.message}`);
  }

  // Default optimization options
  const format = options.format || 'webp';
  const quality = options.quality !== undefined ? options.quality : 80;
  const fit = options.fit || 'contain';
  
  // Set up the sharp pipeline
  let pipeline = sharp(imageBuffer);
  
  // Resize if dimensions are provided
  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: fit,
      withoutEnlargement: true
    });
  }
  
  // Convert to the specified format with quality settings
  if (format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality });
  } else if (format === 'png') {
    pipeline = pipeline.png({ quality });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  } else if (format === 'avif') {
    pipeline = pipeline.avif({ quality });
  }
  
  // Process the image
  const outputBuffer = await pipeline.toBuffer({ resolveWithObject: true });
  
  // Get final size
  const finalSize = outputBuffer.data.byteLength;
  
  // Generate alt text if requested
  let altText;
  if (options.generateAltText) {
    altText = await generateAltText(imageBuffer);
  }
  
  return {
    buffer: outputBuffer.data,
    format: format,
    width: outputBuffer.info.width,
    height: outputBuffer.info.height,
    size: finalSize,
    originalSize: originalSize,
    compressionRatio: Math.round((1 - (finalSize / originalSize)) * 100),
    altText
  };
}

/**
 * Analyze image for SEO optimization potential
 */
export async function analyzeSEOPotential(imageBuffer: Buffer): Promise<SEOAnalysisResult> {
  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const size = imageBuffer.byteLength;
  
  // Determine current format
  const currentFormat = metadata.format || 'unknown';
  
  // Generate recommendations
  const improvementSuggestions: string[] = [];
  
  // Check file size
  let sizeRecommendation = "Size is good for web use";
  let sizeScore = 1;
  
  if (size > 500 * 1024) { // Larger than 500KB
    sizeRecommendation = "Image is too large. Compress to under 200KB for optimal page load speed.";
    improvementSuggestions.push("Reduce file size through compression.");
    sizeScore = 0.3;
  } else if (size > 200 * 1024) { // Larger than 200KB
    sizeRecommendation = "Image could be smaller. Aim for under 200KB for faster loading.";
    improvementSuggestions.push("Consider further compression for faster loading.");
    sizeScore = 0.7;
  }
  
  // Check format
  let formatRecommendation = currentFormat;
  let formatReason = "Current format is suitable for web use";
  let formatScore = 1;
  
  if (!['webp', 'avif'].includes(currentFormat.toLowerCase())) {
    formatRecommendation = "webp";
    formatReason = "WebP offers superior compression with high quality. AVIF is even better but has less browser support.";
    improvementSuggestions.push("Convert to WebP format for better compression.");
    formatScore = 0.5;
  }
  
  // Check dimensions
  let dimensionRecommendation = "Dimensions are appropriate";
  let dimensionScore = 1;
  
  if ((metadata.width || 0) > 2000 || (metadata.height || 0) > 2000) {
    dimensionRecommendation = "Image dimensions are too large. Resize to max 1200px on the longest side.";
    improvementSuggestions.push("Resize image to more appropriate dimensions for web use.");
    dimensionScore = 0.4;
  } else if ((metadata.width || 0) < 600 && (metadata.height || 0) < 600) {
    dimensionRecommendation = "Image dimensions may be too small for high-DPI displays. Consider using larger images.";
    improvementSuggestions.push("Consider using larger dimensions for high-quality display on modern devices.");
    dimensionScore = 0.8;
  }
  
  // Generate sample lazy loading code
  const lazyLoadingCode = `<img src="image.${formatRecommendation}" 
  alt="Product description" 
  loading="lazy" 
  width="${metadata.width}" 
  height="${metadata.height}" />`;
  
  // Calculate overall score
  const overallScore = Math.round(((sizeScore + formatScore + dimensionScore) / 3) * 100);
  
  return {
    score: overallScore,
    size: {
      bytes: size,
      formattedSize: formatBytes(size),
      recommendation: sizeRecommendation
    },
    format: {
      current: currentFormat,
      recommended: formatRecommendation,
      reason: formatReason
    },
    dimensions: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      recommendation: dimensionRecommendation
    },
    lazyLoadingCode,
    improvementSuggestions,
    suggestedFilename: `optimized-product-image.${formatRecommendation}`
  };
}