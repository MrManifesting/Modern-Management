import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MAIN_CATEGORIES, 
  FLOWER_QUALITY_GRADES, 
  FLOWER_STRAIN_TYPES,
  ALL_FLOWER_QUALITIES,
  BULK_SIZES,
  WEIGHT_OPTIONS,
  VENDOR_OPTIONS,
  FLOWER_QUALITY_OPTIONS,
  getSubcategoriesForCategory
} from "./category-data";
import { itemFormSchema, ItemForm, Item } from "@shared/schema";
import { useDropzone } from "react-dropzone";
import { Zap, Image as ImageIcon, X, Upload, PlusCircle, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import BulkUpload from "./bulk-upload";
import TelegramPhotos from "./telegram-photos";

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
    basePrice: 0,
    category: "Flower",
    condition: "New",
    status: "draft",
    images: [],
    tags: [],
    marketplace: [],
    weight: "454", // 1 pound default
    brand: "Gold Standard",
    attributes: {}, // Will store flowerQuality, flowerCategory, and other custom attributes
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
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues,
  });

  // Handle file preview URLs cleanup
  useEffect(() => {
    return () => {
      // Revoke object URLs to avoid memory leaks
      imageUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageUrls]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    onDrop: (acceptedFiles) => {
      setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
      
      // Create preview URLs for display
      const newUrls = acceptedFiles.map(file => URL.createObjectURL(file));
      setImageUrls(prevUrls => [...prevUrls, ...newUrls]);
    },
  });

  const removeImage = (index: number) => {
    // Revoke the object URL first to prevent memory leaks
    if (imageUrls[index] && imageUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(imageUrls[index]);
    }
    
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

  // Bulk upload functionality
  
  const handleBulkUploadComplete = (items: Array<{ images: File[] }>) => {
    // Use the first item's data to populate this form
    if (items.length > 0) {
      const firstItem = items[0];
      
      // Set the files
      setFiles(firstItem.images);
      
      // Create preview URLs for display
      const newUrls = firstItem.images.map(file => URL.createObjectURL(file));
      setImageUrls(newUrls);
      
      // Close dialog
      setBulkUploadOpen(false);
      
      toast({
        title: "Bulk Upload Complete",
        description: `Added ${items.length} items with the first one shown. Save this item, then add the others.`,
      });
    }
  };

  // Weight options are now static - no need for dynamic state

  const conditions = [
    "New",
    "Like New",
    "Very Good",
    "Good",
    "Acceptable",
    "For Parts",
  ];

  const statuses = ["draft", "listed", "sold"];
  
  // Set default values when form is initialized
  useEffect(() => {
    if (!form.getValues("weight")) {
      form.setValue("weight", "1 pound");
    }
    if (!form.getValues("category")) {
      form.setValue("category", "Flower");
    }
    if (!form.getValues("brand")) {
      form.setValue("brand", "Gold Standard");
    }
    // Set flower quality default if it's a flower product
    if (!form.getValues("condition")) {
      form.setValue("condition", "Top Shelf");
    }
  }, []);

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
                    {MAIN_CATEGORIES.map((category) => (
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



          {/* Weight field - standardized weight options */}
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Weight</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "1 pound"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WEIGHT_OPTIONS.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
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
            name="basePrice"
            render={({ field }) => {
              return (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Price</FormLabel>
                  </div>
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
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 1 : parseInt(e.target.value);
                        field.onChange(isNaN(value) ? 1 : value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flower Quality</FormLabel>
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
                    {FLOWER_QUALITY_OPTIONS.map((quality) => (
                      <SelectItem key={quality} value={quality}>
                        {quality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel>Flower Quality</FormLabel>
              <Select 
                onValueChange={(value) => {
                  // Store flower quality in attributes
                  const currentAttributes = form.getValues("attributes") as Record<string, any> || {};
                  form.setValue("attributes", {
                    ...currentAttributes,
                    flowerQuality: value
                  } as any);
                }}
                defaultValue={(form.getValues("attributes") as any)?.flowerQuality || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select flower quality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ALL_FLOWER_QUALITIES.map((quality) => (
                    <SelectItem key={quality} value={quality}>
                      {quality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
            
            <FormItem>
              <FormLabel>Flower Category</FormLabel>
              <Select 
                onValueChange={(value) => {
                  // Store flower category in attributes
                  const currentAttributes = form.getValues("attributes") as Record<string, any> || {};
                  form.setValue("attributes", {
                    ...currentAttributes,
                    flowerCategory: value
                  } as any);
                }}
                defaultValue={(form.getValues("attributes") as any)?.flowerCategory || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FLOWER_STRAIN_TYPES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
            

            
            <FormItem>
              <FormLabel>Bulk Categorization</FormLabel>
              <Select 
                onValueChange={(value) => {
                  // Store bulk category in attributes
                  const currentAttributes = form.getValues("attributes") as Record<string, any> || {};
                  form.setValue("attributes", {
                    ...currentAttributes,
                    bulkCategory: value
                  } as any);
                }}
                defaultValue={(form.getValues("attributes") as any)?.bulkCategory || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bulk category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BULK_SIZES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </div>

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
          
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 sm:col-span-2 border rounded-md p-4 bg-background">
            <FormControl>
              <Checkbox 
                checked={(form.getValues("attributes") as any)?.allowDragDropBreakdown || false}
                onCheckedChange={(checked) => {
                  // Store in attributes object
                  const currentAttributes = form.getValues("attributes") as Record<string, any> || {};
                  form.setValue("attributes", {
                    ...currentAttributes,
                    allowDragDropBreakdown: checked
                  } as any);
                }}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Enable Drag & Drop Breakdown</FormLabel>
              <FormDescription>
                Allow this bulk item to be broken down using the drag and drop interface
              </FormDescription>
            </div>
          </FormItem>

          <div className="sm:col-span-2">
            <div className="flex justify-between items-center">
              <FormLabel>Photos</FormLabel>
              <div className="flex space-x-2">
                <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" /> Bulk Upload
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Bulk Upload Items</DialogTitle>
                    </DialogHeader>
                    <BulkUpload onComplete={handleBulkUploadComplete} />
                  </DialogContent>
                </Dialog>
                
                {/* Telegram integration component */}
                <TelegramPhotos 
                  onSelectPhoto={(photoUrl) => {
                    // Add the selected photo to our image URLs
                    setImageUrls(prevUrls => [...prevUrls, photoUrl]);
                    
                    toast({
                      title: "Photo Added",
                      description: "Telegram photo added to this item.",
                    });
                  }}
                />
              </div>
            </div>
            <div className="mt-1">
              <div 
                {...getRootProps()} 
                className="mt-1 flex justify-center border-2 border-dashed border-gray-300 rounded-md px-6 pt-5 pb-6"
              >
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer rounded-md bg-white font-medium text-primary-600 hover:text-primary-500">
                      <span>Upload files</span>
                      <input {...getInputProps()} className="sr-only" />
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
