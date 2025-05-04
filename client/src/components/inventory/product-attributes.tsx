import React from 'react';
import VariantSelector from './variant-selector';
import TierSelector from './tier-selector';
import SizeSelector from './size-selector';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
// We're using a standard grid instead of importing the Grid component

interface ProductAttributesProps {
  form?: UseFormReturn<any>;
  formPrefix?: string;
  showPercentages?: boolean;
  showSizes?: boolean;
  brand?: 'inventoryPro' | 'premium' | 'common' | 'bulk';
  onAttributeChange?: (field: string, value: any) => void;
  initialValues?: {
    variant?: string;
    tier?: string;
    packageSize?: string;
    strengthA?: string;
    strengthB?: string;
    totalPotency?: string;
  };
}

const ProductAttributes: React.FC<ProductAttributesProps> = ({
  form,
  formPrefix = 'attributes',
  showPercentages = true,
  showSizes = true,
  brand = 'common',
  onAttributeChange,
  initialValues
}) => {
  // Function to handle direct changes when not using form
  const handleChange = (field: string, value: any) => {
    if (onAttributeChange) {
      onAttributeChange(field, value);
    }
  };

  // Prefixed field name helper
  const fieldName = (name: string) => formPrefix ? `${formPrefix}.${name}` : name;

  return (
    <Card className="border-gold/30 bg-black/40">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Variant Selection */}
          {form ? (
            <FormField
              control={form.control}
              name={fieldName('variant')}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gold">Variant</FormLabel>
                  <VariantSelector
                    value={field.value}
                    onChange={field.onChange}
                    formField
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gold">Variant</label>
              <VariantSelector
                value={initialValues?.variant}
                onChange={(value) => handleChange('variant', value)}
              />
            </div>
          )}

          {/* Tier Selection */}
          {form ? (
            <FormField
              control={form.control}
              name={fieldName('tier')}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gold">Quality Tier</FormLabel>
                  <TierSelector
                    value={field.value}
                    onChange={field.onChange}
                    formField
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gold">Quality Tier</label>
              <TierSelector
                value={initialValues?.tier}
                onChange={(value) => handleChange('tier', value)}
              />
            </div>
          )}

          {/* Package Size Selection */}
          {showSizes && (
            form ? (
              <FormField
                control={form.control}
                name={fieldName('packageSize')}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gold">Package Size</FormLabel>
                    <SizeSelector
                      value={field.value}
                      onChange={field.onChange}
                      brand={brand}
                      formField
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gold">Package Size</label>
                <SizeSelector
                  value={initialValues?.packageSize}
                  onChange={(value) => handleChange('packageSize', value)}
                  brand={brand}
                />
              </div>
            )
          )}

          {/* Product Potency Percentages */}
          {showPercentages && (
            <>
              {/* Primary Strength Percentage */}
              {form ? (
                <FormField
                  control={form.control}
                  name={fieldName('strengthA')}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gold">Primary Strength %</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="e.g. 24.5"
                          className="bg-black/60 border-gold/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gold">Primary Strength %</label>
                  <Input
                    value={initialValues?.strengthA || ''}
                    onChange={(e) => handleChange('strengthA', e.target.value)}
                    type="text"
                    placeholder="e.g. 24.5"
                    className="bg-black/60 border-gold/30"
                  />
                </div>
              )}

              {/* Secondary Strength Percentage */}
              {form ? (
                <FormField
                  control={form.control}
                  name={fieldName('strengthB')}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gold">Secondary Strength %</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="e.g. 0.1"
                          className="bg-black/60 border-gold/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gold">Secondary Strength %</label>
                  <Input
                    value={initialValues?.strengthB || ''}
                    onChange={(e) => handleChange('strengthB', e.target.value)}
                    type="text"
                    placeholder="e.g. 0.1"
                    className="bg-black/60 border-gold/30"
                  />
                </div>
              )}

              {/* Total Strength Percentage */}
              {form ? (
                <FormField
                  control={form.control}
                  name={fieldName('totalPotency')}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gold">Total Strength %</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="e.g. 28.5"
                          className="bg-black/60 border-gold/30"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Combined strength of all active ingredients
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gold">Total Strength %</label>
                  <Input
                    value={initialValues?.totalPotency || ''}
                    onChange={(e) => handleChange('totalPotency', e.target.value)}
                    type="text"
                    placeholder="e.g. 28.5"
                    className="bg-black/60 border-gold/30"
                  />
                  <p className="text-gray-400 text-xs">Combined strength of all active ingredients</p>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductAttributes;