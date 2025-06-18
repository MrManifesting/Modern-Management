/**
 * Advanced SKU Generation Service
 * Generates SKUs in format: [STRAIN-3-LETTERS]-[TIER-ABBREV]-[POTENCY%]-[SEQUENCE]
 * Example: BD-TS-3400-1 for Blue Dream, Top Shelf, 34%, first item
 */

export class SKUGenerator {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  /**
   * Extract first 3 letters from strain name
   */
  private getStrainAbbreviation(name: string): string {
    // Remove common words and get strain name
    const strainName = name
      .replace(/\b(flower|bud|strain|cannabis|thca|hemp)\b/gi, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .trim();
    
    // Split into words and take first significant word
    const words = strainName.split(/\s+/).filter(word => word.length > 2);
    const primaryWord = words[0] || strainName;
    
    // Take first 3 letters, uppercase
    return primaryWord.substring(0, 3).toUpperCase();
  }

  /**
   * Get tier abbreviation
   */
  private getTierAbbreviation(tier: string): string {
    const tierMap: { [key: string]: string } = {
      'top shelf': 'TS',
      'topshelf': 'TS',
      'top-shelf': 'TS',
      'premium': 'PR',
      'mid shelf': 'MS',
      'midshelf': 'MS',
      'mid-shelf': 'MS',
      'bottom shelf': 'BS',
      'bottomshelf': 'BS',
      'bottom-shelf': 'BS',
      'budget': 'BU',
      'regular': 'RG',
      'standard': 'ST',
      'house': 'HO',
      'value': 'VA'
    };

    const lowerTier = tier.toLowerCase().trim();
    return tierMap[lowerTier] || 'RG'; // Default to Regular
  }

  /**
   * Extract potency percentage from description or name
   */
  private getPotencyPercentage(item: any): string {
    // Look for percentage in name, description, or potency field
    const searchText = `${item.name || ''} ${item.description || ''} ${item.potency || ''}`;
    
    // Match patterns like "34%", "34.5%", "THCa 34%", etc.
    const potencyMatch = searchText.match(/(\d+(?:\.\d+)?)\s*%/);
    
    if (potencyMatch) {
      const percentage = parseFloat(potencyMatch[1]);
      // Format as 2-digit number (34% becomes 3400, 25.5% becomes 2550)
      return Math.round(percentage * 100).toString().padStart(4, '0');
    }
    
    // Default potency if not found
    return '0000';
  }

  /**
   * Get tier from item quality field or category
   */
  private getItemTier(item: any): string {
    const quality = item.quality || item.tier || item.grade || '';
    const category = item.category || '';
    const description = item.description || '';
    
    const searchText = `${quality} ${category} ${description}`.toLowerCase();
    
    if (searchText.includes('top shelf') || searchText.includes('topshelf') || searchText.includes('premium')) {
      return 'top shelf';
    } else if (searchText.includes('mid shelf') || searchText.includes('midshelf') || searchText.includes('mid')) {
      return 'mid shelf';
    } else if (searchText.includes('bottom shelf') || searchText.includes('bottomshelf') || searchText.includes('budget')) {
      return 'bottom shelf';
    }
    
    return 'regular'; // Default tier
  }

  /**
   * Get next sequence number for a strain-tier-potency combination
   */
  private async getNextSequenceNumber(strainAbbrev: string, tierAbbrev: string, potency: string): Promise<number> {
    try {
      // Get all items with similar SKU pattern
      const allItems = await this.storage.getItems();
      const skuPrefix = `${strainAbbrev}-${tierAbbrev}-${potency}`;
      
      // Find existing SKUs with this pattern
      const existingSKUs = allItems
        .filter((item: any) => item.sku && item.sku.startsWith(skuPrefix))
        .map((item: any) => item.sku);
      
      // Extract sequence numbers
      const sequenceNumbers = existingSKUs
        .map((sku: string) => {
          const parts = sku.split('-');
          if (parts.length >= 4) {
            const lastPart = parts[parts.length - 1];
            return parseInt(lastPart) || 0;
          }
          return 0;
        })
        .filter((num: number) => num > 0);
      
      // Return next available number
      if (sequenceNumbers.length === 0) {
        return 1;
      }
      
      return Math.max(...sequenceNumbers) + 1;
    } catch (error) {
      console.error('Error getting sequence number:', error);
      return 1;
    }
  }

  /**
   * Generate SKU for a single item
   */
  async generateSKU(item: any): Promise<string> {
    const strainAbbrev = this.getStrainAbbreviation(item.name || '');
    const tier = this.getItemTier(item);
    const tierAbbrev = this.getTierAbbreviation(tier);
    const potency = this.getPotencyPercentage(item);
    const sequence = await this.getNextSequenceNumber(strainAbbrev, tierAbbrev, potency);
    
    return `${strainAbbrev}-${tierAbbrev}-${potency}-${sequence}`;
  }

  /**
   * Generate multiple SKUs for quantity > 1
   */
  async generateMultipleSKUs(item: any, quantity: number): Promise<string[]> {
    const strainAbbrev = this.getStrainAbbreviation(item.name || '');
    const tier = this.getItemTier(item);
    const tierAbbrev = this.getTierAbbreviation(tier);
    const potency = this.getPotencyPercentage(item);
    const startSequence = await this.getNextSequenceNumber(strainAbbrev, tierAbbrev, potency);
    
    const skus: string[] = [];
    for (let i = 0; i < quantity; i++) {
      skus.push(`${strainAbbrev}-${tierAbbrev}-${potency}-${startSequence + i}`);
    }
    
    return skus;
  }

  /**
   * Clear all existing SKUs and regenerate for all items
   */
  async regenerateAllSKUs(): Promise<{ updated: number; errors: any[] }> {
    try {
      const allItems = await this.storage.getItems();
      let updated = 0;
      const errors: any[] = [];
      
      console.log(`[sku-generator] Starting SKU regeneration for ${allItems.length} items`);
      
      // Clear all existing SKUs first
      for (const item of allItems) {
        try {
          await this.storage.updateItem(item.id, { sku: null });
        } catch (error) {
          console.error(`Error clearing SKU for item ${item.id}:`, error);
        }
      }
      
      // Group items by strain-tier-potency to ensure proper sequencing
      const itemGroups: { [key: string]: any[] } = {};
      
      for (const item of allItems) {
        const strainAbbrev = this.getStrainAbbreviation(item.name || '');
        const tier = this.getItemTier(item);
        const tierAbbrev = this.getTierAbbreviation(tier);
        const potency = this.getPotencyPercentage(item);
        const groupKey = `${strainAbbrev}-${tierAbbrev}-${potency}`;
        
        if (!itemGroups[groupKey]) {
          itemGroups[groupKey] = [];
        }
        itemGroups[groupKey].push(item);
      }
      
      // Generate SKUs for each group
      for (const [groupKey, items] of Object.entries(itemGroups)) {
        let sequence = 1;
        
        for (const item of items) {
          try {
            const newSKU = `${groupKey}-${sequence}`;
            await this.storage.updateItem(item.id, { sku: newSKU });
            updated++;
            sequence++;
            
            console.log(`[sku-generator] Updated item ${item.id} (${item.name}) with SKU: ${newSKU}`);
          } catch (error) {
            console.error(`Error updating SKU for item ${item.id}:`, error);
            errors.push({ itemId: item.id, error: error.message });
          }
        }
      }
      
      console.log(`[sku-generator] SKU regeneration complete: ${updated} items updated, ${errors.length} errors`);
      
      return { updated, errors };
    } catch (error) {
      console.error('Error in regenerateAllSKUs:', error);
      throw error;
    }
  }

  /**
   * Process imported items and assign SKUs
   */
  async processImportedItems(items: any[]): Promise<{ processed: number; errors: any[] }> {
    try {
      let processed = 0;
      const errors: any[] = [];
      
      console.log(`[sku-generator] Processing ${items.length} imported items for SKU assignment`);
      
      // Group items by strain-tier-potency for consistent sequencing
      const itemGroups: { [key: string]: any[] } = {};
      
      for (const item of items) {
        const strainAbbrev = this.getStrainAbbreviation(item.name || '');
        const tier = this.getItemTier(item);
        const tierAbbrev = this.getTierAbbreviation(tier);
        const potency = this.getPotencyPercentage(item);
        const groupKey = `${strainAbbrev}-${tierAbbrev}-${potency}`;
        
        if (!itemGroups[groupKey]) {
          itemGroups[groupKey] = [];
        }
        itemGroups[groupKey].push(item);
      }
      
      // Assign SKUs to each group
      for (const [groupKey, groupItems] of Object.entries(itemGroups)) {
        const [strainAbbrev, tierAbbrev, potency] = groupKey.split('-');
        const startSequence = await this.getNextSequenceNumber(strainAbbrev, tierAbbrev, potency);
        
        for (let i = 0; i < groupItems.length; i++) {
          try {
            const item = groupItems[i];
            const newSKU = `${groupKey}-${startSequence + i}`;
            
            // Update the item with new SKU
            if (item.id) {
              await this.storage.updateItem(item.id, { sku: newSKU });
            } else {
              item.sku = newSKU; // For new items not yet in database
            }
            
            processed++;
            console.log(`[sku-generator] Assigned SKU ${newSKU} to imported item: ${item.name}`);
          } catch (error) {
            console.error(`Error assigning SKU to imported item:`, error);
            errors.push({ item: groupItems[i], error: error.message });
          }
        }
      }
      
      console.log(`[sku-generator] Import SKU processing complete: ${processed} items processed, ${errors.length} errors`);
      
      return { processed, errors };
    } catch (error) {
      console.error('Error in processImportedItems:', error);
      throw error;
    }
  }
}