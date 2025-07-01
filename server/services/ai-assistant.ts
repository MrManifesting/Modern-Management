import OpenAI from "openai";
import { storage } from "../storage.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ConversationContext {
  userId?: number;
  currentInventoryFocus?: any[];
  lastInventoryQuery?: string;
  preferences?: {
    responseStyle?: 'concise' | 'detailed' | 'technical';
    includeRecommendations?: boolean;
    showMetrics?: boolean;
  };
}

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    inventoryItems?: any[];
    actionsTaken?: string[];
    timestamp?: string;
  };
}

export class AIAssistantService {
  private getSystemPrompt(context: ConversationContext): string {
    return `You are an AI assistant for Gold-Standard_Management, a cannabis inventory management system. You help users manage their inventory, analyze products, and provide insights.

CURRENT CONTEXT:
- User ID: ${context.userId || 'Guest'}
- System: Cannabis inventory management for THCA bulk flower and related products
- Store: Gold Standard CBD (gold-standard-cbd.myshopify.com)

CAPABILITIES:
1. INVENTORY MANAGEMENT
   - Search and filter products by strain, weight, tier, pricing
   - Provide stock level insights and recommendations
   - Help with product categorization and organization
   - Assist with bulk operations and breakdown calculations

2. PRODUCT ANALYSIS
   - Analyze product data and suggest improvements
   - Extract strain information, potency, and quality tiers
   - Provide pricing recommendations based on tier and market data
   - Generate product descriptions and marketing content

3. BUSINESS INSIGHTS
   - Identify low stock alerts and reorder recommendations
   - Analyze sales trends and inventory turnover
   - Suggest product bundling and cross-selling opportunities
   - Provide market analysis for pricing optimization

4. OPERATIONAL SUPPORT
   - Help with CSV imports and data formatting
   - Assist with Shopify integration and syncing
   - Guide through system features and workflows
   - Troubleshoot common inventory issues

RESPONSE GUIDELINES:
- Be concise but informative
- Always provide actionable recommendations when relevant
- Reference specific inventory items when discussing products
- Include quantities, pricing, and availability when helpful
- Suggest next steps or follow-up actions
- Use cannabis industry terminology appropriately

CURRENT INVENTORY FOCUS: ${context.currentInventoryFocus?.length || 0} items
LAST QUERY: ${context.lastInventoryQuery || 'None'}

Respond naturally and helpfully to inventory-related questions, providing specific data when available.`;
  }

