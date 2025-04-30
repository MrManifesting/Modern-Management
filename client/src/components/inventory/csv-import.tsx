import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

export default function CSVImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: string[][];
    totalRows: number;
  } | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "validating" | "validated" | "importing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMessage("Please select a CSV file");
      setImportStatus("error");
      return;
    }
    
    setFile(selectedFile);
    setImportStatus("validating");
    setErrorMessage(null);
    
    try {
      // Preview the CSV
      const text = await selectedFile.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      const headers = rows[0];
      
      // Validate required columns
      const requiredColumns = ['name', 'description', 'price', 'quantity', 'sku'];
      const missingColumns = requiredColumns.filter(col => !headers.map(h => h.toLowerCase()).includes(col));
      
      if (missingColumns.length > 0) {
        setErrorMessage(`Missing required columns: ${missingColumns.join(', ')}`);
        setImportStatus("error");
        return;
      }
      
      setPreview({
        headers,
        rows: rows.slice(1, 6), // First 5 rows for preview
        totalRows: rows.length - 1
      });
      setImportStatus("validated");
    } catch (error) {
      setErrorMessage("Failed to parse CSV file. Please check the format.");
      setImportStatus("error");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle import mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("/api/items/import-csv", {
        method: "POST",
        body: formData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setImportStatus("complete");
      setProgress(100);
      toast({
        title: "Import completed",
        description: `Successfully imported ${data.importedCount} items`,
      });
      // Invalidate inventory queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      setImportStatus("error");
      setErrorMessage(error.message || "Failed to import inventory items");
      toast({
        title: "Import failed",
        description: error.message || "Failed to import inventory items",
        variant: "destructive",
      });
    }
  });

  // Start the import process
  const handleImport = () => {
    if (!file || importStatus !== "validated") return;
    
    setImportStatus("importing");
    setProgress(0);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("syncToShopify", "true");
    
    // Start an interval to simulate progress while waiting for the import
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress >= 90 ? 90 : newProgress; // Cap at 90%, 100% when complete
      });
    }, 300);
    
    importMutation.mutate(formData, {
      onSuccess: () => clearInterval(progressInterval),
      onError: () => clearInterval(progressInterval)
    });
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setImportStatus("idle");
    setErrorMessage(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Inventory from CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />
        
        {importStatus === "error" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {importStatus === "idle" && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 mb-4">
            <FileText className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-center text-sm text-gray-500 mb-4">
              Upload a CSV file with your inventory data.
              <br />
              The file should include columns for name, description, price, quantity, and SKU.
            </p>
            <Button onClick={triggerFileInput}>Select CSV File</Button>
          </div>
        )}
        
        {importStatus === "validating" && (
          <div className="py-8 text-center">
            <p>Validating file...</p>
          </div>
        )}
        
        {(importStatus === "validated" || importStatus === "importing") && preview && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-gray-500">{preview.totalRows} items</p>
              </div>
              {importStatus === "validated" && (
                <Button onClick={resetForm} variant="outline" size="sm">
                  Change File
                </Button>
              )}
            </div>
            
            {importStatus === "importing" && (
              <div className="space-y-2 my-4">
                <p className="text-sm text-gray-500">Importing inventory...</p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 text-right">{Math.round(progress)}%</p>
              </div>
            )}
            
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {preview.headers.map((header, i) => (
                        <th key={i} className="px-4 py-2 text-left font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-2 text-gray-700">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length < preview.totalRows && (
                <div className="p-2 text-xs text-center text-gray-500 border-t">
                  Showing {preview.rows.length} of {preview.totalRows} rows
                </div>
              )}
            </div>
            
            <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
              <p>
                <strong>Important:</strong> All imported items will be automatically synchronized with your connected marketplaces, including Shopify.
              </p>
            </div>
          </div>
        )}
        
        {importStatus === "complete" && (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Import Completed</h3>
            <p className="text-gray-500 mt-1">
              Your inventory has been successfully imported and synced with your marketplaces.
            </p>
            <Button onClick={resetForm} className="mt-4">Import Another File</Button>
          </div>
        )}
      </CardContent>
      
      {importStatus === "validated" && (
        <CardFooter className="border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-end w-full">
            <Button onClick={handleImport} disabled={importStatus === "importing"}>
              Import and Sync Inventory
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}