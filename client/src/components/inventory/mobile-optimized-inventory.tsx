import React, { useState, useEffect, useRef } from 'react';
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
  Mic,
  MicOff
} from 'lucide-react';

interface THCaFlowerProduct {
  id: number;
  strain: string;
  amount: number;
  percentage: string;
  tier: string;
  bulkPrice: number;
  pricePaid?: number;
  askingPrice?: number;
  distroPrice?: number;
  masterPrice?: number;
  master2Price?: number;
  coa: string;
  media: string;
  strainType: string;
  sku: string;
  quantity: number;
  packageType: string;
  brand: string;
  packageSize: string;
  category: string;
  status?: string;
}

interface MobileOptimizedInventoryProps {
  data?: THCaFlowerProduct[];
  onEdit?: (product: THCaFlowerProduct) => void;
  onDelete?: (id: number) => void;
  onView?: (product: THCaFlowerProduct) => void;
}

// Mobile-first filter options
const packageTypes = ["ALL", "Bulk Pounds", "Half Pound", "Quarter Pound", "Golden Nuggets (oz)", "Tree Mason Little Trees (1/2 oz)"];
const tiers = ["ALL", "TOP SHELF", "TOP SHELF - SMALLS", "EXOTIC INDOOR", "AAA INDOOR", "CLASSIC RESERVE", "AA INDOOR"];
const strainTypes = ["ALL", "INDICA", "SATIVA", "HYBRID", "INDICA DOMINANT HYBRID", "SATIVA DOMINANT HYBRID"];
const brands = ["ALL", "Gold Standard", "Tree Mason"];

export const MobileOptimizedInventory: React.FC<MobileOptimizedInventoryProps> = ({
  data = [],
  onEdit,
  onDelete,
  onView
}) => {
  // Enhanced mobile state management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [selectedStrainType, setSelectedStrainType] = useState("ALL");
  const [selectedPackageType, setSelectedPackageType] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mobile-specific responsive detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced voice recognition for mobile
  const toggleListening = () => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        setVoiceError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      setVoiceError('Voice recognition not supported in this browser');
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  // Enhanced filtering with mobile optimization
  const filteredProducts = data.filter(product => {
    const matchesSearch = product.strain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === "ALL" || product.tier === selectedTier;
    const matchesStrainType = selectedStrainType === "ALL" || product.strainType === selectedStrainType;
    const matchesPackageType = selectedPackageType === "ALL" || product.packageType === selectedPackageType;
    const matchesBrand = selectedBrand === "ALL" || product.brand === selectedBrand;
    
    return matchesSearch && matchesTier && matchesStrainType && matchesPackageType && matchesBrand;
  });

  // Enhanced mobile card component
  const renderMobileCard = (product: THCaFlowerProduct) => (
    <Card key={product.id} className="mb-3 border-gold/20 shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate text-foreground">
              {product.strain}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary" className="text-xs font-medium">
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
          
          {/* Mobile-optimized action menu with larger touch targets */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 touch-manipulation">
                <MoreHorizontal className="h-5 w-5" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 touch-manipulation">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => onView && onView(product)} 
                className="cursor-pointer py-3 touch-manipulation"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onEdit && onEdit(product)} 
                className="cursor-pointer py-3 touch-manipulation"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer py-3 touch-manipulation focus:text-red-600"
                onClick={() => onDelete && product.id && onDelete(product.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Enhanced package and pricing display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {product.packageType}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {product.packageSize}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              ${product.askingPrice?.toFixed(2) || product.bulkPrice?.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Price</div>
          </div>
        </div>
        
        {/* Mobile-optimized info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 rounded-lg p-3">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">THC:</span>
              <span className="font-semibold">{product.percentage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock:</span>
              <span className={`font-semibold ${
                product.quantity > 10 ? 'text-green-600' : 
                product.quantity > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {product.quantity}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bulk:</span>
              <span className="font-semibold">${product.bulkPrice?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SKU:</span>
              <span className="font-mono text-xs font-medium">{product.sku}</span>
            </div>
          </div>
        </div>
        
        {/* Mobile-optimized action buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 text-xs touch-manipulation"
            onClick={() => onView && onView(product)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 text-xs touch-manipulation"
            onClick={() => onEdit && onEdit(product)}
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 text-xs touch-manipulation"
            onClick={() => alert('Quick order feature coming soon')}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="shadow-lg border-gold/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold gold-gradient-text">
          THCa Flower Inventory
        </CardTitle>
        <CardDescription className="text-base">
          Mobile-optimized inventory management with touch-friendly interactions
        </CardDescription>
        
        {/* Mobile-first search and voice input */}
        <div className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search strains, SKUs..."
              className="pl-10 pr-12 h-12 text-base touch-manipulation"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 touch-manipulation"
              onClick={toggleListening}
              title="Voice search"
            >
              {isListening ? (
                <Mic className="h-4 w-4 text-red-500 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            {voiceError && (
              <p className="text-xs text-red-500 mt-1">{voiceError}</p>
            )}
          </div>

          {/* Quick filter chips for mobile */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedPackageType === "Bulk Pounds" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setSelectedPackageType(selectedPackageType === "Bulk Pounds" ? "ALL" : "Bulk Pounds")}
              className="h-9 text-xs touch-manipulation"
            >
              Bulk Pounds
            </Button>
            <Button 
              variant={selectedBrand === "Gold Standard" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setSelectedBrand(selectedBrand === "Gold Standard" ? "ALL" : "Gold Standard")}
              className="h-9 text-xs touch-manipulation"
            >
              Gold Standard
            </Button>
            <Button 
              variant={selectedTier.includes("TOP SHELF") ? "default" : "outline"} 
              size="sm" 
              onClick={() => setSelectedTier(selectedTier.includes("TOP SHELF") ? "ALL" : "TOP SHELF")}
              className="h-9 text-xs touch-manipulation"
            >
              Top Shelf
            </Button>
          </div>
          
          {/* Mobile-optimized filter dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <Select value={selectedPackageType} onValueChange={setSelectedPackageType}>
              <SelectTrigger className="h-12 touch-manipulation">
                <SelectValue placeholder="Package Type" />
              </SelectTrigger>
              <SelectContent className="touch-manipulation">
                {packageTypes.map((type) => (
                  <SelectItem key={type} value={type} className="py-3 touch-manipulation">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="h-12 touch-manipulation">
                <SelectValue placeholder="Quality Tier" />
              </SelectTrigger>
              <SelectContent className="touch-manipulation">
                {tiers.map((tier) => (
                  <SelectItem key={tier} value={tier} className="py-3 touch-manipulation">
                    {tier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Clear filters for mobile */}
          {(selectedPackageType !== "ALL" || selectedBrand !== "ALL" || selectedTier !== "ALL" || searchTerm) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedPackageType("ALL");
                setSelectedBrand("ALL");
                setSelectedTier("ALL");
                setSearchTerm("");
              }}
              className="w-full h-10 touch-manipulation"
            >
              <Filter className="mr-2 h-4 w-4" />
              Clear All Filters
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Results summary */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {data.length} products
        </div>
        
        {/* Mobile card grid */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No products found</p>
              <p className="text-sm">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            filteredProducts.map(renderMobileCard)
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileOptimizedInventory;