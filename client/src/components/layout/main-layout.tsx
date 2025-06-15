import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import { VoiceCommandButton } from "@/components/voice/voice-command-button";
import { useIsMobile } from "@/hooks/use-mobile";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [sidebarExpanded, setSidebarExpanded] = useState(!isMobile);
  const [isGoldTheme, setIsGoldTheme] = useState(true); // Default to gold theme

  // Get page title based on current location
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/inventory":
        return "Inventory";
      case "/marketplace":
        return "Marketplace";
      case "/marketplace-management":
        return "Marketplace Management";
      case "/scanner":
        return "Barcode Scanner";
      case "/sales":
        return "Sales Management";
      case "/reports":
        return "Sales Analytics";
      case "/settings":
        return "Settings";
      case "/image-optimization":
        return "Image Optimization";
      case "/employees":
        return "Employee Management";
      case "/affiliate-dashboard":
        return "Affiliate Program";
      case "/sync-dashboard":
        return "Sync Dashboard";
      case "/inventory-sync":
        return "Inventory Sync";
      case "/credentials":
        return "Credential Management";
      default:
        return "Inventory Pro";
    }
  };

  // Toggle sidebar expanded state
  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  // Toggle between gold theme and regular theme
  const toggleTheme = () => {
    setIsGoldTheme(!isGoldTheme);
  };

  // Listen for sidebar close event coming from sidebar component
  useEffect(() => {
    const handleCloseSidebar = () => {
      setSidebarExpanded(false);
    };

    window.addEventListener('closeSidebar', handleCloseSidebar);
    
    return () => {
      window.removeEventListener('closeSidebar', handleCloseSidebar);
    };
  }, []);

  // Collapse sidebar on mobile when location changes
  useEffect(() => {
    if (isMobile) {
      setSidebarExpanded(false);
    }
  }, [location, isMobile]);

  return (
    <div className={`flex h-screen overflow-hidden ${isGoldTheme ? 'gold-theme' : ''}`}>
      {/* Overlay when sidebar is expanded on mobile */}
      {isMobile && sidebarExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarExpanded(false)}
        />
      )}
      
      <Sidebar expanded={sidebarExpanded} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar 
          toggleSidebar={toggleSidebar} 
          pageTitle={getPageTitle()} 
          isGoldTheme={isGoldTheme}
          toggleTheme={toggleTheme}
        />

        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${
          isGoldTheme 
            ? 'bg-black/90 text-gray-100' 
            : 'bg-gray-50 dark:bg-gray-800 dark:text-white'
        }`}>
          {children}
          <VoiceCommandButton />
        </main>
      </div>
    </div>
  );
}
