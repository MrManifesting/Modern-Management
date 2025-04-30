import { AIAnalysis, aiAnalysisSchema } from "@shared/schema";
import OpenAI from "openai";

// Use cost-optimized models as specified
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
    
    // Using gpt-4.1-mini model with gpt-4o-mini-search-preview for web search
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      tools: [{ 
        type: "web_search_preview",
        search_context_size: "low" // Use low context size to reduce costs while still getting accurate pricing
      }],
      tool_choice: { type: "web_search_preview" }, // Force using web search to ensure more accurate pricing data
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `You are an expert e-commerce product analyst. Analyze this product image with extreme detail and use web search to find CURRENT market pricing data.

I need accurate pricing information based on REAL market data, specifically:
1. Precise item identification with brand and model
2. Current market price ranges from actual, RECENT completed sales
3. Specific marketplace recommendations where this item sells best
4. Detailed price comparisons across different platforms

Provide the following in JSON format:
- name: Precise product name with brand and model
- description: Comprehensive description including features, specifications, and material
- category: Specific e-commerce category (use standard marketplace categories)
- condition: Assessment of condition (New, Like New, Good, Fair, etc.) with explanation
- suggestedPrice: The OPTIMAL listing price based on real market data (number only, no currency symbol)
- priceRange: The actual price range this item sells for online (e.g. "$45-65")
- marketComparison: Brief notes on similar items' actual selling prices on marketplaces
- bestMarketplaces: Array of 2-3 platforms where this item would sell best
- tags: Array of relevant search keywords (8-12 terms)
- seoTitle: Optimized listing title (max 80 chars)
- seoDescription: SEO-friendly description (max 250 chars)`
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the result from the new response structure
    const rawResult = JSON.parse(response.output_text || "{}");
    
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