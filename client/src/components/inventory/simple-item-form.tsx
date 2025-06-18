import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package } from "lucide-react";
import MobilePhotoUpload from "@/components/mobile/mobile-photo-upload";
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
import { type Item } from "@shared/schema";

// Simple form schema matching available fields
const simpleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  sku: z.string().optional(),
  brand: z.string().default("Gold Standard"),
  status: z.string().default("draft"),
  costPrice: z.string().optional(),
  basePrice: z.string().optional(),
  salePrice: z.string().optional(),
  wholesalePrice: z.string().optional(),
  category: z.string().default("Bulk Flower"),
  quantity: z.string().default("1"),
  weight: z.string().optional(),

  tier: z.string().optional(),
  strainType: z.string().optional(),
  imageUrl: z.string().optional(),
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
  dimensions: z.string().optional(),
  condition: z.string().optional(),
  tags: z.array(z.string()).default([]),
  thcaPercentage: z.string().optional(),
  itemType: z.string().optional(),
  visibility: z.string().optional(),
  marketplace: z.array(z.any()).default([]),
});

type SimpleFormData = z.infer<typeof simpleFormSchema>;

interface SimpleItemFormProps {
  defaultValues?: Partial<Item>;
  onSubmit: (data: SimpleFormData) => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

const CATEGORIES = ["Bulk Flower", "Flower", "Edibles", "Concentrates", "Accessories"];
const STRAIN_TYPES = ["Indica", "Sativa", "Hybrid", "CBD", "THCA", "THCP"];
const WEIGHT_OPTIONS = ["1 pound", "half pound", "quarter pound", "ounce", "half ounce", "quarter ounce", "eighth", "gram"];
const BRANDS = ["Gold Standard", "Mason Jar Co", "Premium Supply"];
const TIERS = ["Top Shelf", "Mid Shelf", "Budget"];

export default function SimpleItemForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  isEditing = false
}: SimpleItemFormProps) {
  const form = useForm<SimpleFormData>({
    resolver: zodResolver(simpleFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      sku: defaultValues?.sku || "",
      brand: defaultValues?.brand || "Gold Standard",
      status: defaultValues?.status || "draft",
      costPrice: defaultValues?.costPrice || "",
      basePrice: defaultValues?.basePrice || "",
      salePrice: defaultValues?.salePrice || "",
      wholesalePrice: defaultValues?.wholesalePrice || "",
      category: defaultValues?.category || "Bulk Flower",
      quantity: String(defaultValues?.quantity || 1),
      weight: defaultValues?.weight || "1 pound",
      tier: defaultValues?.tier || "Top Shelf",
      strainType: defaultValues?.strainType || "",
      imageUrl: defaultValues?.imageUrl || "",
    }
  });

  const handleSubmit = (data: SimpleFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Auto-generated if empty" {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
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
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BRANDS.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
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
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WEIGHT_OPTIONS.map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {weight}
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
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quality Tier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier}
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
            name="strainType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strain Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select strain type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STRAIN_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
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
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="1" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Photo</FormLabel>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/image.jpg" 
                        {...field}
                      />
                    </FormControl>
                    <MobilePhotoUpload 
                      onImageUrl={(url) => field.onChange(url)}
                      className="flex-shrink-0"
                    />
                  </div>
                  {field.value && (
                    <div className="mt-2">
                      <div className="w-20 h-20 border rounded-lg overflow-hidden bg-gray-50">
                        <img
                          src={field.value}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Price</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="wholesalePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wholesale Price</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter product description..." 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />





        <div className="flex justify-end space-x-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : isEditing ? "Update Item" : "Add Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}