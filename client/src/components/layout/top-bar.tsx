import { useState, useEffect, useRef } from "react";
import { Search, PlusCircle, Menu, Sparkles, Moon, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddItemModal from "@/components/modals/add-item-modal";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import NotificationsDropdown from "@/components/notifications/notifications-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TopBarProps = {
  toggleSidebar: () => void;
  pageTitle: string;
};

export default function TopBar({ 
  toggleSidebar, 
  pageTitle
}: TopBarProps) {
  const [location, navigate] = useLocation();
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const { user, logoutMutation } = useAuth();
  const [itemNameFromVoice, setItemNameFromVoice] = useState<string | null>(null);
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  
  // Listen for voice command events to open the Add Item modal
  useEffect(() => {
    const handleVoiceAddItem = (event: CustomEvent) => {
      console.log("Voice add item event received:", event);
      const itemName = event.detail?.itemName || '';
      setShowAddItemModal(true);
      setItemNameFromVoice(itemName);
    };

    // Add the event listener
    window.addEventListener('openAddItemModal', handleVoiceAddItem as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('openAddItemModal', handleVoiceAddItem as EventListener);
    };
  }, []);
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/auth');
      }
    });
  };

  // Get page description based on current location
  const getPageDescription = () => {
    switch (location) {
      case "/":
        return "Welcome back, manage your inventory and listings";
      case "/inventory":
        return "View and manage your inventory items";
      case "/marketplace":
        return "Connect and manage marketplace integrations";
      case "/scanner":
        return "Scan and update inventory quickly";
      case "/sales":
        return "Track and manage your sales";
      case "/reports":
        return "View analytics and sales reports";
      case "/settings":
        return "Customize your application settings";
      case "/image-optimization":
        return "Optimize images for marketplace listings";
      case "/employees":
        return "Manage employee accounts and permissions";
      default:
        return "Welcome to Inventory Pro";
    }
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b px-3 sm:px-4 md:px-6 sticky top-0 z-30 bg-background border-border text-foreground">
        <div className="flex items-center gap-1">
          {/* Mobile: More visible menu button */}
          <Button
            onClick={toggleSidebar}
            variant="outline"
            size="sm"
            className="lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4 mr-1" />
            <span className="text-xs">Menu</span>
          </Button>
          
          {/* Desktop: Standard menu button */}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 hidden lg:block text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="ml-2 sm:ml-4">
            <h1 className="text-lg sm:text-xl font-semibold truncate max-w-[150px] sm:max-w-none text-foreground">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm hidden sm:block text-muted-foreground">
              {getPageDescription()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          {/* Dark mode toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <NotificationsDropdown />

          {/* Search - not shown on very small screens */}
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 lg:w-64 rounded-md py-1.5 sm:py-2 pl-8 sm:pl-10 pr-2 sm:pr-4 text-sm bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-3 pointer-events-none">
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            </div>
          </div>
          
          {/* Mobile search button - visible only on small screens */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden p-1.5"
            onClick={() => alert('Mobile search coming soon')}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  {user ? (user.firstName || user.username) : 'Account'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.username}
                    </div>
                    <div className="text-xs opacity-75">{user.email}</div>
                    <div className="text-xs mt-1 capitalize bg-primary/20 rounded-full px-2 py-0.5 inline-block">
                      {user.role}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => navigate('/auth')}
                >
                  Sign in
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Item button */}
          <Button
            onClick={() => setShowAddItemModal(true)}
            className="flex items-center"
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            <span className={`${isMobile ? 'hidden' : 'inline'}`}>Add Item</span>
          </Button>
        </div>
      </header>

      <AddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
      />
    </>
  );
}
