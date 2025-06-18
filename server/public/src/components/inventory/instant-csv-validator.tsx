import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, XCircle, AlertTriangle, FileText, Upload, Info, UploadCloud } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

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

interface InstantCSVValidatorProps {
  onValidationComplete?: (validationResult: CSVValidationResponse) => void;
  onImport?: (file: File) => void;
  showImportButton?: boolean;
  compact?: boolean;
  syncToShopify?: boolean;
  onSyncToShopifyChange?: (checked: boolean) => void;
}

export function InstantCSVValidator({
  onValidationComplete,
  onImport,
  showImportButton = true,
  compact = false,
  syncToShopify = false,
  onSyncToShopifyChange
}: InstantCSVValidatorProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<CSVValidationResponse | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLineValidation, setShowLineValidation] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  
  // Handle file drop events
  useEffect(() => {
    const dropArea = dropAreaRef.current;
    if (!dropArea) return;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add('border-primary');
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('border-primary');
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('border-primary');
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.name.endsWith('.csv')) {
          setFile(droppedFile);
          validateFile(droppedFile);
        } else {
          toast({
            title: "Invalid file type",
            description: "Please select a CSV file",
            variant: "destructive"
          });
        }
      }
    };
    
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    
    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, [toast]);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      validateFile(selectedFile);
    }
  };
  
  // Validate the selected CSV file
  const validateFile = async (fileToValidate: File) => {
    setIsValidating(true);
    setActiveTab('overview');
    
    const formData = new FormData();
    formData.append('file', fileToValidate);
    
    try {
      const response = await fetch('/api/items/validate-csv', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setValidationResult(data);
        
        if (onValidationComplete) {
          onValidationComplete(data);
        }
        
        if (data.validation.errors.length > 0 || data.validation.warnings.length > 0) {
          toast({
            title: "Validation issues found",
            description: `${data.validation.errors.length} errors and ${data.validation.warnings.length} warnings detected`,
            variant: "destructive"
          });
          
          // Switch to issues tab if there are errors
          if (data.validation.errors.length > 0) {
            setActiveTab('issues');
          }
        } else {
          toast({
            title: "Validation successful",
            description: `CSV file "${data.fileName}" is valid and ready for import`,
            variant: "default"
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
      setIsValidating(false);
    }
  };
  
  // Import the validated CSV file
  const handleImport = async () => {
    if (!file || !validationResult) {
      toast({
        title: "No valid file",
        description: "Please validate a CSV file before importing",
        variant: "destructive"
      });
      return;
    }
    
    if (onImport) {
      onImport(file);
      return;
    }
    
    setIsImporting(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('syncWithShopify', syncToShopify ? 'true' : 'false');
    
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
      setIsImporting(false);
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
  const getRowStatusIcon = (rowIndex: number): JSX.Element => {
    if (!validationResult) return <CheckCircle className="h-5 w-5 text-gray-300" />;
    
    const hasError = validationResult.validation.errors.some(e => e.row === rowIndex + 1);
    const hasWarning = validationResult.validation.warnings.some(e => e.row === rowIndex + 1);
    
    if (hasError) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    } else if (hasWarning) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };
  
  // Get error or warning for a specific cell
  const getCellIssue = (rowIndex: number, field: string): { type: 'error' | 'warning' | null; message: string } => {
    if (!validationResult) return { type: null, message: '' };
    
    // Check if there's an error for this cell
    const error = validationResult.validation.errors.find(e => 
      e.row === rowIndex + 1 && e.field === field
    );
    
    if (error) {
      return { type: 'error', message: error.message };
    }
    
    // Check if there's a warning for this cell
    const warning = validationResult.validation.warnings.find(w => 
      w.row === rowIndex + 1 && w.field === field
    );
    
    if (warning) {
      return { type: 'warning', message: warning.message };
    }
    
    return { type: null, message: '' };
  };
  
  // Render cell with validation state
  const renderCell = (rowIndex: number, header: string, value: string) => {
    if (!showLineValidation) {
      return value || '';
    }
    
    const issue = getCellIssue(rowIndex, header);
    
    if (issue.type === null) {
      return value || '';
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`px-1 py-0.5 rounded ${issue.type === 'error' ? 'bg-red-100 border border-red-300 text-red-900' : 'bg-yellow-100 border border-yellow-300 text-yellow-900'}`}>
              {value || ''}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="flex items-start gap-2">
              {issue.type === 'error' ? (
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              )}
              <span>{issue.message}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  return (
    <div>
      {!file && (
        <div 
          ref={dropAreaRef}
          className="border-2 border-dashed rounded-lg p-6 transition-colors hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
              {isValidating ? "Validating CSV..." : "Upload a CSV file"}
            </h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop a CSV file here, or click to select a file
            </p>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <div className="mt-2 text-xs text-muted-foreground">
              (.csv files only, 10MB max)
            </div>
          </div>
        </div>
      )}
      
      {file && validationResult && (
        <Card className={compact ? "border-0 shadow-none p-0" : ""}>
          <CardHeader className={compact ? "px-0 py-2" : ""}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {validationResult.fileName}
                <Badge 
                  variant={validationResult.validation.isValid ? "outline" : "destructive"} 
                  className={`ml-3 ${validationResult.validation.isValid ? "border-green-500 text-green-500" : ""}`}
                >
                  {validationResult.validation.isValid ? "Valid" : `${validationResult.validation.errors.length} Issues`}
                </Badge>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFile(null);
                  setValidationResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Change File
              </Button>
            </div>
            <CardDescription>
              {formatFileSize(validationResult.fileSize)} • {validationResult.validation.stats.validRows} of {validationResult.validation.stats.totalRows} rows valid
            </CardDescription>
          </CardHeader>
          <CardContent className={compact ? "px-0 py-2" : ""}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="data">
                  Data Preview
                  <Badge variant="outline" className="ml-2">
                    {validationResult.validation.sampleData.length}
                  </Badge>
                </TabsTrigger>
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
                  {/* Quick stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Valid Rows</div>
                          <div className="text-2xl font-bold">
                            {validationResult.validation.stats.validRows}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              / {validationResult.validation.stats.totalRows}
                            </span>
                          </div>
                        </div>
                        <div className={`p-3 rounded-full ${validationResult.validation.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {validationResult.validation.isValid ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Issues Found</div>
                          <div className="text-2xl font-bold">
                            {validationResult.validation.errors.length}
                            <span className="text-sm font-normal text-destructive ml-1">
                              Errors
                            </span>
                            <span className="text-sm font-normal text-muted-foreground mx-1">
                              +
                            </span>
                            {validationResult.validation.warnings.length}
                            <span className="text-sm font-normal text-yellow-500 ml-1">
                              Warnings
                            </span>
                          </div>
                        </div>
                        {validationResult.validation.errors.length > 0 ? (
                          <div className="p-3 rounded-full bg-red-100 text-red-600">
                            <AlertTriangle className="h-6 w-6" />
                          </div>
                        ) : (
                          <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <CheckCircle className="h-6 w-6" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Columns</div>
                          <div className="text-2xl font-bold">
                            {validationResult.validation.stats.columnsDetected}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              detected
                            </span>
                          </div>
                          <div className="text-xs font-normal text-muted-foreground flex gap-2 mt-0.5">
                            <span className="text-green-500">
                              {validationResult.validation.stats.requiredColumnsFound.length} required found
                            </span>
                            {validationResult.validation.stats.requiredColumnsMissing.length > 0 && (
                              <span className="text-yellow-500">
                                {validationResult.validation.stats.requiredColumnsMissing.length} missing
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                          <FileText className="h-6 w-6" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Detected columns */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Detected Columns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {validationResult.validation.headers.map((header, index) => {
                          const isRequired = validationResult.validation.stats.requiredColumnsFound.includes(header);
                          const isMissing = validationResult.validation.stats.requiredColumnsMissing.includes(header);
                          
                          return (
                            <Badge 
                              key={index} 
                              variant="outline"
                              className={isRequired ? "border-green-500 text-green-700" : ""}
                            >
                              {header}
                              {isRequired && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Required field</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="data">
                <div className="mt-2 flex justify-end mb-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-line-validation"
                      checked={showLineValidation}
                      onCheckedChange={setShowLineValidation}
                    />
                    <Label htmlFor="show-line-validation">Show errors inline</Label>
                  </div>
                </div>
                {validationResult.validation.sampleData.length > 0 ? (
                  <div className="overflow-x-auto border rounded-md">
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
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    {getRowStatusIcon(rowIndex)}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {validationResult.validation.errors.some(e => e.row === rowIndex + 1)
                                      ? "Row has errors"
                                      : validationResult.validation.warnings.some(e => e.row === rowIndex + 1)
                                        ? "Row has warnings"
                                        : "Row is valid"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            {validationResult.validation.headers.map((header, colIndex) => (
                              <TableCell key={colIndex}>
                                {renderCell(rowIndex, header, row[header] || '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                  {validationResult.validation.errors.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-medium mb-2 text-destructive flex items-center">
                        <XCircle className="h-5 w-5 mr-2" />
                        Errors ({validationResult.validation.errors.length})
                      </h3>
                      <div className="overflow-x-auto border rounded-md border-red-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-red-50">
                              <TableHead className="w-16">Row</TableHead>
                              <TableHead className="w-32">Field</TableHead>
                              <TableHead>Issue</TableHead>
                              <TableHead className="w-24">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResult.validation.errors.map((error, index) => (
                              <TableRow key={index} className="border-b border-red-100">
                                <TableCell className="font-medium">{error.row}</TableCell>
                                <TableCell>{error.field || 'N/A'}</TableCell>
                                <TableCell>{error.message}</TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setActiveTab('data');
                                      // Could add functionality to scroll to the row
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>No errors found</AlertTitle>
                      <AlertDescription>
                        Your CSV file doesn't have any critical errors.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validationResult.validation.warnings.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-medium mb-2 text-yellow-600 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Warnings ({validationResult.validation.warnings.length})
                      </h3>
                      <div className="overflow-x-auto border rounded-md border-yellow-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-yellow-50">
                              <TableHead className="w-16">Row</TableHead>
                              <TableHead className="w-32">Field</TableHead>
                              <TableHead>Issue</TableHead>
                              <TableHead className="w-24">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResult.validation.warnings.map((warning, index) => (
                              <TableRow key={index} className="border-b border-yellow-100">
                                <TableCell className="font-medium">{warning.row}</TableCell>
                                <TableCell>{warning.field || 'N/A'}</TableCell>
                                <TableCell>{warning.message}</TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setActiveTab('data');
                                      // Could add functionality to scroll to the row
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>No warnings found</AlertTitle>
                      <AlertDescription>
                        Your CSV file doesn't have any warnings.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          {showImportButton && (
            <CardFooter className={`${compact ? "px-0 pt-2 pb-0" : ""} flex justify-between items-center`}>
              <div className="flex items-center space-x-2">
                {onSyncToShopifyChange && (
                  <>
                    <Switch
                      id="sync-shopify"
                      checked={syncToShopify}
                      onCheckedChange={onSyncToShopifyChange}
                    />
                    <Label htmlFor="sync-shopify">Sync with Shopify</Label>
                  </>
                )}
              </div>
              
              <Button 
                onClick={handleImport} 
                disabled={!validationResult.validation.isValid || isImporting || validationResult.validation.stats.validRows === 0}
              >
                {isImporting ? "Importing..." : "Import CSV"}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}