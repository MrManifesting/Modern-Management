import React, { useState, useEffect, useRef } from 'react';
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
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash, 
  ShoppingCart, 
  BarChart2, 
  ExternalLink,
  Mic,
  MicOff,
  Camera,
  Upload
} from 'lucide-react';

// Define the THCa Flower product interface
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

// Mock data derived from the CSV with added fields for cannabis inventory
const mockTHCaFlowerProducts: THCaFlowerProduct[] = [
  {
    id: 1,
    strain: "Frozen Lemons",
    amount: 29,
    percentage: "27.97%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 500.00,
    pricePaid: 425.00,
    askingPrice: 550.00,
    distroPrice: 400.00,
    masterPrice: 350.00,
    master2Price: 325.00,
    coa: "FROZEN LEMONS - SMALLS",
    media: "CLICK HERE",
    strainType: "SATIVA",
    sku: "FL-TOP-2797",
    quantity: 29,
    packageType: "Bulk Pounds",
    brand: "Gold Standard",
    packageSize: "1lb",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 2,
    strain: "Lemon Cherry Gelato",
    amount: 18,
    percentage: "34.52%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 575.00,
    pricePaid: 475.00,
    askingPrice: 600.00,
    distroPrice: 460.00,
    masterPrice: 402.50,
    master2Price: 373.75,
    coa: "LEMON CHERRY GELATO- SMALLS",
    media: "CLICK HERE",
    strainType: "INDICA DOMINANT HYBRID",
    sku: "LCG-TOP-3452-HP",
    quantity: 18,
    packageType: "Half Pound",
    brand: "Gold Standard",
    packageSize: "0.5lb",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 3,
    strain: "Sunday Driver",
    amount: 41,
    percentage: "30.77%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 525.00,
    pricePaid: 450.00,
    askingPrice: 575.00,
    distroPrice: 420.00,
    masterPrice: 367.50,
    master2Price: 341.25,
    coa: "SUNDAY DRIVER-SMALLS",
    media: "CLICK HERE",
    strainType: "SATIVA DOMINANT HYBRID",
    sku: "SD-TOP-3077",
    quantity: 41,
    packageType: "Bulk Pounds",
    brand: "Gold Standard",
    packageSize: "1lb",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 4,
    strain: "Rainbow Sherbet #11",
    amount: 24,
    percentage: "29.57%",
    tier: "TOP SHELF - SMALLS",
    bulkPrice: 135.00,
    pricePaid: 110.00,
    askingPrice: 150.00,
    distroPrice: 408.00,
    masterPrice: 357.00,
    master2Price: 331.50,
    coa: "RAINBOW SHERBET SMALLS",
    media: "CLICK HERE",
    strainType: "HYBRID",
    sku: "RS-SM-14G",
    quantity: 24,
    packageType: "Packaged 14g - Gold Standard",
    brand: "Gold Standard",
    packageSize: "14g",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 5,
    strain: "Garlic Mintz",
    amount: 25,
    percentage: "26.76%",
    tier: "TOP SHELF",
    bulkPrice: 775.00,
    pricePaid: 650.00,
    askingPrice: 800.00,
    distroPrice: 620.00,
    masterPrice: 542.50,
    master2Price: 503.75,
    coa: "GARLIC MINTZ",
    media: "CLICK HERE",
    strainType: "INDICA",
    sku: "GM-TOP-2676",
    quantity: 25,
    packageType: "Bulk Pounds",
    brand: "Gold Standard",
    packageSize: "1lb",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 6,
    strain: "Blue Dream",
    amount: 36,
    percentage: "28.5%",
    tier: "EXOTIC INDOOR",
    bulkPrice: 90.00,
    pricePaid: 70.00,
    askingPrice: 100.00,
    distroPrice: 85.00,
    masterPrice: 80.00,
    master2Price: 75.00,
    coa: "BLUE DREAM EXOTIC",
    media: "CLICK HERE",
    strainType: "SATIVA",
    sku: "BD-EXO-14G",
    quantity: 36,
    packageType: "Packaged 14g - Tree Mason",
    brand: "Tree Mason",
    packageSize: "14g",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 7,
    strain: "Wedding Cake",
    amount: 48,
    percentage: "31.2%",
    tier: "EXOTIC INDOOR",
    bulkPrice: 50.00,
    pricePaid: 40.00,
    askingPrice: 55.00,
    distroPrice: 45.00,
    masterPrice: 42.00,
    master2Price: 38.00,
    coa: "WEDDING CAKE EXOTIC",
    media: "CLICK HERE",
    strainType: "INDICA",
    sku: "WC-EXO-7G",
    quantity: 48,
    packageType: "Packaged 7g - Tree Mason",
    brand: "Tree Mason",
    packageSize: "7g",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 8,
    strain: "Northern Lights",
    amount: 32,
    percentage: "24.8%",
    tier: "AAA INDOOR",
    bulkPrice: 35.00,
    pricePaid: 25.00,
    askingPrice: 40.00,
    distroPrice: 30.00,
    masterPrice: 28.00,
    master2Price: 25.00,
    coa: "NORTHERN LIGHTS AAA",
    media: "CLICK HERE",
    strainType: "INDICA",
    sku: "NL-AAA-3.5G",
    quantity: 32,
    packageType: "Packaged 3.5g - Tree Mason",
    brand: "Tree Mason",
    packageSize: "3.5g",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 9,
    strain: "Girl Scout Cookies",
    amount: 15,
    percentage: "32.4%",
    tier: "EXOTIC INDOOR",
    bulkPrice: 200.00,
    pricePaid: 160.00,
    askingPrice: 220.00,
    distroPrice: 180.00,
    masterPrice: 170.00,
    master2Price: 160.00,
    coa: "GSC OZ",
    media: "CLICK HERE",
    strainType: "HYBRID",
    sku: "GSC-OZ-EXO",
    quantity: 15,
    packageType: "Golden Nuggets (oz)",
    brand: "Gold Standard",
    packageSize: "28g",
    category: "THCa Flower",
    status: "In Stock"
  },
  {
    id: 10,
    strain: "Runtz",
    amount: 12,
    percentage: "33.5%",
    tier: "EXOTIC INDOOR",
    bulkPrice: 120.00,
    pricePaid: 90.00,
    askingPrice: 130.00,
    distroPrice: 110.00,
    masterPrice: 100.00,
    master2Price: 95.00,
    coa: "RUNTZ HALF OZ",
    media: "CLICK HERE",
    strainType: "HYBRID",
    sku: "RUNTZ-HALFOZ",
    quantity: 12,
    packageType: "Tree Mason Little Trees (1/2 oz)",
    brand: "Tree Mason",
    packageSize: "14g",
    category: "THCa Flower",
    status: "Low Stock"
  }
];

