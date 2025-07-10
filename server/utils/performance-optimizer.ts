import { Request, Response, NextFunction } from 'express';

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    if (duration > 1000) { // Log slow requests (>1s)
      console.log(`[performance] Slow request: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};

// Cache configuration for frequently accessed endpoints
export const cacheConfig = {
  // Cache inventory data for 30 seconds
  inventory: {
    ttl: 30000,
    stale: 60000
  },
  // Cache stats for 1 minute
  stats: {
    ttl: 60000,
    stale: 120000
  },
  // Cache menu data for 5 minutes
  menu: {
    ttl: 300000,
    stale: 600000
  }
};

// Response compression for large JSON responses
export const compressLargeResponse = (data: any): any => {
  if (Array.isArray(data) && data.length > 100) {
    // For large arrays, only send essential fields - including weight for accurate cannabis product data
    return data.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      status: item.status,
      basePrice: item.basePrice || item.base_price,
      base_price: item.base_price,
      sale_price: item.sale_price,
      cost_price: item.cost_price,
      salePrice: item.salePrice || item.sale_price,
      costPrice: item.costPrice || item.cost_price,
      category: item.category,
      weight: item.weight, // Essential for cannabis product accuracy
      // Add image fields for display
      imageUrl: item.imageUrl,
      images: item.images,
      // Add price field for frontend display
      price: item.price
    }));
  }
  return data;
};

// Database query optimization helper
export const optimizeQuery = {
  // Pagination for large datasets
  paginate: (page: number = 1, limit: number = 50) => ({
    limit: Math.min(limit, 100), // Cap at 100 items per page
    offset: (page - 1) * Math.min(limit, 100)
  }),
  
  // Essential fields for inventory listings
  inventoryFields: [
    'id', 'name', 'sku', 'status', 'quantity', 
    'base_price', 'sale_price', 'category', 'brand'
  ],
  
  // Fields for detailed views
  detailFields: [
    'id', 'name', 'sku', 'description', 'status', 'quantity',
    'base_price', 'sale_price', 'cost_price', 'category', 'brand',
    'weight', 'thca_percentage', 'media', 'shopify_id'
  ]
};

// API response formatter for consistency
export const formatResponse = {
  success: (data: any, message?: string) => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }),
  
  error: (message: string, code?: string) => ({
    success: false,
    error: {
      message,
      code: code || 'UNKNOWN_ERROR'
    },
    timestamp: new Date().toISOString()
  }),
  
  paginated: (data: any[], total: number, page: number, limit: number) => ({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  })
};