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

// Define cannabis quality tiers with descriptions
const CANNABIS_TIERS = [
  { 
    value: "top-shelf", 
    label: "Top Shelf", 
    description: "Premium, highest quality product" 
  },
  { 
    value: "exotic", 
    label: "Exotic", 
    description: "Rare strains with unique properties" 
  },
  { 
    value: "classic-reserve", 
    label: "Classic Reserve", 
    description: "High quality staple strains" 
  },
  { 
    value: "aa-indoor", 
    label: "AA Indoor", 
    description: "Good quality indoor-grown" 
  },
  { 
    value: "outdoor", 
    label: "Outdoor", 
    description: "Sun-grown, natural product" 
  },
  { 
    value: "smalls", 
    label: "Smalls", 
    description: "Smaller buds of high quality strains" 
  }
];

interface TierSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  customTiers?: { value: string; label: string; description?: string }[];
  id?: string;
  className?: string;
  formField?: boolean;
}

const TierSelector: React.FC<TierSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select quality tier",
  disabled = false,
  customTiers = [],
  id,
  className,
  formField = false
}) => {
  // Combine default tiers with any custom tiers
  const allTiers = [...CANNABIS_TIERS, ...customTiers];

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
          {allTiers.map(tier => (
            <SelectItem 
              key={tier.value} 
              value={tier.value}
              title={tier.description}
            >
              {tier.label}
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

export default TierSelector;