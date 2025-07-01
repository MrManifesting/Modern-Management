import { motion } from 'framer-motion';
import { AnimatedProductCard } from './AnimatedProductCard';

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

interface AnimatedProductGridProps {
  products: Product[];
  loading?: boolean;
  onProductView?: (product: Product) => void;
  onProductEdit?: (product: Product) => void;
  onProductOrder?: (product: Product) => void;
  columns?: 'auto' | 1 | 2 | 3 | 4 | 5 | 6;
  showActions?: boolean;
}

export function AnimatedProductGrid({
  products,
  loading = false,
  onProductView,
  onProductEdit,
  onProductOrder,
  columns = 'auto',
  showActions = true
}: AnimatedProductGridProps) {
  
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    }
  };

  const getGridColumns = () => {
    if (columns === 'auto') {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
    }
    return `grid-cols-${columns}`;
  };

  if (loading) {
    return (
      <div className={`grid ${getGridColumns()} gap-6`}>
        {Array.from({ length: 8 }, (_, i) => (
          <motion.div
            key={i}
            className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 animate-pulse"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4 opacity-30">📦</div>
        <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
          No Products Found
        </h3>
        <p className="text-gray-500 dark:text-gray-500">
          Try adjusting your filters or add some products to get started.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid ${getGridColumns()} gap-6`}
    >
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          variants={itemVariants}
          custom={index}
        >
          <AnimatedProductCard
            product={product}
            onView={onProductView}
            onEdit={onProductEdit}
            onOrder={onProductOrder}
            showActions={showActions}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// Loading skeleton component for individual cards
export function AnimatedProductCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Image skeleton */}
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-2/3 animate-pulse" />
          </div>
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="space-y-1">
            <div className="h-3 w-12 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-12 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-10 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
            <div className="h-3 w-12 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-1 mt-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </motion.div>
  );
}