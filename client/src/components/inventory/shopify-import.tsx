import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const formSchema = z.object({
  file: z.instanceof(FileList).refine((files) => {
    return files.length === 1;
  }, {
    message: 'Please select a CSV file',
  }),
});

export default function ShopifyImport() {
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [importedItems, setImportedItems] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
    },
  });

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsLoading(true);
      setProgress(10);
      setError(null);
      setImportedItems([]);
      
      try {
        const response = await fetch('/api/items/import-shopify', {
          method: 'POST',
          body: formData,
        });
        
        setProgress(50);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to import items');
        }
        
        setProgress(75);
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
      setImportedItems(data.items);
      toast({
        title: 'Success!',
        description: `Successfully imported ${data.items.length} items from Shopify CSV.`,
      });
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
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel className="text-gold">Shopify CSV File</FormLabel>
                    <FormControl>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            onChange(e.target.files);
                          }}
                          className="cursor-pointer bg-black/40 border-gold/50 file:text-gold file:bg-gold/10 file:border-gold/30"
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
                className="bg-gradient-to-r from-gold to-gold-dark text-black hover:bg-gold-dark hover:from-gold hover:to-gold"
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
          <AlertTitle>Import Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isLoading || importMutation.isPending) && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gold/70">
            <span>Importing Shopify inventory...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-black/50" indicatorClassName="bg-gold" />
        </div>
      )}

      {importedItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gold">Successfully Imported Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {importedItems.slice(0, 9).map((item, index) => (
              <Card key={index} className="bg-black/30 border-gold/20 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-white truncate">{item.name}</h4>
                    <Badge className="bg-gold text-black">{item.category}</Badge>
                  </div>
                  <div className="text-sm space-y-1 text-gray-300">
                    <div className="flex justify-between">
                      <span>SKU:</span>
                      <span className="font-mono text-gold">{item.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span>${item.price?.toFixed(2)}</span>
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
          
          {importedItems.length > 9 && (
            <div className="text-center text-gold/70">
              + {importedItems.length - 9} more items imported successfully
            </div>
          )}
        </div>
      )}
    </div>
  );
}