import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Package } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MenuTabItem {
  strain: string;
  amount: number;
  tier: string;
  bulk: string;
  distro25: string;
  master50: string;
  master100: string;
  variantSku: string;
  keyId: string;
}

interface SyncSummary {
  totalItems: number;
  itemsWithQuantity: number;
  itemsWithoutQuantity: number;
  totalAvailableQuantity: number;
}

export function MenuSyncPanel() {
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/csv-sync/summary'],
    queryFn: () => apiRequest('/api/csv-sync/summary')
  });

  const { data: menuItems, isLoading: itemsLoading, refetch } = useQuery({
    queryKey: ['/api/csv-sync/menu-tab-updated'],
    queryFn: () => apiRequest('/api/csv-sync/menu-tab-updated')
  });

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/csv-sync/download-updated-csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gold-standard-menu-updated-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const summaryData = summary?.data as SyncSummary;
  const itemsData = menuItems?.data as MenuTabItem[];
  const availableItems = itemsData?.filter(item => item.amount > 0) || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gold-600">Menu Inventory Sync</h1>
          <p className="text-muted-foreground">
            Synchronized quantities from All Flower Variants to Menu Tab
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={itemsLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleDownloadCSV} disabled={isDownloading}>
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : summaryData?.totalItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available Strains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryLoading ? '...' : summaryData?.itemsWithQuantity}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryLoading ? '...' : summaryData?.itemsWithoutQuantity}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold-600">
              {summaryLoading ? '...' : summaryData?.totalAvailableQuantity} lbs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Available Inventory
          </CardTitle>
          <CardDescription>
            Items with current stock quantities from Shopify sync
          </CardDescription>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="text-center py-8">Loading inventory data...</div>
          ) : availableItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items with available quantities found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Strain</th>
                    <th className="text-left py-3 px-4 font-medium">Available</th>
                    <th className="text-left py-3 px-4 font-medium">Tier</th>
                    <th className="text-left py-3 px-4 font-medium">Bulk Price</th>
                    <th className="text-left py-3 px-4 font-medium">Distro 25lbs+</th>
                    <th className="text-left py-3 px-4 font-medium">Master 50lbs+</th>
                  </tr>
                </thead>
                <tbody>
                  {availableItems.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{item.strain}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="font-mono">
                          {item.amount} lbs
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          item.tier.includes('TOP SHELF') ? 'default' :
                          item.tier.includes('EXOTIC') ? 'destructive' :
                          item.tier.includes('AAA') ? 'secondary' :
                          'outline'
                        }>
                          {item.tier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-green-600 font-medium">{item.bulk}</td>
                      <td className="py-3 px-4 text-blue-600">{item.distro25}</td>
                      <td className="py-3 px-4 text-purple-600">{item.master50}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}