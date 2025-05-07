import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Camera, FileText, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ImageAnalyzerProps {
  onAnalysisComplete?: (data: any) => void;
}

export function ImageAnalyzer({ onAnalysisComplete }: ImageAnalyzerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Please select an image under 5MB.');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Clear selected file
  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
  };
  
  // Analyze the selected image
  const handleAnalyzeImage = async () => {
    if (!selectedFile) {
      setError('Please select an image to analyze.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }
      
      const data = await response.json();
      setAnalysisResult(data);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during image analysis');
      console.error('Image analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Camera className="w-5 h-5 mr-2 text-primary" />
          AI Image Analyzer
        </CardTitle>
        <CardDescription>
          Upload a product image for AI-powered analysis and attribute extraction
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Image Upload Section */}
        <div className="space-y-4">
          <Label htmlFor="image-upload" className="text-sm font-medium">
            Product Image
          </Label>
          
          {previewUrl ? (
            <div className="relative rounded-md overflow-hidden border border-gray-200">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-h-64 w-full object-contain bg-gray-50"
              />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={handleClearFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900">Upload a product image</p>
                <p className="text-xs text-gray-500 mt-1">
                  Drag and drop or click to browse. JPG, PNG up to 5MB
                </p>
              </div>
              <Input 
                id="image-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleAnalyzeImage} 
            className="w-full"
            disabled={isLoading || !selectedFile}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Analyze Image
              </>
            )}
          </Button>
        </div>
        
        {/* Analysis Results Section */}
        {analysisResult && (
          <div className="mt-6 space-y-4">
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-2">Analysis Results</h3>
              
              {/* Product Name */}
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-700">Detected Product Name</Label>
                <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm">{analysisResult.productName || 'Unknown product'}</p>
                </div>
              </div>
              
              {/* Product Category */}
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-700">Suggested Category</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="px-3 py-1">
                    {analysisResult.category || 'Uncategorized'}
                  </Badge>
                </div>
              </div>
              
              {/* Product Features */}
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-700">Detected Features</Label>
                <div className="mt-1 space-y-2">
                  {analysisResult.features && analysisResult.features.length > 0 ? (
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {analysisResult.features.map((feature: string, index: number) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No specific features detected</p>
                  )}
                </div>
              </div>
              
              {/* Analysis Notes */}
              {analysisResult.notes && (
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm">{analysisResult.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-gray-500">
          Powered by AI image recognition
        </p>
      </CardFooter>
    </Card>
  );
}