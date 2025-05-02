import React, { useState, useRef } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Upload, ShoppingBag, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function ShopifyImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
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
    setErrorMessage(null);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Start import when file is selected
  const handleImport = () => {
    if (!file) return;
    
    setImportStatus("uploading");
    setProgress(0);
    
    const formData = new FormData();
    formData.append("file", file);
    
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

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Use our dedicated Shopify import endpoint
      const response = await apiRequest("POST", "/api/items/import-shopify", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setImportStatus("complete");
      setProgress(100);
      toast({
        title: "Import completed",
        description: `Successfully imported ${data.importedCount} items from Shopify export`,
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
        description: error.message || "Failed to import Shopify inventory",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFile(null);
    setImportStatus("idle");
    setErrorMessage(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="w-full border-gold">
      <CardHeader className="gold-theme card-header">
        <CardTitle className="flex items-center gap-2 gold-gradient-text">
          <ShoppingBag className="h-5 w-5" /> Import Shopify Inventory
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
              Upload a Shopify inventory export CSV file.
              <br />
              The file should have columns for Handle, Title, and Available quantity.
            </p>
            <Button onClick={triggerFileInput} className="gold-btn">
              <Upload className="h-4 w-4 mr-2" /> Select Shopify CSV File
            </Button>
            {file && (
              <div className="mt-4 flex flex-col items-center">
                <p className="text-green-400 font-medium">{file.name} selected</p>
                <Button onClick={handleImport} className="mt-2 gold-btn">
                  <ShoppingBag className="h-4 w-4 mr-2" /> Import Shopify Inventory
                </Button>
              </div>
            )}
          </div>
        )}
        
        {importStatus === "uploading" && (
          <div className="py-8 text-center">
            <p className="text-gold mb-2">Importing Shopify inventory...</p>
            <Progress value={progress} className="h-2 bg-black border border-gold/20" />
            <p className="text-xs text-gold mt-2">{Math.round(progress)}%</p>
          </div>
        )}
        
        {importStatus === "complete" && (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gold">Import Completed</h3>
            <p className="text-gray-300 mt-1">
              Your Shopify inventory has been successfully imported and synchronized.
            </p>
            <Button onClick={resetForm} className="mt-4 gold-btn">
              Import Another File
            </Button>
          </div>
        )}
      </CardContent>
      
      {importStatus === "idle" && file && (
        <CardFooter className="border-t border-gold/30 bg-black px-4 py-4 flex justify-between">
          <Button onClick={resetForm} variant="outline" className="gold-outline-btn">
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}