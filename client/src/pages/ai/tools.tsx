import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageAnalyzer, DescriptionGenerator, InventoryInsights } from '@/components/ai';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { check_secrets } from '@/lib/secrets';

const AiToolsPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('analyzer');

  // Check if OpenAI API key is configured
  const { data: apiStatus, isLoading } = useQuery({
    queryKey: ['/api/ai/status'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/ai/status');
    }
  });

  const hasApiKey = apiStatus?.configured || false;

  // Get secret key if not configured
  const handleSetupApiKey = () => {
    check_secrets(['OPENAI_API_KEY'], 'OpenAI API key is required to use AI features. Please provide your API key to continue.');
    toast({
      title: "API key needed",
      description: "Please provide your OpenAI API key to use the AI features",
    });
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <Helmet>
        <title>AI Tools | Gold-Standard_Management</title>
      </Helmet>

      <div className="flex items-center space-x-2 mb-6">
        <Sparkles className="h-6 w-6 text-blue-500" />
        <h1 className="text-3xl font-bold">AI Tools</h1>
      </div>

      <p className="text-gray-500 mb-8">
        Leverage artificial intelligence to enhance your inventory management. Automatically analyze product images, 
        generate professional descriptions, and gain insights from your inventory data.
      </p>

      {!hasApiKey && !isLoading ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>OpenAI API Configuration Required</CardTitle>
            <CardDescription>
              AI features require an OpenAI API key to function.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTitle>API Key Missing</AlertTitle>
              <AlertDescription>
                To use the AI features, you need to provide an OpenAI API key.
                You can get an API key from <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI's website</a>.
              </AlertDescription>
            </Alert>
            <Button onClick={handleSetupApiKey}>
              <Sparkles className="mr-2 h-4 w-4" />
              Configure API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analyzer">Image Analyzer</TabsTrigger>
            <TabsTrigger value="generator">Description Generator</TabsTrigger>
            <TabsTrigger value="insights">Inventory Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analyzer" className="mt-6">
            <ImageAnalyzer 
              onAnalysisComplete={(data) => {
                toast({
                  title: "Image analysis complete",
                  description: "You can now apply these details to your products",
                  variant: "default"
                });
              }}
            />
          </TabsContent>
          
          <TabsContent value="generator" className="mt-6">
            <DescriptionGenerator 
              onDescriptionGenerated={(description) => {
                toast({
                  title: "Description generated",
                  description: "You can now use this description for your products",
                  variant: "default"
                });
              }}
            />
          </TabsContent>
          
          <TabsContent value="insights" className="mt-6">
            <InventoryInsights />
          </TabsContent>
        </Tabs>
      )}
      
      <div className="text-sm text-gray-500 mt-8">
        <h3 className="font-medium mb-2">About AI Tools</h3>
        <p>
          These tools utilize OpenAI's advanced language and vision models to help you manage your inventory more efficiently.
          The image analyzer can identify product attributes from photos, while the description generator creates professional
          product descriptions. The insights tool analyzes your inventory data to provide actionable recommendations.
        </p>
        <p className="mt-2">
          Note: AI features require an internet connection and a valid OpenAI API key. Your API usage may be billed
          according to OpenAI's pricing policy.
        </p>
      </div>
    </div>
  );
};

export default AiToolsPage;