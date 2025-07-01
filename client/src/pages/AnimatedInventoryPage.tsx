import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AnimatedProductGrid } from '@/components/AnimatedProductGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  RefreshCw,
  Sparkles,
  TrendingUp,
  Package,
  DollarSign
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku?: string;
  quantity?: number;
  base_price?: number;
  sale_price?: number;
  cost_price?: number;
  status?: string;
  category?: string;
  description?: string;
  image_url?: string;
  weight?: string;
  thca_percentage?: string;
}

export function AnimatedInventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<'auto' | 3 | 4 | 5>('auto');

  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['/api/inventory/enhanced'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const products: Product[] = Array.isArray(inventoryData) ? inventoryData : [];

  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                          product.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Get categories for filter
  const categories = ['all', ...new Set(products.map((p: Product) => p.category).filter(Boolean))] as string[];

  // Calculate stats
  const totalProducts = filteredProducts.length;
  const totalValue = filteredProducts.reduce((sum: number, product: Product) => {
    const price = product.sale_price || product.base_price || product.cost_price || 0;
    return sum + (price * (product.quantity || 0));
  }, 0);
  const inStockProducts = filteredProducts.filter((p: Product) => (p.quantity || 0) > 0).length;
  const lowStockProducts = filteredProducts.filter((p: Product) => (p.quantity || 0) > 0 && (p.quantity || 0) <= 10).length;

  const handleProductView = (product: Product) => {
    console.log('Viewing product:', product);
    // Add product view logic
  };

  const handleProductEdit = (product: Product) => {
    console.log('Editing product:', product);
    // Add product edit logic
  };

  const handleProductOrder = (product: Product) => {
    console.log('Ordering product:', product);
    // Open Shopify store page
    window.open(`/api/items/${product.id}/shopify-storefront`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gold-600 to-green-600 bg-clip-text text-transparent">
                Animated Inventory
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Experience our enhanced product cards with smooth animations and hover effects
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200">
                <Sparkles className="w-4 h-4 mr-1" />
                Enhanced UI
              </Badge>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Products</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalProducts}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400">In Stock</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{inStockProducts}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">Low Stock</p>
                      <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{lowStockProducts}</p>
                    </div>
                    <Package className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20 border-gold-200 dark:border-gold-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gold-600 dark:text-gold-400">Total Value</p>
                      <p className="text-2xl font-bold text-gold-700 dark:text-gold-300">
                        ${totalValue.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-gold-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Filters and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & View Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {categories.map((category: string) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>

                {/* View Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="gap-2"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="gap-2"
                  >
                    <List className="w-4 h-4" />
                    List
                  </Button>
                </div>

                {/* Grid Columns */}
                {viewMode === 'grid' && (
                  <div className="flex gap-1">
                    {(['auto', 3, 4, 5] as const).map((cols) => (
                      <Button
                        key={cols}
                        variant={gridColumns === cols ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGridColumns(cols)}
                        className="w-10 h-8 p-0"
                      >
                        {cols === 'auto' ? 'A' : cols}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Product Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <AnimatedProductGrid
            products={filteredProducts}
            loading={isLoading}
            onProductView={handleProductView}
            onProductEdit={handleProductEdit}
            onProductOrder={handleProductOrder}
            columns={gridColumns}
          />
        </motion.div>

        {/* Results Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center text-gray-600 dark:text-gray-400"
        >
          <p>
            Showing {filteredProducts.length} of {products.length} products
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          </p>
        </motion.div>
      </div>
    </div>
  );
}