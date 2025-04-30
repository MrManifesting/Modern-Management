import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { itemFormSchema, ItemForm, Item, AIAnalysis } from "@shared/schema";
import { useDropzone } from "react-dropzone";
import { Zap, Image, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ItemFormProps {
  defaultValues?: Partial<ItemForm>;
  onSubmit: (data: ItemForm) => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function ItemFormComponent({
  defaultValues = {
    name: "",
    description: "",
    price: 0,
    category: "Electronics",
    condition: "Used",
    status: "draft",
    images: [],
    tags: [],
    marketplace: [],
    aiEnhanced: false,
    aiTags: [],
  },
  onSubmit,
  isLoading = false,
  isEditing = false,
}: ItemFormProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(
    (defaultValues.images as string[]) || []
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues,
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file =>
        Object.assign(file, {
          preview: URL.createObjectURL(file)
        })
      );
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      
      // Create preview URLs for display
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setImageUrls(prevUrls => [...prevUrls, ...newUrls]);
    },
  });

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: ItemForm) => {
    // Include the files with the form data
    onSubmit({
      ...data,
      files,
    });
  };

  const analyzeWithAI = async () => {
    if (files.length === 0) {
      toast({
        title: "No image selected",
        description: "Please upload at least one image to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Create form data with the first image
      const formData = new FormData();
      formData.append("image", files[0]);

      // Send request to analyze image
      const response = await apiRequest("POST", "/api/analyze-image", formData);
      const analysisResult: AIAnalysis = await response.json();

      // Update form with AI analysis
      if (analysisResult) {
        form.setValue("name", analysisResult.name || form.getValues("name"));
        form.setValue("description", analysisResult.description || form.getValues("description"));
        form.setValue("category", analysisResult.category || form.getValues("category"));
        form.setValue("condition", analysisResult.condition || form.getValues("condition"));
        form.setValue("price", analysisResult.suggestedPrice || form.getValues("price"));
        form.setValue("tags", analysisResult.tags || form.getValues("tags"));
        form.setValue("seoTitle", analysisResult.seoTitle || form.getValues("seoTitle"));
        form.setValue("seoDescription", analysisResult.seoDescription || form.getValues("seoDescription"));
        form.setValue("aiEnhanced", true);

        toast({
          title: "AI Analysis Complete",
          description: "Item details have been populated based on the image.",
        });
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const categories = [
    "Electronics",
    "Clothing",
    "Home Goods",
    "Collectibles",
    "Toys",
    "Books",
    "Jewelry",
    "Art",
    "Sporting Goods",
    "Automotive",
    "Other",
  ];

  const conditions = [
    "New",
    "Like New",
    "Very Good",
    "Good",
    "Acceptable",
    "For Parts",
  ];

  const statuses = ["draft", "listed", "sold"];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter item name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter item description"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-2">
            <FormLabel>Photos</FormLabel>
            <div className="mt-1">
              <div 
                {...getRootProps()} 
                className="mt-1 flex justify-center border-2 border-dashed border-gray-300 rounded-md px-6 pt-5 pb-6"
              >
                <div className="space-y-1 text-center">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-primary-600 hover:text-primary-500">
                      <span>Upload files</span>
                      <input {...getInputProps()} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>

              {/* Preview uploaded images */}
              {imageUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative h-20 w-20">
                      <img
                        src={url}
                        alt={`Preview ${index}`}
                        className="h-full w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 rounded-full bg-white p-1 shadow-md"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-md">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Use AI to identify item and generate details
                </h3>
                <p className="text-xs text-gray-500">
                  Our AI will analyze your photos and suggest item details
                </p>
              </div>
              <div className="ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing || files.length === 0}
                >
                  {isAnalyzing ? "Analyzing..." : "Run AI Analysis"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : isEditing ? "Update Item" : "Save Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
