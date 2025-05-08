import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Info, AlertCircle, CheckCircle2, Eye, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLocation, useRoute } from 'wouter';

const formSchema = z.object({
  file: z.instanceof(FileList).refine((files) => {
    return files.length === 1;
  }, {
    message: 'Please select a CSV file',
  }).refine((files) => {
    if (files.length === 0) return true;
    return files[0].name.toLowerCase().endsWith('.csv');
  }, {
    message: 'The file must be a CSV file'
  }),
});

export default function ShopifyImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);
  const [importedItems, setImportedItems] = useState<Array<any>>([]);
  const [errors, setErrors] = useState<Array<any>>([]);
  const [importStats, setImportStats] = useState<{
    total?: number;
    succeeded?: number;
    failed?: number;
    skipped?: number;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectToInventory, setRedirectToInventory] = useState(false);

  // Progress bar animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading && progress < 90) {
      interval = setInterval(() => {
        setProgress((prev) => {
          // Slower progress as we get higher
          const increment = prev < 30 ? 5 : prev < 60 ? 3 : prev < 80 ? 1 : 0.5;
          return Math.min(prev + increment, 90);
        });
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, progress]);
  
  // Handle auto-redirect to inventory view
  useEffect(() => {
    if (redirectToInventory) {
      // Add slight delay to allow the user to see the success message
      const redirectTimer = setTimeout(() => {
        setLocation("/inventory"); // Redirect to inventory page
      }, 2000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [redirectToInventory, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
    },
  });

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsLoading(true);
      setProgress(5);
      setError(null);
      setErrors([]);
      setImportedItems([]);
      setImportStats({});
      
      try {
        const response = await fetch('/api/items/import-shopify', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Failed to import items');
        }
        
        const data = await response.json();
        setProgress(100);
        return data;
      } catch (err: any) {
        console.error('Import error:', err);
        setError(err.message || 'An unknown error occurred');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      // Make sure items exists in the response before using it
      if (data && data.items) {
        setImportedItems(data.items || []);
        
        // Set any errors
        if (data.errors && data.errors.length > 0) {
          setErrors(data.errors);
        }
        
        // Calculate import stats from data
        const stats = {
          total: data.items.length + (data.totalErrors || 0),
          succeeded: data.items.length,
          failed: data.errors?.length || 0,
          skipped: (data.totalErrors || 0) - (data.errors?.length || 0)
        };
        
        setImportStats(stats);
        
        // Show toast message about import success and upcoming redirection
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${data.items.length} items. Redirecting to inventory view...`,
        });
        
        // Invalidate queries to refresh inventory data
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
        
        // Initiate auto-redirect to inventory view after a brief delay
        if (data.items.length > 0) {
          setRedirectToInventory(true);
        }
      } else {
        // Handle case where data.items is missing
        setImportedItems([]);
        toast({
          title: 'Import Completed',
          description: data.message || 'Import process completed, but no items were returned.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Import Failed',
        description: error.message || 'An unknown error occurred during import',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append('file', values.file[0]);
    
    importMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-500/30 bg-blue-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 mb-4">
            <Info className="h-6 w-6 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-2">
              <p className="text-white">
                Use this tool to import your Shopify product inventory data into Inventory Pro. 
                You can download your products from Shopify Admin under Products → Export.
              </p>
              <p className="text-gray-300">
                The importer supports both full product exports and inventory exports. Items will be automatically
                matched by SKU to prevent duplicates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Shopify CSV File</FormLabel>
                    <FormControl>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            onChange(e.target.files);
                          }}
                          className="cursor-pointer bg-gray-100/5 border-gray-700 file:text-blue-500 file:bg-blue-500/10 file:border-blue-500/30"
                          {...rest}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || importMutation.isPending}
              >
                {isLoading || importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Shopify Inventory
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isLoading || importMutation.isPending) && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Importing Shopify inventory...</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-gray-800 [&>div]:bg-blue-600" />
        </div>
      )}

      {/* Import Summary */}
      {importedItems && importedItems.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium">Import Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-sm text-gray-400">Total Processed</div>
                <div className="text-xl font-semibold">{importStats.total || 0}</div>
              </div>
              <div className="p-3 bg-green-900/20 text-green-300 rounded-lg text-center">
                <div className="text-sm opacity-80">Imported</div>
                <div className="text-xl font-semibold">{importStats.succeeded || 0}</div>
              </div>
              <div className="p-3 bg-yellow-900/20 text-yellow-300 rounded-lg text-center">
                <div className="text-sm opacity-80">Skipped</div>
                <div className="text-xl font-semibold">{importStats.skipped || 0}</div>
              </div>
              <div className="p-3 bg-red-900/20 text-red-300 rounded-lg text-center">
                <div className="text-sm opacity-80">Failed</div>
                <div className="text-xl font-semibold">{importStats.failed || 0}</div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <h4 className="text-md font-medium mb-3">Recently Imported Items</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {importedItems.slice(0, 6).map((item, index) => (
                <Card key={index} className="bg-gray-800/30 border-gray-700 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-white truncate">{item.name}</h4>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1 text-gray-300">
                      <div className="flex justify-between">
                        <span>SKU:</span>
                        <span className="font-mono text-blue-300">{item.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span>${item.basePrice?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span>{item.quantity}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {importedItems.length > 6 && (
              <div className="text-center text-gray-400 mt-4">
                + {importedItems.length - 6} more items imported successfully
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-gray-800/30 py-3 px-6 flex justify-between">
            <div className="text-sm text-gray-400">
              {redirectToInventory ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirecting to inventory...</span>
                </div>
              ) : (
                <span>Click the button to view all items in the inventory</span>
              )}
            </div>
            <Button 
              variant="outline" 
              className="text-sm flex items-center gap-2"
              onClick={() => setLocation("/inventory")}
            >
              <Eye className="h-4 w-4" /> View All Items
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Import Errors */}
      {errors && errors.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-medium">Import Warnings</h3>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto p-2">
              {errors.map((error, index) => (
                <div key={index} className="bg-yellow-900/10 border border-yellow-500/30 rounded-md p-3 text-sm">
                  <div className="flex items-start">
                    <span className="font-mono text-yellow-300 mr-2">Row {error.row}:</span> 
                    <span>{error.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}