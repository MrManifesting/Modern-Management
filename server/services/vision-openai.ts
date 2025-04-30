import { AIAnalysis, aiAnalysisSchema } from "@shared/schema";
import OpenAI from "openai";

// Using cost-optimized models as specified
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze an image using OpenAI's vision model with cost-optimized settings
 */
export async function analyzeImageWithOpenAI(imageBuffer: Buffer): Promise<AIAnalysis> {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString("base64");
    
    // First, use vision capabilities to identify the product
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Most cost-effective model with vision capabilities
      messages: [
        {
          role: "system",
          content: "You are an expert e-commerce product analyst. Identify products with extreme precision."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this product image with extreme detail. 

Provide the following in JSON format:
- name: Precise product name with brand and model
- description: Comprehensive description including features, specifications, and material
- category: Specific e-commerce category (use standard marketplace categories)
- condition: Assessment of condition (New, Like New, Good, Fair, etc.) with explanation
- suggestedPrice: Your best estimate of a fair listing price (number only, no currency symbol)
- priceRange: The estimated price range this item typically sells for (e.g. "$45-65")
- marketComparison: Brief notes comparing similar items' prices
- bestMarketplaces: Array of 2-3 platforms where this item would sell best
- tags: Array of relevant search keywords (8-12 terms)
- seoTitle: Optimized listing title (max 80 chars)
- seoDescription: SEO-friendly description (max 250 chars)`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200
    });

    // Parse the result from the vision analysis
    const rawResult = JSON.parse(response.choices[0].message.content || "{}");
    
    // Extract price range text but ensure numeric suggestedPrice for database
    const priceRange = rawResult.priceRange || "";
    const marketComparison = rawResult.marketComparison || "";
    
    // Extract best marketplaces info if available
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

    // Create a modified result to match our schema
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
    
    // Validate the result against our schema
    const validatedResult = aiAnalysisSchema.parse(result);
    
    return validatedResult;
  } catch (error) {
    console.error("Error analyzing image with OpenAI:", error);
    
    // Return a basic response on error
    return {
      name: "Unknown Item",
      description: "Unable to analyze this image. Please try with a clearer photo or enter details manually.",
      category: "Other",
      tags: ["unidentified"]
    };
  }
}