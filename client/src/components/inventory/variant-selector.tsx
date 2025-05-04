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

// Common product variants organized by type
const PRODUCT_VARIANTS = {
  premium: [
    "Premium Gold",
    "Premium Silver",
    "Premium Bronze",
    "Ultra Premium",
    "Deluxe Plus",
    "Supreme",
    "Elite",
    "Signature",
    "Limited Edition",
    "Collector's Choice"
  ],
  standard: [
    "Standard",
    "Classic",
    "Original",
    "Essential",
    "Basic",
    "Regular",
    "Traditional",
    "Everyday",
    "Common",
    "Universal"
  ],
  specialty: [
    "Special Blend",
    "Exclusive Mix",
    "Custom Batch",
    "Artisan",
    "Specialty",
    "Founder's Selection",
    "Seasonal",
    "Reserve",
    "Professional",
    "Masterpiece"
  ]
};

interface VariantSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  showTypes?: boolean;
  placeholder?: string;
  disabled?: boolean;
  customVariants?: string[];
  id?: string;
  className?: string;
  formField?: boolean;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  value,
  onChange,
  showTypes = true,
  placeholder = "Select variant",
  disabled = false,
  customVariants = [],
  id,
  className,
  formField = false
}) => {
  // Combine default variants with any custom variants and remove duplicates
  const allVariants = Array.from(
    new Set([
      ...PRODUCT_VARIANTS.premium,
      ...PRODUCT_VARIANTS.standard,
      ...PRODUCT_VARIANTS.specialty,
      ...customVariants
    ])
  ).sort();

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
        {showTypes ? (
          <>
            <SelectGroup>
              <SelectLabel>Premium</SelectLabel>
              {PRODUCT_VARIANTS.premium.map(variant => (
                <SelectItem key={`premium-${variant}`} value={variant}>{variant}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Standard</SelectLabel>
              {PRODUCT_VARIANTS.standard.map(variant => (
                <SelectItem key={`standard-${variant}`} value={variant}>{variant}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Specialty</SelectLabel>
              {PRODUCT_VARIANTS.specialty.map(variant => (
                <SelectItem key={`specialty-${variant}`} value={variant}>{variant}</SelectItem>
              ))}
            </SelectGroup>
            {customVariants.length > 0 && (
              <SelectGroup>
                <SelectLabel>Custom</SelectLabel>
                {customVariants.map(variant => (
                  <SelectItem key={`custom-${variant}`} value={variant}>{variant}</SelectItem>
                ))}
              </SelectGroup>
            )}
          </>
        ) : (
          <SelectGroup>
            {allVariants.map(variant => (
              <SelectItem key={variant} value={variant}>{variant}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );

  return formField ? (
    <FormControl>
      {renderSelect()}
    </FormControl>
  ) : renderSelect();
};

export default VariantSelector;