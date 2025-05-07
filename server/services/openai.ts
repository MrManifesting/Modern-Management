/**
 * OpenAI Service Integration
 * This service provides image analysis and content generation capabilities for Inventory Pro
 */

import OpenAI from "openai";
import { log } from "../vite";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyze product image and extract key details
 * 
 * @param base64Image Base64-encoded image data
 * @returns Object containing extracted product details
 */
export async function analyzeProductImage(base64Image: string): Promise<{
  success: boolean;
  description?: string;
  suggestedCategory?: string;
  features?: string[];
  error?: string;
}> {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      log("OpenAI API key is missing", "openai-error");
      return {
        success: false,
        error: "OpenAI API key is not configured. Please add your OPENAI_API_KEY to environment variables."
      };
    }

    log("Analyzing product image with OpenAI Vision API", "openai");

    // Call the OpenAI API with the image
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a product analysis expert for an inventory management system. Extract detailed product information from images."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and extract the following information: 1) Detailed product description, 2) Suggested product category, 3) List of key product features or attributes. Format your response as JSON with keys 'description', 'suggestedCategory', and 'features' (as an array)."
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
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content);
    
    log("Successfully analyzed product image", "openai");
    
    return {
      success: true,
      description: result.description || "",
      suggestedCategory: result.suggestedCategory || "",
      features: result.features || []
    };
  } catch (error: any) {
    log(`Error analyzing image: ${error.message}`, "openai-error");
    return {
      success: false,
      error: `Error analyzing image: ${error.message}`
    };
  }
}

/**
 * Generate product descriptions based on key details
 * 
 * @param productName Product name
 * @param category Product category
 * @param features Key product features/specifications
 * @returns Generated product description
 */
export async function generateProductDescription(
  productName: string,
  category: string,
  features: string[]
): Promise<{ success: boolean; description?: string; error?: string }> {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      log("OpenAI API key is missing", "openai-error");
      return {
        success: false,
        error: "OpenAI API key is not configured. Please add your OPENAI_API_KEY to environment variables."
      };
    }

    log(`Generating description for product: ${productName}`, "openai");

    const featuresText = features.join(", ");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional product description writer for an e-commerce platform. Create compelling, detailed product descriptions."
        },
        {
          role: "user",
          content: `Write a professional and compelling product description for the following:
            Product Name: ${productName}
            Category: ${category}
            Features: ${featuresText}
            
            The description should be 2-3 paragraphs long, highlight key selling points, and be written in a professional tone.`
        }
      ],
      max_tokens: 500
    });

    const description = response.choices[0].message.content;
    
    log("Successfully generated product description", "openai");
    
    return {
      success: true,
      description
    };
  } catch (error: any) {
    log(`Error generating description: ${error.message}`, "openai-error");
    return {
      success: false,
      error: `Error generating description: ${error.message}`
    };
  }
}

/**
 * Suggest improvements for a product listing based on current information
 * 
 * @param productName Product name
 * @param description Current product description
 * @param category Product category
 * @param price Product price
 * @returns Suggestions for improving the product listing
 */
export async function suggestListingImprovements(
  productName: string,
  description: string,
  category: string,
  price: number
): Promise<{
  success: boolean;
  suggestions?: string[];
  improvedTitle?: string;
  improvedDescription?: string;
  error?: string;
}> {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      log("OpenAI API key is missing", "openai-error");
      return {
        success: false,
        error: "OpenAI API key is not configured. Please add your OPENAI_API_KEY to environment variables."
      };
    }

    log(`Analyzing and improving listing for product: ${productName}`, "openai");

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an e-commerce optimization expert who helps improve product listings to maximize conversions and SEO performance."
        },
        {
          role: "user",
          content: `Analyze and suggest improvements for this product listing:
            Current Title: ${productName}
            Current Description: ${description}
            Category: ${category}
            Price: $${price.toFixed(2)}
            
            Provide the following in JSON format:
            1. A list of suggestions for improving the listing
            2. An improved product title
            3. An improved product description`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content);
    
    log("Successfully generated listing improvements", "openai");
    
    return {
      success: true,
      suggestions: result.suggestions || [],
      improvedTitle: result.improvedTitle || "",
      improvedDescription: result.improvedDescription || ""
    };
  } catch (error: any) {
    log(`Error generating listing improvements: ${error.message}`, "openai-error");
    return {
      success: false,
      error: `Error generating listing improvements: ${error.message}`
    };
  }
}

/**
 * Analyze inventory data to provide insights and suggestions
 * 
 * @param inventoryData Array of inventory items with sales and stock data
 * @returns Analysis results and suggestions
 */
export async function analyzeInventoryData(inventoryData: any[]): Promise<{
  success: boolean;
  insights?: string[];
  recommendations?: string[];
  trendingCategories?: string[];
  error?: string;
}> {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      log("OpenAI API key is missing", "openai-error");
      return {
        success: false,
        error: "OpenAI API key is not configured. Please add your OPENAI_API_KEY to environment variables."
      };
    }

    // Prepare inventory data for analysis (limit to essential fields)
    const simplifiedData = inventoryData.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      stock: item.currentStock,
      sales: item.totalSales || 0,
      price: item.basePrice,
      lastRestocked: item.lastRestockDate
    }));

    log(`Analyzing inventory data (${inventoryData.length} items)`, "openai");

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an inventory management and retail analytics expert. Analyze inventory data to provide actionable business insights."
        },
        {
          role: "user",
          content: `Analyze this inventory data and provide insights and recommendations:
            ${JSON.stringify(simplifiedData)}
            
            Provide the following in JSON format:
            1. Key insights about inventory performance
            2. Actionable recommendations for inventory optimization
            3. Trending categories based on sales data`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content);
    
    log("Successfully analyzed inventory data", "openai");
    
    return {
      success: true,
      insights: result.insights || [],
      recommendations: result.recommendations || [],
      trendingCategories: result.trendingCategories || []
    };
  } catch (error: any) {
    log(`Error analyzing inventory data: ${error.message}`, "openai-error");
    return {
      success: false,
      error: `Error analyzing inventory data: ${error.message}`
    };
  }
}