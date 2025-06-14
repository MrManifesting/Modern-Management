import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Upload, Download, RefreshCw } from "lucide-react";

interface SyncResults {
  thca: { imported: number; exported: number; success: boolean };
  inventory: { imported: number; exported: number; success: boolean };
  list: { imported: number; exported: number; success: boolean };
}

export default function SheetsMappingAdmin() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [thcaSheetName, setThcaSheetName] = useState("THCa Flower");
  const [inventorySheetName, setInventorySheetName] = useState("Inventory");
  const [listSheetName, setListSheetName] = useState("InventoryList");
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null);
  const [mappingConfig, setMappingConfig] = useState<any>(null);
  const { toast } = useToast();

  const handleThcaImport = async () => {
    if (!spreadsheetId) {
      toast({
        title: "Error",
        description: "Please enter a spreadsheet ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sheets/thca-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          sheetName: thcaSheetName
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${result.imported} items from THCa Flower sheet`
        });
      } else {
        throw new Error(result.message || "Import failed");
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInventoryExport = async () => {
    if (!spreadsheetId) {
      toast({
        title: "Error",
        description: "Please enter a spreadsheet ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sheets/inventory-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          sheetName: inventorySheetName
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Export Successful",
          description: `Exported ${result.exported} items to Inventory sheet`
        });
      } else {
        throw new Error(result.message || "Export failed");
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSync = async (direction: 'to-app' | 'from-app' | 'bidirectional') => {
    if (!spreadsheetId) {
      toast({
        title: "Error",
        description: "Please enter a spreadsheet ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sheets/bulk-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          thcaSheetName,
          inventorySheetName,
          listSheetName,
          syncDirection: direction
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSyncResults(result.results);
        toast({
          title: "Sync Completed",
          description: "Bulk synchronization completed across all sheet types"
        });
      } else {
        throw new Error(result.message || "Sync failed");
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappingConfig = async () => {
    try {
      const response = await fetch("/api/sheets/mapping-config");
      const result = await response.json();
      
      if (result.success) {
        setMappingConfig(result.mappings);
      }
    } catch (error) {
      console.error("Error loading mapping config:", error);
    }
  };

  // Load mapping config on component mount
  useState(() => {
    loadMappingConfig();
  });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Google Sheets Mapping Admin</h1>
        <p className="text-gray-600 mt-2">
          Manage synchronization between THCa Flower, Inventory, and InventoryList sheets
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sheet Configuration
            </CardTitle>
            <CardDescription>
              Configure Google Sheets connection and sheet names for synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                <Input
                  id="spreadsheetId"
                  placeholder="1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thcaSheet">THCa Flower Sheet Name</Label>
                <Input
                  id="thcaSheet"
                  value={thcaSheetName}
                  onChange={(e) => setThcaSheetName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inventorySheet">Inventory Sheet Name</Label>
                <Input
                  id="inventorySheet"
                  value={inventorySheetName}
                  onChange={(e) => setInventorySheetName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listSheet">InventoryList Sheet Name</Label>
                <Input
                  id="listSheet"
                  value={listSheetName}
                  onChange={(e) => setListSheetName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="operations">Sync Operations</TabsTrigger>
            <TabsTrigger value="results">Sync Results</TabsTrigger>
            <TabsTrigger value="mappings">Column Mappings</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-6">
            {/* Individual Operations */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Sheet Operations</CardTitle>
                <CardDescription>
                  Import or export data from specific sheet types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleThcaImport}
                    disabled={isLoading}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import THCa Flower Data
                  </Button>
                  <Button
                    onClick={handleInventoryExport}
                    disabled={isLoading}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Inventory Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Operations */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Synchronization</CardTitle>
                <CardDescription>
                  Sync data across all three sheet formats simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => handleBulkSync('to-app')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import All Sheets
                  </Button>
                  <Button
                    onClick={() => handleBulkSync('from-app')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All Sheets
                  </Button>
                  <Button
                    onClick={() => handleBulkSync('bidirectional')}
                    disabled={isLoading}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Bidirectional Sync
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {syncResults ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Last Sync Results</h3>
                
                {Object.entries(syncResults).map(([sheetType, result]) => (
                  <Card key={sheetType}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {sheetType === 'thca' ? 'THCa Flower' : 
                         sheetType === 'inventory' ? 'Inventory' : 'InventoryList'} Sheet
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <Badge variant={result.imported > 0 ? "default" : "secondary"}>
                          Imported: {result.imported}
                        </Badge>
                        <Badge variant={result.exported > 0 ? "default" : "secondary"}>
                          Exported: {result.exported}
                        </Badge>
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No sync results available. Run a sync operation to see results here.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="mappings" className="space-y-6">
            {mappingConfig ? (
              <div className="space-y-6">
                {Object.entries(mappingConfig).map(([type, config]: [string, any]) => (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle className="capitalize">
                        {type === 'thcaFlower' ? 'THCa Flower' : 
                         type === 'inventory' ? 'Inventory' : 'InventoryList'} Mapping
                      </CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2">Column Headers ({config.headers.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {config.headers.map((header: string) => (
                              <Badge key={header} variant="outline" className="text-xs">
                                {header}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Sample Mapping</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            {Object.entries(config.mapping).slice(0, 5).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-mono">{key}</span>
                                <span className="text-gray-500">→</span>
                                <span className="font-mono text-blue-600">{value as string}</span>
                              </div>
                            ))}
                            {Object.keys(config.mapping).length > 5 && (
                              <div className="text-gray-500 italic">
                                ... and {Object.keys(config.mapping).length - 5} more mappings
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <Button onClick={loadMappingConfig} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Mapping Configuration
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}