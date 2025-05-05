import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyze an image and provide a detailed description
 */
export async function analyzeImage(base64Image: string): Promise<string> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image in detail and provide a concise description of what you see. Include key product features, colors, and packaging elements."
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
      max_tokens: 300,
    });

    return visionResponse.choices[0].message.content || "No analysis available";
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    throw new Error(`Error analyzing image: ${error.message}`);
  }
}

/**
 * Generate SEO-optimized product descriptions based on product data and image analysis
 */
export async function generateProductDescription(
  productName: string, 
  category: string, 
  existingDescription: string = "", 
  imageAnalysis: string = ""
): Promise<string> {
  try {
    const prompt = `
    Write a concise, SEO-friendly product description for the following product:
    
    Product Name: ${productName}
    Category: ${category}
    ${existingDescription ? `Existing Description: ${existingDescription}` : ''}
    ${imageAnalysis ? `Image Analysis: ${imageAnalysis}` : ''}
    
    The description should be 2-3 paragraphs, highlight key features, benefits, and use cases.
    Use a professional but conversational tone suitable for e-commerce. 
    Do not invent specific features that aren't mentioned in the provided information.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional product description writer specializing in e-commerce content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error generating product description:", error);
    throw new Error(`Error generating product description: ${error.message}`);
  }
}

/**
 * Analyze inventory data and provide insights and recommendations
 */
export async function analyzeInventoryData(inventoryData: any[]): Promise<{
  insights: string[];
  recommendations: string[];
}> {
  try {
    // Convert inventory data to a string representation
    const inventoryString = JSON.stringify(
      inventoryData.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        lastSold: item.lastSold
      }))
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an inventory management specialist providing actionable insights and recommendations."
        },
        {
          role: "user",
          content: `Analyze this inventory data and provide key insights and recommendations:
          ${inventoryString}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      insights: result.insights || [],
      recommendations: result.recommendations || []
    };
  } catch (error: any) {
    console.error("Error analyzing inventory data:", error);
    return {
      insights: ["Error analyzing inventory data"],
      recommendations: ["Check API key and try again"]
    };
  }
}