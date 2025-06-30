import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Store, 
  Menu, 
  Loader2, 
  ExternalLink, 
  Package,
  DollarSign,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ImportStats {
  imported: number;
  updated: number;
  totalProducts: number;
}

export function ShopifyImportDashboard() {
  const [importing, setImporting] = useState(false);
  const [generatingMenu, setGeneratingMenu] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const { toast } = useToast();

  const handleShopifyImport = async () => {
    setImporting(true);
    setImportStats(null);
    
    try {
      const response = await fetch('/api/shopify/sync-inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setImportStats({
          imported: result.imported || 0,
          updated: result.updated || 0,
          totalProducts: result.totalProducts || 0
        });
        
        toast({
          title: "Shopify Import Successful",
          description: `Imported ${result.imported || 0} new items, updated ${result.updated || 0} existing items`,
          variant: "default"
        });
      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error) {
      console.error('Shopify import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import from Shopify",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateMenu = async () => {
    setGeneratingMenu(true);
    
    try {
      // Open the pound variants menu in a new tab
      window.open('/api/pound-variants-menu', '_blank');
      
      toast({
        title: "Menu Generated",
        description: "Pound variants menu opened in new tab",
        variant: "default"
      });
    } catch (error) {
      console.error('Menu generation error:', error);
      toast({
        title: "Menu Generation Failed",
        description: "Failed to generate pound variants menu",
        variant: "destructive"
      });
    } finally {
      setGeneratingMenu(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold gold-gradient-text">Shopify Integration Dashboard</h2>
        <p className="text-muted-foreground">
          Import current Shopify inventory and generate stylized pound variants menu
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shopify Import Card */}
        <Card className="border-gold/30">
          <CardHeader className="bg-gold/5 border-b border-gold/20">
            <CardTitle className="flex items-center gap-2 text-gold">
              <Store className="h-5 w-5" />
              Shopify Inventory Import
            </CardTitle>
            <CardDescription>
              Import all current products and variants from your Shopify store
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Store Connection</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Connected
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Store Domain</span>
                <span className="text-sm text-muted-foreground">gold-standard-cbd.myshopify.com</span>
              </div>

              {importStats && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Last Import Results</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{importStats.imported}</div>
                        <div className="text-xs text-muted-foreground">Imported</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{importStats.updated}</div>
                        <div className="text-xs text-muted-foreground">Updated</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gold">{importStats.totalProducts}</div>
                        <div className="text-xs text-muted-foreground">Total Products</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleShopifyImport}
              disabled={importing}
              className="w-full bg-gold hover:bg-gold-dark text-black"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import All Shopify Inventory
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Pound Variants Menu Card */}
        <Card className="border-gold/30">
          <CardHeader className="bg-gold/5 border-b border-gold/20">
            <CardTitle className="flex items-center gap-2 text-gold">
              <Menu className="h-5 w-5" />
              Pound Variants Menu
            </CardTitle>
            <CardDescription>
              Generate stylized wholesale menu for active pound variants
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto text-gold mb-2" />
                  <div className="text-sm font-medium">Premium Design</div>
                  <div className="text-xs text-muted-foreground">Professional styling</div>
                </div>
                <div className="text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="text-sm font-medium">Wholesale Pricing</div>
                  <div className="text-xs text-muted-foreground">Current market rates</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-sm font-medium">Live Inventory</div>
                  <div className="text-xs text-muted-foreground">Real-time quantities</div>
                </div>
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <div className="text-sm font-medium">Instant Generation</div>
                  <div className="text-xs text-muted-foreground">Always up-to-date</div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleGenerateMenu}
              disabled={generatingMenu}
              variant="outline"
              className="w-full border-gold hover:bg-gold/10"
            >
              {generatingMenu ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Generate Pound Variants Menu
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Features Overview */}
      <Card className="border-gold/30">
        <CardHeader className="bg-gold/5 border-b border-gold/20">
          <CardTitle className="text-gold">Shopify Integration Features</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border border-gold/20 rounded-lg">
              <Store className="h-8 w-8 mx-auto text-gold mb-2" />
              <div className="font-medium">Live Store Sync</div>
              <div className="text-sm text-muted-foreground mt-1">
                Direct connection to your Shopify store
              </div>
            </div>
            
            <div className="text-center p-4 border border-gold/20 rounded-lg">
              <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="font-medium">Product Variants</div>
              <div className="text-sm text-muted-foreground mt-1">
                Import all product variants with pricing
              </div>
            </div>
            
            <div className="text-center p-4 border border-gold/20 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="font-medium">Inventory Tracking</div>
              <div className="text-sm text-muted-foreground mt-1">
                Real-time quantity synchronization
              </div>
            </div>
            
            <div className="text-center p-4 border border-gold/20 rounded-lg">
              <Menu className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <div className="font-medium">Styled Menus</div>
              <div className="text-sm text-muted-foreground mt-1">
                Professional wholesale catalogs
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}