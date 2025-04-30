import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { apiRequest, apiRequestSimple } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Mic, ImageDown, Image, Loader2 } from 'lucide-react';

interface OptimizationResult {
  url: string;
  size: number;
  width: number;
  height: number;
  format: string;
  altText?: string;
  originalSize: number;
  compressionRatio: number;
}

const ImageOptimizer = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<number>(80);
  const [format, setFormat] = useState<string>('webp');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [generateAltText, setGenerateAltText] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [altText, setAltText] = useState<string>('');
  
  // Speech recognition for alt text dictation
  const startDictation = () => {
    try {
      // Check if the browser supports the Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: 'Speech Recognition Not Supported',
          description: 'Your browser does not support speech recognition. Try using Chrome or Edge.',
          variant: 'destructive',
        });
        return;
      }

      // Create a new instance of SpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAltText(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setSpeechRecognition(recognition);
      recognition.start();
    } catch (error) {
      console.error('Error starting dictation', error);
      toast({
        title: 'Dictation Error',
        description: 'There was an error starting dictation. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const stopDictation = () => {
    if (speechRecognition) {
      speechRecognition.stop();
      setIsListening(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
      
      // Create a preview URL for the dropped file
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Reset any previous results
      setResult(null);
      
      // Clean up the preview URL when the component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
      'image/gif': [],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleOptimize = async () => {
    if (!file) {
      toast({
        title: 'No Image Selected',
        description: 'Please select an image first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('quality', quality.toString());
      formData.append('format', format);
      
      if (width) {
        formData.append('width', width);
      }
      
      if (height) {
        formData.append('height', height);
      }
      
      formData.append('maintainAspectRatio', maintainAspectRatio.toString());
      formData.append('generateAltText', generateAltText.toString());
      
      const response = await apiRequestSimple('/api/optimize-image', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here; it will be set automatically with the correct boundary
        },
      });
      
      setResult(response);
      
      // Set the alt text field if it came back from the API
      if (response.altText) {
        setAltText(response.altText);
      }
      
      toast({
        title: 'Image Optimized',
        description: `Reduced size by ${response.compressionRatio}%`,
      });
    } catch (error) {
      console.error('Error optimizing image:', error);
      toast({
        title: 'Optimization Failed',
        description: 'There was an error optimizing your image',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const copyAltTextToClipboard = () => {
    if (altText) {
      navigator.clipboard.writeText(altText);
      toast({
        title: 'Alt Text Copied',
        description: 'Alt text copied to clipboard',
      });
    }
  };

  const downloadOptimizedImage = () => {
    if (result?.url) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = `optimized-image.${result.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // Initialize screen reader
  const readImageDetails = () => {
    if (result) {
      const details = `Optimized image. Width: ${result.width} pixels. Height: ${result.height} pixels. 
        Format: ${result.format}. File size: ${(result.size / 1024).toFixed(2)} kilobytes. 
        Original size: ${(result.originalSize / 1024).toFixed(2)} kilobytes.
        Compression ratio: ${result.compressionRatio}%.
        Image alt text: ${altText || 'No alt text available.'}`;
        
      // Use the Web Speech API to read the details
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(details);
        window.speechSynthesis.speak(utterance);
      } else {
        toast({
          title: 'Speech Synthesis Not Supported',
          description: 'Your browser does not support speech synthesis.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Optimization Tool</CardTitle>
          <CardDescription>
            Optimize your product images for faster loading and better SEO performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Upload Section */}
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-300 hover:border-primary'
                }`}
              >
                <input {...getInputProps()} />
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-h-40 object-contain mb-4" 
                    />
                    <p className="text-sm text-gray-500">
                      Drop a new image or click to replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Image className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-gray-500">
                      Drag & drop your image here, or click to select
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Supports JPEG, PNG, WebP, and GIF
                    </p>
                  </div>
                )}
              </div>
              
              {/* Original Image Details */}
              {file && (
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">File name:</span> {file.name}</p>
                  <p><span className="font-medium">File size:</span> {(file.size / 1024).toFixed(2)} KB</p>
                  <p><span className="font-medium">File type:</span> {file.type}</p>
                </div>
              )}
            </div>
            
            {/* Settings Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quality">Quality: {quality}%</Label>
                <Slider
                  id="quality"
                  value={[quality]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={(value) => setQuality(value[0])}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger id="format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webp">WebP (recommended)</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="avif">AVIF (best compression)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    placeholder="Auto"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="Auto"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="aspectRatio"
                  checked={maintainAspectRatio}
                  onCheckedChange={setMaintainAspectRatio}
                />
                <Label htmlFor="aspectRatio">Maintain aspect ratio</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="generateAlt"
                  checked={generateAltText}
                  onCheckedChange={setGenerateAltText}
                />
                <Label htmlFor="generateAlt">Generate alt text (uses AI)</Label>
              </div>
              
              <Button
                className="w-full"
                onClick={handleOptimize}
                disabled={!file || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  'Optimize Image'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
            <CardDescription>
              Your image has been optimized successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="border rounded-lg p-4 flex justify-center">
                  <img 
                    src={result.url} 
                    alt="Optimized" 
                    className="max-h-60 object-contain" 
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button onClick={downloadOptimizedImage} className="flex items-center">
                    <ImageDown className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={readImageDetails}
                    className="flex items-center"
                  >
                    <span className="mr-2">🔊</span>
                    Read Details
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="mb-2">
                    <Label className="text-xs">Size Reduction</Label>
                    <Progress value={result.compressionRatio} className="h-2" />
                    <p className="text-sm mt-1">
                      {(result.originalSize / 1024).toFixed(2)} KB → {(result.size / 1024).toFixed(2)} KB ({result.compressionRatio}% smaller)
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Label className="text-xs">Dimensions</Label>
                      <p>{result.width} × {result.height} px</p>
                    </div>
                    <div>
                      <Label className="text-xs">Format</Label>
                      <p>{result.format.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alt-text">Alt Text</Label>
                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={isListening ? stopDictation : startDictation}
                        variant="outline" 
                        size="sm"
                        className="h-8"
                      >
                        <Mic className={`h-4 w-4 ${isListening ? 'text-red-500' : ''}`} />
                        <span className="ml-1 text-xs">
                          {isListening ? 'Stop' : 'Dictate'}
                        </span>
                      </Button>
                      <Button 
                        onClick={copyAltTextToClipboard}
                        variant="outline" 
                        size="sm"
                        className="h-8"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <textarea
                    id="alt-text"
                    className="w-full h-20 px-3 py-2 border rounded-md resize-none"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Alt text for the image"
                  />
                  <p className="text-xs text-gray-500">
                    {altText.length}/125 characters (recommended max)
                  </p>
                </div>
                
                <Alert>
                  <AlertTitle>HTML Code for Lazy Loading</AlertTitle>
                  <AlertDescription className="mt-2">
                    <code className="text-xs block bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
{`<img 
  src="${result.url.substring(0, 40)}..." 
  alt="${altText.substring(0, 30)}${altText.length > 30 ? '...' : ''}" 
  loading="lazy" 
  width="${result.width}" 
  height="${result.height}"
/>`}
                    </code>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Accessibility Features */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Features</CardTitle>
          <CardDescription>
            Tools to help with accessibility and hands-free operation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center justify-start space-x-2"
              onClick={startDictation}
            >
              <Mic className="h-4 w-4" />
              <div className="text-left">
                <p className="font-medium">Voice Dictation</p>
                <p className="text-xs text-gray-500">Use voice to enter text</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center justify-start space-x-2"
              onClick={readImageDetails}
            >
              <span className="text-lg">🔊</span>
              <div className="text-left">
                <p className="font-medium">Screen Reader</p>
                <p className="text-xs text-gray-500">Read image details aloud</p>
              </div>
            </Button>

            <a 
              href="https://help.mrmanifestlister.com/accessibility" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                variant="outline" 
                className="flex items-center justify-start space-x-2 w-full"
              >
                <span className="text-lg">ℹ️</span>
                <div className="text-left">
                  <p className="font-medium">Accessibility Guide</p>
                  <p className="text-xs text-gray-500">Learn about all features</p>
                </div>
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageOptimizer;