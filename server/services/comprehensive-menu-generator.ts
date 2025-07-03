import { DatabaseStorage } from '../storage.ts';

interface MenuSection {
  title: string;
  description: string;
  items: any[];
  totalValue: number;
  totalQuantity: number;
}

interface ComprehensiveMenu {
  sections: MenuSection[];
  summary: {
    totalItems: number;
    totalValue: number;
    generatedAt: string;
  };
}

export class ComprehensiveMenuGenerator {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  async generateStylizedMenu(): Promise<ComprehensiveMenu> {
    console.log('[comprehensive-menu] Starting comprehensive menu generation...');
    
    // Get all items with quantities (active or draft)
    const allItems = await this.storage.getAllItems();
    const activeItems = allItems.filter(item => 
      (item.status === 'active' || item.status === 'draft') && 
      item.quantity > 0
    );

    console.log(`[comprehensive-menu] Found ${activeItems.length} active items with quantities`);

    // Create sections
    const sections: MenuSection[] = [];

    // 1. Flower and Bulk Flower Section ONLY - NO gram/ounce variants
    const flowerItems = activeItems.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      const weight = item.weight?.toLowerCase() || '';
      
      // Must be flower or bulk flower category
      const isFlowerCategory = category.includes('flower') || category.includes('bulk flower');
      
      // Must NOT contain gram or ounce weights - only pound variants allowed
      const hasGramOunceWeight = weight.includes('gram') || 
                                weight.includes('ounce') || 
                                weight.includes('oz') ||
                                weight.includes('eighth') ||
                                name.includes('gram') ||
                                name.includes('ounce') ||
                                name.includes('oz');
      
      // Must be authentic flower/bulk flower without small weight variants
      return isFlowerCategory && !hasGramOunceWeight;
    });

    sections.push({
      title: 'Premium Cannabis Flower & Bulk Flower',
      description: 'High-quality THCa flower products available in various weights and quality tiers',
      items: this.formatFlowerItems(flowerItems),
      totalValue: this.calculateSectionValue(flowerItems),
      totalQuantity: flowerItems.reduce((sum, item) => sum + item.quantity, 0)
    });

    // REMOVED: Pre-Rolls section per user requirement - flower/bulk flower only

    // REMOVED: Edibles section per user requirement - flower/bulk flower only

    // REMOVED: Concentrates section per user requirement - flower/bulk flower only

    // REMOVED: All other sections per user requirement - flower/bulk flower only
    // System now exclusively displays flower and bulk flower items without gram/ounce variants

    const totalItems = activeItems.length;
    const totalValue = sections.reduce((sum, section) => sum + section.totalValue, 0);

    console.log(`[comprehensive-menu] Generated menu with ${sections.length} sections, ${totalItems} items, $${totalValue.toFixed(2)} total value`);

    return {
      sections,
      summary: {
        totalItems,
        totalValue,
        generatedAt: new Date().toISOString()
      }
    };
  }

  private formatFlowerItems(items: any[]): any[] {
    return items
      .sort((a, b) => b.quantity - a.quantity) // Sort by highest quantity first
      .map(item => ({
        id: item.id,
        name: this.extractStrainName(item.name),
        originalName: item.name,
        weight: this.extractWeight(item.name),
        tier: this.extractTier(item.name),
        thcaPercentage: this.extractTHCAPercentage(item.name),
        quantity: item.quantity,
        price: this.getDisplayPrice(item),
        pricePerGram: this.getDisplayPrice(item), // Show total price, not per-gram calculation
        sku: item.sku,
        image: item.thumbnail || item.images?.[0] || null,
        coaLink: `https://goldcbd.com/coa/${this.createSlug(this.extractStrainName(item.name))}`,
        orderLink: `https://goldcbd.com/products/${this.createSlug(item.name)}`,
        mediaLink: `https://goldcbd.com/media/download/${item.sku}`,
        inStock: item.quantity > 0,
        lowStock: item.quantity <= 10
      }));
  }

  // REMOVED: All unused formatting methods for non-flower products per user requirement

  private calculateSectionValue(items: any[]): number {
    return items.reduce((sum, item) => {
      const price = this.getDisplayPrice(item);
      return sum + (price * item.quantity);
    }, 0);
  }

  private extractStrainName(name: string): string {
    if (!name) return 'Unknown Strain';
    
    // Remove common cannabis product keywords and extract strain name
    const cleanName = name
      .replace(/\b(thca|bulk|flower|smalls|mediums|indoor|outdoor|exotic|top shelf|classic reserve|aa|aaa|premium|quality)\b/gi, '')
      .replace(/\b(1\/4|1\/2|quarter|half|pound|lb|ounce|oz|gram|g|\d+\s*gram|\d+\s*g)\b/gi, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Capitalize each word
    return cleanName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'Cannabis Strain';
  }

  private extractWeight(name: string): string {
    if (!name) return '1 gram';
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('1 pound') || nameLower.includes('1lb') || nameLower.includes('one pound')) return '1 pound';
    if (nameLower.includes('1/2 pound') || nameLower.includes('half pound')) return 'half pound';
    if (nameLower.includes('1/4 pound') || nameLower.includes('quarter pound')) return 'quarter pound';
    if (nameLower.includes('ounce') || nameLower.includes('oz')) return '1 ounce';
    if (nameLower.includes('half gram')) return 'half gram';
    
    // Extract gram amounts
    const gramMatch = nameLower.match(/(\d+)\s*gram/);
    if (gramMatch) return `${gramMatch[1]} gram${parseInt(gramMatch[1]) > 1 ? 's' : ''}`;
    
    return '1 gram';
  }

  private extractTier(name: string): string {
    if (!name) return 'Standard';
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('exotic')) return 'Exotic';
    if (nameLower.includes('top shelf')) return 'Top Shelf';
    if (nameLower.includes('aaa indoor')) return 'AAA Indoor';
    if (nameLower.includes('aa indoor')) return 'AA Indoor';
    if (nameLower.includes('classic reserve')) return 'Classic Reserve';
    
    return 'Premium';
  }

  private extractTHCAPercentage(name: string): string | null {
    if (!name) return null;
    
    // Look for percentage patterns
    const percentMatch = name.match(/(\d+\.?\d*)%/);
    if (percentMatch) return `${percentMatch[1]}%`;
    
    // Default THCA percentages based on tier
    const tier = this.extractTier(name);
    switch (tier) {
      case 'Exotic': return '28-32%';
      case 'Top Shelf': return '25-30%';
      case 'AAA Indoor': return '22-28%';
      case 'AA Indoor': return '20-25%';
      default: return '18-24%';
    }
  }

  // REMOVED: Helper methods for non-flower products per user requirement

  private getDisplayPrice(item: any): number {
    return item.sale_price || item.base_price || item.cost_price || 0;
  }

  private formatPrice(price: number): string {
    if (price <= 0) return 'Contact for Price';
    return `$${price.toFixed(2)}`;
  }

  private calculatePricePerGram(item: any): number {
    const price = this.getDisplayPrice(item);
    const weight = this.extractWeight(item.name);
    
    let grams = 1;
    if (weight.includes('pound')) grams = 453.592;
    else if (weight.includes('ounce')) grams = 28.3495;
    else if (weight.includes('half gram')) grams = 0.5;
    else {
      const gramMatch = weight.match(/(\d+)/);
      if (gramMatch) grams = parseInt(gramMatch[1]);
    }
    
    return price / grams;
  }

  private createSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}