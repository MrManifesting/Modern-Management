import { useQuery } from "@tanstack/react-query";
import StatsCard from "@/components/dashboard/stats-card";
import QuickActions from "@/components/dashboard/quick-actions";
import ItemGrid from "@/components/inventory/item-grid";
import AIInsights from "@/components/dashboard/ai-insights";
import MarketplaceStatus from "@/components/dashboard/marketplace-status";
import { Package, FileText, Zap, DollarSign } from "lucide-react";

export default function Dashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/stats'],
  });

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Inventory"
          value={isLoading ? "..." : stats?.inventory?.total || 0}
          icon={<Package className="h-6 w-6" />}
          iconBgColor="bg-primary-100"
          iconColor="text-primary-500"
          changeValue="8.1%"
          isLoading={isLoading}
        />
        
        <StatsCard
          title="Active Listings"
          value={isLoading ? "..." : stats?.inventory?.listed || 0}
          icon={<FileText className="h-6 w-6" />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-500"
          changeValue="12.5%"
          isLoading={isLoading}
        />
        
        <StatsCard
          title="AI Processed"
          value={isLoading ? "..." : stats?.inventory?.aiEnhanced || 0}
          icon={<Zap className="h-6 w-6" />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-500"
          changeValue="23.9%"
          isLoading={isLoading}
        />
        
        <StatsCard
          title="Revenue (Est.)"
          value={isLoading ? "..." : `$${stats?.inventory?.revenue?.toFixed(2) || "0.00"}`}
          icon={<DollarSign className="h-6 w-6" />}
          iconBgColor="bg-green-100"
          iconColor="text-green-500"
          changeValue="5.7%"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Inventory */}
      <ItemGrid limit={4} />

      {/* AI Insights and Marketplace Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AIInsights />
        </div>
        <div>
          <MarketplaceStatus />
        </div>
      </div>
    </div>
  );
}
