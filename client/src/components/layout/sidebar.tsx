import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Zap,
  ShoppingBag,
  BarChart3,
  Settings,
  ScanLine,
  DollarSign,
  FileBarChart,
  Image,
  Users,
} from "lucide-react";

type SidebarProps = {
  expanded: boolean;
};

export default function Sidebar({ expanded }: SidebarProps) {
  const [location] = useLocation();

  const navigationItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/",
    },
    {
      title: "Inventory",
      icon: <Package className="h-5 w-5" />,
      path: "/inventory",
    },
    {
      title: "AI Tools",
      icon: <Zap className="h-5 w-5" />,
      path: "/ai-tools",
    },
    {
      title: "Marketplace",
      icon: <ShoppingBag className="h-5 w-5" />,
      path: "/marketplace",
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
      title: "Reports",
      icon: <FileBarChart className="h-5 w-5" />,
      path: "/reports",
    },
    {
      title: "Image Optimization",
      icon: <Image className="h-5 w-5" />,
      path: "/image-optimization",
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
    },
  ];

  return (
    <aside
      className={cn(
        "fixed z-20 h-full flex-shrink-0 transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-sm",
        expanded ? "w-64" : "w-20"
      )}
    >
      {/* Logo and Brand */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-700 px-4">
        <div className="flex items-center space-x-2 lg:justify-start md:justify-center">
          <div className="flex items-center justify-center rounded-md bg-gradient-to-br from-primary-400 to-primary-600 p-1.5 text-white">
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
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Gold-Standard-Inventory</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1 px-3 py-4">
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center space-x-2 rounded-lg px-3 py-2",
              location === item.path
                ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            {item.icon}
            {expanded && <span>{item.title}</span>}
          </Link>
        ))}
      </nav>

      {/* User Menu */}
      <div className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-[hsl(var(--wood))] text-[hsl(var(--wood-foreground))] flex items-center justify-center">
            <span className="text-sm font-medium">JS</span>
          </div>
          {expanded && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">John Smith</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">john@example.com</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
