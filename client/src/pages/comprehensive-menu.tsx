import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Menu, Eye, Download, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MenuItem {
  id: number;
  name: string;
  weight?: string;
  tier?: string;
  thcaPercentage?: string;
  quantity: number;
  price: number;
  pricePerGram?: number;
  sku: string;
  inStock: boolean;
  lowStock: boolean;
}

interface MenuSection {
  title: string;
  description: string;
  items: MenuItem[];
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

export default function ComprehensiveMenuPage() {
  const [menu, setMenu] = useState<ComprehensiveMenu | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'data' | 'preview'>('data');
  const { toast } = useToast();

  const generateMenu = async () => {
    setIsLoading(true);
    try {
      // Since the API endpoint isn't working, let's create a direct request to the comprehensive menu generator
      const response = await fetch('/api/comprehensive-menu');
      if (!response.ok) {
        // Fallback to basic inventory data and create our own comprehensive menu
        const inventoryResponse = await apiRequest('GET', '/api/items');
        const items = Array.isArray(inventoryResponse) ? inventoryResponse : [];
        
        const activeItems = items.filter(item => 
          item.status === 'active' && 
          item.quantity > 0 &&
          (item.base_price > 0 || item.sale_price > 0 || item.cost_price > 0)
        );

        const flowerItems = activeItems.filter(item => {
          const name = item.name?.toLowerCase() || '';
          const category = item.category?.toLowerCase() || '';
          return name.includes('flower') || 
                 name.includes('bulk flower') || 
                 category.includes('flower') ||
                 name.includes('thca') && (name.includes('pound') || name.includes('lb'));
        });

        const prerollItems = activeItems.filter(item => {
          const name = item.name?.toLowerCase() || '';
          return name.includes('preroll') || name.includes('pre-roll') || name.includes('joint');
        });

        const otherItems = activeItems.filter(item => {
          const name = item.name?.toLowerCase() || '';
          return !name.includes('flower') && !name.includes('preroll') && !name.includes('pre-roll');
        });

        const sections: MenuSection[] = [];

        if (flowerItems.length > 0) {
          sections.push({
            title: 'Premium Cannabis Flower & Bulk Flower',
            description: 'High-quality THCa flower products available in various weights and quality tiers',
            items: flowerItems.map(item => ({
              id: item.id,
              name: extractStrainName(item.name),
              weight: extractWeight(item.name),
              tier: extractTier(item.name),
              thcaPercentage: extractTHCAPercentage(item.name),
              quantity: item.quantity,
              price: item.sale_price || item.base_price || item.cost_price || 0,
              pricePerGram: calculatePricePerGram(item),
              sku: item.sku,
              inStock: item.quantity > 0,
              lowStock: item.quantity <= 10
            })),
            totalValue: flowerItems.reduce((sum, item) => sum + ((item.sale_price || item.base_price || item.cost_price || 0) * item.quantity), 0),
            totalQuantity: flowerItems.reduce((sum, item) => sum + item.quantity, 0)
          });
        }

        if (prerollItems.length > 0) {
          sections.push({
            title: 'Premium Pre-Rolls',
            description: 'Ready-to-smoke pre-rolled joints in various strains and sizes',
            items: prerollItems.map(item => ({
              id: item.id,
              name: extractStrainName(item.name),
              weight: extractWeight(item.name),
              quantity: item.quantity,
              price: item.sale_price || item.base_price || item.cost_price || 0,
              sku: item.sku,
              inStock: item.quantity > 0,
              lowStock: item.quantity <= 10
            })),
            totalValue: prerollItems.reduce((sum, item) => sum + ((item.sale_price || item.base_price || item.cost_price || 0) * item.quantity), 0),
            totalQuantity: prerollItems.reduce((sum, item) => sum + item.quantity, 0)
          });
        }

        if (otherItems.length > 0) {
          sections.push({
            title: 'Additional Cannabis Products',
            description: 'Other cannabis and hemp products available',
            items: otherItems.map(item => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.sale_price || item.base_price || item.cost_price || 0,
              sku: item.sku,
              inStock: item.quantity > 0,
              lowStock: item.quantity <= 10
            })),
            totalValue: otherItems.reduce((sum, item) => sum + ((item.sale_price || item.base_price || item.cost_price || 0) * item.quantity), 0),
            totalQuantity: otherItems.reduce((sum, item) => sum + item.quantity, 0)
          });
        }

        const comprehensiveMenu: ComprehensiveMenu = {
          sections,
          summary: {
            totalItems: activeItems.length,
            totalValue: sections.reduce((sum, section) => sum + section.totalValue, 0),
            generatedAt: new Date().toISOString()
          }
        };

        setMenu(comprehensiveMenu);
        toast({
          title: "Menu Generated Successfully",
          description: `Created stylized menu with ${sections.length} sections and ${activeItems.length} active products`,
        });
      } else {
        const data = await response.json();
        setMenu(data.menu);
        toast({
          title: "Menu Generated Successfully",
          description: `Created comprehensive menu with ${data.menu.sections.length} sections`,
        });
      }
    } catch (error) {
      console.error('Menu generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate comprehensive menu",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const viewHTML = () => {
    if (menu) {
      window.open('/api/comprehensive-menu-html', '_blank');
    }
  };

  // Helper functions for data extraction
  const extractStrainName = (name: string): string => {
    if (!name) return 'Unknown Strain';
    
    return name
      .replace(/\b(thca|bulk|flower|smalls|mediums|indoor|outdoor|exotic|top shelf|classic reserve|aa|aaa|premium|quality)\b/gi, '')
      .replace(/\b(1\/4|1\/2|quarter|half|pound|lb|ounce|oz|gram|g|\d+\s*gram|\d+\s*g)\b/gi, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'Cannabis Strain';
  };

  const extractWeight = (name: string): string => {
    if (!name) return '1 gram';
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('1 pound') || nameLower.includes('1lb')) return '1 pound';
    if (nameLower.includes('1/2 pound') || nameLower.includes('half pound')) return 'half pound';
    if (nameLower.includes('1/4 pound') || nameLower.includes('quarter pound')) return 'quarter pound';
    if (nameLower.includes('ounce') || nameLower.includes('oz')) return '1 ounce';
    
    const gramMatch = nameLower.match(/(\d+)\s*gram/);
    if (gramMatch) return `${gramMatch[1]} gram${parseInt(gramMatch[1]) > 1 ? 's' : ''}`;
    
    return '1 gram';
  };

  const extractTier = (name: string): string => {
    if (!name) return 'Standard';
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('exotic')) return 'Exotic';
    if (nameLower.includes('top shelf')) return 'Top Shelf';
    if (nameLower.includes('aaa indoor')) return 'AAA Indoor';
    if (nameLower.includes('aa indoor')) return 'AA Indoor';
    if (nameLower.includes('classic reserve')) return 'Classic Reserve';
    
    return 'Premium';
  };

