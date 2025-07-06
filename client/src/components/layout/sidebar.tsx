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
  Users,
  X,
  ShoppingBag,
  Bot,
  Menu,
  FileSpreadsheet,
  CreditCard
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
      path: "/inventory",
    },
    {
      title: "Customers",
      icon: <Users className="h-5 w-5" />,
      path: "/customers",
    },
    {
      title: "Sales",
      icon: <DollarSign className="h-5 w-5" />,
      path: "/sales",
    },
    {
      title: "Scanner",
      icon: <ScanLine className="h-5 w-5" />,
      path: "/scanner",
    },
    {
      title: "Marketplace",
      icon: <ShoppingBag className="h-5 w-5" />,
      path: "/marketplace",
    },
    {
      title: "Reports",
      icon: <FileBarChart className="h-5 w-5" />,
      path: "/reports",
    },
    {
      title: "Menu Generator",
      icon: <Menu className="h-5 w-5" />,
      path: "/menu-generator",
    },
    {
      title: "AI Assistant",
      icon: <Bot className="h-5 w-5" />,
      path: "/ai-assistant",
    },
    {
      title: "Google Sheets",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      path: "/google-sheets",
    },
    {
      title: "Employees",
      icon: <Users className="h-5 w-5" />,
      path: "/employees",
    },
    {
      title: "Credentials",
      icon: <CreditCard className="h-5 w-5" />,
      path: "/credentials",
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
        "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col bg-card border-r transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        expanded ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <h2 className="text-lg font-semibold">Gold-Standard</h2>
        <button
          className="lg:hidden p-1 hover:bg-accent rounded-md"
          onClick={() => {
            const closeEvent = new CustomEvent('closeSidebar');
            window.dispatchEvent(closeEvent);
          }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <Link 
                href={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                  location === item.path ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  item.highlight && "font-semibold text-primary"
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-medium">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}