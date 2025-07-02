import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Eye, Download, Palette, Clock, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThemedMenu {
  theme: string;
  html: string;
  itemCount: number;
}

interface MenuData {
  success: boolean;
  menus: ThemedMenu[];
  flowerItems: number;
  themes: string[];
  generatedAt: string;
}

const ThemedMenusPage: React.FC = () => {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('cannabis');
  const { toast } = useToast();

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/all-themed-menus');
      const data = await response.json();
      
      if (data.success) {
        setMenuData(data);
      } else {
        throw new Error(data.error || 'Failed to fetch menu data');
      }
    } catch (error) {
      console.error('Error fetching menu data:', error);
      toast({
        title: "Error",
        description: "Failed to load themed menus. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openMenuInNewTab = (theme: string) => {
    window.open(`/api/themed-menus/${theme}`, '_blank');
  };

  const downloadMenu = (theme: string, html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${theme}-cannabis-menu.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Complete",
      description: `${theme.charAt(0).toUpperCase() + theme.slice(1)} menu downloaded successfully.`
    });
  };

  const getThemeDescription = (theme: string) => {
    const descriptions = {
      professional: "Clean, corporate design perfect for B2B partnerships and professional presentations",
      modern: "Contemporary purple gradient theme with sleek design elements for trendy dispensaries",
      cannabis: "Gold and green cannabis industry-specific theme with authentic branding",
      wholesale: "Forest green wholesale-focused design for bulk distributors and suppliers",
      luxury: "Premium red and gold luxury theme for high-end cannabis products and experiences"
    };
    return descriptions[theme as keyof typeof descriptions] || "Custom themed menu";
  };

  const getThemeColors = (theme: string) => {
    const colors = {
      professional: "from-blue-500 to-blue-600",
      modern: "from-purple-500 to-purple-600", 
      cannabis: "from-yellow-500 to-green-600",
      wholesale: "from-green-600 to-green-700",
      luxury: "from-red-500 to-red-600"
    };
    return colors[theme as keyof typeof colors] || "from-gray-500 to-gray-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Generating themed menus...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Failed to load themed menus.</p>
            <Button onClick={fetchMenuData} className="mt-4">Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Themed Menu Generator</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-2">
            Professional cannabis menu templates with live flower inventory
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>{menuData.flowerItems} Active Flower Products</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Updated: {new Date(menuData.generatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Theme Selector Tabs */}
        <Tabs value={selectedTheme} onValueChange={setSelectedTheme} className="w-full">
          <TabsList className="grid grid-cols-5 mb-8 h-auto">
            {menuData.themes.map((theme) => (
              <TabsTrigger 
                key={theme} 
                value={theme} 
                className="flex flex-col gap-2 p-4 text-center"
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getThemeColors(theme)}`}></div>
                <span className="capitalize font-medium">{theme}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {menuData.themes.map((theme) => {
            const menu = menuData.menus.find(m => m.theme === theme);
            return (
              <TabsContent key={theme} value={theme}>
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getThemeColors(theme)}`}></div>
                          {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {getThemeDescription(theme)}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-4">
                        {menu?.itemCount || menuData.flowerItems} Products
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Preview Frame */}
                      <div className="border rounded-lg overflow-hidden bg-white shadow-inner">
                        <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                          </div>
                          <span className="text-sm text-gray-600 ml-2">
                            {theme.charAt(0).toUpperCase() + theme.slice(1)} Cannabis Menu Preview
                          </span>
                        </div>
                        <iframe
                          src={`/api/themed-menus/${theme}`}
                          className="w-full h-96 border-0"
                          title={`${theme} menu preview`}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          onClick={() => openMenuInNewTab(theme)}
                          className="flex-1 gap-2"
                          variant="default"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Full Menu
                        </Button>
                        <Button 
                          onClick={() => menu && downloadMenu(theme, menu.html)}
                          className="flex-1 gap-2"
                          variant="outline"
                        >
                          <Download className="h-4 w-4" />
                          Download HTML
                        </Button>
                      </div>

                      {/* Theme Features */}
                      <div className="bg-gray-50 rounded-lg p-4 mt-4">
                        <h4 className="font-medium mb-2">Theme Features:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Responsive design optimized for all devices</li>
                          <li>• Real-time inventory data with live quantities</li>
                          <li>• Direct ordering links to Gold Standard CBD</li>
                          <li>• COA (Certificate of Analysis) access buttons</li>
                          <li>• Professional contact information and branding</li>
                          <li>• Print-friendly layout for physical distribution</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-primary mb-2">Ready to Use</h3>
              <p className="text-muted-foreground">
                All themed menus are generated with live inventory data and can be used immediately 
                for marketing, wholesale catalogs, or customer-facing displays.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ThemedMenusPage;