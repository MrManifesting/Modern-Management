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

// Define product package size options by brand
export const SIZE_OPTIONS = {
  // Common sizes across all brands
  common: [
    { value: "30ml", label: "30ml (1 oz)" },
    { value: "60ml", label: "60ml (2 oz)" },
    { value: "120ml", label: "120ml (4 oz)" },
    { value: "240ml", label: "240ml (8 oz)" }
  ],
  // InventoryPro specific sizes
  inventoryPro: [
    { value: "60ml", label: "60ml (2 oz)" },
    { value: "120ml", label: "120ml (4 oz)" }
  ],
  // Premium specific sizes
  premium: [
    { value: "30ml", label: "30ml (1 oz)" },
    { value: "60ml", label: "60ml (2 oz)" },
    { value: "120ml", label: "120ml (4 oz)" }
  ],
  // Bulk options
  bulk: [
    { value: "240ml", label: "240ml (8 oz)" },
    { value: "500ml", label: "500ml (16.9 oz)" },
    { value: "1000ml", label: "1000ml (1 liter)" },
    { value: "4000ml", label: "4000ml (1 gallon)" }
  ]
};

type BrandType = 'common' | 'inventoryPro' | 'premium' | 'bulk';

interface SizeSelectorProps {
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

const SizeSelector: React.FC<SizeSelectorProps> = ({
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
  // Get size options based on brand(s)
  const getSizeOptions = () => {
    let options: { value: string; label: string }[] = [];
    
    if (Array.isArray(brand)) {
      // If multiple brands are specified, combine their options
      brand.forEach(b => {
        options = [...options, ...SIZE_OPTIONS[b]];
      });
    } else {
      // Single brand
      options = [...SIZE_OPTIONS[brand]];
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

  const sizeOptions = getSizeOptions();

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
          {sizeOptions.map(option => (
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

export default SizeSelector;