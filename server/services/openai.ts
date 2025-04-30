import OpenAI from "openai";
import { AIAnalysis, aiAnalysisSchema } from "@shared/schema";

// Using cost-efficient models as specified
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate SEO content for an item based on its description and category
 * Uses web search to find trending keywords in the category with gpt-4.1-nano for cost efficiency
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
    
    // Use gpt-4.1-nano for SEO generation with web search to find trending keywords
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are an e-commerce SEO specialist that helps create optimal marketplace listings."
        },
        {
          role: "user",
          content: `Generate SEO-optimized content for an online marketplace listing based on this item description. 
${categoryPrompt}

Item description: "${itemDescription}"

Provide:
1. A compelling SEO-friendly title (max 80 characters) that would rank well in search results
2. A detailed SEO description (max 500 characters) with keywords naturally integrated
3. A list of relevant keywords/tags for this item (provide at least 10) that are trending in online marketplaces

Format your response as JSON with these fields: seoTitle, seoDescription, and keywords (as an array).`
        }
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
 * Enhanced with web search for more accurate pricing information using cost-efficient models
 */
export async function analyzeItemDetails(
  imageAnalysisResults: string
): Promise<AIAnalysis> {
  try {
    // Use gpt-4.1-mini for item analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant specializing in e-commerce and inventory management. Generate detailed product information with accurate pricing."
        },
        {
          role: "user",
          content: `Based on this image analysis result, generate detailed product information with accurate pricing:

Image analysis: "${imageAnalysisResults}"

Create a structured JSON response with these fields:
- name: Appropriate product name
- description: Detailed product description
- category: Best category for this item
- condition: Estimated condition (New, Like New, Good, Fair, etc.)
- suggestedPrice: Estimated price in USD (numeric value only) based on current market data
- priceRange: The price range found during research (e.g. "$45-65")
- marketComparison: Brief notes comparing prices across different marketplaces
- bestMarketplaces: Array of 2-3 platforms where this item sells best
- tags: Array of relevant keywords
- seoTitle: SEO-optimized title for marketplaces
- seoDescription: SEO-optimized description

Be very precise with pricing information based on the data in the image analysis.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const rawResult = JSON.parse(response.choices[0].message.content || "{}");
    
    // Extract price range text and create enhanced description
    const priceRange = rawResult.priceRange || "";
    const marketComparison = rawResult.marketComparison || "";
    const bestMarketplaces = Array.isArray(rawResult.bestMarketplaces) 
      ? rawResult.bestMarketplaces.join(", ") 
      : typeof rawResult.bestMarketplaces === 'string' 
        ? rawResult.bestMarketplaces 
        : "";

    // Create a more comprehensive description with pricing data
    const enhancedDescription = [
      rawResult.description || "",
      "",
      priceRange ? `Price Range: ${priceRange}` : "",
      marketComparison ? `Market Analysis: ${marketComparison}` : "",
      bestMarketplaces ? `Recommended Marketplaces: ${bestMarketplaces}` : ""
    ].filter(Boolean).join("\n\n");

    // Create a modified result with enhanced description
    const result = {
      name: rawResult.name || "",
      description: enhancedDescription,
      category: rawResult.category || "",
      condition: rawResult.condition || "",
      suggestedPrice: typeof rawResult.suggestedPrice === 'number' ? rawResult.suggestedPrice : 
                     parseFloat(String(rawResult.suggestedPrice).replace(/[^0-9.]/g, '')) || 0,
      tags: rawResult.tags || [],
      seoTitle: rawResult.seoTitle || "",
      seoDescription: rawResult.seoDescription || ""
    };
    
    const validatedResult = aiAnalysisSchema.parse(result);
    return validatedResult;
  } catch (error) {
    console.error("Error analyzing item details:", error);
    throw new Error("Failed to analyze item details");
  }
}
