import React, { useState, useMemo, useRef, useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  X,
  Eye,
  Edit,
  ShoppingCart,
  Package,
  Leaf,
  DollarSign,
  Calendar,
  BarChart3,
  TrendingUp,
} from "lucide-react";

export interface THCaFlowerProduct {
  id?: number;
  strain: string;
  amount: number;
  percentage: string;
  tier: string;
  bulkPrice: number; // Selling price
  pricePaid: number; // Price we paid
  askingPrice: number; // Price we're asking
  distroPrice: number;
  masterPrice: number;
  master2Price: number;
  coa: string;
  media: string;
  strainType: string;
  sku: string;
  barcode?: string;
  quantity: number;
  packageType: string; // Bulk pounds, Half pound, Quarter pound, Ounce, etc.
  brand: string; // Gold Standard or Tree Mason
  packageSize: string; // 1lb, 0.5lb, 0.25lb, 28g, 14g, 7g, 3.5g
  category: string;
  status?: string;
}

interface THCaFlowerInventoryTableProps {
  data?: THCaFlowerProduct[];
  onEdit?: (product: THCaFlowerProduct) => void;
  onDelete?: (id: number) => void;
  onView?: (product: THCaFlowerProduct) => void;
}

export const THCaFlowerInventoryTable: React.FC<THCaFlowerInventoryTableProps> = ({
  data = [],
  onEdit,
  onDelete,
  onView,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [selectedStrainType, setSelectedStrainType] = useState("ALL");
  const [selectedPackageType, setSelectedPackageType] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedPackageSize, setSelectedPackageSize] = useState("ALL");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Enhanced filtering with more criteria
  const filteredProducts = useMemo(() => {
    return data.filter((product) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        product.strain.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower);

      const matchesTier = selectedTier === "ALL" || product.tier === selectedTier;
      const matchesStrainType = selectedStrainType === "ALL" || product.strainType === selectedStrainType;
      const matchesPackageType = selectedPackageType === "ALL" || product.packageType === selectedPackageType;
      const matchesBrand = selectedBrand === "ALL" || product.brand === selectedBrand;
      const matchesPackageSize = selectedPackageSize === "ALL" || product.packageSize === selectedPackageSize;

      return matchesSearch && matchesTier && matchesStrainType && matchesPackageType && matchesBrand && matchesPackageSize;
    });
  }, [data, searchTerm, selectedTier, selectedStrainType, selectedPackageType, selectedBrand, selectedPackageSize]);

  // Get unique values for filter dropdowns
  const uniqueTiers = useMemo(() => [...new Set(data.map(p => p.tier))], [data]);
  const uniqueStrainTypes = useMemo(() => [...new Set(data.map(p => p.strainType))], [data]);
  const uniquePackageTypes = useMemo(() => [...new Set(data.map(p => p.packageType))], [data]);
  const uniqueBrands = useMemo(() => [...new Set(data.map(p => p.brand))], [data]);
  const uniquePackageSizes = useMemo(() => [...new Set(data.map(p => p.packageSize))], [data]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get tier badge styling
  const getTierBadgeClass = (tier: string) => {
    switch (tier.toUpperCase()) {
      case 'EXOTIC':
      case 'EXOTIC INDOOR':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'TOP SHELF':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'AA INDOOR':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AAA INDOOR':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'CLASSIC RESERVE':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Enhanced mobile card view with better touch interactions and layout
  const renderMobileProductCard = (product: THCaFlowerProduct) => (
    <Card key={product.id} className="mb-4 border-gold/20 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header with strain name and quick actions */}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">{product.strain}</CardTitle>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge className={getTierBadgeClass(product.tier)} variant="secondary">
                {product.tier}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {product.strainType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {product.brand}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onView(product)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(product)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content with key metrics */}
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Package</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {product.packageSize} {product.packageType}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Quantity</span>
            </div>
            <p className="text-sm font-semibold">{product.quantity} units</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">THCa %</span>
            </div>
            <p className="text-sm font-semibold">{product.percentage}%</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Price</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(product.bulkPrice)}</p>
          </div>
        </div>

        {/* Additional details in expandable format */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">SKU:</span>
            <span className="font-mono text-xs">{product.sku}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Asking Price:</span>
            <span className="font-semibold">{formatCurrency(product.askingPrice)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Distro Price:</span>
            <span>{formatCurrency(product.distroPrice)}</span>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-9"
            onClick={() => onEdit?.(product)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="px-3 h-9"
            onClick={() => alert('Quick order functionality coming soon')}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl gold-gradient-text">Premium Products Inventory</CardTitle>
        <CardDescription>
          Manage your premium product inventory, pricing tiers, and stock levels
        </CardDescription>
        <div className="flex flex-col gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search by strain or SKU..."
              className="pl-8 pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tiers</SelectItem>
                {uniqueTiers.map(tier => (
                  <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStrainType} onValueChange={setSelectedStrainType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {uniqueStrainTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPackageType} onValueChange={setSelectedPackageType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Package" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Packages</SelectItem>
                {uniquePackageTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Brands</SelectItem>
                {uniqueBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPackageSize} onValueChange={setSelectedPackageSize}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sizes</SelectItem>
                {uniquePackageSizes.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSearchTerm("");
                setSelectedTier("ALL");
                setSelectedStrainType("ALL");
                setSelectedPackageType("ALL");
                setSelectedBrand("ALL");
                setSelectedPackageSize("ALL");
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Reset Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          // Mobile view - Card layout
          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found. Try adjusting your search or filters.
              </div>
            ) : (
              filteredProducts.map(renderMobileProductCard)
            )}
          </div>
        ) : (
          // Desktop view - Table layout
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strain</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>THCa %</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Bulk Price</TableHead>
                  <TableHead>Asking Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No products found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.strain}</TableCell>
                      <TableCell>
                        <Badge className={getTierBadgeClass(product.tier)} variant="secondary">
                          {product.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.strainType}</TableCell>
                      <TableCell>{product.packageSize} {product.packageType}</TableCell>
                      <TableCell>{product.percentage}%</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>{formatCurrency(product.bulkPrice)}</TableCell>
                      <TableCell>{formatCurrency(product.askingPrice)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {onView && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(product)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default THCaFlowerInventoryTable;