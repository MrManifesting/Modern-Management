// Application constants

// API endpoints
export const API_ENDPOINTS = {
  ITEMS: "/api/items",
  ITEM_DETAIL: (id: number) => `/api/items/${id}`,
  MARKETPLACES: "/api/marketplaces",
  MARKETPLACE_CONNECT: (id: number) => `/api/marketplaces/${id}/connect`,
  ANALYZE_IMAGE: "/api/analyze-image",
  GENERATE_SEO: "/api/generate-seo",
  EXPORT_CSV: "/api/export-csv",
  STATS: "/api/stats",
};

// Item categories
export const ITEM_CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home Goods",
  "Collectibles",
  "Toys",
  "Books",
  "Jewelry",
  "Art",
  "Sporting Goods",
  "Automotive",
  "Other",
];

// Item conditions
export const ITEM_CONDITIONS = [
  "New",
  "Like New",
  "Very Good",
  "Good",
  "Acceptable",
  "For Parts",
];

// Item statuses
export const ITEM_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "listed", label: "Listed" },
  { value: "sold", label: "Sold" },
];

// Marketplace platforms (full objects with details)
export const MARKETPLACE_PLATFORM_DETAILS = [
  { 
    name: "eBay", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/2560px-EBay_logo.svg.png",
    bgColor: "bg-blue-50",
    badgeClass: "bg-blue-500 text-white",
    description: "Sell on one of the world's largest marketplaces with millions of active users."
  },
  { 
    name: "Etsy", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Etsy_logo.svg/2560px-Etsy_logo.svg.png",
    bgColor: "bg-orange-50",
    badgeClass: "bg-orange-500 text-white",
    description: "Perfect for handmade, vintage items, and craft supplies."
  },
  { 
    name: "Amazon", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png",
    bgColor: "bg-amber-50",
    badgeClass: "bg-amber-500 text-white",
    description: "Reach millions of Prime members and Amazon customers worldwide."
  },
  { 
    name: "Shopify", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/2560px-Shopify_logo_2018.svg.png",
    bgColor: "bg-green-50",
    badgeClass: "bg-green-500 text-white",
    description: "Sync with your Shopify store to manage your own branded e-commerce presence."
  },
  {
    name: "Woo Commerce",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/WooCommerce_logo.svg/1200px-WooCommerce_logo.svg.png",
    bgColor: "bg-purple-50",
    badgeClass: "bg-purple-500 text-white",
    description: "Connect your WordPress WooCommerce store for seamless inventory management."
  },
  {
    name: "Magento",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Magento_Logo.svg/1280px-Magento_Logo.svg.png",
    bgColor: "bg-pink-50",
    badgeClass: "bg-pink-500 text-white",
    description: "Enterprise-level e-commerce platform for businesses with complex requirements."
  }
];

// Simple marketplace platform names (for form selects)
export const MARKETPLACE_PLATFORMS = MARKETPLACE_PLATFORM_DETAILS.map(platform => platform.name);

// Status badge classes
export const STATUS_BADGE_CLASSES = {
  listed: "status-badge-listed",
  draft: "status-badge-draft",
  sold: "status-badge-sold",
  default: "bg-gray-500"
};

// Maximum file size for uploads (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Accepted image file types
export const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"]
};

// Default pagination limit
export const DEFAULT_ITEMS_PER_PAGE = 12;

// Demo user information (for display only)
export const DEMO_USER = {
  initials: "JS",
  name: "John Smith",
  email: "john@example.com"
};
