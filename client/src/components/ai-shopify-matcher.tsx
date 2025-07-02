import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ExternalLink, Brain, Zap, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AIShopifyMatcherProps {
  itemId?: number;
  items?: any[];
  showBatchMode?: boolean;
}

export function AIShopifyMatcher({ itemId, items = [], showBatchMode = false }: AIShopifyMatcherProps) {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [matchProgress, setMatchProgress] = useState(0);
  const queryClient = useQueryClient();

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['/api/ai/status'],
    queryFn: () => fetch('/api/ai/status').then(res => res.json())
  });

  // Single item matching mutation
  const singleMatchMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest(`/api/ai/match-shopify/${itemId}`, { method: 'POST' });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/ai-enhanced'] });
    }
  });

  // Batch matching mutation
  const batchMatchMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      const response = await apiRequest('/api/ai/batch-match-shopify', {
        method: 'POST',
        body: JSON.stringify({ itemIds }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/ai-enhanced'] });
      setSelectedItems([]);
      setMatchProgress(0);
    }
  });

  // Get AI enhanced inventory
  const { data: aiEnhancedItems, isLoading: loadingEnhanced } = useQuery({
    queryKey: ['/api/inventory/ai-enhanced'],
    queryFn: () => fetch('/api/inventory/ai-enhanced').then(res => res.json()),
    enabled: showBatchMode
  });

  const handleSingleMatch = (itemId: number) => {
    singleMatchMutation.mutate(itemId);
  };

  const handleBatchMatch = () => {
    if (selectedItems.length === 0) return;
    
    // Simulate progress for user feedback
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 100 / selectedItems.length;
      setMatchProgress(Math.min(progress, 95));
    }, 500);

    batchMatchMutation.mutate(selectedItems, {
      onSettled: () => {
        clearInterval(progressInterval);
        setMatchProgress(100);
        setTimeout(() => setMatchProgress(0), 2000);
      }
    });
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>;
    if (confidence >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>;
    if (confidence >= 0.3) return <Badge className="bg-orange-100 text-orange-800">Low Confidence</Badge>;
    return <Badge variant="destructive">No Match</Badge>;
  };

  if (!aiStatus?.configured) {
    return (
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          AI features require OpenAI API key configuration. Please contact your administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Shopify Matcher
          </CardTitle>
          <CardDescription>
            Use AI to intelligently match your inventory items to Shopify products with high accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <CheckCircle className="h-4 w-4 text-green-500" />
            AI Status: {aiStatus?.model} Ready
            <Badge variant="outline">
              {aiStatus?.features?.length || 0} Features Available
            </Badge>
          </div>

          {/* Single Item Mode */}
          {itemId && (
            <div className="space-y-4">
              <Button
                onClick={() => handleSingleMatch(itemId)}
                disabled={singleMatchMutation.isPending}
                className="w-full"
              >
                {singleMatchMutation.isPending ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    AI Matching in Progress...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Find Shopify Match with AI
                  </>
                )}
              </Button>

              {singleMatchMutation.data && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Match Result</span>
                    {getConfidenceBadge(singleMatchMutation.data.match.confidence)}
                  </div>
                  
                  {singleMatchMutation.data.match.success ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {singleMatchMutation.data.match.reasoning}
                      </p>
                      {singleMatchMutation.data.match.shopifyHandle && (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://gold-standard-cbd.myshopify.com/products/${singleMatchMutation.data.match.shopifyHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Shopify
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {singleMatchMutation.data.match.reasoning}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Batch Mode */}
          {showBatchMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">Batch AI Matching</h3>
                  <p className="text-sm text-muted-foreground">
                    Select items to match with Shopify products using AI analysis
                  </p>
                </div>
                
                {selectedItems.length > 0 && (
                  <Button
                    onClick={handleBatchMatch}
                    disabled={batchMatchMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {batchMatchMutation.isPending ? (
                      <>
                        <Zap className="h-4 w-4 animate-spin" />
                        Matching {selectedItems.length} items...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Match {selectedItems.length} Selected
                      </>
                    )}
                  </Button>
                )}
              </div>

              {(batchMatchMutation.isPending || matchProgress > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>AI Matching Progress</span>
                    <span>{Math.round(matchProgress)}%</span>
                  </div>
                  <Progress value={matchProgress} className="h-2" />
                </div>
              )}

              {batchMatchMutation.data && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully matched {batchMatchMutation.data.successfulMatches} out of {batchMatchMutation.data.totalItems} items with Shopify products.
                  </AlertDescription>
                </Alert>
              )}

              {/* Items Grid */}
              {loadingEnhanced ? (
                <div className="text-center py-8">
                  <Zap className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading AI enhanced inventory...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(aiEnhancedItems || items).slice(0, 12).map((item: any) => (
                    <Card 
                      key={item.id} 
                      className={`cursor-pointer transition-all ${
                        selectedItems.includes(item.id) 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {item.weight} • {item.category}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                              className="mt-1"
                            />
                          </div>

                          {item.shopifyMatch && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Shopify Match</span>
                                {getConfidenceBadge(item.matchConfidence)}
                              </div>
                              
                              {item.shopifyUrl && (
                                <Button variant="outline" size="sm" className="w-full h-8 text-xs" asChild>
                                  <a href={item.shopifyUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View Match
                                  </a>
                                </Button>
                              )}
                            </div>
                          )}

                          {!item.shopifyMatch && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Ready for AI matching
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}