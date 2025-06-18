import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Package, Clock, Filter, ShoppingBag, Star, Zap, Sparkles, TrendingUp, Award, CheckCircle, Phone, Mail, Eye, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

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

export default function ModernLiveCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const { data: catalogData, isLoading, error } = useQuery<CatalogResponse>({
    queryKey: ["/api/catalog/live"],
    refetchInterval: 15000,
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
    if (item.salePrice && item.salePrice !== "null") {
      const price = typeof item.salePrice === 'number' ? item.salePrice : parseFloat(item.salePrice?.toString().replace(/[$,]/g, "") || "0");
      if (price > 0) return { price: `$${price.toFixed(2)}`, type: "Sale", originalPrice: item.basePrice };
    }
    if (item.basePrice && item.basePrice !== "null") {
      const price = typeof item.basePrice === 'number' ? item.basePrice : parseFloat(item.basePrice?.toString().replace(/[$,]/g, "") || "0");
      if (price > 0) return { price: `$${price.toFixed(2)}`, type: "Regular" };
    }
    if (item.wholesalePrice && item.wholesalePrice !== "null") {
      const price = typeof item.wholesalePrice === 'number' ? item.wholesalePrice : parseFloat(item.wholesalePrice?.toString().replace(/[$,]/g, "") || "0");
      if (price > 0) return { price: `$${price.toFixed(2)}`, type: "Wholesale" };
    }
    return { price: "Contact for Price", type: "" };
  };

  // Get tier badge styling
  const getTierStyle = (name: string) => {
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes("TOP SHELF") || nameUpper.includes("EXOTIC")) {
      return { bg: "bg-gradient-to-r from-yellow-400 to-orange-500", text: "text-white", icon: Award, label: "Top Shelf" };
    }
    if (nameUpper.includes("AAA") || nameUpper.includes("PREMIUM")) {
      return { bg: "bg-gradient-to-r from-purple-500 to-pink-500", text: "text-white", icon: Star, label: "AAA Premium" };
    }
    if (nameUpper.includes("AA") || nameUpper.includes("CLASSIC")) {
      return { bg: "bg-gradient-to-r from-blue-500 to-cyan-500", text: "text-white", icon: CheckCircle, label: "AA Classic" };
    }
    return { bg: "bg-gradient-to-r from-green-500 to-emerald-500", text: "text-white", icon: Leaf, label: "Premium" };
  };

  const toggleFavorite = (itemId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-12">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block"
            >
              <Sparkles className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2">Loading Premium Catalog</h2>
            <p className="text-emerald-200">Preparing the finest selection...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-slate-900 p-4">
        <div className="container mx-auto text-center py-12">
          <h2 className="text-3xl font-bold text-white mb-4">Catalog Temporarily Unavailable</h2>
          <p className="text-red-200 mb-6">Our premium selection is being updated</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-purple-600/90" />
        <div className="relative container mx-auto px-4 py-16">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Leaf className="h-16 w-16 mr-4 text-emerald-300" />
              </motion.div>
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-white bg-gradient-to-r from-emerald-300 to-purple-300 bg-clip-text text-transparent">
                  Gold Standard
                </h1>
                <p className="text-xl text-emerald-200">Premium Cannabis Collective</p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Live Premium Catalog</h2>
              <p className="text-lg text-purple-200">Authentic THCa Hemp Flower • Real-Time Inventory</p>
            </motion.div>
            
            {/* Live Stats with Animation */}
            <motion.div 
              className="flex flex-wrap justify-center items-center gap-8 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div 
                className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3"
                whileHover={{ scale: 1.05 }}
              >
                <Package className="h-5 w-5 mr-2 text-emerald-300" />
                <span className="text-white font-semibold">{catalogData?.totalAvailable || 0} Premium Strains</span>
              </motion.div>
              
              <motion.div 
                className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="h-5 w-5 mr-2 text-purple-300" />
                </motion.div>
                <span className="text-white font-semibold">Live Updates</span>
              </motion.div>
              
              <motion.div 
                className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3"
                whileHover={{ scale: 1.05 }}
              >
                <Zap className="h-5 w-5 mr-2 text-yellow-300" />
                <span className="text-white font-semibold">Instant Availability</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Advanced Filters */}
        <motion.div 
          className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-8 border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2 flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Price Range
              </label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under100">Under $100</SelectItem>
                  <SelectItem value="100-500">$100 - $500</SelectItem>
                  <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                  <SelectItem value="over1000">Over $1,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                View Mode
              </label>
              <div className="flex bg-white/10 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="flex-1"
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="flex-1"
                >
                  List
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Header */}
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-white">
            Premium Selection 
            <span className="text-emerald-400 ml-2">({filteredItems.length})</span>
          </h2>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 text-sm">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-white rounded-full mr-2"
              />
              Live Inventory
            </Badge>
          </motion.div>
        </motion.div>

        {/* Product Grid/List */}
        {filteredItems.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Package className="h-20 w-20 text-white/40 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">No Products Available</h3>
            <p className="text-white/70 mb-6">Try adjusting your filters or contact us directly</p>
            <Button 
              onClick={() => {
                setSelectedCategory("all");
                setPriceRange("all");
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Reset Filters
            </Button>
          </motion.div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            <AnimatePresence>
              {filteredItems.map((item: CatalogItem, index) => {
                const { price, type, originalPrice } = getPrice(item);
                const tierStyle = getTierStyle(item.name);
                const IconComponent = tierStyle.icon;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="group"
                  >
                    <Card className="overflow-hidden bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300 h-full">
                      <CardHeader className="pb-3 relative">
                        {/* Favorite Button */}
                        <motion.button
                          onClick={() => toggleFavorite(item.id)}
                          className="absolute top-4 right-4 z-10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Heart 
                            className={`h-5 w-5 ${favorites.has(item.id) ? 'text-red-500 fill-current' : 'text-white/60'}`}
                          />
                        </motion.button>

                        {/* Tier Badge */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                        >
                          <Badge className={`${tierStyle.bg} ${tierStyle.text} mb-3 w-fit`}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {tierStyle.label}
                          </Badge>
                        </motion.div>

                        {/* Stock Badge */}
                        <div className="flex justify-between items-start mb-3">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                          >
                            <Badge 
                              variant="outline" 
                              className={`${(item.quantity || 0) > 10 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 
                                         (item.quantity || 0) > 5 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                         'bg-red-500/20 text-red-300 border-red-500/30'}`}
                            >
                              {item.quantity || 0} in stock
                            </Badge>
                          </motion.div>
                        </div>

                        <CardTitle className="text-lg leading-tight text-white group-hover:text-emerald-300 transition-colors">
                          {item.name.replace(/- THCA .*?FLOWER.*?-/i, "").replace(/THCA/gi, "").trim()}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="pt-0 space-y-4">
                        {/* Product Details */}
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-white/70">
                            <Package className="h-4 w-4 mr-2 text-emerald-400" />
                            <span>{item.weight || "Contact for details"}</span>
                          </div>
                          
                          {item.thcaPercentage && (
                            <div className="flex items-center text-sm text-white/70">
                              <Leaf className="h-4 w-4 mr-2 text-emerald-400" />
                              <span>{item.thcaPercentage}% THCa</span>
                            </div>
                          )}
                          
                          <div className="text-xs text-white/50">
                            SKU: {item.sku || "N/A"}
                          </div>
                        </div>
                        
                        {/* Price Section */}
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl font-bold text-emerald-400">
                              {price}
                            </span>
                            {type && (
                              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                {type}
                              </Badge>
                            )}
                          </div>
                          
                          {originalPrice && type === "Sale" && (
                            <div className="text-sm text-white/60 line-through">
                              {typeof originalPrice === 'number' ? `$${originalPrice.toFixed(2)}` : originalPrice}
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button 
                              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg"
                              onClick={() => window.open('tel:+15412958811', '_self')}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call to Order
                            </Button>
                          </motion.div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                              onClick={() => navigator.share?.({ 
                                title: item.name, 
                                text: `Check out ${item.name} - ${price}`,
                                url: window.location.href 
                              })}
                            >
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Premium Contact Footer */}
        <motion.div 
          className="mt-16 bg-gradient-to-r from-emerald-600/20 to-purple-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="text-center">
            <motion.h3 
              className="text-3xl font-bold text-white mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Ready for Premium Quality?
            </motion.h3>
            <p className="text-white/80 mb-8 text-lg">
              Experience our curated selection with wholesale pricing and premium service
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 mb-8">
              <motion.a
                href="tel:+15412958811"
                className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full font-semibold transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Phone className="h-5 w-5 mr-2" />
                (541) 295-8811
              </motion.a>
              
              <motion.a
                href="mailto:bulk@goldcbd.com"
                className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mail className="h-5 w-5 mr-2" />
                bulk@goldcbd.com
              </motion.a>
            </div>
            
            <motion.div 
              className="flex flex-wrap justify-center gap-4 text-sm text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-emerald-400" />
                Real-time inventory
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-emerald-400" />
                Wholesale accounts available
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-emerald-400" />
                Licensed distributor
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-emerald-400" />
                Lab tested quality
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}