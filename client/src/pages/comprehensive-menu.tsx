import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Menu, Eye, Download, ExternalLink, FileText, Phone, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  id: number;
  name: string;
  originalName: string;
  weight: string;
  tier: string;
  thcaPercentage: string;
  quantity: number;
  price: number;
  pricePerGram: number;
  sku: string;
  image: string | null;
  coaLink: string;
  orderLink: string;
  mediaLink: string;
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
      const response = await fetch('/api/comprehensive-menu');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.menu) {
          setMenu(data.menu);
          toast({
            title: "Menu Generated Successfully",
            description: `Created comprehensive menu with ${data.menu.sections.length} sections and ${data.menu.summary.totalItems} products`,
          });
        }
      } else {
        throw new Error('Failed to fetch comprehensive menu');
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

  const formatPrice = (price: number): string => {
    if (price <= 0) return 'Contact for Price';
    return `$${price.toFixed(2)}`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <Helmet>
        <title>Comprehensive Menu Generator - Gold Standard Management</title>
        <meta name="description" content="Generate comprehensive cannabis product menus with live inventory data, pricing, and direct ordering capabilities" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-green-50 to-emerald-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card className="border-2 border-amber-200 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-amber-600 via-green-600 to-emerald-600 bg-clip-text text-transparent">
                <Menu className="inline mr-4 text-amber-600" size={40} />
                Comprehensive Menu Generator
              </CardTitle>
              <p className="text-lg text-gray-600 mt-2">
                Generate professional cannabis product menus with live inventory data, realistic pricing, and direct ordering capabilities
              </p>
            </CardHeader>
          </Card>

          {/* Control Panel */}
          <Card className="border border-amber-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-amber-800">Menu Generation Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <Button
                  onClick={generateMenu}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-amber-600 to-green-600 hover:from-amber-700 hover:to-green-700 text-white font-semibold px-6 py-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Menu...
                    </>
                  ) : (
                    <>
                      <Menu className="mr-2 h-4 w-4" />
                      Generate Comprehensive Menu
                    </>
                  )}
                </Button>

                {menu && (
                  <>
                    <Button
                      onClick={viewHTML}
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Full HTML Menu
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setViewMode('data')}
                        variant={viewMode === 'data' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Data View
                      </Button>
                      <Button
                        onClick={() => setViewMode('preview')}
                        variant={viewMode === 'preview' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Preview
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Menu Display */}
          {menu && (
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="border border-green-200 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="text-2xl text-green-800">Menu Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{menu.summary.totalItems}</div>
                      <div className="text-sm text-gray-600">Total Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600">{formatCurrency(menu.summary.totalValue)}</div>
                      <div className="text-sm text-gray-600">Total Inventory Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-600">{menu.sections.length}</div>
                      <div className="text-sm text-gray-600">Product Categories</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Menu Sections */}
              {menu.sections.map((section, sectionIndex) => (
                <Card key={sectionIndex} className="border border-amber-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-amber-100 to-green-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-2xl text-amber-800">{section.title}</CardTitle>
                        <p className="text-gray-600 mt-1">{section.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {section.totalQuantity} units available
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(section.totalValue)} total value
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {viewMode === 'data' ? (
                      <div className="grid gap-4">
                        {section.items.map((item, itemIndex) => (
                          <div
                            key={itemIndex}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                                  <Badge variant={item.inStock ? "default" : "secondary"}>
                                    {item.inStock ? `${item.quantity} units` : 'Out of Stock'}
                                  </Badge>
                                  {item.lowStock && item.inStock && (
                                    <Badge variant="destructive">Low Stock</Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-3">
                                  <div><span className="font-medium">Weight:</span> {item.weight}</div>
                                  <div><span className="font-medium">Tier:</span> {item.tier}</div>
                                  <div><span className="font-medium">THCa:</span> {item.thcaPercentage}</div>
                                  <div><span className="font-medium">SKU:</span> {item.sku}</div>
                                </div>

                                <div className="flex items-center gap-2 text-lg font-semibold mb-3">
                                  <span className="text-green-600">{formatPrice(item.price)}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-sm text-gray-600">{item.quantity} available</span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(item.orderLink, '_blank')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <ShoppingCart className="mr-1 h-3 w-3" />
                                    Order Now
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(item.coaLink, '_blank')}
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                  >
                                    <FileText className="mr-1 h-3 w-3" />
                                    View COA
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(item.mediaLink, '_blank')}
                                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                  >
                                    <Download className="mr-1 h-3 w-3" />
                                    Media Pack
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open('tel:541-295-8811', '_blank')}
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                  >
                                    <Phone className="mr-1 h-3 w-3" />
                                    Call Now
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.items.map((item, itemIndex) => (
                          <Card key={itemIndex} className="border border-gray-200 hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                              <div className="text-center">
                                <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                                <div className="text-2xl font-bold text-green-600 mb-2">
                                  {formatPrice(item.price)}
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                  {item.weight} • {item.tier}
                                </div>
                                <Badge variant={item.inStock ? "default" : "secondary"} className="mb-3">
                                  {item.quantity} in stock
                                </Badge>
                                <div className="space-y-2">
                                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                                    <ShoppingCart className="mr-1 h-3 w-3" />
                                    Order Now
                                  </Button>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" className="flex-1">
                                      <FileText className="mr-1 h-3 w-3" />
                                      COA
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1">
                                      <Download className="mr-1 h-3 w-3" />
                                      Media
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Contact Information */}
              <Card className="border border-amber-200 shadow-lg bg-gradient-to-r from-amber-50 to-green-50">
                <CardHeader>
                  <CardTitle className="text-xl text-amber-800 text-center">Contact Gold Standard CBD</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="font-semibold text-gray-800">Phone</div>
                      <div className="text-amber-600">541-295-8811</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Email</div>
                      <div className="text-amber-600">contact@goldcbd.com</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Website</div>
                      <div className="text-amber-600">goldcbd.com</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!menu && !isLoading && (
            <Card className="border border-gray-200 shadow-lg">
              <CardContent className="text-center py-12">
                <Menu className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Menu Generated</h3>
                <p className="text-gray-500 mb-6">
                  Click "Generate Comprehensive Menu" to create a professional product menu with live inventory data
                </p>
                <Button
                  onClick={generateMenu}
                  className="bg-gradient-to-r from-amber-600 to-green-600 hover:from-amber-700 hover:to-green-700 text-white"
                >
                  <Menu className="mr-2 h-4 w-4" />
                  Get Started
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}