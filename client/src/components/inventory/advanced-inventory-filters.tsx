import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Filter, Search, X, Package, DollarSign, Scale, Zap } from "lucide-react";

interface AdvancedFilters {
  searchTerm: string;
  category: string;
  priceRange: [number, number];
  quantityRange: [number, number];
  thcaRange: [number, number];
  status: string;
  weight: string;
  hasCOA: boolean;
  hasMedia: boolean;
  inStock: boolean;
  poundVariantsOnly: boolean;
}

interface AdvancedInventoryFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  totalItems: number;
  filteredItems: number;
}

export default function AdvancedInventoryFilters({
  filters,
  onFiltersChange,
  totalItems,
  filteredItems
}: AdvancedInventoryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof AdvancedFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: "",
      category: "",
      priceRange: [0, 2000],
      quantityRange: [0, 500],
      thcaRange: [0, 35],
      status: "",
      weight: "",
      hasCOA: false,
      hasMedia: false,
      inStock: false,
      poundVariantsOnly: false
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.category) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 2000) count++;
    if (filters.quantityRange[0] > 0 || filters.quantityRange[1] < 500) count++;
    if (filters.thcaRange[0] > 0 || filters.thcaRange[1] < 35) count++;
    if (filters.status) count++;
    if (filters.weight) count++;
    if (filters.hasCOA) count++;
    if (filters.hasMedia) count++;
    if (filters.inStock) count++;
    if (filters.poundVariantsOnly) count++;
    return count;
  };

  const activeFilters = getActiveFilterCount();

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
            {activeFilters > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilters} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredItems} of {totalItems} items
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
        <CardDescription>
          Filter inventory by multiple criteria to find products quickly
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Always visible: Search and quick filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search">Search Products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name, SKU, or strain..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="pl-10"
              />
              {filters.searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilter('searchTerm', '')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="flower">Flower</SelectItem>
                <SelectItem value="bulk flower">Bulk Flower</SelectItem>
                <SelectItem value="pre-rolls">Pre-rolls</SelectItem>
                <SelectItem value="concentrates">Concentrates</SelectItem>
                <SelectItem value="edibles">Edibles</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick toggle filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="inStock"
              checked={filters.inStock}
              onCheckedChange={(checked) => updateFilter('inStock', checked)}
            />
            <Label htmlFor="inStock" className="text-sm">In Stock Only</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="poundVariants"
              checked={filters.poundVariantsOnly}
              onCheckedChange={(checked) => updateFilter('poundVariantsOnly', checked)}
            />
            <Label htmlFor="poundVariants" className="text-sm">Pound Variants Only</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="hasMedia"
              checked={filters.hasMedia}
              onCheckedChange={(checked) => updateFilter('hasMedia', checked)}
            />
            <Label htmlFor="hasMedia" className="text-sm">Has Media</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="hasCOA"
              checked={filters.hasCOA}
              onCheckedChange={(checked) => updateFilter('hasCOA', checked)}
            />
            <Label htmlFor="hasCOA" className="text-sm">Has COA</Label>
          </div>
        </div>

        {/* Expanded filters */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t">
            {/* Price Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
              </Label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value)}
                max={2000}
                min={0}
                step={25}
                className="w-full"
              />
            </div>

            {/* Quantity Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Quantity Range: {filters.quantityRange[0]} - {filters.quantityRange[1]} units
              </Label>
              <Slider
                value={filters.quantityRange}
                onValueChange={(value) => updateFilter('quantityRange', value)}
                max={500}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* THCa Percentage Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                THCa Range: {filters.thcaRange[0]}% - {filters.thcaRange[1]}%
              </Label>
              <Slider
                value={filters.thcaRange}
                onValueChange={(value) => updateFilter('thcaRange', value)}
                max={35}
                min={0}
                step={1}
                className="w-full"
              />
            </div>

            {/* Additional filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="weight">Weight</Label>
                <Select value={filters.weight} onValueChange={(value) => updateFilter('weight', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All weights" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Weights</SelectItem>
                    <SelectItem value="1 pound">1 Pound</SelectItem>
                    <SelectItem value="half pound">Half Pound</SelectItem>
                    <SelectItem value="quarter pound">Quarter Pound</SelectItem>
                    <SelectItem value="ounce">Ounce</SelectItem>
                    <SelectItem value="half ounce">Half Ounce</SelectItem>
                    <SelectItem value="quarter ounce">Quarter Ounce</SelectItem>
                    <SelectItem value="eighth">Eighth</SelectItem>
                    <SelectItem value="1g">1 Gram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Clear filters button */}
        {activeFilters > 0 && (
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All Filters ({activeFilters})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}