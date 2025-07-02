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
    
    // Get all active items with quantities
    const allItems = await this.storage.getAllItems();
    const activeItems = allItems.filter(item => 
      item.status === 'active' && 
      item.quantity > 0 &&
      (item.base_price > 0 || item.sale_price > 0 || item.cost_price > 0)
    );

    console.log(`[comprehensive-menu] Found ${activeItems.length} active items with quantities`);

    // Create sections
    const sections: MenuSection[] = [];

    // 1. Flower and Bulk Flower Section
    const flowerItems = activeItems.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      return name.includes('flower') || 
             name.includes('bulk flower') || 
             category.includes('flower') ||
             name.includes('thca') && (name.includes('pound') || name.includes('lb'));
    });

    sections.push({
      title: 'Premium Cannabis Flower & Bulk Flower',
      description: 'High-quality THCa flower products available in various weights and quality tiers',
      items: this.formatFlowerItems(flowerItems),
      totalValue: this.calculateSectionValue(flowerItems),
      totalQuantity: flowerItems.reduce((sum, item) => sum + item.quantity, 0)
    });

    // 2. Pre-Rolls Section
    const prerollItems = activeItems.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      return name.includes('preroll') || 
             name.includes('pre-roll') || 
             name.includes('joint') ||
             category.includes('preroll');
    });

    if (prerollItems.length > 0) {
      sections.push({
        title: 'Premium Pre-Rolls',
        description: 'Ready-to-smoke pre-rolled joints in various strains and sizes',
        items: this.formatPrerollItems(prerollItems),
        totalValue: this.calculateSectionValue(prerollItems),
        totalQuantity: prerollItems.reduce((sum, item) => sum + item.quantity, 0)
      });
    }

    // 3. Edibles Section
    const edibleItems = activeItems.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      return name.includes('gummies') || 
             name.includes('edible') || 
             name.includes('chocolate') ||
             name.includes('candy') ||
             category.includes('edible');
    });

    if (edibleItems.length > 0) {
      sections.push({
        title: 'Cannabis Edibles',
        description: 'Delicious cannabis-infused edibles in various flavors and potencies',
        items: this.formatEdibleItems(edibleItems),
        totalValue: this.calculateSectionValue(edibleItems),
        totalQuantity: edibleItems.reduce((sum, item) => sum + item.quantity, 0)
      });
    }

    // 4. Concentrates Section
    const concentrateItems = activeItems.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      return name.includes('concentrate') || 
             name.includes('wax') || 
             name.includes('shatter') ||
             name.includes('rosin') ||
             name.includes('hash') ||
             category.includes('concentrate');
    });

    if (concentrateItems.length > 0) {
      sections.push({
        title: 'Premium Concentrates',
        description: 'High-potency cannabis concentrates and extracts',
        items: this.formatConcentrateItems(concentrateItems),
        totalValue: this.calculateSectionValue(concentrateItems),
        totalQuantity: concentrateItems.reduce((sum, item) => sum + item.quantity, 0)
      });
    }

    // 5. Accessories Section
    const accessoryItems = activeItems.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      return name.includes('accessories') || 
             name.includes('pipe') || 
             name.includes('grinder') ||
             name.includes('papers') ||
             category.includes('accessories');
    });

    if (accessoryItems.length > 0) {
      sections.push({
        title: 'Cannabis Accessories',
        description: 'Essential accessories for cannabis consumption',
        items: this.formatAccessoryItems(accessoryItems),
        totalValue: this.calculateSectionValue(accessoryItems),
        totalQuantity: accessoryItems.reduce((sum, item) => sum + item.quantity, 0)
      });
    }

    // 6. Other Products Section (catch-all for remaining items)
    const categorizedItemIds = new Set([
      ...flowerItems.map(item => item.id),
      ...prerollItems.map(item => item.id),
      ...edibleItems.map(item => item.id),
      ...concentrateItems.map(item => item.id),
      ...accessoryItems.map(item => item.id)
    ]);

    const otherItems = activeItems.filter(item => !categorizedItemIds.has(item.id));

    if (otherItems.length > 0) {
      sections.push({
        title: 'Additional Products',
        description: 'Other cannabis and hemp products available',
        items: this.formatOtherItems(otherItems),
        totalValue: this.calculateSectionValue(otherItems),
        totalQuantity: otherItems.reduce((sum, item) => sum + item.quantity, 0)
      });
    }

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
        pricePerGram: this.calculatePricePerGram(item),
        sku: item.sku,
        image: item.thumbnail || item.images?.[0] || null,
        coaLink: `https://goldcbd.com/coa/${this.createSlug(this.extractStrainName(item.name))}`,
        orderLink: `https://goldcbd.com/products/${this.createSlug(item.name)}`,
        mediaLink: `https://goldcbd.com/media/download/${item.sku}`,
        inStock: item.quantity > 0,
        lowStock: item.quantity <= 10
      }));
  }

  private formatPrerollItems(items: any[]): any[] {
    return items
      .sort((a, b) => b.quantity - a.quantity)
      .map(item => ({
        id: item.id,
        name: this.extractStrainName(item.name),
        originalName: item.name,
        size: this.extractPrerollSize(item.name),
        quantity: item.quantity,
        price: this.getDisplayPrice(item),
        sku: item.sku,
        image: item.thumbnail || item.images?.[0] || null,
        coaLink: `https://goldcbd.com/coa/${this.createSlug(this.extractStrainName(item.name))}`,
        orderLink: `https://goldcbd.com/products/${this.createSlug(item.name)}`,
        inStock: item.quantity > 0
      }));
  }

  private formatEdibleItems(items: any[]): any[] {
    return items
      .sort((a, b) => b.quantity - a.quantity)
      .map(item => ({
        id: item.id,
        name: item.name,
        flavor: this.extractFlavor(item.name),
        potency: this.extractPotency(item.name),
        quantity: item.quantity,
        price: this.getDisplayPrice(item),
        sku: item.sku,
        image: item.thumbnail || item.images?.[0] || null,
        orderLink: `https://goldcbd.com/products/${this.createSlug(item.name)}`,
        inStock: item.quantity > 0
      }));
  }

  private formatConcentrateItems(items: any[]): any[] {
    return items
      .sort((a, b) => b.quantity - a.quantity)
      .map(item => ({
        id: item.id,
        name: this.extractStrainName(item.name),
        originalName: item.name,
        type: this.extractConcentrateType(item.name),
        quantity: item.quantity,
        price: this.getDisplayPrice(item),
        sku: item.sku,
        image: item.thumbnail || item.images?.[0] || null,
        coaLink: `https://goldcbd.com/coa/${this.createSlug(this.extractStrainName(item.name))}`,
        orderLink: `https://goldcbd.com/products/${this.createSlug(item.name)}`,
        inStock: item.quantity > 0
      }));
  }

  private formatAccessoryItems(items: any[]): any[] {
    return items
      .sort((a, b) => b.quantity - a.quantity)
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: this.getDisplayPrice(item),
        sku: item.sku,
        image: item.thumbnail || item.images?.[0] || null,
        orderLink: `https://goldcbd.com/products/${this.createSlug(item.name)}`,
        inStock: item.quantity > 0
      }));
  }

  private formatOtherItems(items: any[]): any[] {
    return items
      .sort((a, b) => b.quantity - a.quantity)
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: this.getDisplayPrice(item),
        sku: item.sku,
        image: item.thumbnail || item.images?.[0] || null,
        orderLink: `https://goldcbd.com/products/${this.createSlug(item.name)}`,
        inStock: item.quantity > 0
      }));
  }

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

  private extractPrerollSize(name: string): string {
    if (!name) return '1g';
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('king size')) return 'King Size (1.5g)';
    if (nameLower.includes('mini')) return 'Mini (0.5g)';
    if (nameLower.includes('2g') || nameLower.includes('2 gram')) return '2g';
    if (nameLower.includes('1.5g')) return '1.5g';
    if (nameLower.includes('0.5g') || nameLower.includes('half gram')) return '0.5g';
    
    return '1g';
  }

  private extractFlavor(name: string): string {
    // Extract flavor from edible names
    const flavorKeywords = ['strawberry', 'grape', 'cherry', 'lemon', 'lime', 'orange', 'berry', 'mint', 'vanilla', 'chocolate'];
    
    for (const flavor of flavorKeywords) {
      if (name.toLowerCase().includes(flavor)) {
        return flavor.charAt(0).toUpperCase() + flavor.slice(1);
      }
    }
    
    return 'Mixed';
  }

  private extractPotency(name: string): string {
    const potencyMatch = name.match(/(\d+)\s*mg/i);
    if (potencyMatch) return `${potencyMatch[1]}mg`;
    
    return '10mg';
  }

  private extractConcentrateType(name: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('rosin')) return 'Live Rosin';
    if (nameLower.includes('shatter')) return 'Shatter';
    if (nameLower.includes('wax')) return 'Wax';
    if (nameLower.includes('hash')) return 'Hash';
    if (nameLower.includes('budder')) return 'Budder';
    
    return 'Concentrate';
  }

  private getDisplayPrice(item: any): number {
    return item.sale_price || item.base_price || item.cost_price || 0;
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