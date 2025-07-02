import OpenAI from "openai";
import { Logger } from '../utils/logger.js';

const logger = new Logger();
const log = (message: string, context = 'ai-weight-extractor') => logger.log(message, 'info', context);

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WeightExtractionResult {
  weight: string;
  confidence: number;
  reasoning: string;
  category: 'gram' | 'ounce' | 'pound' | 'count' | 'unknown';
}

export class AIWeightExtractor {
  
  async extractWeightFromProductName(productName: string, shopifyData?: any): Promise<WeightExtractionResult> {
    try {
      // If we have real Shopify weight data, use it first
      if (shopifyData?.variants?.edges?.[0]?.node?.weight && shopifyData?.variants?.edges?.[0]?.node?.weightUnit) {
        const weight = shopifyData.variants.edges[0].node.weight;
        const unit = shopifyData.variants.edges[0].node.weightUnit.toLowerCase();
        
        const shopifyWeight = this.formatShopifyWeight(weight, unit);
        if (shopifyWeight.weight !== 'unknown') {
          log(`Using authentic Shopify weight data: ${shopifyWeight.weight}`, 'shopify-weight');
          return {
            weight: shopifyWeight.weight,
            confidence: 0.95,
            reasoning: 'Extracted from authentic Shopify weight data',
            category: shopifyWeight.category
          };
        }
      }

      // Use AI for intelligent parsing when Shopify data isn't available or clear
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a cannabis product weight extraction expert. Extract the exact weight from product names.

CRITICAL RULES:
1. 2 GRAM products should return "2 grams" - NOT "1 pound"  
2. Half gram products should return "half gram"
3. Only return "pound" weights if the name explicitly contains "pound", "bulk flower", or "book flower"
4. Be very specific - do not make assumptions
5. Cannabis industry terminology: eighth = 3.5g, quarter ounce = 7g, half ounce = 14g, ounce = 28g

Return JSON with: weight, confidence (0-1), reasoning, category (gram/ounce/pound/count/unknown)`
          },
          {
            role: "user",
            content: `Extract weight from this cannabis product name: "${productName}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        weight: result.weight || 'Weight not specified',
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'AI extraction',
        category: result.category || 'unknown'
      };

    } catch (error) {
      log(`AI weight extraction error: ${error}`, 'error');
      
      // Fallback to basic parsing only for obvious cases
      return this.basicWeightFallback(productName);
    }
  }

  private formatShopifyWeight(weight: number, unit: string): { weight: string; category: WeightExtractionResult['category'] } {
    if (unit === 'grams' || unit === 'g') {
      if (weight >= 453.592) { // 1 pound in grams
        const pounds = Math.round(weight / 453.592 * 4) / 4; // Round to quarter pounds
        return { weight: `${pounds} pound${pounds !== 1 ? 's' : ''}`, category: 'pound' };
      } else if (weight >= 28) { // 1 ounce in grams
        const ounces = Math.round(weight / 28 * 4) / 4; // Round to quarter ounces
        return { weight: `${ounces} ounce${ounces !== 1 ? 's' : ''}`, category: 'ounce' };
      } else {
        return { weight: `${weight}g`, category: 'gram' };
      }
    } else if (unit === 'ounces' || unit === 'oz') {
      if (weight >= 16) { // 1 pound in ounces
        const pounds = Math.round(weight / 16 * 4) / 4;
        return { weight: `${pounds} pound${pounds !== 1 ? 's' : ''}`, category: 'pound' };
      } else {
        return { weight: `${weight} ounce${weight !== 1 ? 's' : ''}`, category: 'ounce' };
      }
    } else if (unit === 'pounds' || unit === 'lb') {
      return { weight: `${weight} pound${weight !== 1 ? 's' : ''}`, category: 'pound' };
    }
    
    return { weight: 'unknown', category: 'unknown' };
  }

  private basicWeightFallback(productName: string): WeightExtractionResult {
    const nameLower = productName.toLowerCase();
    
    // Only return obvious gram amounts
    if (nameLower.includes('2 gram')) return { weight: '2 grams', confidence: 0.8, reasoning: 'Basic text match', category: 'gram' };
    if (nameLower.includes('3 gram')) return { weight: '3 grams', confidence: 0.8, reasoning: 'Basic text match', category: 'gram' };
    if (nameLower.includes('half gram')) return { weight: 'half gram', confidence: 0.8, reasoning: 'Basic text match', category: 'gram' };
    
    // Only return obvious pound indicators
    if (nameLower.includes('bulk flower') || nameLower.includes('book flower')) {
      return { weight: '1 pound', confidence: 0.7, reasoning: 'Bulk flower indicator', category: 'pound' };
    }
    
    return { 
      weight: 'Weight not specified', 
      confidence: 0.0, 
      reasoning: 'No clear weight indicators found', 
      category: 'unknown' 
    };
  }
}