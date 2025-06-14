import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Marketplace from "@/pages/marketplace";
import MarketplaceManagement from "@/pages/marketplace-management";
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
import ProductsInventoryPage from "@/pages/products-inventory";
import SpecialtyProductsPage from "@/pages/specialty-products";

import MediaManagerPage from "@/pages/media-manager";

import DatabaseCleanupPage from "@/pages/DatabaseCleanupPage";
import AffiliateDashboard from "@/pages/affiliate-dashboard";
import AiToolsPage from "@/pages/ai/tools";
import CSVValidatorPage from "@/pages/csv-validator";
import GoogleSheetsIntegration from "@/pages/google-sheets-integration";
import GoogleSheetsPage from "@/pages/google-sheets-page";
import SheetsConfigPage from "@/pages/sheets-config";
import GoogleAppsScriptAdminPage from "@/pages/google-apps-script-admin";
import CustomersPage from "@/pages/customers";
import AuthPage from "@/pages/auth-page-simple";
import QrScanPage from "@/pages/qr-scan";
import AnimationDemo from "@/pages/animation-demo";
import CheckoutPage from "@/pages/checkout";
import CredentialsPage from "@/pages/credentials-page";
import CredentialsManagement from "@/pages/credentials-management";
import LabelGeneration from "@/pages/label-generation";
import SyncDashboard from "@/pages/sync-dashboard";
import BarcodeScannerPage from "@/pages/barcode-scanner";
import SheetsMappingAdmin from "@/pages/sheets-mapping-admin";
import ShopifyWebhooksPage from "@/pages/ShopifyWebhooksPage";
import NotFound from "@/pages/not-found";

// Onboarding components
import { OnboardingTour, WelcomeBanner } from "@/components/onboarding";

function Router() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
        <React.Suspense fallback={<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>}>
          {/* Dynamically import the leaf loader to avoid circular dependencies */}
          {(() => {
            const LeafLoadingPattern = React.lazy(() => import("@/components/ui/leaf-loader").then(module => ({ default: module.LeafLoadingPattern })));
            return <LeafLoadingPattern message="Loading application..." />;
          })()}
        </React.Suspense>
      </div>}>
      <Switch>
        <ProtectedRoute path="/" component={() => <Dashboard />} />
        <ProtectedRoute path="/inventory" component={() => <Inventory />} />
        <ProtectedRoute path="/products-inventory" component={() => <ProductsInventoryPage />} />
        <ProtectedRoute path="/inventory/:id" component={() => {
          const InventoryDetailPage = React.lazy(() => import('@/pages/inventory-detail'));
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>}>
              <InventoryDetailPage />
            </React.Suspense>
          );
        }} />
        <ProtectedRoute path="/inventory/products" component={() => <ProductsInventoryPage />} />
        <ProtectedRoute path="/inventory/specialty-products" component={() => <SpecialtyProductsPage />} />

        <ProtectedRoute path="/marketplace" component={() => <Marketplace />} />
        <ProtectedRoute path="/marketplace-management" component={() => <MarketplaceManagement />} />
        <ProtectedRoute path="/scanner" component={() => <Scanner />} />
        <ProtectedRoute path="/sales" component={() => <Sales />} />
        <ProtectedRoute path="/reports" component={() => <Reports />} />
        <ProtectedRoute path="/forecast" component={() => <Forecast />} />
        <ProtectedRoute path="/image-optimization" component={() => <ImageOptimization />} />
        <ProtectedRoute path="/employees" component={() => <Employees />} />
        <ProtectedRoute path="/settings" component={() => <Settings />} />
        <ProtectedRoute path="/shopify-settings" component={() => <ShopifySettingsPage />} />
        <ProtectedRoute path="/shopify-sync" component={() => <ShopifySyncPage />} />
        <ProtectedRoute path="/shopify-reports" component={() => <ShopifyReportsPage />} />
        <ProtectedRoute path="/shopify-import" component={() => <ShopifyImportPage />} />
        <ProtectedRoute path="/accessibility-guide" component={() => <AccessibilityGuide />} />
        <ProtectedRoute path="/media-manager" component={() => <MediaManagerPage />} />

        <ProtectedRoute path="/database-cleanup" component={() => <DatabaseCleanupPage />} />
        <ProtectedRoute path="/affiliate-dashboard" component={() => <AffiliateDashboard />} />
        <ProtectedRoute path="/ai-tools" component={() => <AiToolsPage />} />
        <ProtectedRoute path="/csv-validator" component={() => <CSVValidatorPage />} />
        <ProtectedRoute path="/google-sheets" component={() => <GoogleSheetsPage />} />
        <ProtectedRoute path="/google-sheets-integration" component={() => <GoogleSheetsIntegration />} />
        <ProtectedRoute path="/sheets-config" component={() => <SheetsConfigPage />} />
        <ProtectedRoute path="/google-apps-script-admin" component={() => <GoogleAppsScriptAdminPage />} />
        <ProtectedRoute path="/sheets-mapping-admin" component={() => <SheetsMappingAdmin />} />
        <ProtectedRoute path="/label-generation" component={() => <LabelGeneration />} />
        <ProtectedRoute path="/sync-dashboard" component={() => <SyncDashboard />} />
        <ProtectedRoute path="/barcode-scanner" component={() => <BarcodeScannerPage />} />
        <ProtectedRoute path="/shopify-webhooks" component={() => <ShopifyWebhooksPage />} />
        <ProtectedRoute path="/customers" component={() => <CustomersPage />} />
        <ProtectedRoute path="/credentials" component={() => <CredentialsPage />} />
        <ProtectedRoute path="/animation-demo" component={() => <AnimationDemo />} />
        <Route path="/auth" component={() => <AuthPage />} />
        <Route path="/login-debug" component={() => {
          const LoginDebug = React.lazy(() => import("@/pages/login-debug"));
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>}>
              <LoginDebug />
            </React.Suspense>
          );
        }} />
        <Route path="/direct-login" component={() => {
          const DirectLogin = React.lazy(() => import("@/pages/direct-login"));
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>}>
              <DirectLogin />
            </React.Suspense>
          );
        }} />
        <Route path="/bypass-login" component={() => {
          const BypassLogin = React.lazy(() => import("@/pages/bypass-login"));
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>}>
              <BypassLogin />
            </React.Suspense>
          );
        }} />
        <Route path="/qr-scan" component={() => <QrScanPage />} />
        <Route path="/affiliate/:code?" component={() => {
          const AffiliateQrDemo = React.lazy(() => import("@/pages/affiliate/qr-demo"));
          return <AffiliateQrDemo />;
        }} />
        <Route path="/checkout" component={() => <CheckoutPage />} />
        <ProtectedRoute path="/credentials" component={() => <CredentialsManagement />} />
        <Route path="/demo-inventory" component={() => {
          const DemoInventoryPage = React.lazy(() => import('@/pages/demo-inventory'));
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>}>
              <DemoInventoryPage />
            </React.Suspense>
          );
        }} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="inventory-pro-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            {/* Global application onboarding components - only show one to avoid duplicates */}
            <OnboardingTour />
            {/* WelcomeBanner removed to prevent duplicate tours */}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
