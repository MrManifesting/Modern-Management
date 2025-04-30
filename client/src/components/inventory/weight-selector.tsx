import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormControl } from '@/components/ui/form';

// Define cannabis package weight/size options by brand
export const WEIGHT_OPTIONS = {
  // Common sizes across all brands
  common: [
    { value: "3.5g", label: "3.5g (Eighth)" },
    { value: "7g", label: "7g (Quarter)" },
    { value: "14g", label: "14g (Half Ounce)" },
    { value: "28g", label: "28g (Ounce)" }
  ],
  // Gold Standard specific sizes
  goldStandard: [
    { value: "7g", label: "7g (Quarter)" },
    { value: "14g", label: "14g (Half Ounce)" }
  ],
  // Tree Mason specific sizes
  treeMason: [
    { value: "3.5g", label: "3.5g (Eighth)" },
    { value: "7g", label: "7g (Quarter)" },
    { value: "14g", label: "14g (Half Ounce)" }
  ],
  // Bulk options
  bulk: [
    { value: "28g", label: "28g (Ounce)" },
    { value: "4oz", label: "4oz (Quarter Pound)" },
    { value: "8oz", label: "8oz (Half Pound)" },
    { value: "16oz", label: "16oz (Pound)" }
  ]
};

type BrandType = 'common' | 'goldStandard' | 'treeMason' | 'bulk';

interface WeightSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  brand?: BrandType | BrandType[]; // Can specify one or multiple brands
  customOptions?: { value: string; label: string }[];
  id?: string;
  className?: string;
  formField?: boolean;
}

const WeightSelector: React.FC<WeightSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select package size",
  disabled = false,
  brand = 'common',
  customOptions = [],
  id,
  className,
  formField = false
}) => {
  // Get weight options based on brand(s)
  const getWeightOptions = () => {
    let options: { value: string; label: string }[] = [];
    
    if (Array.isArray(brand)) {
      // If multiple brands are specified, combine their options
      brand.forEach(b => {
        options = [...options, ...WEIGHT_OPTIONS[b]];
      });
    } else {
      // Single brand
      options = [...WEIGHT_OPTIONS[brand]];
    }
    
    // Add custom options
    options = [...options, ...customOptions];
    
    // Remove duplicates by value
    const seen = new Set();
    return options.filter(option => {
      const duplicate = seen.has(option.value);
      seen.add(option.value);
      return !duplicate;
    });
  };

  const weightOptions = getWeightOptions();

  // Handler for the select change event
  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  const renderSelect = () => (
    <Select 
      value={value} 
      onValueChange={handleChange} 
      disabled={disabled}
    >
      <SelectTrigger className={className} id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {weightOptions.map(option => (
            <SelectItem 
              key={option.value} 
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  return formField ? (
    <FormControl>
      {renderSelect()}
    </FormControl>
  ) : renderSelect();
};

export default WeightSelector;