import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCodeGenerator } from '@/components/affiliate/qr-code-generator';
import { QrCodeList } from '@/components/affiliate/qr-code-list';
import { AffiliateStats } from '@/components/affiliate/affiliate-stats';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCwIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AffiliateDashboard() {
  const [activeTab, setActiveTab] = useState('stats');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Hardcoded affiliateId for demo purposes
  // In a real implementation, this would come from the authenticated user's profile
  const affiliateId = 1;

  // Fetch affiliate information
  const {
    data: affiliate,
    isLoading: isLoadingAffiliate,
    error: affiliateError
  } = useQuery({
    queryKey: ['/api/affiliates', affiliateId],
    queryFn: async () => {
      const response = await fetch(`/api/affiliates/${affiliateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch affiliate data');
      }
      const data = await response.json();
      return data.data;
    }
  });

  // Fetch QR codes
  const {
    data: qrCodesData,
    isLoading: isLoadingQrCodes,
    error: qrCodesError,
    refetch: refetchQrCodes
  } = useQuery({
    queryKey: ['/api/affiliates', affiliateId, 'qrcodes'],
    queryFn: async () => {
      const response = await fetch(`/api/affiliates/${affiliateId}/qrcodes`);
      if (!response.ok) {
        throw new Error('Failed to fetch QR codes');
      }
      const data = await response.json();
      return data.data;
    }
  });

  // Fetch statistics
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/affiliates', affiliateId, 'stats'],
    queryFn: async () => {
      const response = await fetch(`/api/affiliates/${affiliateId}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const data = await response.json();
      return data.data;
    }
  });

  // Handle errors
  useEffect(() => {
    if (affiliateError) {
      toast({
        title: "Error",
        description: "Failed to load affiliate information",
        variant: "destructive"
      });
    }
    
    if (qrCodesError) {
      toast({
        title: "Error",
        description: "Failed to load QR codes",
        variant: "destructive"
      });
    }
    
    if (statsError) {
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive"
      });
    }
  }, [affiliateError, qrCodesError, statsError, toast]);

  const handleQrCodeGenerated = () => {
    refetchQrCodes();
    // Also refresh stats as they might have changed
    refetchStats();
  };

  const handleRefreshData = () => {
    refetchQrCodes();
    refetchStats();
    toast({
      title: "Refreshed",
      description: "Data has been refreshed"
    });
  };

  // Loading state
  if (isLoadingAffiliate) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <h2 className="mt-2 text-xl font-semibold">Loading affiliate dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
          {affiliate && (
            <p className="text-gray-600">
              Welcome back, {affiliate.name} (Code: {affiliate.code})
            </p>
          )}
        </div>
        <Button variant="outline" onClick={handleRefreshData}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="qrcodes">My QR Codes</TabsTrigger>
          <TabsTrigger value="generate">Generate QR Code</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats" className="mt-4">
          <AffiliateStats
            stats={statsData || {
              totalSales: 0,
              totalEarnings: 0,
              pendingPayouts: 0,
              conversionRate: 0,
              recentTransactions: []
            }}
            isLoading={isLoadingStats}
          />
        </TabsContent>
        
        <TabsContent value="qrcodes" className="mt-4">
          <QrCodeList
            affiliateId={affiliateId}
            qrCodes={qrCodesData || []}
            onRefresh={refetchQrCodes}
          />
        </TabsContent>
        
        <TabsContent value="generate" className="mt-4">
          <QrCodeGenerator
            affiliateId={affiliateId}
            onGenerate={handleQrCodeGenerated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}