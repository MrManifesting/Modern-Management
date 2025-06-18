import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, SquarePen, CopyIcon, CheckIcon, PlusCircle, MinusCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Product categories
const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Beauty',
  'Home',
  'Office',
  'Sports',
  'Food',
  'Toys',
  'Furniture',
  'Automotive',
  'Other'
];

interface DescriptionGeneratorProps {
  onDescriptionGenerated?: (description: string) => void;
}

export function DescriptionGenerator({ onDescriptionGenerated }: DescriptionGeneratorProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Add a new feature input field
  const addFeature = () => {
    setFeatures([...features, '']);
  };
  
  // Remove a feature input field
  const removeFeature = (index: number) => {
    const newFeatures = [...features];
    newFeatures.splice(index, 1);
    setFeatures(newFeatures.length ? newFeatures : ['']);
  };
  
  // Update a feature input field
  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };
  
  // Generate product description based on inputs
  const handleGenerateDescription = async () => {
    // Validate inputs
    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }
    
    if (!category) {
      setError('Category is required');
      return;
    }
    
    // Filter out empty features
    const nonEmptyFeatures = features.filter(f => f.trim());
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: productName.trim(),
          category,
          features: nonEmptyFeatures,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }
      
      const data = await response.json();
      setGeneratedDescription(data.description);
      
      if (onDescriptionGenerated) {
        onDescriptionGenerated(data.description);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating the description');
      console.error('Description generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Copy generated description to clipboard
  const copyToClipboard = () => {
    if (generatedDescription) {
      navigator.clipboard.writeText(generatedDescription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <SquarePen className="w-5 h-5 mr-2 text-primary" />
          AI Description Generator
        </CardTitle>
        <CardDescription>
          Generate professional product descriptions using AI
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Product Name Input */}
          <div>
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter the product name"
              className="mt-1"
            />
          </div>
          
          {/* Category Dropdown */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={setCategory}
            >
              <SelectTrigger id="category" className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Features Input Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Key Features (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeature}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Feature
              </Button>
            </div>
            
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  placeholder={`Feature ${index + 1}`}
                />
                {features.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                    className="shrink-0"
                  >
                    <MinusCircle className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleGenerateDescription} 
            className="w-full"
            disabled={isLoading || !productName.trim() || !category}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SquarePen className="mr-2 h-4 w-4" />
                Generate Description
              </>
            )}
          </Button>
        </div>
        
        {/* Generated Description Output */}
        {generatedDescription && (
          <div className="mt-6">
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Generated Description</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              
              <div className="relative">
                <Textarea
                  value={generatedDescription}
                  readOnly
                  className="min-h-[200px] bg-gray-50"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t pt-4">
        <p className="text-xs text-gray-500">
          Descriptions are generated using AI based on the information you provide.
          You can edit the result to better match your specific needs.
        </p>
      </CardFooter>
    </Card>
  );
}