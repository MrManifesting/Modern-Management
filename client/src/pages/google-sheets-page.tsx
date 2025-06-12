import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Download, Upload, RefreshCw, FileSpreadsheet } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors: string[];
  conflicts?: Array<{
    itemId: number;
    field: string;
    localValue: any;
    sheetValue: any;
  }>;
}

export default function GoogleSheetsPage() {
  const { toast } = useToast();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [worksheetName, setWorksheetName] = useState("Inventory");
  const [newSpreadsheetTitle, setNewSpreadsheetTitle] = useState("");

  // Check Google Sheets status
  const { data: sheetsStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/google-sheets/status"],
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async ({ spreadsheetId, worksheetName }: { spreadsheetId: string; worksheetName: string }) => {
      const response = await apiRequest("GET", `/api/google-sheets/test-connection?spreadsheetId=${encodeURIComponent(spreadsheetId)}&worksheetName=${encodeURIComponent(worksheetName)}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: `Connected to spreadsheet: ${data.spreadsheet?.title}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create spreadsheet mutation
  const createSpreadsheetMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/google-sheets/create-spreadsheet", { title });
      return response.json();
    },
    onSuccess: (data) => {
      setSpreadsheetId(data.spreadsheetId);
      setWorksheetName(data.worksheetName);
      setNewSpreadsheetTitle("");
      toast({
        title: "Spreadsheet Created",
        description: `New inventory spreadsheet created successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-sheets/export", {
        spreadsheetId,
        worksheetName,
      });
      return response.json();
    },
    onSuccess: (data: SyncResult) => {
      toast({
        title: "Export Complete",
        description: `Successfully exported ${data.syncedItems} items to Google Sheets`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-sheets/import", {
        spreadsheetId,
        worksheetName,
      });
      return response.json();
    },
    onSuccess: (data: SyncResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.syncedItems} items from Google Sheets`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-sheets/sync", {
        spreadsheetId,
        worksheetName,
      });
      return response.json();
    },
    onSuccess: (data: SyncResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Sync Complete",
        description: `Successfully synchronized ${data.syncedItems} items with Google Sheets`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = () => {
    if (!spreadsheetId.trim() || !worksheetName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both Spreadsheet ID and Worksheet Name",
        variant: "destructive",
      });
      return;
    }
    testConnectionMutation.mutate({ spreadsheetId, worksheetName });
  };

  const handleCreateSpreadsheet = () => {
    if (!newSpreadsheetTitle.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a title for the new spreadsheet",
        variant: "destructive",
      });
      return;
    }
    createSpreadsheetMutation.mutate(newSpreadsheetTitle);
  };

  const isConfigured = sheetsStatus?.configured;
  const canSync = isConfigured && spreadsheetId.trim() && worksheetName.trim();

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google Sheets Integration</h1>
        <p className="text-muted-foreground">
          Connect your inventory with Google Sheets for real-time collaboration and data management
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Authentication method: {sheetsStatus?.authMethod}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Not Configured
                </Badge>
              </>
            )}
          </div>
          
          {!isConfigured && (
            <Alert className="mt-4">
              <AlertDescription>
                Google Sheets credentials are not configured. Please contact your administrator to set up authentication.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isConfigured && (
        <Tabs defaultValue="connect" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="sync">Sync Data</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connect to Existing Spreadsheet</CardTitle>
                <CardDescription>
                  Enter the details of an existing Google Sheets spreadsheet to connect your inventory
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                  <Input
                    id="spreadsheetId"
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Found in the spreadsheet URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="worksheetName">Worksheet Name</Label>
                  <Input
                    id="worksheetName"
                    placeholder="Inventory"
                    value={worksheetName}
                    onChange={(e) => setWorksheetName(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending}
                  className="w-full"
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Synchronization</CardTitle>
                <CardDescription>
                  Import, export, or sync your inventory data with Google Sheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canSync && (
                  <Alert>
                    <AlertDescription>
                      Please connect to a spreadsheet first using the Connect tab
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => exportMutation.mutate()}
                    disabled={!canSync || exportMutation.isPending}
                    variant="outline"
                    className="h-20 flex-col gap-2"
                  >
                    {exportMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                    Export to Sheets
                    <span className="text-xs text-muted-foreground">
                      Send inventory to Google Sheets
                    </span>
                  </Button>

                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={!canSync || importMutation.isPending}
                    variant="outline"
                    className="h-20 flex-col gap-2"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    Import from Sheets
                    <span className="text-xs text-muted-foreground">
                      Load data from Google Sheets
                    </span>
                  </Button>

                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={!canSync || syncMutation.isPending}
                    className="h-20 flex-col gap-2"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-5 w-5" />
                    )}
                    Two-Way Sync
                    <span className="text-xs text-muted-foreground">
                      Sync both directions
                    </span>
                  </Button>
                </div>

                {canSync && (
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Connected to:</strong> {spreadsheetId}</p>
                    <p><strong>Worksheet:</strong> {worksheetName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Spreadsheet</CardTitle>
                <CardDescription>
                  Create a new Google Sheets spreadsheet pre-configured for inventory management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newTitle">Spreadsheet Title</Label>
                  <Input
                    id="newTitle"
                    placeholder="My Inventory Spreadsheet"
                    value={newSpreadsheetTitle}
                    onChange={(e) => setNewSpreadsheetTitle(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleCreateSpreadsheet}
                  disabled={createSpreadsheetMutation.isPending}
                  className="w-full"
                >
                  {createSpreadsheetMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Create Spreadsheet
                </Button>

                <p className="text-sm text-muted-foreground">
                  This will create a new spreadsheet with pre-configured columns for inventory tracking.
                  You'll be able to share it with team members for collaborative inventory management.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}