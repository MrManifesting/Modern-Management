import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  ScanLine,
  DollarSign,
  FileBarChart,
  Image,
  Users,
  X,
  Camera,
  RefreshCw,
  Layers,
  Database,
  Trash2,
  ShoppingBag,
  Share2,
  CreditCard,
  QrCode,
  FileSpreadsheet,
  FileCheck,
  Shield
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

type SidebarProps = {
  expanded: boolean;
};

type NavigationItem = {
  title: string;
  icon: React.ReactNode;
  path: string;
  highlight?: boolean;
  subItems?: {
    title: string;
    path: string;
    className: string;
  }[];
};

export default function Sidebar({ expanded }: SidebarProps) {
  const [location] = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  // Handle click outside sidebar on mobile to auto-close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth < 1024 && // Only on small screens
        expanded
      ) {
        // We can't directly manipulate the expanded state here
        // Instead, we'll use a custom event that main-layout can listen for
        const closeEvent = new CustomEvent('closeSidebar');
        window.dispatchEvent(closeEvent);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded]);

  const navigationItems: NavigationItem[] = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/",
    },
    {
      title: "Inventory",
      icon: <Package className="h-5 w-5" />,
      path: "/products-inventory",
      subItems: [
        {
          title: "Enhanced Inventory",
          path: "/inventory",
          className: "inventory-link primary-brand",
        },
        {
          title: "Products",
          path: "/products-inventory",
          className: "inventory-link primary-brand",
        },
        {
          title: "CSV Validator",
          path: "/csv-validator",
          className: "inventory-link specialty-brand",
        },
        {
          title: "Orders Tracking",
          path: "/orders-tracking",
          className: "inventory-link specialty-brand",
        }
      ]
    },
    {
      title: "Marketplaces",
      icon: <ShoppingBag className="h-5 w-5" />,
      path: "/marketplace",
      subItems: [
        {
          title: "Marketplace",
          path: "/marketplace",
          className: "inventory-link primary-brand",
        },
        {
          title: "Connect & Manage",
          path: "/marketplace-management",
          className: "inventory-link specialty-brand",
        },
        {
          title: "Shopify Sync",
          path: "/shopify-sync",
          className: "inventory-link package-brand",
        },
        {
          title: "Shopify Reports",
          path: "/shopify-reports",
          className: "inventory-link package-brand",
        }
      ]
    },
    {
      title: "Scanner",
      icon: <ScanLine className="h-5 w-5" />,
      path: "/scanner",
    },
    {
      title: "Sales",
      icon: <DollarSign className="h-5 w-5" />,
      path: "/sales",
    },
    {
      title: "Employees",
      icon: <Users className="h-5 w-5" />,
      path: "/employees",
    },
    {
      title: "Customers",
      icon: <CreditCard className="h-5 w-5" />,
      path: "/customers",
    },
    {
      title: "Reports",
      icon: <FileBarChart className="h-5 w-5" />,
      path: "/reports",
    },
    {
      title: "Affiliate Program",
      icon: <Share2 className="h-5 w-5" />,
      path: "/affiliate-dashboard",
      highlight: true,
    },
    {
      title: "Forecast",
      icon: <BarChart3 className="h-5 w-5" />,
      path: "/forecast",
    },
    {
      title: "Image Optimization",
      icon: <Image className="h-5 w-5" />,
      path: "/image-optimization",
    },
    {
      title: "Media Manager",
      icon: <Camera className="h-5 w-5" />,
      path: "/media-manager",
    },

    {
      title: "Database Cleanup",
      icon: <Database className="h-5 w-5" />,
      path: "/database-cleanup",
    },
    {
      title: "Google Sheets",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      path: "/google-sheets",
      highlight: true,
    },
    {
      title: "Sync Dashboard",
      icon: <RefreshCw className="h-5 w-5" />,
      path: "/sync-dashboard",
      highlight: true,
    },
    {
      title: "Credentials",
      icon: <Shield className="h-5 w-5" />,
      path: "/credentials",
      highlight: true,
    },
    {
      title: "Payment Testing",
      icon: <CreditCard className="h-5 w-5" />,
      path: "/checkout",
      highlight: true,
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
    },
  ];

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "fixed z-20 h-full flex-shrink-0 transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0 border-r border-border shadow-sm overflow-y-auto",
        "bg-background", 
        expanded ? "translate-x-0 w-64" : "translate-x-[-100%] w-64 lg:w-20 lg:translate-x-0",
        "pb-safe-bottom"
      )}
    >
      {/* Close button for mobile */}
      {expanded && (
        <button 
          className="lg:hidden absolute top-4 right-4 z-50 text-primary rounded-full p-1 hover:bg-primary/10"
          onClick={() => {
            const closeEvent = new CustomEvent('closeSidebar');
            window.dispatchEvent(closeEvent);
          }}
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Logo and Brand */}
      <div className="flex h-16 items-center justify-center border-b border-primary/30 px-4">
        <div className="flex items-center space-x-2 lg:justify-start md:justify-center">
          <div className="flex items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          {expanded && (
            <span className="text-lg font-semibold primary-gradient-text">Inventory Pro</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1 px-3 py-4 max-h-[calc(100vh-9rem)] overflow-y-auto">
        {navigationItems.map((item) => (
          <div key={item.path} className="space-y-1">
            <Link
              href={item.path}
              className={cn(
                "flex items-center space-x-2 rounded-lg px-3 py-2 transition-all",
                location === item.path || (item.subItems && item.subItems.some(subItem => location === subItem.path))
                  ? "bg-primary/20 text-primary border-l-2 border-primary"
                  : item.highlight 
                    ? "text-white bg-gradient-to-r from-primary/20 to-transparent border-l-2 border-primary/80 font-medium"
                    : "text-gray-300 hover:bg-black/50 hover:text-primary hover:border-l-2 hover:border-primary/50"
              )}
            >
              {item.icon}
              {expanded && <span className="text-sm">{item.title}</span>}
            </Link>
            
            {/* Sub-items, if any */}
            {expanded && item.subItems && (
              <div className="ml-6 space-y-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.path}
                    href={subItem.path}
                    className={cn(
                      "flex items-center space-x-2 rounded-lg px-2 py-1 text-sm transition-all",
                      subItem.className,
                      location === subItem.path
                        ? "bg-primary/10 text-primary border-l border-primary"
                        : "text-gray-400 hover:bg-black/30 hover:text-primary hover:border-l hover:border-primary/50"
                    )}
                  >
                    <span>•</span>
                    <span>{subItem.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Menu */}
      <div className="mt-auto border-t border-primary/30 p-4">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
            <span className="text-sm font-medium">
              {user ? (user.firstName?.charAt(0) || user.username.charAt(0)).toUpperCase() : '?'}
            </span>
          </div>
          {expanded && user && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-200">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username}
              </p>
              <p className="text-xs text-primary/70">{user.email || ''}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
