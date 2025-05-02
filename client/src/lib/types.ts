// Utility types that extend shared schema types

import { Item, Marketplace } from "@shared/schema";

// Dashboard stats types
export interface DashboardStats {
  inventory: {
    total: number;
    listed: number;
    inStock: number;
    revenue: number;
  };
  marketplaces: {
    total: number;
    connected: number;
  };
}

// Form submission status
export interface FormStatus {
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  message?: string;
}

// File with preview URL
export interface FileWithPreview extends File {
  preview: string;
}



// Item with additional UI state
export interface ItemWithUIState extends Item {
  isSelected?: boolean;
  isHovered?: boolean;
}

// Filter options for inventory
export interface InventoryFilters {
  category?: string;
  priceRange?: [number, number];
  status?: string;
  searchQuery?: string;
  sortBy?: keyof Item;
  sortDirection?: "asc" | "desc";
}

// CSV export options
export interface CSVExportOptions {
  selectedItems: number[];
  selectedMarketplaces: string[];
  formatOptions?: {
    includeHeaders: boolean;
    delimiter: string;
  };
}

// Navigation item
export interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

// Quick action item
export interface QuickAction {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  onClick: () => void;
}

// Stats card props
export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  changeValue?: string | number;
  changeText?: string;
  isLoading?: boolean;
}

// Modal props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}



// Extended Marketplace type with UI elements
export interface MarketplaceWithUI extends Marketplace {
  logo: string;
  bgColor: string;
  badgeClass: string;
}
