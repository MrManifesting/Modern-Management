import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, CheckCircle, XCircle, AlertTriangle, FileText, Upload, Download, AlertCircle, Database } from 'lucide-react';

// Types for validation results
interface ValidationError {
  row: number;
  message: string;
  field?: string;
}

interface ValidationStats {
  totalRows: number;
  validRows: number;
  columnsDetected: number;
  requiredColumnsFound: string[];
  requiredColumnsMissing: string[];
}

interface ValidationResult {
  isValid: boolean;
  headers: string[];
  sampleData: any[];
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: ValidationStats;
}

interface CSVValidationResponse {
  success: boolean;
  validation: ValidationResult;
  fileName: string;
  fileSize: number;
  message?: string;
}

export default function CSVValidatorPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<CSVValidationResponse | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [importInProgress, setImportInProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setValidationResult(null);
    }
  };

  // Validate the selected CSV file
  const validateCSVFile = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to validate",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/items/validate-csv', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setValidationResult(data);
        
        if (data.validation.isValid) {
          toast({
            title: "Validation successful",
            description: `CSV file "${data.fileName}" is valid and ready for import`,
            variant: "default"
          });
        } else {
          toast({
            title: "Validation issues found",
            description: `${data.validation.errors.length} errors and ${data.validation.warnings.length} warnings detected`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Validation failed",
          description: data.message || "An error occurred while validating the CSV file",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate CSV file. Please try again.",
        variant: "destructive"
      });
      console.error("CSV validation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Import the validated CSV file
  const importCSVFile = async () => {
    if (!file || !validationResult) {
      toast({
        title: "No valid file",
        description: "Please validate a CSV file before importing",
        variant: "destructive"
      });
      return;
    }

    setImportInProgress(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/items/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Import successful",
          description: data.message || `Successfully imported ${data.imported} items`,
          variant: "default"
        });
        
        // Reset state after successful import
        setFile(null);
        setValidationResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast({
          title: "Import failed",
          description: data.message || "An error occurred while importing the CSV file",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import CSV file. Please try again.",
        variant: "destructive"
      });
      console.error("CSV import error:", error);
    } finally {
      setImportInProgress(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get row validation status icon
  const getRowStatusIcon = (row: any, index: number): JSX.Element => {
    const hasError = validationResult?.validation.errors.some(e => e.row === index + 1);
    const hasWarning = validationResult?.validation.warnings.some(e => e.row === index + 1);
    
    if (hasError) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    } else if (hasWarning) {
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-success" />;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Helmet>
        <title>CSV Validator | Inventory Pro</title>
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">CSV Validator</h1>
          <p className="text-muted-foreground">
            Validate and preview CSV files before importing them into your inventory
          </p>
        </div>
        <Button onClick={() => window.history.back()} variant="outline">
          Back
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file to validate before importing it to your inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input 
                  id="csv-file" 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={validateCSVFile} 
                  disabled={!file || isLoading}
                  className="w-full"
                >
                  {isLoading ? "Validating..." : "Validate CSV"}
                </Button>
              </div>
            </div>
            
            {file && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>
                  {file.name} ({formatFileSize(file.size)})
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {validationResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Validation Results</CardTitle>
                <Badge variant={validationResult.validation.isValid ? "outline" : "destructive"} className={validationResult.validation.isValid ? "border-green-500 text-green-500" : ""}>
                  {validationResult.validation.isValid ? "Valid" : "Issues Found"}
                </Badge>
              </div>
              <CardDescription>
                File: {validationResult.fileName} ({formatFileSize(validationResult.fileSize)})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="data">Data Preview</TabsTrigger>
                  <TabsTrigger value="issues">
                    Issues
                    {(validationResult.validation.errors.length > 0 || validationResult.validation.warnings.length > 0) && (
                      <Badge variant="outline" className="ml-2">
                        {validationResult.validation.errors.length + validationResult.validation.warnings.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-medium">Data Quality</div>
                        <Progress 
                          value={(validationResult.validation.stats.validRows / validationResult.validation.stats.totalRows) * 100} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {validationResult.validation.stats.validRows} of {validationResult.validation.stats.totalRows} rows are valid ({Math.round((validationResult.validation.stats.validRows / validationResult.validation.stats.totalRows) * 100)}%)
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-medium">Required Fields</div>
                        <Progress 
                          value={(validationResult.validation.stats.requiredColumnsFound.length / (validationResult.validation.stats.requiredColumnsFound.length + validationResult.validation.stats.requiredColumnsMissing.length)) * 100} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {validationResult.validation.stats.requiredColumnsFound.length} of {validationResult.validation.stats.requiredColumnsFound.length + validationResult.validation.stats.requiredColumnsMissing.length} required fields found
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <Card>
                        <CardHeader className="p-4">
                          <CardTitle className="text-base flex items-center">
                            <Database className="h-4 w-4 mr-2" />
                            Columns Detected
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="text-2xl font-bold">
                            {validationResult.validation.stats.columnsDetected}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="p-4">
                          <CardTitle className="text-base flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Issues Found
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="text-2xl font-bold">
                            {validationResult.validation.errors.length + validationResult.validation.warnings.length}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                            <span className="flex items-center">
                              <div className="h-2 w-2 rounded-full bg-destructive mr-1"></div>
                              {validationResult.validation.errors.length} errors
                            </span>
                            <span className="flex items-center">
                              <div className="h-2 w-2 rounded-full bg-warning mr-1"></div>
                              {validationResult.validation.warnings.length} warnings
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="p-4">
                          <CardTitle className="text-base flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Valid Rows
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="text-2xl font-bold">
                            {validationResult.validation.stats.validRows}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            of {validationResult.validation.stats.totalRows} total rows
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Detected Columns</h3>
                      <div className="flex flex-wrap gap-2">
                        {validationResult.validation.headers.map((header, index) => (
                          <Badge key={index} variant="outline">
                            {header}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {validationResult.validation.stats.requiredColumnsMissing.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2 text-warning">Missing Required Columns</h3>
                        <div className="flex flex-wrap gap-2">
                          {validationResult.validation.stats.requiredColumnsMissing.map((column, index) => (
                            <TooltipProvider key={index}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="border-warning text-warning">
                                    {column}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This required column was not found in your CSV.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="data">
                  {validationResult.validation.sampleData.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Data Preview (First {validationResult.validation.sampleData.length} Rows)</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              <TableHead className="w-10">Status</TableHead>
                              {validationResult.validation.headers.map((header, index) => (
                                <TableHead key={index}>{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResult.validation.sampleData.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                <TableCell>{rowIndex + 1}</TableCell>
                                <TableCell>{getRowStatusIcon(row, rowIndex)}</TableCell>
                                {validationResult.validation.headers.map((header, colIndex) => (
                                  <TableCell key={colIndex}>
                                    {row[header] || ''}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No data preview available</AlertTitle>
                      <AlertDescription>
                        No valid data rows were found in the CSV file.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                
                <TabsContent value="issues">
                  <div className="grid gap-4">
                    {validationResult.validation.errors.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2 text-destructive flex items-center">
                          <XCircle className="h-5 w-5 mr-2" />
                          Errors ({validationResult.validation.errors.length})
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Row</TableHead>
                              <TableHead className="w-32">Field</TableHead>
                              <TableHead>Issue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResult.validation.errors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row}</TableCell>
                                <TableCell>{error.field || 'N/A'}</TableCell>
                                <TableCell>{error.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {validationResult.validation.warnings.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2 text-warning flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          Warnings ({validationResult.validation.warnings.length})
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Row</TableHead>
                              <TableHead className="w-32">Field</TableHead>
                              <TableHead>Issue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResult.validation.warnings.map((warning, index) => (
                              <TableRow key={index}>
                                <TableCell>{warning.row}</TableCell>
                                <TableCell>{warning.field || 'N/A'}</TableCell>
                                <TableCell>{warning.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {validationResult.validation.errors.length === 0 && validationResult.validation.warnings.length === 0 && (
                      <Alert className="bg-green-500/20 border-green-500 text-green-500">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>No issues found</AlertTitle>
                        <AlertDescription>
                          Your CSV file passed all validation checks and is ready for import.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setFile(null);
                setValidationResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}>
                Reset
              </Button>
              <Button 
                onClick={importCSVFile} 
                disabled={!validationResult.validation.isValid || importInProgress || validationResult.validation.stats.validRows === 0}
              >
                {importInProgress ? "Importing..." : "Import CSV"}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {!validationResult && !file && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center text-center p-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Upload a CSV file to get started</h3>
              <p className="text-muted-foreground mb-4">
                Validate your CSV files before importing them to ensure data quality
              </p>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                Select CSV File
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}