import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import StatsCard from "@/components/dashboard/stats-card";
import QuickActions from "@/components/dashboard/quick-actions";
import ItemGrid from "@/components/inventory/item-grid";
import AIInsights from "@/components/dashboard/ai-insights";
import MarketplaceStatus from "@/components/dashboard/marketplace-status";
import { Package, FileText, Zap, DollarSign, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import QRCode from "qrcode";

export default function Dashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/stats'],
  });
  
  const [qrUrl, setQrUrl] = useState("");
  const [showEmployeeQrDialog, setShowEmployeeQrDialog] = useState(false);

  // Generate QR code URL for employee app access
  useEffect(() => {
    const generateQR = async () => {
      try {
        // The URL that should be encoded in the QR code (app download URL)
        const appUrl = window.location.origin;
        const qrDataUrl = await QRCode.toDataURL(appUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFDC80' // Light gold background
          }
        });
        setQrUrl(qrDataUrl);
      } catch (err) {
        console.error("QR Code generation error:", err);
      }
    };
    
    generateQR();
  }, []);

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
      
      {/* Employee App QR Code Card */}
      <Card className="border-2 border-amber-400 bg-gradient-to-r from-zinc-900 to-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Employee App Access</CardTitle>
          <QrCode className="h-5 w-5 text-amber-400" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Scan this QR code with your mobile device to download and access the employee app for inventory management, fulfillment, and more.
          </p>
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => setShowEmployeeQrDialog(true)}
              className="bg-amber-400 hover:bg-amber-500 text-black"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Show QR Code
            </Button>
            <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-400">
              Mobile Ready
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* QR Code Dialog */}
      <Dialog open={showEmployeeQrDialog} onOpenChange={setShowEmployeeQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-amber-400" />
              Employee App Access
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your mobile device camera to access the employee app.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-800 rounded-md">
            {qrUrl ? (
              <img 
                src={qrUrl} 
                alt="QR Code for Employee App" 
                className="w-64 h-64 border-8 border-white rounded-lg shadow-lg" 
              />
            ) : (
              <div className="w-64 h-64 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded-lg flex items-center justify-center">
                <span>Generating QR code...</span>
              </div>
            )}
          </div>
          <div className="flex flex-col text-center text-sm text-muted-foreground mt-2">
            <p>Employees will be prompted to enter their employee ID and PIN for secure access.</p>
            <p className="mt-1">Employee IDs can be managed in the Employees section.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
