import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Package } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}

export function CSVImportPanel() {
  const [importing, setImporting] = useState<string | null>(null);
  const [results, setResults] = useState<{[key: string]: ImportResult}>({});
  const { toast } = useToast();

  const importVariants = async (type: 'flower' | 'thca' | 'preroll') => {
    setImporting(type);
    try {
      const endpoint = `/api/csv-sync/import-${type}-variants`;
      const result = await apiRequest(endpoint, {
        method: 'POST'
      });

      setResults(prev => ({ ...prev, [type]: result }));
      
      toast({
        title: "Import Complete",
        description: `Imported ${result.imported} ${type} variants, skipped ${result.skipped} existing items`,
      });

    } catch (error) {
      toast({
        title: "Import Failed",
        description: error.message || `Failed to import ${type} variants`,
        variant: "destructive"
      });
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">CSV Import Manager</h2>
        <p className="text-muted-foreground">
          Import product variants from your Shopify catalog exports to expand inventory coverage
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Flower Variants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              All Flower Variants
            </CardTitle>
            <CardDescription>
              Import all flower product variants with quality tiers and weights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => importVariants('flower')}
              disabled={importing === 'flower'}
              className="w-full"
            >
              {importing === 'flower' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Flower Variants
                </>
              )}
            </Button>
            
            {results.flower && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Imported:</span>
                  <Badge variant="default">{results.flower.imported}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Skipped:</span>
                  <Badge variant="secondary">{results.flower.skipped}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <Badge variant="outline">{results.flower.total}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* THCa Variants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              THCa Variants
            </CardTitle>
            <CardDescription>
              Import THCa-specific product variants and formulations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => importVariants('thca')}
              disabled={importing === 'thca'}
              className="w-full"
            >
              {importing === 'thca' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import THCa Variants
                </>
              )}
            </Button>
            
            {results.thca && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Imported:</span>
                  <Badge variant="default">{results.thca.imported}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Skipped:</span>
                  <Badge variant="secondary">{results.thca.skipped}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <Badge variant="outline">{results.thca.total}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preroll Variants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Preroll Variants
            </CardTitle>
            <CardDescription>
              Import preroll product variants with different counts and packaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => importVariants('preroll')}
              disabled={importing === 'preroll'}
              className="w-full"
            >
              {importing === 'preroll' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Preroll Variants
                </>
              )}
            </Button>
            
            {results.preroll && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Imported:</span>
                  <Badge variant="default">{results.preroll.imported}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Skipped:</span>
                  <Badge variant="secondary">{results.preroll.skipped}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <Badge variant="outline">{results.preroll.total}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Combined Results Summary */}
      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
            <CardDescription>
              Overview of all import operations completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(results).reduce((sum, r) => sum + r.imported, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Imported</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(results).reduce((sum, r) => sum + r.skipped, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {Object.values(results).reduce((sum, r) => sum + r.total, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Processed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}