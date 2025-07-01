import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ShoppingCart, FileText, Download, Phone } from 'lucide-react';

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

interface AnimatedProductCardProps {
  product: Product;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onOrder?: (product: Product) => void;
  showActions?: boolean;
}

export function AnimatedProductCard({ 
  product, 
  onView, 
  onEdit, 
  onOrder,
  showActions = true 
}: AnimatedProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const price = product.sale_price || product.base_price || product.cost_price || 0;
  const formattedPrice = price > 0 ? `$${price.toFixed(2)}` : 'Contact for Price';
  
  // Extract strain name for cleaner display
  const strainName = product.name?.split(' - ')[0] || product.name || 'Unknown Product';
  
  // Determine stock status
  const quantity = product.quantity || 0;
  const stockStatus = quantity > 50 ? 'high' : quantity > 10 ? 'medium' : quantity > 0 ? 'low' : 'out';
  const stockColor = {
    high: 'bg-green-500',
    medium: 'bg-yellow-500', 
    low: 'bg-orange-500',
    out: 'bg-red-500'
  }[stockStatus];

  // Animation variants
  const cardVariants = {
    initial: {
      scale: 1,
      y: 0,
      rotateY: 0,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    hover: {
      scale: 1.05,
      y: -8,
      rotateY: 5,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  };

  const imageVariants = {
    initial: {
      scale: 1,
      filter: 'brightness(1) saturate(1)'
    },
    hover: {
      scale: 1.1,
      filter: 'brightness(1.1) saturate(1.2)',
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    }
  };

  const overlayVariants = {
    initial: {
      opacity: 0,
      y: 20
    },
    hover: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  };

  const buttonVariants = {
    initial: {
      scale: 0.9,
      opacity: 0
    },
    hover: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.2,
        delay: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group cursor-pointer"
      style={{ perspective: '1000px' }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-transparent hover:border-gold-200 dark:hover:border-gold-700 transition-all duration-300">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-gold-400 via-transparent to-green-400" />
        </div>

        {/* Stock Status Indicator */}
        <div className="absolute top-3 right-3 z-20">
          <div className={`w-3 h-3 rounded-full ${stockColor} shadow-lg`} />
        </div>

        {/* Product Image Section */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gold-50 to-green-50 dark:from-gold-900/20 dark:to-green-900/20">
          <motion.div
            variants={imageVariants}
            className="absolute inset-0"
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={strainName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold-100 to-green-100 dark:from-gold-900/30 dark:to-green-900/30">
                <div className="text-6xl opacity-30">🌿</div>
              </div>
            )}
          </motion.div>

          {/* Hover Overlay */}
          <motion.div
            variants={overlayVariants}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          >
            {showActions && (
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  variants={buttonVariants}
                  className="flex gap-2"
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white text-gray-900"
                    onClick={() => onView?.(product)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    className="bg-gold-500 hover:bg-gold-600 text-white"
                    onClick={() => onOrder?.(product)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <motion.h3 
                className="font-semibold text-lg leading-tight truncate bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
                animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {strainName}
              </motion.h3>
              
              {product.sku && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  SKU: {product.sku}
                </p>
              )}
            </div>

            <motion.div
              animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Badge 
                variant={product.status === 'active' ? 'default' : 'secondary'}
                className="bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200"
              >
                {product.status?.toUpperCase() || 'DRAFT'}
              </Badge>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Pricing and Quantity */}
          <div className="flex items-center justify-between mb-3">
            <motion.div
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
              className="text-2xl font-bold bg-gradient-to-r from-gold-600 to-green-600 bg-clip-text text-transparent"
            >
              {formattedPrice}
            </motion.div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Stock</div>
              <div className={`font-semibold ${quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {quantity} units
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-2">
            {product.weight && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Weight:</span>
                <span className="font-medium">{product.weight}</span>
              </div>
            )}
            
            {product.thca_percentage && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">THCa:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {product.thca_percentage}%
                </span>
              </div>
            )}
            
            {product.category && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Category:</span>
                <span className="font-medium">{product.category}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {showActions && (
            <motion.div
              className="mt-4 grid grid-cols-4 gap-1"
              variants={{
                initial: { opacity: 0.7 },
                hover: { opacity: 1 }
              }}
            >
              <Button
                size="sm"
                variant="outline"
                className="text-xs p-1 h-8"
                onClick={() => onView?.(product)}
              >
                <FileText className="w-3 h-3" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="text-xs p-1 h-8"
                onClick={() => window.open(`/api/items/${product.id}/coa-redirect`, '_blank')}
              >
                📄
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="text-xs p-1 h-8"
                onClick={() => window.open(`/api/items/${product.id}/media-pack`, '_blank')}
              >
                <Download className="w-3 h-3" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="text-xs p-1 h-8"
                onClick={() => window.open('tel:541-295-8811', '_self')}
              >
                <Phone className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </CardContent>

        {/* Animated Border Glow */}
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-transparent opacity-0 -z-10"
          animate={isHovered ? { opacity: 0.3 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: isHovered 
              ? 'linear-gradient(45deg, #D4AF37, #228B22, #D4AF37, #D4AF37, #228B22)'
              : 'transparent',
            backgroundSize: '400% 400%',
            animation: isHovered ? 'gradientShift 3s ease infinite' : 'none'
          }}
        />
      </Card>
    </motion.div>
  );
}