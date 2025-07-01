import React, { useState } from 'react';
import VoiceSearch from '@/components/mobile/voice-search';
import MobileNavigation from '@/components/mobile/mobile-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Mic, Search, Smartphone, Volume2 } from 'lucide-react';

interface SearchResult {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
}

export const VoiceSearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch inventory data for voice search
  const { data: inventoryData } = useQuery({
    queryKey: ['/api/items'],
    enabled: false // Only fetch when we need to search
  });

  const handleVoiceSearchResults = async (query: string, results: any[]) => {
    setSearchQuery(query);
    setIsSearching(true);

    try {
      // Simulate API search - in real implementation, this would call your search API
      if (inventoryData && Array.isArray(inventoryData)) {
        const filtered = inventoryData
          .filter((item: any) => 
            item.name?.toLowerCase().includes(query.toLowerCase()) ||
            item.sku?.toLowerCase().includes(query.toLowerCase()) ||
            item.category?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10) // Limit results
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            price: item.basePrice || item.salePrice || 0,
            quantity: item.quantity || 0
          }));
        
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice search error:', error);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold gold-gradient-text flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Search
              </h1>
              <p className="text-sm text-muted-foreground">
                Hands-free inventory search and commands
              </p>
            </div>
            <Badge variant="secondary" className="bg-gold/10 text-gold">
              Beta
            </Badge>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Voice Search Component */}
        <VoiceSearch
          onSearchResults={handleVoiceSearchResults}
          onError={handleVoiceError}
        />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Voice Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-2 touch-manipulation"
                onClick={() => handleVoiceSearchResults("top shelf", [])}
              >
                <Search className="h-5 w-5" />
                <span className="text-sm">Top Shelf</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-2 touch-manipulation"
                onClick={() => handleVoiceSearchResults("bulk pounds", [])}
              >
                <Search className="h-5 w-5" />
                <span className="text-sm">Bulk Pounds</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-2 touch-manipulation"
                onClick={() => handleVoiceSearchResults("indica", [])}
              >
                <Search className="h-5 w-5" />
                <span className="text-sm">Indica</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-2 touch-manipulation"
                onClick={() => handleVoiceSearchResults("sativa", [])}
              >
                <Search className="h-5 w-5" />
                <span className="text-sm">Sativa</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchQuery && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Search Results</span>
                <Badge variant="outline">{searchResults.length} found</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing results for: "{searchQuery}"
              </p>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm">{result.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {result.quantity} units
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>SKU: {result.sku}</span>
                        <span className="font-medium text-foreground">
                          ${result.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.category}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No results found for "{searchQuery}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0"></div>
                <div>
                  <p className="font-medium">Product Search</p>
                  <p className="text-muted-foreground">Say "search for [product name]" to find specific items</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0"></div>
                <div>
                  <p className="font-medium">Category Filtering</p>
                  <p className="text-muted-foreground">Use commands like "filter by top shelf" or "show indica products"</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0"></div>
                <div>
                  <p className="font-medium">Quick Navigation</p>
                  <p className="text-muted-foreground">Say "show inventory" or "display bulk products"</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0"></div>
                <div>
                  <p className="font-medium">Help Commands</p>
                  <p className="text-muted-foreground">Say "help" to hear available voice commands</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default VoiceSearchPage;