// Filter options based on product data
const packageTypes = [
  "ALL",
  "Bulk Pounds",
  "Half Pound",
  "Quarter Pound",
  "Golden Nuggets (oz)",
  "Tree Mason Little Trees (1/2 oz)",
  "Packaged 14g - Gold Standard",
  "Packaged 7g - Gold Standard",
  "Packaged 14g - Tree Mason",
  "Packaged 7g - Tree Mason",
  "Packaged 3.5g - Tree Mason"
];

const tiers = [
  "ALL",
  "TOP SHELF",
  "TOP SHELF - SMALLS",
  "TOP SHELF - MEDIUMS",
  "EXOTIC INDOOR",
  "AAA INDOOR",
  "CLASSIC RESERVE",
  "CLASSIC RESERVE - SMALLS",
  "AA INDOOR",
  "AA INDOOR - SMALLS"
];

const strainTypes = [
  "ALL",
  "INDICA",
  "SATIVA",
  "HYBRID",
  "INDICA DOMINANT HYBRID",
  "SATIVA DOMINANT HYBRID"
];

const brands = [
  "ALL",
  "Gold Standard",
  "Tree Mason"
];

const packageSizes = [
  "ALL",
  "1lb",
  "0.5lb",
  "0.25lb",
  "28g", // 1 ounce
  "14g", // 1/2 ounce
  "7g",  // 1/4 ounce
  "3.5g" // 1/8 ounce
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
  const [selectedPackageType, setSelectedPackageType] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedPackageSize, setSelectedPackageSize] = useState("ALL");
  
  // Voice recognition
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Voice recognition
  const toggleListening = () => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsListening(true);
      setVoiceError(null);
      
      // @ts-ignore - We're checking existence before using
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (searchInputRef.current) {
          setSearchTerm(transcript);
        }
        stopListening();
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setVoiceError(`Error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      setVoiceError('Speech recognition is not supported in this browser');
    }
  };
  
  const stopListening = () => {
    setIsListening(false);
  };

  // Filter products based on search term and filters
  const filteredProducts = data.filter(product => {
    const matchesSearch = 
      product.strain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = selectedTier === "ALL" || product.tier.includes(selectedTier);
    const matchesStrainType = selectedStrainType === "ALL" || product.strainType.includes(selectedStrainType);
    
    // Additional filters for package type, brand, and package size
    const matchesPackageType = selectedPackageType === "ALL" || 
      (product.packageType && product.packageType.includes(selectedPackageType));
    const matchesBrand = selectedBrand === "ALL" || 
      (product.brand && product.brand === selectedBrand);
    const matchesPackageSize = selectedPackageSize === "ALL" || 
      (product.packageSize && product.packageSize === selectedPackageSize);
    
    return matchesSearch && matchesTier && matchesStrainType && 
           matchesPackageType && matchesBrand && matchesPackageSize;
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

  // Determine if we're on mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configure brand badge color
  const getBrandBadgeClass = (brand: string = "") => {
    if (brand === "Gold Standard") return "bg-gold text-black";
    if (brand === "Tree Mason") return "bg-green-600 text-white";
    return "bg-gray-500 text-white";
  };
  
  // Configure package type badge color
  const getPackageTypeBadgeClass = (packageType: string = "") => {
    if (packageType.includes("Bulk")) return "bg-purple-700 text-white";
    if (packageType.includes("Half") || packageType.includes("0.5")) return "bg-blue-600 text-white";
    if (packageType.includes("Quarter") || packageType.includes("0.25")) return "bg-cyan-600 text-white";
    if (packageType.includes("Ounce") || packageType.includes("28g")) return "bg-gold text-black";
    if (packageType.includes("Half Ounce") || packageType.includes("14g")) return "bg-amber-600 text-white";
    if (packageType.includes("7g")) return "bg-green-600 text-white";
    if (packageType.includes("3.5g")) return "bg-teal-600 text-white";
    return "bg-gray-500 text-white";
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
              <Badge className={getStrainTypeBadgeClass(product.strainType)} variant="outline">
                {product.strainType}
              </Badge>
              {product.brand && (
                <Badge className={getBrandBadgeClass(product.brand)} variant="outline">
                  {product.brand}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Mobile-optimized action menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView && onView(product)} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit && onEdit(product)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer focus:text-red-600"
                onClick={() => onDelete && product.id && onDelete(product.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Package info with visual hierarchy */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {product.packageType && (
              <Badge className={getPackageTypeBadgeClass(product.packageType)} variant="secondary">
                {product.packageType}
              </Badge>
            )}
            {product.packageSize && (
              <span className="text-sm font-medium text-muted-foreground">
                {product.packageSize}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              ${product.askingPrice?.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Asking Price</div>
          </div>
        </div>
        
        {/* Key metrics in optimized mobile grid */}
        <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">THC:</span>
              <span className="font-medium">{product.percentage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock:</span>
              <span className={`font-medium ${product.quantity > 10 ? 'text-green-600' : product.quantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {product.quantity} units
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bulk:</span>
              <span className="font-medium">${product.bulkPrice?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SKU:</span>
              <span className="font-mono text-xs">{product.sku}</span>
            </div>
          </div>
        </div>
        
        {/* Quick action buttons for mobile */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-9"
            onClick={() => onView && onView(product)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-9"
            onClick={() => onEdit && onEdit(product)}
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
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

  // Main component return
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
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-primary"
              onClick={toggleListening}
              title="Use voice search"
            >
              {isListening ? (
                <Mic className="h-4 w-4 text-red-500 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span className="sr-only">Voice Search</span>
            </Button>
            {voiceError && (
              <p className="text-xs text-red-500 mt-1">{voiceError}</p>
            )}
          </div>
          {/* Enhanced mobile-first filters */}
          <div className="space-y-3">
            {/* Quick filter chips for mobile */}
            <div className="flex flex-wrap gap-2 md:hidden">
              <Button 
                variant={selectedPackageType === "Bulk Pounds" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setSelectedPackageType(selectedPackageType === "Bulk Pounds" ? "ALL" : "Bulk Pounds")}
                className="h-8 text-xs"
              >
                Bulk Pounds
              </Button>
              <Button 
                variant={selectedBrand === "Gold Standard" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setSelectedBrand(selectedBrand === "Gold Standard" ? "ALL" : "Gold Standard")}
                className="h-8 text-xs"
              >
                Gold Standard
              </Button>
              <Button 
                variant={selectedTier.includes("TOP SHELF") ? "default" : "outline"} 
                size="sm" 
                onClick={() => setSelectedTier(selectedTier.includes("TOP SHELF") ? "ALL" : "TOP SHELF")}
                className="h-8 text-xs"
              >
                Top Shelf
              </Button>
              <Button 
                variant={selectedStrainType === "INDICA" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setSelectedStrainType(selectedStrainType === "INDICA" ? "ALL" : "INDICA")}
                className="h-8 text-xs"
              >
                Indica
              </Button>
            </div>
            
            {/* Full filter dropdowns - optimized for mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Select value={selectedPackageType} onValueChange={setSelectedPackageType}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Package Type" />
                </SelectTrigger>
                <SelectContent>
                  {packageTypes.map((type) => (
                    <SelectItem key={type} value={type} className="cursor-pointer">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand} className="cursor-pointer">
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Quality Tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier} value={tier} className="cursor-pointer">
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStrainType} onValueChange={setSelectedStrainType}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Strain Type" />
                </SelectTrigger>
                <SelectContent>
                  {strainTypes.map((type) => (
                    <SelectItem key={type} value={type} className="cursor-pointer">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Clear filters button */}
            {(selectedPackageType !== "ALL" || selectedBrand !== "ALL" || selectedTier !== "ALL" || selectedStrainType !== "ALL" || searchTerm) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedPackageType("ALL");
                  setSelectedBrand("ALL");
                  setSelectedTier("ALL");
                  setSelectedStrainType("ALL");
                  setSearchTerm("");
                }}
                className="w-full sm:w-auto"
              >
                <Filter className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            )}
          </div>
          </div>
          
          {/* Secondary filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Quality Tier" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tier) => (
                  <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStrainType} onValueChange={setSelectedStrainType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Strain Type" />
              </SelectTrigger>
              <SelectContent>
                {strainTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Weight filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedPackageSize} onValueChange={setSelectedPackageSize}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Package Size" />
              </SelectTrigger>
              <SelectContent>
                {packageSizes.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="flex-1 bg-gold/10 hover:bg-gold/20 border-gold/30"
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
        )}
      </CardContent>
    </Card>
  );
};

export default THCaFlowerInventoryTable;