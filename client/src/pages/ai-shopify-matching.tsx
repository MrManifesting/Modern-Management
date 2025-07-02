import React from 'react';
import { Helmet } from 'react-helmet';
import { AIShopifyMatcher } from '@/components/ai-shopify-matcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Link2, Zap, Target } from 'lucide-react';

export default function AIShopifyMatchingPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <Helmet>
        <title>AI Shopify Matching | Gold-Standard_Management</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-6">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">AI Shopify Matching</h1>
            <p className="text-muted-foreground">
              Intelligently link your inventory items to Shopify products using advanced AI analysis
            </p>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-blue-500" />
                Smart Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI analyzes strain names, weights, categories, and product descriptions to find the most accurate Shopify matches
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-green-500" />
                High Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Advanced fuzzy matching algorithms provide confidence scores and detailed reasoning for each match
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-yellow-500" />
                Batch Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Process multiple items simultaneously with intelligent batching and progress tracking
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              How AI Shopify Matching Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Analysis Process</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-primary">1.</span>
                    Extract strain names from product titles (e.g., "Blueberry Muffin")
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-primary">2.</span>
                    Identify product weights and categories (flower, concentrate, edible)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-primary">3.</span>
                    Analyze quality tiers (Top Shelf, AA Indoor, etc.)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-primary">4.</span>
                    Compare against live Shopify product catalog
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Matching Criteria</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-green-500">✓</span>
                    Strain name similarity (highest priority)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-green-500">✓</span>
                    Weight and size matching
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-green-500">✓</span>
                    Product type and category alignment
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-green-500">✓</span>
                    SKU pattern recognition
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Matcher Component */}
        <AIShopifyMatcher showBatchMode={true} />

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Benefits of AI Shopify Matching</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Operational Efficiency</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Reduce manual product linking time by 90%</li>
                  <li>• Eliminate human errors in product matching</li>
                  <li>• Process hundreds of items in minutes</li>
                  <li>• Real-time confidence scoring</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">Business Impact</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Improve inventory synchronization accuracy</li>
                  <li>• Enable better pricing and stock management</li>
                  <li>• Enhance customer experience with correct links</li>
                  <li>• Streamline multi-platform operations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}