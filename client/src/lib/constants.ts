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

// Marketplace platforms
export const MARKETPLACE_PLATFORMS = [
  { 
    name: "eBay", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/2560px-EBay_logo.svg.png",
    bgColor: "bg-blue-50",
    badgeClass: "marketplace-badge-ebay"
  },
  { 
    name: "Etsy", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Etsy_logo.svg/2560px-Etsy_logo.svg.png",
    bgColor: "bg-purple-50",
    badgeClass: "marketplace-badge-etsy"
  },
  { 
    name: "Amazon", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png",
    bgColor: "bg-red-50",
    badgeClass: "marketplace-badge-amazon"
  },
  { 
    name: "Shopify", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/2560px-Shopify_logo_2018.svg.png",
    bgColor: "bg-gray-50",
    badgeClass: "marketplace-badge-shopify"
  },
];

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