  async chatWithAssistant(
    messages: AssistantMessage[],
    context: ConversationContext = {}
  ): Promise<{
    response: string;
    tokensUsed: number;
    responseTime: number;
    metadata: any;
  }> {
    const startTime = Date.now();

    try {
      // Enhance context with current inventory data if needed
      const enhancedContext = await this.enhanceContext(context, messages);

      // Prepare messages for OpenAI
      const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.getSystemPrompt(enhancedContext)
        },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content
        }))
      ];

      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: openAIMessages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
      const tokensUsed = completion.usage?.total_tokens || 0;
      const responseTime = Date.now() - startTime;

      return {
        response,
        tokensUsed,
        responseTime,
        metadata: {
          model: "gpt-4o",
          contextItems: enhancedContext.currentInventoryFocus?.length || 0,
          hasInventoryData: !!enhancedContext.currentInventoryFocus?.length
        }
      };

    } catch (error) {
      console.error('AI Assistant error:', error);
      throw new Error(`AI Assistant failed: ${(error as Error).message}`);
    }
  }

  private async enhanceContext(
    context: ConversationContext,
    messages: AssistantMessage[]
  ): Promise<ConversationContext> {
    const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // If the user is asking about inventory, fetch relevant items
    if (this.isInventoryQuery(latestUserMessage)) {
      try {
        const items = await storage.getItems();
        const relevantItems = this.findRelevantInventoryItems(latestUserMessage, items);
        
        return {
          ...context,
          currentInventoryFocus: relevantItems.slice(0, 10), // Limit to 10 most relevant
          lastInventoryQuery: latestUserMessage
        };
      } catch (error) {
        console.error('Error fetching inventory for context:', error);
      }
    }

    return context;
  }

  private isInventoryQuery(message: string): boolean {
    const inventoryKeywords = [
      'inventory', 'stock', 'product', 'strain', 'thca', 'flower',
      'quantity', 'price', 'available', 'pound', 'ounce', 'gram',
      'tier', 'quality', 'search', 'find', 'show', 'list',
      'low stock', 'out of stock', 'reorder', 'bulk'
    ];

    return inventoryKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private findRelevantInventoryItems(query: string, items: any[]): any[] {
    const queryLower = query.toLowerCase();
    
    // Score items based on relevance to the query
    const scoredItems = items.map(item => {
      let score = 0;
      
      // Name matching
      if (item.name?.toLowerCase().includes(queryLower)) score += 10;
      
      // Category matching
      if (item.category?.toLowerCase().includes(queryLower)) score += 5;
      
      // Brand matching
      if (item.brand?.toLowerCase().includes(queryLower)) score += 3;
      
      // Description matching
      if (item.description?.toLowerCase().includes(queryLower)) score += 2;
      
      // Weight matching
      if (item.weight?.toLowerCase().includes(queryLower)) score += 3;
      
      // Prioritize items with stock
      if (item.quantity > 0) score += 2;
      
      // Prioritize active items
      if (item.status === 'active' || item.status === 'available') score += 1;

      return { ...item, relevanceScore: score };
    });

    // Return items sorted by relevance, then by quantity
    return scoredItems
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => {
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return (b.quantity || 0) - (a.quantity || 0);
      });
  }

  async generateInventoryInsights(): Promise<{
    recommendations: string[];
    lowStockAlerts: string[];
    categoryAnalysis: string;
  }> {
    try {
      const items = await storage.getItems();
      const activeItems = items.filter(item => 
        item.status === 'active' || item.status === 'available'
      );

      const prompt = `Analyze this cannabis inventory data and provide insights:

INVENTORY SUMMARY:
- Total items: ${items.length}
- Active items: ${activeItems.length}
- Items with stock: ${items.filter(i => i.quantity > 0).length}

TOP ITEMS BY STOCK:
${items
  .filter(i => i.quantity > 0)
  .sort((a, b) => b.quantity - a.quantity)
  .slice(0, 10)
  .map(item => `- ${item.name}: ${item.quantity} units${item.base_price ? ` @ $${item.base_price}` : ''}`)
  .join('\n')}

LOW STOCK ITEMS (< 10 units):
${items
  .filter(i => i.quantity > 0 && i.quantity < 10)
  .map(item => `- ${item.name}: ${item.quantity} units`)
  .join('\n')}

Provide analysis in JSON format:
{
  "recommendations": ["3-5 actionable business recommendations"],
  "lowStockAlerts": ["items needing immediate attention"],
  "categoryAnalysis": "overview of category performance and trends"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"recommendations": [], "lowStockAlerts": [], "categoryAnalysis": "Analysis pending"}');
      
      return {
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        lowStockAlerts: Array.isArray(result.lowStockAlerts) ? result.lowStockAlerts : [],
        categoryAnalysis: result.categoryAnalysis || "Analysis pending"
      };
    } catch (error) {
      console.error('Failed to generate inventory insights:', error);
      throw new Error('AI inventory analysis failed - check OpenAI API credentials');
    }
  }

  async generateProductDescription(productData: any): Promise<string> {
    const prompt = `Generate a professional product description for this cannabis product:

Product: ${productData.name || 'Cannabis Product'}
Category: ${productData.category || 'Flower'}
Brand: ${productData.brand || 'Gold Standard'}
Weight: ${productData.weight || 'Various'}
Price: ${productData.basePrice ? `$${productData.basePrice}` : 'Contact for pricing'}
Quantity Available: ${productData.quantity || 0}

Create a compelling, professional description that highlights quality, potency, and value. Include relevant details about the strain characteristics, cultivation method, and intended use. Keep it informative but marketing-friendly.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || "Professional cannabis product description.";
    } catch (error) {
      console.error('Failed to generate product description:', error);
      throw new Error('Failed to generate product description');
    }
  }
}

export const aiAssistant = new AIAssistantService();