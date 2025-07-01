import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Package, 
  ShoppingBag, 
  BarChart3, 
  Search,
  Plus,
  Smartphone,
  Camera,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = "" }) => {
  const [location] = useLocation();

  const navigationItems = [
    {
      title: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      path: "/",
      badge: null
    },
    {
      title: "Mobile Inventory",
      icon: <Smartphone className="h-5 w-5" />,
      path: "/inventory/mobile",
      badge: "New"
    },
    {
      title: "Scanner",
      icon: <Camera className="h-5 w-5" />,
      path: "/scanner",
      badge: null
    },
    {
      title: "Voice Search",
      icon: <Mic className="h-5 w-5" />,
      path: "/voice-search",
      badge: "Beta"
    }
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50 ${className}`}>
      <div className="flex items-center justify-around py-2 px-4 safe-area-bottom">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 touch-manipulation ${
                  isActive ? 'bg-gold text-black' : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 text-xs px-1 py-0 h-4 min-w-4 text-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.title}</span>
              </Button>
            </Link>
          );
        })}
        
        {/* Quick action button */}
        <Button
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 px-3 bg-gold hover:bg-gold/90 text-black touch-manipulation"
          onClick={() => {
            // Quick add action - can be customized based on current page
            if (location.includes('/inventory')) {
              alert('Quick add product feature coming soon!');
            } else {
              alert('Quick actions available here!');
            }
          }}
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-medium">Add</span>
        </Button>
      </div>
    </div>
  );
};

export default MobileNavigation;