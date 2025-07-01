import React, { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Define cannabis quality tiers with descriptions
const CANNABIS_TIERS = [
  { 
    value: "exotic", 
    label: "Exotic", 
    description: "Premium rare strains with unique properties" 
  },
  { 
    value: "exotic-indoor", 
    label: "Exotic Indoor", 
    description: "Premium rare strains grown indoors" 
  },
  { 
    value: "top-shelf", 
    label: "Top Shelf", 
    description: "Premium, highest quality product" 
  },
  { 
    value: "aa-indoor", 
    label: "AA Indoor", 
    description: "Good quality indoor-grown cannabis" 
  },
  { 
    value: "aaa-indoor", 
    label: "AAA Indoor", 
    description: "Very high quality indoor-grown cannabis" 
  },
  { 
    value: "classic-reserve", 
    label: "Classic Reserve", 
    description: "High quality staple strains" 
  },
  { 
    value: "smalls", 
    label: "Smalls", 
    description: "Smaller buds of high quality strains" 
  },
  { 
    value: "top-shelf-smalls", 
    label: "Top Shelf - Smalls", 
    description: "Top shelf quality in smaller bud sizes" 
  },
  { 
    value: "aa-indoor-smalls", 
    label: "AA Indoor - Smalls", 
    description: "AA indoor quality in smaller bud sizes" 
  },
  { 
    value: "top-shelf-mediums", 
    label: "Top Shelf - Mediums", 
    description: "Top shelf quality in medium bud sizes" 
  },
  { 
    value: "classic-reserve-smalls", 
    label: "Classic Reserve - Smalls", 
    description: "Classic reserve quality in smaller bud sizes" 
  },
  { 
    value: "add-new", 
    label: "➕ Add New Quality Tier", 
    description: "Add a custom quality tier" 
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
  const [isAddNewDialogOpen, setIsAddNewDialogOpen] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');

  // Combine default tiers with any custom tiers
  const allTiers = [...CANNABIS_TIERS, ...customTiers];

  // Handler for the select change event
  const handleChange = (newValue: string) => {
    if (newValue === 'add-new') {
      setIsAddNewDialogOpen(true);
    } else {
      onChange(newValue);
    }
  };

  // Handle adding a new custom tier
  const handleAddNewTier = () => {
    if (newTierName.trim()) {
      const customTier = {
        value: newTierName.toLowerCase().replace(/\s+/g, '-'),
        label: newTierName,
        description: newTierDescription || `Custom quality tier: ${newTierName}`
      };
      
      // Add to custom tiers and select it
      onChange(customTier.value);
      
      // Reset dialog state
      setNewTierName('');
      setNewTierDescription('');
      setIsAddNewDialogOpen(false);
    }
  };

  const renderSelect = () => (
    <>
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

      <Dialog open={isAddNewDialogOpen} onOpenChange={setIsAddNewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Quality Tier</DialogTitle>
            <DialogDescription>
              Create a custom quality tier for your cannabis products.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tier-name" className="text-right">
                Name
              </Label>
              <Input
                id="tier-name"
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Premium Indoor"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tier-description" className="text-right">
                Description
              </Label>
              <Input
                id="tier-description"
                value={newTierDescription}
                onChange={(e) => setNewTierDescription(e.target.value)}
                className="col-span-3"
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddNewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddNewTier}
              disabled={!newTierName.trim()}
            >
              Add Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return formField ? (
    <FormControl>
      {renderSelect()}
    </FormControl>
  ) : renderSelect();
};

export default TierSelector;