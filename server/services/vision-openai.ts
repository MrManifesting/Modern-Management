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
    
    // Call OpenAI vision model
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert product identifier for e-commerce. You analyze images and provide detailed product information for marketplace listings."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image in detail. Identify the item, its likely condition, category, and suggest a price. Format your response as structured JSON with these fields: name, description, category, condition, suggestedPrice (number), tags (array), seoTitle, seoDescription."
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
      response_format: { type: "json_object" }
    });

    // Parse the result
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate the result
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