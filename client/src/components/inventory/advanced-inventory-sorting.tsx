import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, TrendingUp, Calendar, Package, DollarSign, Hash, Scale } from "lucide-react";

interface SortOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface AdvancedInventorySortingProps {
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: string, direction: 'asc' | 'desc') => void;
  prioritizePounds: boolean;
  onPrioritizePoundsChange: (prioritize: boolean) => void;
  prioritizeNewest: boolean;
  onPrioritizeNewestChange: (prioritize: boolean) => void;
}

export default function AdvancedInventorySorting({
  sortBy,
  sortDirection,
  onSortChange,
  prioritizePounds,
  onPrioritizePoundsChange,
  prioritizeNewest,
  onPrioritizeNewestChange
}: AdvancedInventorySortingProps) {

  const sortOptions: SortOption[] = [
    {
      key: 'name',
      label: 'Product Name',
      icon: <Package className="h-4 w-4" />,
      description: 'Alphabetical by product name'
    },
    {
      key: 'price',
      label: 'Price',
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Sort by price value'
    },
    {
      key: 'quantity',
      label: 'Quantity',
      icon: <Hash className="h-4 w-4" />,
      description: 'Sort by stock quantity'
    },
    {
      key: 'weight',
      label: 'Weight',
      icon: <Scale className="h-4 w-4" />,
      description: 'Sort by product weight'
    },
    {
      key: 'thca',
      label: 'THCa %',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Sort by THCa percentage'
    },
    {
      key: 'created',
      label: 'Date Added',
      icon: <Calendar className="h-4 w-4" />,
      description: 'Sort by creation date'
    },
    {
      key: 'sku',
      label: 'SKU',
      icon: <Package className="h-4 w-4" />,
      description: 'Sort by SKU alphabetically'
    }
  ];

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Toggle direction if same field
      onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, use default direction based on field type
      const defaultDirection = ['name', 'sku'].includes(newSortBy) ? 'asc' : 'desc';
      onSortChange(newSortBy, defaultDirection);
    }
  };

  const toggleDirection = () => {
    onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const currentSortOption = sortOptions.find(option => option.key === sortBy);

  return (
    <Card className="border border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          Advanced Sorting
        </CardTitle>
        <CardDescription>
          Sort inventory with custom prioritization rules
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Priority Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-sm">Prioritize Pound Variants</span>
            </div>
            <Button
              variant={prioritizePounds ? "default" : "outline"}
              size="sm"
              onClick={() => onPrioritizePoundsChange(!prioritizePounds)}
            >
              {prioritizePounds ? "ON" : "OFF"}
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Prioritize Newest Items</span>
            </div>
            <Button
              variant={prioritizeNewest ? "default" : "outline"}
              size="sm"
              onClick={() => onPrioritizeNewestChange(!prioritizeNewest)}
            >
              {prioritizeNewest ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        {/* Priority Status */}
        {(prioritizePounds || prioritizeNewest) && (
          <div className="flex flex-wrap gap-2">
            {prioritizePounds && (
              <Badge variant="default" className="bg-orange-100 text-orange-800">
                <Scale className="h-3 w-3 mr-1" />
                Pound variants first
              </Badge>
            )}
            {prioritizeNewest && (
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <Calendar className="h-3 w-3 mr-1" />
                Newest items first
              </Badge>
            )}
          </div>
        )}

        {/* Sort Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {currentSortOption?.icon}
                    {currentSortOption?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Direction</label>
            <Button
              variant="outline"
              onClick={toggleDirection}
              className="w-full justify-start"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              <Badge variant="secondary" className="ml-auto">
                {sortDirection === 'asc' ? 'A → Z' : 'Z → A'}
              </Badge>
            </Button>
          </div>
        </div>

        {/* Current Sort Display */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm font-medium mb-1">Current Sort Order:</div>
          <div className="text-xs text-muted-foreground">
            {prioritizePounds && "1. Pound variants first → "}
            {prioritizeNewest && "2. Newest items first → "}
            3. {currentSortOption?.label} ({sortDirection === 'asc' ? 'ascending' : 'descending'})
          </div>
        </div>
      </CardContent>
    </Card>
  );
}