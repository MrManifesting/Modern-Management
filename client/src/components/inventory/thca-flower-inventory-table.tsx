import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash, ShoppingCart, BarChart2, ExternalLink } from 'lucide-react';

// Define the THCa Flower product interface
export interface THCaFlowerProduct {
  id?: number;
  strain: string;
  amount: number;
  percentage: string;
  tier: string;
  bulkPrice: number;
  distroPrice: number;
  masterPrice: number;
  master2Price: number;
  coa: string;
  media: string;
  strainType: string;
  sku: string;
  barcode?: string;
  quantity: number;
  category: string;
  status?: string;
}

// Mock data derived from the CSV
const mockTHCaFlowerProducts: THCaFlowerProduct[] = [
  {
    id: 1,
    strain: "Frozen Lemons",
    amount: 29,
    percentage: "27.97%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 500.00,
    distroPrice: 400.00,
    masterPrice: 350.00,
    master2Price: 325.00,
    coa: "FROZEN LEMONS - SMALLS",
    media: "CLICK HERE",
    strainType: "SATIVA",
    sku: "FL-TOP-2797",
    quantity: 29,
    category: "THCa Flower"
  },
  {
    id: 2,
    strain: "Lemon Cherry Gelato",
    amount: 29,
    percentage: "34.52%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 575.00,
    distroPrice: 460.00,
    masterPrice: 402.50,
    master2Price: 373.75,
    coa: "LEMON CHERRY GELATO- SMALLS",
    media: "CLICK HERE",
    strainType: "INDICA DOMINANT HYBRID",
    sku: "LCG-TOP-3452",
    quantity: 29,
    category: "THCa Flower"
  },
  {
    id: 3,
    strain: "Sunday Driver",
    amount: 41,
    percentage: "30.77%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 525.00,
    distroPrice: 420.00,
    masterPrice: 367.50,
    master2Price: 341.25,
    coa: "SUNDAY DRIVER-SMALLS",
    media: "CLICK HERE",
    strainType: "SATIVA DOMINANT HYBRID",
    sku: "SD-TOP-3077",
    quantity: 41,
    category: "THCa Flower"
  },
  {
    id: 4,
    strain: "Rainbow Sherbet #11",
    amount: 36,
    percentage: "29.57%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 510.00,
    distroPrice: 408.00,
    masterPrice: 357.00,
    master2Price: 331.50,
    coa: "RAINBOW SHERBET SMALLS",
    media: "CLICK HERE",
    strainType: "HYBRID",
    sku: "RS#-TOP-2957",
    quantity: 36,
    category: "THCa Flower"
  },
  {
    id: 5,
    strain: "Garlic Mintz",
    amount: 25,
    percentage: "26.76%",
    tier: "TOP SHELF",
    bulkPrice: 775.00,
    distroPrice: 620.00,
    masterPrice: 542.50,
    master2Price: 503.75,
    coa: "GARLIC MINTZ",
    media: "CLICK HERE",
    strainType: "INDICA",
    sku: "GM-TOP-2676",
    quantity: 25,
    category: "THCa Flower"
  },
];

// Filter options based on product data
const tiers = [
  "ALL",
  "TOP SHELF",
  "TOP SHELF - SMALLS",
  "TOP SHELF - MEDIUMS",
  "CLASSIC RESERVE",
  "CLASSIC RESERVE - SMALLS",
  "AA INDOOR",
  "AA INDOOR - SMALLS",
  "AAA INDOOR",
  "EXOTIC INDOOR"
];

const strainTypes = [
  "ALL",
  "INDICA",
  "SATIVA",
  "HYBRID",
  "INDICA DOMINANT HYBRID",
  "SATIVA DOMINANT HYBRID"
];

interface THCaFlowerInventoryTableProps {
  data?: THCaFlowerProduct[];
  onEdit?: (product: THCaFlowerProduct) => void;
  onDelete?: (id: number) => void;
  onView?: (product: THCaFlowerProduct) => void;
}

export const THCaFlowerInventoryTable: React.FC<THCaFlowerInventoryTableProps> = ({
  data = mockTHCaFlowerProducts,
  onEdit,
  onDelete,
  onView
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [selectedStrainType, setSelectedStrainType] = useState("ALL");

  // Filter products based on search term and filters
  const filteredProducts = data.filter(product => {
    const matchesSearch = 
      product.strain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = selectedTier === "ALL" || product.tier.includes(selectedTier);
    const matchesStrainType = selectedStrainType === "ALL" || product.strainType.includes(selectedStrainType);
    
    return matchesSearch && matchesTier && matchesStrainType;
  });

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Get badge color based on strain type
  const getStrainTypeBadgeClass = (strainType: string) => {
    if (strainType.includes("INDICA")) return "bg-purple-600 text-white";
    if (strainType.includes("SATIVA")) return "bg-orange-500 text-white";
    if (strainType.includes("HYBRID")) return "bg-green-500 text-white";
    return "bg-gray-400 text-white";
  };

  // Get badge color based on tier
  const getTierBadgeClass = (tier: string) => {
    if (tier.includes("TOP SHELF")) return "bg-gold text-black";
    if (tier.includes("CLASSIC RESERVE")) return "bg-blue-500 text-white";
    if (tier.includes("AA INDOOR")) return "bg-green-600 text-white";
    if (tier.includes("AAA INDOOR")) return "bg-purple-700 text-white";
    if (tier.includes("EXOTIC INDOOR")) return "bg-red-600 text-white";
    return "bg-gray-500 text-white";
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl gold-gradient-text">THCa Flower Inventory</CardTitle>
        <CardDescription>
          Manage your THCa flower inventory, pricing tiers, and stock levels
        </CardDescription>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by strain or SKU..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by Tier" />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((tier) => (
                <SelectItem key={tier} value={tier}>{tier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStrainType} onValueChange={setSelectedStrainType}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by Strain Type" />
            </SelectTrigger>
            <SelectContent>
              {strainTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="inventory-table">
            <TableHeader>
              <TableRow>
                <TableHead>Strain</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">THC %</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">SKU</TableHead>
                <TableHead className="text-right">Bulk Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No products found. Try adjusting your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.strain}</TableCell>
                    <TableCell>
                      <Badge className={getTierBadgeClass(product.tier)}>
                        {product.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{product.percentage}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={getStrainTypeBadgeClass(product.strainType)}>
                        {product.strainType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono">{product.sku}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(product.bulkPrice)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.amount > 10 ? "default" : "destructive"}>
                        {product.amount} lbs
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onView && onView(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit && onEdit(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Create Sale
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart2 className="mr-2 h-4 w-4" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => onDelete && product.id && onDelete(product.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default THCaFlowerInventoryTable;