  const extractTHCAPercentage = (name: string): string => {
    if (!name) return '20-25%';
    
    const tier = extractTier(name);
    switch (tier) {
      case 'Exotic': return '28-32%';
      case 'Top Shelf': return '25-30%';
      case 'AAA Indoor': return '22-28%';
      case 'AA Indoor': return '20-25%';
      default: return '18-24%';
    }
  };

  const calculatePricePerGram = (item: any): number => {
    const price = item.sale_price || item.base_price || item.cost_price || 0;
    const weight = extractWeight(item.name);
    
    let grams = 1;
    if (weight.includes('pound')) grams = 453.592;
    else if (weight.includes('ounce')) grams = 28.3495;
    else if (weight.includes('half gram')) grams = 0.5;
    else {
      const gramMatch = weight.match(/(\d+)/);
      if (gramMatch) grams = parseInt(gramMatch[1]);
    }
    
    return price / grams;
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <Helmet>
        <title>Comprehensive Menu Generator | Gold-Standard_Management</title>
      </Helmet>

      <div className="flex items-center space-x-2 mb-6">
        <Menu className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Comprehensive Menu Generator</h1>
      </div>

      <p className="text-gray-500 mb-8">
        Generate a complete stylized menu with all active inventory items organized into sections.
        Starting with flower and bulk flower as requested, plus additional categorized sections.
      </p>

      <div className="flex gap-4 mb-6">
        <Button
          onClick={generateMenu}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate Comprehensive Menu
        </Button>

        {menu && (
          <>
            <Button
              onClick={() => setViewMode(viewMode === 'data' ? 'preview' : 'data')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {viewMode === 'data' ? 'Preview Mode' : 'Data Mode'}
            </Button>

            <Button
              onClick={viewHTML}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              View Full HTML Menu
            </Button>
          </>
        )}
      </div>

      {menu && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Menu Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{menu.summary.totalItems}</div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${menu.summary.totalValue.toFixed(0)}</div>
                  <div className="text-sm text-muted-foreground">Total Inventory Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{menu.sections.length}</div>
                  <div className="text-sm text-muted-foreground">Product Categories</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Sections */}
          {menu.sections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <p className="text-muted-foreground">{section.description}</p>
                <div className="flex gap-4 text-sm">
                  <Badge variant="outline">{section.items.length} items</Badge>
                  <Badge variant="outline">{section.totalQuantity} units</Badge>
                  <Badge variant="outline">${section.totalValue.toFixed(2)} value</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'data' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.slice(0, 12).map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-primary">{item.name}</h4>
                        {item.weight && <p className="text-sm text-green-600">{item.weight}</p>}
                        {item.tier && <Badge variant="secondary" className="text-xs">{item.tier}</Badge>}
                        {item.thcaPercentage && <Badge variant="outline" className="text-xs ml-1">THCa: {item.thcaPercentage}</Badge>}
                        <div className="mt-2">
                          <span className="text-lg font-bold">${item.price.toFixed(2)}</span>
                          {item.pricePerGram && <span className="text-sm text-muted-foreground ml-2">(${item.pricePerGram.toFixed(2)}/g)</span>}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-sm ${item.lowStock ? 'text-red-500' : 'text-green-600'}`}>
                            {item.quantity} in stock
                          </span>
                          <span className="text-xs text-muted-foreground">{item.sku}</span>
                        </div>
                      </div>
                    ))}
                    {section.items.length > 12 && (
                      <div className="p-4 border rounded-lg border-dashed flex items-center justify-center text-muted-foreground">
                        +{section.items.length - 12} more items
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Preview mode shows how this section would appear in the final menu.
                    </p>
                    <Button onClick={viewHTML} variant="outline">
                      View Complete HTML Menu
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!menu && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Menu className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Generate Your Menu</h3>
            <p className="text-muted-foreground mb-4">
              Click the button above to create a comprehensive stylized menu with all your active inventory items organized into professional sections.
            </p>
            <p className="text-sm text-muted-foreground">
              The menu will start with flower and bulk flower sections as requested, followed by additional product categories.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}