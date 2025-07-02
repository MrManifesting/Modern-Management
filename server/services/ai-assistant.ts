import OpenAI from "openai";
import { logger } from '../utils/logger.js';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class AIAssistant {
  private context: string;

  constructor(context = "cannabis inventory management") {
    this.context = context;
  }

  async chat(message: string, systemPrompt?: string): Promise<string> {
    try {
      const defaultSystemPrompt = `You are an expert AI assistant for cannabis inventory management. 
      You help with product categorization, weight extraction, inventory optimization, and business insights.
      
      Current context: ${this.context}
      
      Be helpful, accurate, and professional. Focus on cannabis industry best practices.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt || defaultSystemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.3
      });

      return response.choices[0].message.content || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      logger.error(`AI Assistant error: ${error}`, 'ai-assistant');
      return "I'm experiencing technical difficulties. Please try again.";
    }
  }

  async analyzeProduct(productName: string, shopifyData?: any): Promise<any> {
    try {
      const prompt = `Analyze this cannabis product and extract key information:

Product Name: "${productName}"
Shopify Data: ${shopifyData ? JSON.stringify(shopifyData, null, 2) : 'Not available'}

Please provide analysis in JSON format with:
- strain: extracted strain name
- weight: precise weight classification
- quality_tier: quality level (Exotic, Top Shelf, AA Indoor, etc.)
- category: product type (flower, concentrate, edible, etc.)
- thca_percentage: if mentioned
- confidence: confidence score 0-1 for accuracy
- recommendations: business insights

Respond with valid JSON only.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a cannabis product analysis expert. Extract precise information and provide business insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      logger.error(`Product analysis error: ${error}`, 'ai-assistant');
      return {
        error: "Analysis failed",
        strain: "Unknown",
        weight: "Not specified",
        confidence: 0
      };
    }
  }

  async optimizeInventory(inventoryData: any[]): Promise<any> {
    try {
      const summary = {
        totalItems: inventoryData.length,
        totalValue: inventoryData.reduce((sum, item) => sum + (parseFloat(item.base_price || '0') * parseFloat(item.quantity || '0')), 0),
        categories: inventoryData.reduce((acc, item) => {
          const category = item.category || 'Unknown';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {}),
        lowStock: inventoryData.filter(item => parseFloat(item.quantity || '0') < 10).length
      };

      const prompt = `Analyze this cannabis inventory and provide optimization recommendations:

Inventory Summary:
${JSON.stringify(summary, null, 2)}

Sample Items:
${JSON.stringify(inventoryData.slice(0, 10), null, 2)}

Provide JSON response with:
- inventory_health: overall assessment
- recommendations: array of actionable insights
- priority_actions: most important next steps
- market_insights: business opportunities
- risk_factors: potential issues to address`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a cannabis business optimization expert. Analyze inventory data and provide strategic recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      logger.error(`Inventory optimization error: ${error}`, 'ai-assistant');
      return {
        error: "Optimization analysis failed",
        inventory_health: "Unable to assess",
        recommendations: []
      };
    }
  }
}

export const aiAssistant = new AIAssistant();