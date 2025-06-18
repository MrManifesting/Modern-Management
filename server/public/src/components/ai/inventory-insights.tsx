import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, TrendingUp, Lightbulb, Tag } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

export function InventoryInsights() {
  const { toast } = useToast();
  const [openSection, setOpenSection] = useState<'insights' | 'recommendations' | 'trending' | null>(null);

  // Toggle section visibility
  const toggleSection = (section: 'insights' | 'recommendations' | 'trending') => {
    setOpenSection(openSection === section ? null : section);
  };

  // Fetch inventory insights
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/ai/inventory-insights'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/ai/inventory-insights');
    },
    refetchOnWindowFocus: false
  });

  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing insights",
      description: "Analyzing your inventory data",
    });
  };

  // Render insight items with icons
  const renderInsightItems = (insights: string[]) => {
    return insights.map((insight, index) => (
      <div key={index} className="flex items-start gap-2 mb-2">
        <Lightbulb className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p>{insight}</p>
      </div>
    ));
  };

  // Render recommendation items with icons
  const renderRecommendationItems = (recommendations: string[]) => {
    return recommendations.map((recommendation, index) => (
      <div key={index} className="flex items-start gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <p>{recommendation}</p>
      </div>
    ));
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-blue-500" />
          AI Inventory Insights
        </CardTitle>
        <CardDescription>
          Smart analysis of your inventory data to help you make better decisions
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-center text-gray-500">
              Analyzing your inventory data...
            </p>
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Error loading insights</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load AI insights'}
            </AlertDescription>
          </Alert>
        ) : !data ? (
          <div className="text-center py-6 text-gray-500">
            <p>No insights available.</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Insights Section */}
            <div>
              <Button
                variant="ghost"
                className="flex w-full justify-between p-0 hover:bg-transparent"
                onClick={() => toggleSection('insights')}
              >
                <div className="flex items-center font-medium text-lg">
                  <Lightbulb className="mr-2 h-5 w-5 text-blue-500" />
                  Inventory Insights
                </div>
                <div className={`transform transition-transform ${openSection === 'insights' ? 'rotate-180' : ''}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Button>
              
              {openSection === 'insights' && (
                <div className="mt-4 pl-2">
                  {data.insights && data.insights.length > 0 ? (
                    renderInsightItems(data.insights)
                  ) : (
                    <p className="text-gray-500 italic">No insights available.</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Recommendations Section */}
            <div>
              <Button
                variant="ghost"
                className="flex w-full justify-between p-0 hover:bg-transparent"
                onClick={() => toggleSection('recommendations')}
              >
                <div className="flex items-center font-medium text-lg">
                  <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                  Recommendations
                </div>
                <div className={`transform transition-transform ${openSection === 'recommendations' ? 'rotate-180' : ''}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Button>
              
              {openSection === 'recommendations' && (
                <div className="mt-4 pl-2">
                  {data.recommendations && data.recommendations.length > 0 ? (
                    renderRecommendationItems(data.recommendations)
                  ) : (
                    <p className="text-gray-500 italic">No recommendations available.</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Trending Categories Section */}
            <div>
              <Button
                variant="ghost"
                className="flex w-full justify-between p-0 hover:bg-transparent"
                onClick={() => toggleSection('trending')}
              >
                <div className="flex items-center font-medium text-lg">
                  <Tag className="mr-2 h-5 w-5 text-purple-500" />
                  Trending Categories
                </div>
                <div className={`transform transition-transform ${openSection === 'trending' ? 'rotate-180' : ''}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Button>
              
              {openSection === 'trending' && (
                <div className="mt-4">
                  {data.trendingCategories && data.trendingCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.trendingCategories.map((category, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No trending categories available.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-gray-500">
          Powered by AI analysis of your inventory data
        </p>
        
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Analysis
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}