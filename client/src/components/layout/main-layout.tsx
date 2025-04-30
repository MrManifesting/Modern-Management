import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
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
      case "/ai-tools":
        return "AI Tools";
      case "/marketplace":
        return "Marketplace";
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
      default:
        return "Gold-Standard-Inventory";
    }
  };

  // Toggle sidebar expanded state
  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  // Collapse sidebar on mobile when location changes
  useEffect(() => {
    if (isMobile) {
      setSidebarExpanded(false);
    }
  }, [location, isMobile]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar expanded={sidebarExpanded} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar toggleSidebar={toggleSidebar} pageTitle={getPageTitle()} />

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 dark:text-white p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
