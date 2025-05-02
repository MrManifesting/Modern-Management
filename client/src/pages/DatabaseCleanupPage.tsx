import { useState } from "react";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trash2, RefreshCw, Tag, Calendar, BarChart, Database } from "lucide-react";
export default function DatabaseCleanupPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sourceValue, setSourceValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [results, setResults] = useState<any>(null);

  // Cleanup Mutations
  const removeDuplicatesByStrainPrice = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/duplicates-by-strain-price", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Duplicates Removed",
        description: data.message,
      });
      setResults(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove duplicates: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const removeDuplicatesBySku = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/duplicates", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Duplicates Removed",
        description: data.message,
      });
      setResults(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove duplicates: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const removeZeroItems = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/zero-items", {
        confirmDelete: "YES_DELETE_ZERO_ITEMS"
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Zero Items Removed",
        description: data.message,
      });
      setResults(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove zero items: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const removeBySource = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/import-batch", {
        source: sourceValue,
        confirmDelete: `YES_DELETE_IMPORT_${sourceValue.toUpperCase()}`
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Import Batch Removed",
        description: data.message,
      });
      setResults(data);
      setSourceValue("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove import batch: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const removeByDateRange = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/by-date", {
        startDate,
        endDate,
        confirmDelete: "YES_DELETE_BY_DATE_RANGE"
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Date Range Items Removed",
        description: data.message,
      });
      setResults(data);
      setStartDate("");
      setEndDate("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove items by date range: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const removeAllItems = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/all-items", {
        confirmDelete: "YES_DELETE_ALL_ITEMS"
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "All Items Removed",
        description: data.message,
      });
      setResults(data);
      setConfirming(null);
      setConfirmationText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove all items: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle user confirming dangerous operations
  const handleConfirmation = (action: string) => {
    if (confirming === action && confirmationText === "DELETE") {
      // Execute the appropriate action
      switch (action) {
        case "remove-all":
          removeAllItems.mutate();
          break;
      }
    } else {
      setConfirming(action);
      setConfirmationText("");
    }
  };

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  return (
    <>
      <Helmet>
        <title>Database Cleanup - Inventory Management</title>
      </Helmet>
      
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Database Cleanup & Maintenance</h1>
            <p className="text-muted-foreground">
              Manage your inventory database and remove duplicate or unnecessary items
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/stats'] })}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg font-medium">Total Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.inventory?.total || 0}
                <span className="text-sm text-muted-foreground font-normal ml-2">items</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg font-medium">Listed Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.inventory?.listed || 0}
                <span className="text-sm text-muted-foreground font-normal ml-2">items</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg font-medium">AI Enhanced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.inventory?.aiEnhanced || 0}
                <span className="text-sm text-muted-foreground font-normal ml-2">items</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="duplicates" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="duplicates">Remove Duplicates</TabsTrigger>
            <TabsTrigger value="zero-items">Zero Items</TabsTrigger>
            <TabsTrigger value="by-source">By Source</TabsTrigger>
            <TabsTrigger value="by-date">By Date</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="danger" className="text-red-500">Danger Zone</TabsTrigger>
          </TabsList>

          {/* Duplicates Tab */}
          <TabsContent value="duplicates">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Remove Duplicate Items by Strain & Price</CardTitle>
                  <CardDescription>
                    Finds and removes duplicate inventory items that have the same strain and price.
                    Keeps the oldest item and removes duplicates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This operation will scan your inventory for items where both the strain (condition field) 
                    and price match exactly. For each group of matching items, it will keep
                    the oldest item (by ID) and remove all duplicates.
                  </p>
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Automated Operation</AlertTitle>
                    <AlertDescription>
                      This is an automated process that doesn't require confirmation.
                      No confirmation required because items are analyzed first and only
                      duplicates are removed.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => removeDuplicatesByStrainPrice.mutate()}
                    disabled={removeDuplicatesByStrainPrice.isPending}
                  >
                    {removeDuplicatesByStrainPrice.isPending ? "Removing..." : "Remove Duplicates by Strain & Price"}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Remove Duplicate Items by SKU</CardTitle>
                  <CardDescription>
                    Finds and removes duplicate inventory items that have the same SKU.
                    Keeps the oldest item and removes duplicates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This operation will scan your inventory for items with identical SKUs.
                    For each group of matching SKUs, it will keep
                    the oldest item (by ID) and remove all duplicates.
                  </p>
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Automated Operation</AlertTitle>
                    <AlertDescription>
                      This is an automated process that doesn't require confirmation.
                      No confirmation required because items are analyzed first and only
                      duplicates are removed.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => removeDuplicatesBySku.mutate()}
                    disabled={removeDuplicatesBySku.isPending}
                  >
                    {removeDuplicatesBySku.isPending ? "Removing..." : "Remove Duplicates by SKU"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* Zero Items Tab */}
          <TabsContent value="zero-items">
            <Card>
              <CardHeader>
                <CardTitle>Remove Zero Price & Zero Quantity Items</CardTitle>
                <CardDescription>
                  Removes all inventory items that have both zero price (0) and zero quantity (0).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This operation will find and remove all items where both the price and quantity
                  are set to zero. This is useful for cleaning up placeholder or inactive products.
                </p>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This operation will permanently delete items that match the criteria.
                    These items cannot be recovered after deletion.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => removeZeroItems.mutate()}
                  disabled={removeZeroItems.isPending}
                  variant="destructive"
                >
                  {removeZeroItems.isPending ? "Removing..." : "Remove Zero Items"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* By Source Tab */}
          <TabsContent value="by-source">
            <Card>
              <CardHeader>
                <CardTitle>Remove Items by Import Source</CardTitle>
                <CardDescription>
                  Removes all inventory items imported from a specific source.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This operation will find and remove all items that were imported from
                  the specified source. Enter the exact source name used during import.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" htmlFor="source">
                    Import Source
                  </label>
                  <Input
                    id="source"
                    value={sourceValue}
                    onChange={e => setSourceValue(e.target.value)}
                    placeholder="e.g., shopify, csv, manual"
                    className="mb-4"
                  />
                </div>
                <Alert className="mb-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This operation will permanently delete all items imported from the specified source.
                    These items cannot be recovered after deletion.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => removeBySource.mutate()}
                  disabled={removeBySource.isPending || !sourceValue}
                  variant="destructive"
                >
                  {removeBySource.isPending ? "Removing..." : "Remove Items by Source"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* By Date Tab */}
          <TabsContent value="by-date">
            <Card>
              <CardHeader>
                <CardTitle>Remove Items by Date Range</CardTitle>
                <CardDescription>
                  Removes all inventory items created within a specific date range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This operation will find and remove all items that were created
                  between the specified start and end dates (inclusive).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="start-date">
                      Start Date
                    </label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="end-date">
                      End Date
                    </label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <Alert className="mb-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This operation will permanently delete all items created within the specified date range.
                    These items cannot be recovered after deletion.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => removeByDateRange.mutate()}
                  disabled={removeByDateRange.isPending || !startDate || !endDate}
                  variant="destructive"
                >
                  {removeByDateRange.isPending ? "Removing..." : "Remove Items by Date Range"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Operation Results</CardTitle>
                <CardDescription>
                  View the results of your most recent cleanup operation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results ? (
                  <div>
                    <div className="mb-4 flex items-center">
                      <Badge variant={results.success ? "default" : "destructive"} className="mr-2">
                        {results.success ? "Success" : "Error"}
                      </Badge>
                      <span className="text-lg font-medium">{results.message}</span>
                    </div>
                    
                    {results.deletedCount !== undefined && (
                      <div className="mb-4">
                        <span className="text-2xl font-bold">{results.deletedCount}</span>
                        <span className="text-muted-foreground ml-2">items removed</span>
                      </div>
                    )}
                    
                    {results.duplicates && results.duplicates.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Affected SKUs</h3>
                        <ScrollArea className="h-[200px] rounded-md border p-4">
                          <div className="space-y-2">
                            {results.duplicates.map((dup: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Tag className="h-4 w-4 mr-2" />
                                  <span>{dup.sku}</span>
                                </div>
                                <Badge variant="outline">
                                  {dup.deleteIds.length} duplicates removed
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                    
                    {results.items && results.items.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Removed Items</h3>
                        <ScrollArea className="h-[200px] rounded-md border p-4">
                          <div className="space-y-2">
                            {results.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Database className="h-4 w-4 mr-2" />
                                  <span>{item.name}</span>
                                </div>
                                <Badge variant="outline">
                                  ID: {item.id}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No results to display. Run a cleanup operation first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger">
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="text-red-500">Danger Zone</CardTitle>
                <CardDescription>
                  These operations are destructive and cannot be undone.
                  Only use these in development or when you're absolutely sure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Critical Warning</AlertTitle>
                  <AlertDescription>
                    Operations in this section will permanently delete large amounts of data.
                    These items cannot be recovered after deletion.
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 border border-red-500 rounded-lg">
                  <h3 className="text-lg font-medium mb-2 text-red-500">Remove All Items</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This operation will delete ALL items from your inventory database.
                    Only use this for development or when setting up a fresh start.
                  </p>
                  
                  {confirming === "remove-all" ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1 text-red-500">
                        Type "DELETE" to confirm
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={confirmationText}
                          onChange={e => setConfirmationText(e.target.value)}
                          className="border-red-500"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setConfirming(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  
                  <Button 
                    variant="destructive"
                    onClick={() => handleConfirmation("remove-all")}
                    disabled={removeAllItems.isPending || (confirming === "remove-all" && confirmationText !== "DELETE")}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {removeAllItems.isPending 
                      ? "Removing..." 
                      : confirming === "remove-all" 
                        ? "Confirm Deletion" 
                        : "Remove All Inventory Items"
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}