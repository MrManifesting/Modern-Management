import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { queryClient } from "./lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import AITools from "@/pages/ai-tools";
import Marketplace from "@/pages/marketplace";
import Scanner from "@/pages/scanner";
import Sales from "@/pages/sales";
import Reports from "@/pages/reports";
import Forecast from "@/pages/forecast";
import ImageOptimization from "@/pages/image-optimization";
import Employees from "@/pages/employees";
import Settings from "@/pages/settings";
import ShopifySettingsPage from "@/pages/ShopifySettingsPage";
import ShopifySyncPage from "@/pages/shopify-sync";
import ShopifyReportsPage from "@/pages/shopify-reports";
import ShopifyImportPage from "@/pages/shopify-import";
import AccessibilityGuide from "@/pages/accessibility-guide";
import THCaFlowerInventoryPage from "@/pages/thca-flower-inventory";
import GoldStandardInventoryPage from "@/pages/gold-standard-inventory";
import TreeMasonInventoryPage from "@/pages/tree-mason-inventory";
import PackageInventoryPage from "@/pages/package-inventory";
import MediaManagerPage from "@/pages/media-manager";
import BulkBreakdownPage from "@/pages/bulk-breakdown";
import NotFound from "@/pages/not-found";

// Onboarding components
import { OnboardingTour, WelcomeBanner } from "@/components/onboarding";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory/thca-flower" component={THCaFlowerInventoryPage} />
      <Route path="/inventory/gold-standard" component={GoldStandardInventoryPage} />
      <Route path="/inventory/tree-mason" component={TreeMasonInventoryPage} />
      <Route path="/inventory/package" component={PackageInventoryPage} />
      <Route path="/ai-tools" component={AITools} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/scanner" component={Scanner} />
      <Route path="/sales" component={Sales} />
      <Route path="/reports" component={Reports} />
      <Route path="/forecast" component={Forecast} />
      <Route path="/image-optimization" component={ImageOptimization} />
      <Route path="/employees" component={Employees} />
      <Route path="/settings" component={Settings} />
      <Route path="/shopify-settings" component={ShopifySettingsPage} />
      <Route path="/shopify-sync" component={ShopifySyncPage} />
      <Route path="/shopify-reports" component={ShopifyReportsPage} />
      <Route path="/shopify-import" component={ShopifyImportPage} />
      <Route path="/accessibility-guide" component={AccessibilityGuide} />
      <Route path="/media-manager" component={MediaManagerPage} />
      <Route path="/bulk-breakdown" component={BulkBreakdownPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="gold-standard-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MainLayout>
            <Router />
          </MainLayout>
          {/* Global application onboarding components - only show one to avoid duplicates */}
          <OnboardingTour />
          {/* WelcomeBanner removed to prevent duplicate tours */}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
