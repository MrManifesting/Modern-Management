import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import { ShopifyReportsDashboard } from '@/components/shopify/shopify-reports-dashboard';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ShopifyReportsPage() {
  // Check if Shopify connection is established
  const { 
    data: connectionStatus, 
    isLoading, 
    isError,
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/shopify/test-connection'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/test-connection');
      if (!response.ok) {
        throw new Error('Shopify connection test failed');
      }
      return response.json();
    }
  });

  // Show loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Shopify Reports</h1>
            <p className="text-muted-foreground">
              Loading connection status...
            </p>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error state
  if (isError) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Shopify Reports</h1>
            <p className="text-muted-foreground">
              Integrated reports from your Shopify store
            </p>
          </div>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Could not connect to Shopify. Please check your API credentials.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Show not connected state
  if (!connectionStatus?.connected) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Shopify Reports</h1>
            <p className="text-muted-foreground">
              Integrated reports from your Shopify store
            </p>
          </div>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Connected</AlertTitle>
            <AlertDescription>
              Your Shopify store is not connected or the connection has expired. 
              Please check your API credentials in the environment variables.
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Show the dashboard when connected
  return (
    <MainLayout>
      <ShopifyReportsDashboard />
    </MainLayout>
  );
}