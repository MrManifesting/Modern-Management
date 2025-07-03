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
  const [activeTab, setActiveTab] = useState<string>('');
  const { toast } = useToast();

  const generateMenu = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/comprehensive-menu');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.menu) {
          setMenu(data.menu);
          // Set first section as active tab
          if (data.menu.sections.length > 0) {
            setActiveTab(data.menu.sections[0].title);
          }
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

  const renderProductCard = (item: MenuItem, itemIndex: number) => {
    return React.createElement('div', {
      key: itemIndex,
      className: "border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-white hover:border-amber-300"
    }, 
      React.createElement('div', { className: "flex flex-col md:flex-row gap-6" },
        // Product Image
        React.createElement('div', {
          className: "w-full md:w-48 h-48 bg-gradient-to-br from-amber-50 to-green-50 rounded-lg overflow-hidden flex items-center justify-center border border-amber-200"
        },
          item.image 
            ? React.createElement('img', {
                src: item.image,
                alt: item.name,
                className: "w-full h-full object-cover hover:scale-105 transition-transform duration-300",
                onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = '<div class="text-6xl text-amber-400">🌿</div>';
                  }
                }
              })
            : React.createElement('div', { className: "text-6xl text-amber-400" }, '🌿')
        ),
        
        // Product Details
        React.createElement('div', { className: "flex-1" },
          React.createElement('div', { className: "flex items-start justify-between mb-4" },
            React.createElement('div', {},
              React.createElement('h3', { className: "text-2xl font-bold text-gray-800 mb-2" }, item.name),
              React.createElement('div', { className: "flex flex-wrap gap-2 mb-3" },
                React.createElement(Badge, {
                  variant: "outline",
                  className: "bg-amber-50 border-amber-300 text-amber-800"
                }, `⚖️ ${item.weight}`),
                React.createElement(Badge, {
                  variant: "outline", 
                  className: "bg-green-50 border-green-300 text-green-800"
                }, `⭐ ${item.tier}`),
                React.createElement(Badge, {
                  variant: "outline",
                  className: "bg-purple-50 border-purple-300 text-purple-800"
                }, `🧪 THCa ${item.thcaPercentage}`),
                React.createElement(Badge, {
                  variant: "outline",
                  className: "bg-gray-50 border-gray-300 text-gray-700"
                }, `📦 ${item.sku}`)
              )
            ),
            
            // Stock Status
            React.createElement('div', { className: "text-right" },
              React.createElement(Badge, {
                variant: item.inStock ? "default" : "secondary",
                className: "mb-2"
              }, item.inStock ? `${item.quantity} in stock` : 'Out of Stock'),
              item.lowStock && item.inStock && React.createElement(Badge, {
                variant: "destructive",
                className: "block"
              }, 'Low Stock Alert')
            )
          ),
          
          // Pricing Section
          React.createElement('div', {
            className: "bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4 border border-green-200"
          },
            React.createElement('div', { className: "text-center" },
              React.createElement('div', { 
                className: "text-3xl font-bold text-green-600 mb-1" 
              }, formatPrice(item.price)),
              React.createElement('div', { 
                className: "text-sm text-gray-600" 
              }, `Wholesale Price • ${item.quantity} Units Available`)
            )
          ),
          
          // Action Buttons
          React.createElement('div', { className: "flex flex-wrap gap-2" },
            React.createElement(Button, {
              size: "sm",
              onClick: () => window.open(item.orderLink, '_blank'),
              className: "bg-green-600 hover:bg-green-700 text-white"
            }, 
              React.createElement(ShoppingCart, { className: "mr-1 h-3 w-3" }),
              'Order Now'
            ),
            React.createElement(Button, {
              size: "sm",
              variant: "outline",
              onClick: () => window.open(item.coaLink, '_blank'),
              className: "border-blue-300 text-blue-700 hover:bg-blue-50"
            },
              React.createElement(FileText, { className: "mr-1 h-3 w-3" }),
              'View COA'
            ),
            React.createElement(Button, {
              size: "sm", 
              variant: "outline",
              onClick: () => window.open(item.mediaLink, '_blank'),
              className: "border-purple-300 text-purple-700 hover:bg-purple-50"
            },
              React.createElement(Download, { className: "mr-1 h-3 w-3" }),
              'Media Pack'
            ),
            React.createElement(Button, {
              size: "sm",
              variant: "outline", 
              onClick: () => window.open('tel:541-295-8811', '_blank'),
              className: "border-amber-300 text-amber-700 hover:bg-amber-50"
            },
              React.createElement(Phone, { className: "mr-1 h-3 w-3" }),
              'Call Now'
            )
          )
        )
      )
    );
  };

  return React.createElement(React.Fragment, {},
    React.createElement(Helmet, {},
      React.createElement('title', {}, 'Comprehensive Menu Generator - Gold Standard Management'),
      React.createElement('meta', {
        name: "description",
        content: "Generate comprehensive cannabis product menus with live inventory data, pricing, and direct ordering capabilities"
      })
    ),

    React.createElement('div', { className: "min-h-screen bg-gradient-to-br from-amber-50 via-green-50 to-emerald-50 p-4" },
      React.createElement('div', { className: "max-w-7xl mx-auto space-y-6" },
        
        // Header
        React.createElement(Card, { className: "border-2 border-amber-200 shadow-xl bg-white/90 backdrop-blur-sm" },
          React.createElement(CardHeader, { className: "text-center" },
            React.createElement(CardTitle, {
              className: "text-4xl font-bold bg-gradient-to-r from-amber-600 via-green-600 to-emerald-600 bg-clip-text text-transparent"
            },
              React.createElement(Menu, { className: "inline mr-4 text-amber-600", size: 40 }),
              'Comprehensive Menu Generator'
            ),
            React.createElement('p', { className: "text-lg text-gray-600 mt-2" },
              'Generate professional cannabis product menus with live inventory data, realistic pricing, and direct ordering capabilities'
            )
          )
        ),
        
        // Control Panel
        React.createElement(Card, { className: "border border-amber-200 shadow-lg" },
          React.createElement(CardHeader, {},
            React.createElement(CardTitle, { className: "text-xl text-amber-800" }, 'Menu Generation Controls')
          ),
          React.createElement(CardContent, {},
            React.createElement('div', { className: "flex flex-wrap gap-4 items-center" },
              React.createElement(Button, {
                onClick: generateMenu,
                disabled: isLoading,
                className: "bg-gradient-to-r from-amber-600 to-green-600 hover:from-amber-700 hover:to-green-700 text-white font-semibold px-6 py-3"
              },
                isLoading 
                  ? React.createElement(React.Fragment, {},
                      React.createElement(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
                      'Generating Menu...'
                    )
                  : React.createElement(React.Fragment, {},
                      React.createElement(Menu, { className: "mr-2 h-4 w-4" }),
                      'Generate Comprehensive Menu'
                    )
              ),
              
              menu && React.createElement(Button, {
                onClick: viewHTML,
                variant: "outline",
                className: "border-amber-300 text-amber-700 hover:bg-amber-50"
              },
                React.createElement(Eye, { className: "mr-2 h-4 w-4" }),
                'View Full HTML Menu'
              )
            )
          )
        ),
        
        // Menu Display
        menu && React.createElement('div', { className: "space-y-6" },
          // Summary Card
          React.createElement(Card, { className: "border border-green-200 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50" },
            React.createElement(CardHeader, {},
              React.createElement(CardTitle, { className: "text-2xl text-green-800" }, 'Menu Summary')
            ),
            React.createElement(CardContent, {},
              React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
                React.createElement('div', { className: "text-center" },
                  React.createElement('div', { className: "text-3xl font-bold text-green-600" }, menu.summary.totalItems),
                  React.createElement('div', { className: "text-sm text-gray-600" }, 'Total Products')
                ),
                React.createElement('div', { className: "text-center" },
                  React.createElement('div', { className: "text-3xl font-bold text-amber-600" }, formatCurrency(menu.summary.totalValue)),
                  React.createElement('div', { className: "text-sm text-gray-600" }, 'Total Inventory Value')
                ),
                React.createElement('div', { className: "text-center" },
                  React.createElement('div', { className: "text-3xl font-bold text-emerald-600" }, menu.sections.length),
                  React.createElement('div', { className: "text-sm text-gray-600" }, 'Product Categories')
                )
              )
            )
          ),
          
          // Tabbed Interface for Weight Categories
          React.createElement(Card, { className: "border border-amber-200 shadow-lg" },
            React.createElement(CardHeader, { className: "bg-gradient-to-r from-amber-100 to-green-100" },
              React.createElement(CardTitle, { className: "text-2xl text-amber-800 text-center" }, 'Product Categories'),
              
              // Tab Navigation
              React.createElement('div', { className: "flex justify-center space-x-4 mt-4" },
                ...menu.sections.map((section, index) =>
                  React.createElement(Button, {
                    key: index,
                    onClick: () => setActiveTab(section.title),
                    variant: activeTab === section.title ? 'default' : 'outline',
                    className: `px-6 py-3 font-semibold text-sm transition-all duration-300 ${
                      activeTab === section.title
                        ? 'bg-gradient-to-r from-amber-600 to-green-600 text-white shadow-lg transform scale-105'
                        : 'border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400'
                    }`
                  },
                    section.title,
                    React.createElement(Badge, {
                      variant: "secondary",
                      className: `ml-2 ${activeTab === section.title ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`
                    }, section.items.length)
                  )
                )
              )
            ),
            
            // Active Tab Content
            React.createElement(CardContent, { className: "p-6" },
              ...menu.sections.filter(section => section.title === activeTab).map((section, sectionIndex) =>
                React.createElement('div', { key: sectionIndex },
                  React.createElement('div', { className: "mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200" },
                    React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-center" },
                      React.createElement('div', {},
                        React.createElement('div', { className: "text-2xl font-bold text-green-600" }, section.items.length),
                        React.createElement('div', { className: "text-sm text-gray-600" }, 'Available Products')
                      ),
                      React.createElement('div', {},
                        React.createElement('div', { className: "text-2xl font-bold text-amber-600" }, section.totalQuantity),
                        React.createElement('div', { className: "text-sm text-gray-600" }, 'Total Units')
                      ),
                      React.createElement('div', {},
                        React.createElement('div', { className: "text-2xl font-bold text-emerald-600" }, formatCurrency(section.totalValue)),
                        React.createElement('div', { className: "text-sm text-gray-600" }, 'Total Value')
                      )
                    )
                  ),
                  
                  // Products Display
                  React.createElement('div', { className: "grid gap-6" },
                    ...section.items.map((item, itemIndex) => renderProductCard(item, itemIndex))
                  )
                )
              )
            )
          ),
          
          // Contact Information
          React.createElement(Card, { className: "border border-amber-200 shadow-lg bg-gradient-to-r from-amber-50 to-green-50" },
            React.createElement(CardHeader, {},
              React.createElement(CardTitle, { className: "text-xl text-amber-800 text-center" }, 'Contact Gold Standard CBD')
            ),
            React.createElement(CardContent, {},
              React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-center" },
                React.createElement('div', {},
                  React.createElement('div', { className: "font-semibold text-gray-800" }, 'Phone'),
                  React.createElement('div', { className: "text-amber-600" }, '541-295-8811')
                ),
                React.createElement('div', {},
                  React.createElement('div', { className: "font-semibold text-gray-800" }, 'Email'),
                  React.createElement('div', { className: "text-amber-600" }, 'contact@goldcbd.com')
                ),
                React.createElement('div', {},
                  React.createElement('div', { className: "font-semibold text-gray-800" }, 'Website'),
                  React.createElement('div', { className: "text-amber-600" }, 'goldcbd.com')
                )
              )
            )
          )
        )
      )
    )
  );
}