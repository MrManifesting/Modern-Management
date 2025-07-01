import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MappingOverview {
  thcaSheet: {
    totalThcaRows: string;
    autoMatched: string;
    manualMapped: string;
    conflicts: string;
    unmapped: string;
    needsReview: string;
    avgMatchScore: string;
  };
  shopify: {
    totalShopifyProducts: string;
  };
  inventory: {
    totalInventoryItems: string;
  };
}

interface StrainMapping {
  thca_sheet_strain: string;
  thca_entries: string;
  shopify_matches: string;
  inventory_matches: string;
  avg_match_score: string;
}

interface InventoryAlignment {
  inventory_name: string;
  inventory_sku: string;
  inventory_quantity: number;
  thca_sheet_strain: string;
  thca_sheet_amount: string;
  thca_sheet_percentage: string;
  shopify_title: string | null;
  shopify_quantity: number | null;
  shopify_price: string | null;
  match_score: string;
  mapping_method: string;
}

export default function ThcaPivotTablesPage() {
  const queryClient = useQueryClient();

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading } = useQuery<MappingOverview>({
    queryKey: ['/api/thca-mapping/overview'],
  });

  // Fetch strain mapping pivot table
  const { data: strainMapping, isLoading: strainLoading } = useQuery<StrainMapping[]>({
    queryKey: ['/api/thca-mapping/strain-pivot'],
  });

  // Fetch inventory alignment pivot table
  const { data: inventoryAlignment, isLoading: alignmentLoading } = useQuery<InventoryAlignment[]>({
    queryKey: ['/api/thca-mapping/inventory-alignment'],
  });

  // Generate pivot tables mutation
  const generatePivotMutation = useMutation({
    mutationFn: () => apiRequest('/api/thca-mapping/generate-pivot-tables', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/thca-mapping'] });
    },
  });

  const handleGeneratePivotTables = () => {
    generatePivotMutation.mutate();
  };

  const getMatchScoreColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return 'bg-green-500';
    if (numScore >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMatchScoreBadge = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return 'High Confidence';
    if (numScore >= 0.7) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">THCa Flower Sheet Pivot Tables</h1>
          <p className="text-muted-foreground">
            Comprehensive mapping between THCa flower sheet data and Shopify inventory
          </p>
        </div>
        <Button 
          onClick={handleGeneratePivotTables}
          disabled={generatePivotMutation.isPending}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${generatePivotMutation.isPending ? 'animate-spin' : ''}`} />
          Generate Pivot Tables
        </Button>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">THCa Sheet Entries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.thcaSheet.totalThcaRows}</div>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-sm">
                  <span>Auto Matched:</span>
                  <Badge variant="secondary">{overview.thcaSheet.autoMatched}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Need Review:</span>
                  <Badge variant="outline">{overview.thcaSheet.needsReview}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Score:</span>
                  <Badge variant="secondary">{parseFloat(overview.thcaSheet.avgMatchScore).toFixed(2)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shopify Products</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.shopify.totalShopifyProducts}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Products synced to lookup table
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.inventory.totalInventoryItems}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Total items in database
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="strain-mapping" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="strain-mapping">Strain Mapping</TabsTrigger>
          <TabsTrigger value="inventory-alignment">Inventory Alignment</TabsTrigger>
          <TabsTrigger value="conflict-resolution">Conflict Resolution</TabsTrigger>
        </TabsList>

        <TabsContent value="strain-mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strain-Based Mapping Pivot Table</CardTitle>
              <CardDescription>
                Shows how THCa sheet strains connect to Shopify and inventory items
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strainLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strain Name</TableHead>
                      <TableHead>THCa Entries</TableHead>
                      <TableHead>Shopify Matches</TableHead>
                      <TableHead>Inventory Matches</TableHead>
                      <TableHead>Match Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strainMapping?.slice(0, 20).map((strain, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{strain.thca_sheet_strain}</TableCell>
                        <TableCell>{strain.thca_entries}</TableCell>
                        <TableCell>{strain.shopify_matches}</TableCell>
                        <TableCell>{strain.inventory_matches}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={parseFloat(strain.avg_match_score) * 100} 
                              className="w-16"
                            />
                            <span className="text-sm">
                              {parseFloat(strain.avg_match_score).toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory-alignment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Alignment Pivot Table</CardTitle>
              <CardDescription>
                Detailed connections between inventory items, THCa sheet data, and Shopify products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alignmentLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inventory Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>THCa Strain</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Shopify Product</TableHead>
                      <TableHead>Match Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryAlignment?.slice(0, 20).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.inventory_name}</TableCell>
                        <TableCell className="text-sm font-mono">{item.inventory_sku}</TableCell>
                        <TableCell>{item.thca_sheet_strain}</TableCell>
                        <TableCell>{item.thca_sheet_amount}</TableCell>
                        <TableCell>{item.thca_sheet_percentage}</TableCell>
                        <TableCell>{item.shopify_title || 'Not Connected'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={parseFloat(item.match_score) >= 0.7 ? 'default' : 'secondary'}
                            className={parseFloat(item.match_score) >= 0.7 ? 'bg-green-600' : 'bg-yellow-600'}
                          >
                            {getMatchScoreBadge(item.match_score)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflict-resolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Items Requiring Review</CardTitle>
              <CardDescription>
                Items with low confidence scores or mapping conflicts that need manual review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-4 border rounded-lg bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Review Needed</p>
                  <p className="text-sm text-muted-foreground">
                    {overview?.thcaSheet.needsReview} items have match scores below 0.8 and require manual review
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Low Confidence Matches</h4>
                <div className="space-y-2">
                  {inventoryAlignment?.filter(item => parseFloat(item.match_score) < 0.7).slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{item.inventory_name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.inventory_sku}</p>
                      </div>
                      <Badge variant="outline" className="bg-red-50">
                        Score: {parseFloat(item.match_score).toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}