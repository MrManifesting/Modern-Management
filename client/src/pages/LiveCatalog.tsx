import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Leaf, Package, DollarSign, Clock, Phone, Mail } from "lucide-react";
import { useState } from "react";

interface CatalogItem {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  weight: string | null;
  quantity: number | null;
  basePrice: string | null;
  salePrice: string | null;
  wholesalePrice: string | null;
  brand: string | null;
  thcaPercentage: string | null;
  condition: string | null;
  imageUrl: string | null;
  updatedAt: Date | null;
}

interface CatalogResponse {
  items: CatalogItem[];
  totalAvailable: number;
  lastUpdated: string;
  categories: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

export default function LiveCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");

  const { data: catalogData, isLoading, error } = useQuery<CatalogResponse>({
    queryKey: ["/api/catalog/live"],
    refetchInterval: 15000, // Refresh every 15 seconds for live updates
  });

  const items = catalogData?.items || [];
  const categories = ["all", ...(catalogData?.categories || [])];

  // Filter items based on selection
  const filteredItems = items.filter((item: CatalogItem) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    
    if (priceRange !== "all") {
      const price = parseFloat(item.basePrice?.replace(/[$,]/g, "") || "0");
      switch (priceRange) {
        case "under100": return price < 100;
        case "100-500": return price >= 100 && price <= 500;
        case "500-1000": return price >= 500 && price <= 1000;
        case "over1000": return price > 1000;
        default: return true;
      }
    }
    
    return true;
  });

  // Get price display
  const getPrice = (item: CatalogItem) => {
    if (item.salePrice && item.salePrice !== "null" && parseFloat(item.salePrice.replace(/[$,]/g, "")) > 0) {
      return { price: item.salePrice, type: "Sale" };
    }
    if (item.basePrice && item.basePrice !== "null" && parseFloat(item.basePrice.replace(/[$,]/g, "")) > 0) {
      return { price: item.basePrice, type: "Regular" };
    }
    return { price: "Contact for Price", type: "" };
  };

  // Get tier badge color
  const getTierColor = (name: string) => {
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes("TOP SHELF") || nameUpper.includes("EXOTIC")) return "bg-yellow-500";
    if (nameUpper.includes("AAA") || nameUpper.includes("PREMIUM")) return "bg-purple-500";
    if (nameUpper.includes("AA") || nameUpper.includes("CLASSIC")) return "bg-blue-500";
    return "bg-green-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="container mx-auto">
          <div className="text-center py-12">
            <Leaf className="h-16 w-16 text-green-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-green-800">Loading Fresh Inventory...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
        <div className="container mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Catalog</h2>
          <p className="text-red-600">Please contact us directly for current availability</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Leaf className="h-12 w-12 mr-3" />
              <h1 className="text-4xl font-bold">Gold Standard CBD</h1>
            </div>
            <p className="text-xl text-green-100 mb-2">Live Flower Catalog</p>
            <p className="text-green-200">Premium THCa Hemp Flower • Real-Time Inventory</p>
            
            {/* Live Stats */}
            <div className="flex justify-center items-center mt-6 space-x-6">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                <span>{catalogData?.totalAvailable || 0} Strains Available</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <span>Updated Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Prices</option>
                <option value="under100">Under $100</option>
                <option value="100-500">$100 - $500</option>
                <option value="500-1000">$500 - $1,000</option>
                <option value="over1000">Over $1,000</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Available Flower ({filteredItems.length} strains)
          </h2>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Live Inventory
          </Badge>
        </div>

        {/* Product Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Products Available</h3>
            <p className="text-gray-500">Try adjusting your filters or contact us directly</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item: CatalogItem) => {
              const { price, type } = getPrice(item);
              
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={`${getTierColor(item.name)} text-white`}>
                        {item.name.includes("TOP SHELF") ? "Top Shelf" :
                         item.name.includes("EXOTIC") ? "Exotic" :
                         item.name.includes("AAA") ? "AAA" :
                         item.name.includes("AA") ? "AA" : "Premium"}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {item.quantity || 0} in stock
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {item.name.replace(/- THCA .*?FLOWER.*?-/i, "").replace(/THCA/gi, "").trim()}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Weight */}
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="h-4 w-4 mr-2" />
                        <span>{item.weight || "Contact for details"}</span>
                      </div>
                      
                      {/* THCa Percentage */}
                      {item.thcaPercentage && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Leaf className="h-4 w-4 mr-2" />
                          <span>{item.thcaPercentage}% THCa</span>
                        </div>
                      )}
                      
                      {/* SKU */}
                      <div className="text-xs text-gray-500">
                        SKU: {item.sku || "N/A"}
                      </div>
                      
                      <Separator />
                      
                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                          <span className="text-lg font-bold text-green-700">
                            {price}
                          </span>
                          {type && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => window.open('tel:+15412958811', '_self')}
                      >
                        Call to Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Contact Footer */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to Order?</h3>
            <p className="text-gray-600 mb-6">Contact us directly for wholesale pricing and bulk orders</p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="flex items-center">
                <Phone className="h-5 w-5 mr-2 text-green-600" />
                <a href="tel:+15412958811" className="text-green-600 hover:text-green-700 font-semibold">
                  (541) 295-8811
                </a>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-green-600" />
                <a href="mailto:bulk@goldcbd.com" className="text-green-600 hover:text-green-700 font-semibold">
                  bulk@goldcbd.com
                </a>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              Inventory updates every 30 seconds • Wholesale accounts available • Licensed distributor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}