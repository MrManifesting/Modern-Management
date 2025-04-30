import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ShoppingBag, 
  UploadCloud, 
  Database,
  Leaf,
  Stamp
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CSVImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: string[][];
    totalRows: number;
  } | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "validating" | "validated" | "importing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [syncToShopify, setSyncToShopify] = useState(true);
  const [isStampImport, setIsStampImport] = useState(false);
  const [isCannabisImport, setIsCannabisImport] = useState(false);
  
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
      const rows = text.split('\n')
        .filter(row => row.trim() !== '')
        .map(row => {
          // Handle CSV with quotes properly
          let result = [];
          let insideQuotes = false;
          let currentValue = '';
          
          for (let i = 0; i < row.length; i++) {
            if (row[i] === '"' && (i === 0 || row[i-1] !== '\\')) {
              insideQuotes = !insideQuotes;
            } else if (row[i] === ',' && !insideQuotes) {
              result.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += row[i];
            }
          }
          
          if (currentValue) {
            result.push(currentValue.trim());
          }
          
          return result;
        });
      
      if (rows.length === 0) {
        setErrorMessage("The CSV file appears to be empty");
        setImportStatus("error");
        return;
      }
      
      const headers = rows[0];
      
      // Detect file type by headers
      const isStampFormat = headers.some(h => 
        h.toLowerCase().includes('title') || 
        h.toLowerCase().includes('condition')
      );
      
      const isCannabisFormat = isCannabisInventory(headers);
      
      // Set import type
      setIsStampImport(isStampFormat);
      setIsCannabisImport(isCannabisFormat);
      
      // Set required columns based on import type
      let requiredColumns = [];
      
      if (isStampFormat) {
        requiredColumns = ['title', 'description', 'price', 'condition'];
      } else if (isCannabisFormat) {
        requiredColumns = ['strain', 'tier', 'price']; 
      } else {
        requiredColumns = ['name', 'description', 'price', 'quantity'];
      };
      
      const headersLower = headers.map(h => h.toLowerCase());
      const missingColumns = requiredColumns.filter(col => 
        !headersLower.some(h => h.includes(col))
      );
      
      if (missingColumns.length > 0) {
        setErrorMessage(`Missing required columns: ${missingColumns.join(', ')}`);
        setImportStatus("error");
        return;
      }
      
      setPreview({
        headers,
        rows: rows.slice(1, Math.min(rows.length, 6)), // First 5 rows for preview
        totalRows: rows.length - 1
      });
      setImportStatus("validated");
    } catch (error) {
      console.error("CSV parsing error:", error);
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
      const response = await apiRequest("POST", "/api/items/import-csv", formData);
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
    formData.append("syncToShopify", syncToShopify.toString());
    formData.append("isStampImport", isStampImport.toString());
    formData.append("isCannabisImport", isCannabisImport.toString());
    
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

  // Check if file is likely a cannabis inventory spreadsheet
  const isCannabisInventory = (headers: string[]): boolean => {
    return headers.some(h => h.includes('Strain')) && 
           headers.some(h => h.includes('Tier') || h.includes('THC') || h.includes('CBD'));
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setImportStatus("idle");
    setErrorMessage(null);
    setProgress(0);
    setIsStampImport(false);
    setIsCannabisImport(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="w-full border-gold">
      <CardHeader className="gold-theme card-header">
        <CardTitle className="flex items-center gap-2 gold-gradient-text">
          {isStampImport ? (
            <><Stamp className="h-5 w-5" /> Import Stamp Collection</>
          ) : isCannabisImport ? (
            <><Leaf className="h-5 w-5" /> Import Cannabis Inventory</>
          ) : (
            <><UploadCloud className="h-5 w-5" /> Import Inventory from CSV</>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gold-theme">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />
        
        {importStatus === "error" && (
          <Alert variant="destructive" className="mb-4 bg-black/80 border-red-700 text-white">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-red-300">{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {importStatus === "idle" && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gold/30 bg-black/30 rounded-md p-6 mb-4">
            <FileText className="h-12 w-12 text-gold mb-2" />
            <p className="text-center text-sm text-gray-300 mb-4">
              Upload a CSV file with your inventory data.
              <br />
              The file should include columns for name, description, price, and condition.
            </p>
            <Button onClick={triggerFileInput} className="gold-btn">
              <Upload className="h-4 w-4 mr-2" /> Select CSV File
            </Button>
            <p className="text-center text-xs text-gray-400 mt-4">
              <span className="text-gold">Pro Tip:</span> We auto-detect stamp collection format
            </p>
          </div>
        )}
        
        {importStatus === "validating" && (
          <div className="py-8 text-center">
            <p className="text-gold">Validating file...</p>
            <Progress value={50} className="h-2 mt-4 bg-black border border-gold/20" />
          </div>
        )}
        
        {(importStatus === "validated" || importStatus === "importing") && preview && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 gap-2">
              <div>
                <p className="font-medium text-gold">{file?.name}</p>
                <p className="text-sm text-gray-400">
                  {preview.totalRows} items - 
                  <span className="text-gold ml-1">
                    {isStampImport 
                      ? "Stamp Collection Detected" 
                      : isCannabisImport 
                        ? "Cannabis Inventory Detected" 
                        : "Standard Inventory"}
                  </span>
                </p>
              </div>
              {importStatus === "validated" && (
                <Button onClick={resetForm} variant="outline" size="sm" className="gold-outline-btn">
                  Change File
                </Button>
              )}
            </div>
            
            {(importStatus === "importing") && (
              <div className="space-y-2 my-4">
                <p className="text-sm text-gray-300">Importing inventory...</p>
                <Progress value={progress} className="h-2 bg-black border border-gold/20" />
                <p className="text-xs text-gold text-right">{Math.round(progress)}%</p>
              </div>
            )}
            
            <div className="border border-gold/30 rounded-md overflow-hidden bg-black/50">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gold/20 border-b border-gold/30">
                      {preview.headers.map((header, i) => (
                        <th key={i} className="px-4 py-2 text-left font-medium text-gold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-t border-gold/10">
                        {row.map((cell, j) => {
                          // Format cell content for better display
                          let displayCell = cell;
                          if (cell.length > 60) {
                            displayCell = cell.substring(0, 60) + "...";
                          }
                          
                          // Format prices 
                          if (preview.headers[j].toLowerCase().includes('price') && !isNaN(Number(cell))) {
                            displayCell = `$${Number(cell).toFixed(2)}`;
                          }
                          
                          return (
                            <td key={j} className="px-4 py-2 text-gray-300" title={cell}>
                              {displayCell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length < preview.totalRows && (
                <div className="p-2 text-xs text-center text-gray-400 border-t border-gold/20">
                  Showing {preview.rows.length} of {preview.totalRows} rows
                </div>
              )}
            </div>
            
            <div className="p-4 border border-gold/30 rounded-md bg-black/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-5 w-5 text-gold" />
                  <h3 className="font-medium text-gray-200">Marketplace Integration</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="sync-shopify" 
                    checked={syncToShopify}
                    onCheckedChange={setSyncToShopify}
                    className="bg-gold/30 data-[state=checked]:bg-gold"
                  />
                  <Label htmlFor="sync-shopify" className="text-gray-300">
                    {syncToShopify ? "Sync with Shopify" : "Local Import Only"}
                  </Label>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {syncToShopify 
                  ? isStampImport 
                    ? "Your stamp collection will be synchronized with your Shopify store." 
                    : "All imported items will be automatically synchronized with Shopify to prevent overselling."
                  : "Items will only be imported locally. You can sync them later manually."}
              </p>
            </div>
          </div>
        )}
        
        {importStatus === "complete" && (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gold">Import Completed</h3>
            <p className="text-gray-300 mt-1">
              {syncToShopify 
                ? isStampImport 
                  ? "Your stamp collection has been successfully imported and synchronized with your Shopify store."
                  : isCannabisImport
                    ? "Your cannabis inventory has been successfully imported and synchronized with Shopify to prevent overselling."
                    : "Your inventory has been successfully imported and synchronized with Shopify to prevent overselling."
                : isStampImport
                  ? "Your stamp collection has been successfully imported. You can sync with marketplaces later if needed."
                  : isCannabisImport
                    ? "Your cannabis inventory has been successfully imported. You can sync with marketplaces later if needed."
                    : "Your inventory has been successfully imported. You can sync with marketplaces later if needed."
              }
            </p>
            <Button onClick={resetForm} className="mt-4 gold-btn">
              Import Another File
            </Button>
          </div>
        )}
      </CardContent>
      
      {importStatus === "validated" && (
        <CardFooter className="border-t border-gold/30 bg-black px-4 py-4 flex flex-col sm:flex-row gap-3">
          <div className="text-sm text-gray-400 flex items-center mb-2 sm:mb-0">
            <Database className="h-4 w-4 mr-2 text-gold/70" />
            {syncToShopify ? 
              isStampImport 
                ? "Stamps will be imported and synchronized" 
                : isCannabisImport
                  ? "Cannabis products will be imported and synchronized with Shopify"
                  : "Inventory will be imported and synchronized with Shopify" 
              : isStampImport
                ? "Stamps will be imported locally only"
                : isCannabisImport
                  ? "Cannabis products will be imported locally only"
                  : "Inventory will be imported locally only"}
          </div>
          <Button 
            onClick={handleImport} 
            disabled={importStatus !== "validated"}
            className="gold-btn ml-auto"
          >
            {syncToShopify 
              ? isStampImport 
                ? "Import & Sync Stamp Collection"
                : isCannabisImport
                  ? "Import & Sync Cannabis Products"
                  : "Import & Sync Inventory" 
              : isStampImport
                ? "Import Stamp Collection Only"
                : isCannabisImport
                  ? "Import Cannabis Products Only"
                  : "Import Inventory Only"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}