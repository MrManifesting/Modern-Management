import { AIAnalysis } from "@shared/schema";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { analyzeItemDetails } from "./openai";

// Initialize Google Cloud Vision client
let visionClient: ImageAnnotatorClient;

try {
  // Initialize with credentials from environment variables
  visionClient = new ImageAnnotatorClient({
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined
  });
} catch (error) {
  console.error("Error initializing Google Cloud Vision client:", error);
}

/**
 * Analyze an image using Google Cloud Vision and OpenAI
 */
export async function analyzeImage(imageBuffer: Buffer): Promise<AIAnalysis> {
  try {
    // If Vision API client isn't available, return placeholder result
    if (!visionClient) {
      return {
        name: "Unable to analyze image (Vision API not configured)",
        description: "Please configure Google Cloud Vision API to use this feature.",
        category: "Unspecified",
        tags: ["error", "configuration-needed"]
      };
    }

    // Convert buffer to base64
    const imageContent = imageBuffer.toString("base64");

    // Use multiple Vision API features for comprehensive analysis
    const [result] = await visionClient.annotateImage({
      image: {
        content: imageContent
      },
      features: [
        { type: "LABEL_DETECTION", maxResults: 15 },
        { type: "OBJECT_LOCALIZATION", maxResults: 10 },
        { type: "WEB_DETECTION", maxResults: 10 },
        { type: "TEXT_DETECTION" },
        { type: "IMAGE_PROPERTIES" }
      ]
    });

    // Extract meaningful information from Vision API response
    const labels = result.labelAnnotations?.map(label => ({
      description: label.description,
      score: label.score
    })) || [];
    
    const objects = result.localizedObjectAnnotations?.map(obj => ({
      name: obj.name,
      score: obj.score
    })) || [];
    
    const textAnnotations = result.textAnnotations?.[0]?.description || "";
    
    const webEntities = result.webDetection?.webEntities?.map(entity => ({
      description: entity.description,
      score: entity.score
    })) || [];

    // Combine all information for comprehensive analysis
    const analysisText = `
      Labels: ${labels.map(l => l.description).join(", ")}
      
      Objects: ${objects.map(o => o.name).join(", ")}
      
      Text found in image: ${textAnnotations}
      
      Web entities: ${webEntities.map(e => e.description).join(", ")}
    `;

    // Use OpenAI to analyze this information
    const itemDetails = await analyzeItemDetails(analysisText);
    
    return itemDetails;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image");
  }
}
