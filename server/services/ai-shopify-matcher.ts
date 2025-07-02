import OpenAI from "openai";
import { logger } from '../utils/logger.js';
import { shopifyGraphQL } from './shopify-graphql.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ShopifyMatchResult {
  success: boolean;
  confidence: number;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  shopifyHandle?: string;
  reasoning: string;
  matchedProduct?: any;
  suggestions?: string[];
}

export class AIShopifyMatcher {
  
  async findBestShopifyMatch(inventoryItem: any): Promise<ShopifyMatchResult> {
    try {
      // First, get all Shopify products for comparison
      const shopifyProducts = await shopifyGraphQL.getAllProducts();
      
      if (!shopifyProducts || shopifyProducts.length === 0) {
        return {
          success: false,
          confidence: 0,
          reasoning: "No Shopify products available for matching"
        };
      }

      // Use AI to analyze and find the best match
      const analysisPrompt = `You are an expert at matching cannabis inventory items to Shopify products.

INVENTORY ITEM TO MATCH:
Name: "${inventoryItem.name}"
SKU: "${inventoryItem.sku}"
Weight: "${inventoryItem.weight}"
Category: "${inventoryItem.category}"
Description: "${inventoryItem.description || 'N/A'}"

AVAILABLE SHOPIFY PRODUCTS:
${shopifyProducts.slice(0, 20).map((product: any) => `
- ID: ${product.id}
- Title: ${product.title}
- Handle: ${product.handle}
- Variants: ${product.variants?.edges?.map((v: any) => `${v.node.title} (${v.node.sku})`).join(', ') || 'N/A'}
`).join('')}

Please analyze and find the best matching Shopify product. Consider:
1. Strain name similarity (most important)
2. Weight/size matching
3. Product type/category
4. SKU patterns
5. Title variations

Respond with JSON containing:
{
  "bestMatchId": "shopify_product_id_or_null",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "alternativeMatches": ["id1", "id2"],
  "suggestions": ["improvement suggestions"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a cannabis product matching expert. Analyze inventory items and find their best Shopify product matches with high accuracy."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const aiAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Find the matched product details
      let matchedProduct = null;
      if (aiAnalysis.bestMatchId) {
        matchedProduct = shopifyProducts.find((p: any) => p.id === aiAnalysis.bestMatchId);
      }

      // Get variant information if product is found
      let variantId = null;
      let handle = null;
      if (matchedProduct) {
        handle = matchedProduct.handle;
        // Try to find best variant match
        const firstVariant = matchedProduct.variants?.edges?.[0]?.node;
        if (firstVariant) {
          variantId = firstVariant.id;
        }
      }

      const result: ShopifyMatchResult = {
        success: !!aiAnalysis.bestMatchId,
        confidence: aiAnalysis.confidence || 0,
        shopifyProductId: aiAnalysis.bestMatchId,
        shopifyVariantId: variantId,
        shopifyHandle: handle,
        reasoning: aiAnalysis.reasoning || "AI analysis completed",
        matchedProduct: matchedProduct,
        suggestions: aiAnalysis.suggestions || []
      };

      logger.info(`AI Shopify match for "${inventoryItem.name}": ${result.confidence} confidence`, 'ai-shopify-matcher');
      
      return result;

    } catch (error) {
      logger.error(`AI Shopify matching error: ${error}`, 'ai-shopify-matcher');
      return {
        success: false,
        confidence: 0,
        reasoning: `Matching failed: ${error.message}`
      };
    }
  }

  async batchMatchInventoryItems(items: any[]): Promise<{ [itemId: string]: ShopifyMatchResult }> {
    const results: { [itemId: string]: ShopifyMatchResult } = {};
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        const match = await this.findBestShopifyMatch(item);
        results[item.id] = match;
        return match;
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async enhanceInventoryWithShopifyLinks(items: any[]): Promise<any[]> {
    try {
      const matchResults = await this.batchMatchInventoryItems(items);
      
      return items.map(item => {
        const match = matchResults[item.id];
        
        return {
          ...item,
          shopifyMatch: match,
          shopifyProductId: match?.shopifyProductId,
          shopifyVariantId: match?.shopifyVariantId,
          shopifyHandle: match?.shopifyHandle,
          shopifyUrl: match?.shopifyHandle ? 
            `https://gold-standard-cbd.myshopify.com/products/${match.shopifyHandle}` : null,
          matchConfidence: match?.confidence || 0
        };
      });
      
    } catch (error) {
      logger.error(`Batch inventory enhancement error: ${error}`, 'ai-shopify-matcher');
      return items; // Return original items if enhancement fails
    }
  }
}

export const aiShopifyMatcher = new AIShopifyMatcher();