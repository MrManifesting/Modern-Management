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

// Common cannabis strains organized by type
const CANNABIS_STRAINS = {
  indica: [
    "Northern Lights",
    "Granddaddy Purple",
    "Blueberry",
    "Bubba Kush",
    "Purple Punch",
    "Death Star",
    "Wedding Cake",
    "GG4",
    "Platinum OG",
    "Mendo Breath"
  ],
  sativa: [
    "Sour Diesel",
    "Jack Herer",
    "Durban Poison",
    "Green Crack",
    "Maui Wowie",
    "Super Lemon Haze",
    "Strawberry Cough",
    "Tangie",
    "Super Silver Haze",
    "Tropicana Cookies"
  ],
  hybrid: [
    "Blue Dream",
    "Girl Scout Cookies",
    "Pineapple Express",
    "OG Kush",
    "Gelato",
    "Zkittlez",
    "Sherbet",
    "White Widow",
    "AK-47",
    "Runtz"
  ]
};

interface StrainSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  showTypes?: boolean;
  placeholder?: string;
  disabled?: boolean;
  customStrains?: string[];
  id?: string;
  className?: string;
  formField?: boolean;
}

const StrainSelector: React.FC<StrainSelectorProps> = ({
  value,
  onChange,
  showTypes = true,
  placeholder = "Select strain",
  disabled = false,
  customStrains = [],
  id,
  className,
  formField = false
}) => {
  // Combine default strains with any custom strains
  const allStrains = [
    ...new Set([
      ...CANNABIS_STRAINS.indica,
      ...CANNABIS_STRAINS.sativa,
      ...CANNABIS_STRAINS.hybrid,
      ...customStrains
    ])
  ].sort();

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
              <SelectLabel>Indica</SelectLabel>
              {CANNABIS_STRAINS.indica.map(strain => (
                <SelectItem key={`indica-${strain}`} value={strain}>{strain}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Sativa</SelectLabel>
              {CANNABIS_STRAINS.sativa.map(strain => (
                <SelectItem key={`sativa-${strain}`} value={strain}>{strain}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Hybrid</SelectLabel>
              {CANNABIS_STRAINS.hybrid.map(strain => (
                <SelectItem key={`hybrid-${strain}`} value={strain}>{strain}</SelectItem>
              ))}
            </SelectGroup>
            {customStrains.length > 0 && (
              <SelectGroup>
                <SelectLabel>Custom</SelectLabel>
                {customStrains.map(strain => (
                  <SelectItem key={`custom-${strain}`} value={strain}>{strain}</SelectItem>
                ))}
              </SelectGroup>
            )}
          </>
        ) : (
          <SelectGroup>
            {allStrains.map(strain => (
              <SelectItem key={strain} value={strain}>{strain}</SelectItem>
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

export default StrainSelector;