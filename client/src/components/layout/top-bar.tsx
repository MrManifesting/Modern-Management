import { useState } from "react";
import { Bell, Search, PlusCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddItemModal from "@/components/modals/add-item-modal";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type TopBarProps = {
  toggleSidebar: () => void;
  pageTitle: string;
};

export default function TopBar({ toggleSidebar, pageTitle }: TopBarProps) {
  const [location] = useLocation();
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get page description based on current location
  const getPageDescription = () => {
    switch (location) {
      case "/":
        return "Welcome back, manage your inventory and listings";
      case "/inventory":
        return "View and manage your inventory items";
      case "/ai-tools":
        return "Use AI to improve your listings and content";
      case "/marketplace":
        return "Connect and manage marketplace integrations";
      default:
        return "Welcome to Gold-Standard-Inventory";
    }
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 px-6">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4">
            <h1 className="text-xl font-semibold text-gray-800">{pageTitle}</h1>
            <p className="text-sm text-gray-600">{getPageDescription()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          
          <div className="relative">
            <button className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
              <Bell className="h-5 w-5" />
            </button>
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary-500 text-xs text-white flex items-center justify-center">
              3
            </div>
          </div>

          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          <Button
            onClick={() => setShowAddItemModal(true)}
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
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
