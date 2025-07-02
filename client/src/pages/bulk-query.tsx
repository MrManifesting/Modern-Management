import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ExternalLink, Download, Package, Truck, AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface BulkQueryItem {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  sku: string;
  inventoryQuantity: number;
  location: string;
  strain: string;
  tier: string;
  weight: string;
  urls: {
    storefront: string;
    coa: string;
    media: string;
    admin: string;
  };
}

interface BulkQueryResponse {
  success: boolean;
  lastUpdated: string;
  summary: {
    totalProducts: number;
    totalVariants: number;
    totalInventory: number;
    averageStock: number;
  };
  items: BulkQueryItem[];
  contactInfo: {
    email: string;
    phone: string;
    website: string;
    company: string;
  };
}

export default function BulkQueryPage() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const queryClient = useQueryClient();

  // Query for bulk operation status
  const { data: statusData } = useQuery({
    queryKey: ['/api/shopify/bulk-query/status'],
    refetchInterval: 5000, // Poll every 5 seconds during operation
    enabled: isExecuting
  });

  // Mutation to start bulk query
  const startBulkQuery = useMutation({
    mutationFn: () => apiRequest('POST', '/api/shopify/bulk-query/start'),
    onSuccess: () => {
      setIsExecuting(true);
      setExecutionProgress(25);
    }
  });

  // Mutation to execute complete bulk query
  const executeBulkQuery = useMutation({
    mutationFn: () => apiRequest('POST', '/api/shopify/bulk-query/execute'),
    onSuccess: (data) => {
      setIsExecuting(false);
      setExecutionProgress(100);
      queryClient.setQueryData(['/api/shopify/bulk-query/results'], data);
    },
    onError: () => {
      setIsExecuting(false);
      setExecutionProgress(0);
    }
  });

  // Query for bulk query results
  const { data: bulkResults, isLoading: isLoadingResults } = useQuery<BulkQueryResponse>({
    queryKey: ['/api/shopify/bulk-query/results'],
    enabled: false // Only fetch when we have results
  });

  const handleStartBulkQuery = () => {
    setExecutionProgress(0);
    startBulkQuery.mutate();
  };

  const handleExecuteComplete = () => {
    setExecutionProgress(50);
    executeBulkQuery.mutate();
  };

  // Update progress based on status
  useEffect(() => {
    if (statusData?.status && isExecuting) {
      if (statusData.status.status === 'COMPLETED') {
        setExecutionProgress(75);
        handleExecuteComplete();
      } else if (statusData.status.status === 'FAILED') {
        setIsExecuting(false);
        setExecutionProgress(0);
      }
    }
  }, [statusData?.status, isExecuting]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shopify Bulk Query System</h1>
          <p className="text-muted-foreground">
            Comprehensive inventory synchronization using Shopify GraphQL bulk operations
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Database className="w-4 h-4 mr-1" />
          Real-Time Data
        </Badge>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bulk Query Operations
          </CardTitle>
          <CardDescription>
            Execute comprehensive inventory queries that match your Google Apps Script workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {isExecuting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Query Progress</span>
                <span className="text-sm text-muted-foreground">{executionProgress}%</span>
              </div>
              <Progress value={executionProgress} className="w-full" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {executionProgress < 25 && "Starting bulk operation..."}
                {executionProgress >= 25 && executionProgress < 50 && "Polling for completion..."}
                {executionProgress >= 50 && executionProgress < 75 && "Operation completed, downloading data..."}
                {executionProgress >= 75 && "Processing inventory data..."}
              </div>
            </div>
          )}

          {/* Status Alert */}
          {statusData?.status && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Current operation status: <strong>{statusData.status.status}</strong>
                {statusData.status.errorCode && ` (Error: ${statusData.status.errorCode})`}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleStartBulkQuery}
              disabled={isExecuting || startBulkQuery.isPending}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              {startBulkQuery.isPending ? 'Starting...' : 'Start Bulk Query'}
            </Button>
            
            <Button
              onClick={handleExecuteComplete}
              disabled={isExecuting || executeBulkQuery.isPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {executeBulkQuery.isPending ? 'Executing...' : 'Execute Complete Query'}
            </Button>
          </div>

          {/* Error Display */}
          {(startBulkQuery.isError || executeBulkQuery.isError) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {startBulkQuery.error?.message || executeBulkQuery.error?.message || 'An error occurred'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {bulkResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Bulk Query Results
            </CardTitle>
            <CardDescription>
              Last updated: {new Date(bulkResults.lastUpdated).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{bulkResults.summary.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Products</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{bulkResults.summary.totalVariants}</div>
                <div className="text-sm text-muted-foreground">Variants</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{bulkResults.summary.totalInventory.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Units</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{bulkResults.summary.averageStock}</div>
                <div className="text-sm text-muted-foreground">Avg Stock</div>
              </div>
            </div>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Company:</strong> {bulkResults.contactInfo.company}
                </div>
                <div>
                  <strong>Email:</strong> {bulkResults.contactInfo.email}
                </div>
                <div>
                  <strong>Phone:</strong> {bulkResults.contactInfo.phone}
                </div>
                <div>
                  <strong>Website:</strong> 
                  <a href={bulkResults.contactInfo.website} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline">
                    {bulkResults.contactInfo.website}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Inventory ({bulkResults.items.length} items)</h3>
              
              {isLoadingResults ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                  {bulkResults.items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{item.strain}</h4>
                            <Badge variant="outline">{item.tier}</Badge>
                            <Badge variant="secondary">{item.weight}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku} | Location: {item.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span className="font-medium">{item.inventoryQuantity} units available</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <a href={item.urls.storefront} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Store
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={item.urls.coa} target="_blank" rel="noopener noreferrer">
                              COA
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={item.urls.admin} target="_blank" rel="noopener noreferrer">
                              Admin
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}