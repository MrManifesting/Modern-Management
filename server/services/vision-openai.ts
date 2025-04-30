import { AIAnalysis, aiAnalysisSchema } from "@shared/schema";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze an image using OpenAI's vision model
 */
export async function analyzeImageWithOpenAI(imageBuffer: Buffer): Promise<AIAnalysis> {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString("base64");
    
    // Call OpenAI vision model with enhanced prompt for accurate price estimation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert e-commerce product analyst specializing in merchandise valuation and identification.
You have extensive knowledge of current market prices and historical sales data across multiple marketplaces including eBay, Amazon, Etsy, and Shopify.

Your analysis MUST include:
1. Precise item identification with brand, model, and specific features
2. Accurate price estimation based on REAL current market data with EXACT figures (not rough estimates or ranges)
3. Price range showing low-high values from actual recent completed sales (use format like "$45-65")
4. Condition assessment based on visual inspection with clear reasoning
5. Specific marketplace recommendations based on where this exact item category sells best
6. SEO-optimized title and description that would maximize marketplace visibility
7. Brief market comparison showing prices of comparable listings across different platforms

IMPORTANT PRICING INSTRUCTIONS:
- Always provide PRECISE pricing based on ACTUAL MARKET DATA, not approximations
- For price ranges, use format like "$20-30" based on REAL sales data
- When comparing prices, mention exact figures from specific marketplaces (e.g., "Similar items sell for $25-35 on eBay, $30-45 on Amazon")
- Include factors that affect price (condition, rarity, demand, etc.)
- suggestedPrice should be the OPTIMAL listing price to maximize profit while ensuring timely sale`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this product image with extreme detail.

Provide the following in JSON format:
- name: Precise product name with brand and model (if visible)
- description: Comprehensive description including features, specifications, and material
- category: Specific e-commerce category (use standard marketplace categories)
- condition: Assessment of condition (New, Like New, Good, Fair, etc.) with explanation
- suggestedPrice: The OPTIMAL listing price based on real market data (number only, no currency symbol)
- priceRange: The actual price range this item sells for online (e.g. "$45-65")
- marketComparison: Brief notes on similar items' actual selling prices on marketplaces
- bestMarketplaces: Array of 2-3 platforms where this item would sell best
- tags: Array of relevant search keywords (8-12 terms)
- seoTitle: Optimized listing title (max 80 chars)
- seoDescription: SEO-friendly description (max 250 chars)

YOUR ANALYSIS MUST BE BASED ON REAL MARKET DATA - NOT ESTIMATES. Use your extensive knowledge of current prices.`
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

    // Parse the result
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