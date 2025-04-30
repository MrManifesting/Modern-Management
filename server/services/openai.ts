import OpenAI from "openai";
import { AIAnalysis, aiAnalysisSchema } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-openai-key",
});

/**
 * Generate SEO content for an item based on its description and category
 */
export async function generateSEOContent(
  itemDescription: string,
  category?: string
): Promise<{
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
}> {
  try {
    const categoryPrompt = category ? `The item is in the "${category}" category.` : "";
    
    const prompt = `
      Generate SEO-optimized content for an online marketplace listing based on this item description. 
      ${categoryPrompt}
      
      Item description: "${itemDescription}"
      
      Please provide:
      1. A compelling SEO-friendly title (max 80 characters)
      2. A detailed SEO description (max 500 characters)
      3. A list of relevant keywords/tags for this item (provide at least 8)
      
      Format your response as JSON with these fields: seoTitle, seoDescription, and keywords (as an array).
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an e-commerce SEO specialist that helps create optimal marketplace listings.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      seoTitle: result.seoTitle || "",
      seoDescription: result.seoDescription || "",
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
    };
  } catch (error) {
    console.error("Error generating SEO content:", error);
    throw new Error("Failed to generate SEO content");
  }
}

/**
 * Analyze an item based on image analysis results and generate detailed product information
 */
export async function analyzeItemDetails(
  imageAnalysisResults: string
): Promise<AIAnalysis> {
  try {
    const prompt = `
      Based on this image analysis result, generate detailed product information:
      
      Image analysis: "${imageAnalysisResults}"
      
      Create a structured JSON response with these fields:
      - name: Appropriate product name
      - description: Detailed product description
      - category: Best category for this item
      - condition: Estimated condition (New, Like New, Good, Fair, etc.)
      - suggestedPrice: Estimated price in USD (numeric value only)
      - tags: Array of relevant keywords
      - seoTitle: SEO-optimized title for marketplaces
      - seoDescription: SEO-optimized description
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant specializing in e-commerce and inventory management.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const validatedResult = aiAnalysisSchema.parse(result);
    
    return validatedResult;
  } catch (error) {
    console.error("Error analyzing item details:", error);
    throw new Error("Failed to analyze item details");
  }
}
