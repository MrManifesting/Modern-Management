import React from 'react';
import StrainSelector from './strain-selector';
import TierSelector from './tier-selector';
import WeightSelector from './weight-selector';
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
import { Grid, Cell } from '@/components/ui/grid';

interface CannabisProductAttributesProps {
  form?: UseFormReturn<any>;
  formPrefix?: string;
  showPercentages?: boolean;
  showWeights?: boolean;
  brand?: 'goldStandard' | 'treeMason' | 'common' | 'bulk';
  onAttributeChange?: (field: string, value: any) => void;
  initialValues?: {
    strain?: string;
    tier?: string;
    packageSize?: string;
    thcaPercentage?: string;
    cbdPercentage?: string;
    totalTerpenes?: string;
  };
}

const CannabisProductAttributes: React.FC<CannabisProductAttributesProps> = ({
  form,
  formPrefix = 'attributes',
  showPercentages = true,
  showWeights = true,
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
          {/* Strain Selection */}
          {form ? (
            <FormField
              control={form.control}
              name={fieldName('strain')}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gold">Strain</FormLabel>
                  <StrainSelector
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
              <label className="text-sm font-medium text-gold">Strain</label>
              <StrainSelector
                value={initialValues?.strain}
                onChange={(value) => handleChange('strain', value)}
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

          {/* Package Size/Weight Selection */}
          {showWeights && (
            form ? (
              <FormField
                control={form.control}
                name={fieldName('packageSize')}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gold">Package Size</FormLabel>
                    <WeightSelector
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
                <WeightSelector
                  value={initialValues?.packageSize}
                  onChange={(value) => handleChange('packageSize', value)}
                  brand={brand}
                />
              </div>
            )
          )}

          {/* Cannabinoid Percentages */}
          {showPercentages && (
            <>
              {/* THCa Percentage */}
              {form ? (
                <FormField
                  control={form.control}
                  name={fieldName('thcaPercentage')}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gold">THCa %</FormLabel>
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
                  <label className="text-sm font-medium text-gold">THCa %</label>
                  <Input
                    value={initialValues?.thcaPercentage || ''}
                    onChange={(e) => handleChange('thcaPercentage', e.target.value)}
                    type="text"
                    placeholder="e.g. 24.5"
                    className="bg-black/60 border-gold/30"
                  />
                </div>
              )}

              {/* CBD Percentage */}
              {form ? (
                <FormField
                  control={form.control}
                  name={fieldName('cbdPercentage')}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gold">CBD %</FormLabel>
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
                  <label className="text-sm font-medium text-gold">CBD %</label>
                  <Input
                    value={initialValues?.cbdPercentage || ''}
                    onChange={(e) => handleChange('cbdPercentage', e.target.value)}
                    type="text"
                    placeholder="e.g. 0.1"
                    className="bg-black/60 border-gold/30"
                  />
                </div>
              )}

              {/* Total Terpenes Percentage */}
              {form ? (
                <FormField
                  control={form.control}
                  name={fieldName('totalTerpenes')}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gold">Total Terpenes %</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="e.g. 3.2"
                          className="bg-black/60 border-gold/30"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Total terpene profile percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gold">Total Terpenes %</label>
                  <Input
                    value={initialValues?.totalTerpenes || ''}
                    onChange={(e) => handleChange('totalTerpenes', e.target.value)}
                    type="text"
                    placeholder="e.g. 3.2"
                    className="bg-black/60 border-gold/30"
                  />
                  <p className="text-gray-400 text-xs">Total terpene profile percentage</p>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CannabisProductAttributes;