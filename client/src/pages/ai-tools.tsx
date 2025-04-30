import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Zap, Upload, Camera, Copy } from "lucide-react";
import { useDropzone } from "react-dropzone";

export default function AITools() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("seo");
  
  // SEO Generation
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [seoResults, setSeoResults] = useState<{
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
  } | null>(null);

  // Image Analysis
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null);

  // SEO generation mutation
  const seoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate-seo", {
        itemDescription: description,
        category,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSeoResults(data);
      toast({
        title: "SEO content generated",
        description: "Your SEO content has been successfully generated.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to generate SEO content. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Image analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async () => {
      if (!image) return;
      
      const formData = new FormData();
      formData.append("image", image);
      
      const res = await apiRequest("POST", "/api/analyze-image", formData);
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisResults(data);
      toast({
        title: "Image analysis complete",
        description: "Your image has been successfully analyzed.",
      });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Failed to analyze the image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file drop for image analysis
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    },
  });

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to clipboard",
    });
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>AI Tools</CardTitle>
          <CardDescription>
            Use our AI tools to enhance your listings and save time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="seo" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="seo">
                <Zap className="mr-2 h-4 w-4" />
                SEO Content Generation
              </TabsTrigger>
              <TabsTrigger value="image">
                <Camera className="mr-2 h-4 w-4" />
                Image Analysis
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="seo" className="mt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Description
                  </label>
                  <Textarea
                    placeholder="Enter your item description here..."
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Electronics, Clothing, Collectibles"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={() => seoMutation.mutate()}
                  disabled={!description || seoMutation.isPending}
                  className="w-full"
                >
                  {seoMutation.isPending ? "Generating..." : "Generate SEO Content"}
                </Button>
                
                {seoResults && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">SEO Title</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(seoResults.seoTitle)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm">{seoResults.seoTitle}</p>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">SEO Description</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(seoResults.seoDescription)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm">{seoResults.seoDescription}</p>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Keywords</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(seoResults.keywords.join(", "))}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {seoResults.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="image" className="mt-4">
              <div className="space-y-4">
                <div
                  {...getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input {...getInputProps()} />
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 max-w-full mb-4 rounded"
                      />
                      <p className="text-sm text-gray-500">
                        Click or drag to replace the image
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Drag and drop an image here, or click to select a file
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={() => analysisMutation.mutate()}
                  disabled={!image || analysisMutation.isPending}
                  className="w-full"
                >
                  {analysisMutation.isPending ? "Analyzing..." : "Analyze Image"}
                </Button>
                
                {analysisResults && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium mb-2">Analysis Results</h3>
                      
                      {analysisResults.name && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Product Name:</h4>
                          <p className="text-sm">{analysisResults.name}</p>
                        </div>
                      )}
                      
                      {analysisResults.category && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Category:</h4>
                          <p className="text-sm">{analysisResults.category}</p>
                        </div>
                      )}
                      
                      {analysisResults.condition && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Condition:</h4>
                          <p className="text-sm">{analysisResults.condition}</p>
                        </div>
                      )}
                      
                      {analysisResults.suggestedPrice && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Suggested Price:</h4>
                          <p className="text-sm">${analysisResults.suggestedPrice.toFixed(2)}</p>
                        </div>
                      )}
                      
                      {analysisResults.description && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Description:</h4>
                          <p className="text-sm">{analysisResults.description}</p>
                        </div>
                      )}
                      
                      {analysisResults.tags && analysisResults.tags.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Tags:</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {analysisResults.tags.map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <Button variant="outline" className="w-full">
                          Add to Inventory
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
