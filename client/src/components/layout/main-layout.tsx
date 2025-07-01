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

  // Get page title based on current location
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/inventory":
        return "Inventory";
      case "/inventory/enhanced":
        return "Enhanced Inventory";
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
      case "/credentials":
        return "Credential Management";
      case "/shopify-import":
        return "Shopify Import";
      default:
        return "Gold-Standard_Management";
    }
  };

  // Toggle sidebar expanded state
  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
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
    <div className="flex h-screen overflow-hidden bg-background">
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
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background text-foreground">
          {children}
          <VoiceCommandButton />
        </main>
      </div>
    </div>
  );
}
