import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Check,
  Clock,
  AlertTriangle,
  ListChecks,
  ShieldX,
  ShieldOff,
  ShieldQuestion
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiRequestSimple } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Safety mode options
enum ShopifySafetyMode {
  NORMAL = 'normal',
  STRICT = 'strict',
  READONLY = 'readonly',
  DISABLED = 'disabled',
}

// Types for safety status and logs
interface SafetyStatus {
  mode: ShopifySafetyMode;
  confirmationRequired: boolean;
  message: string;
}

interface SafetyOperation {
  timestamp: string;
  operation: string;
  details: Record<string, any>;
  successful: boolean;
  safetyMode: string;
  pushEnabled: boolean;
}

interface OperationsReport {
  operations: SafetyOperation[];
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
}

export default function ShopifySafetyPanel() {
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>({
    mode: ShopifySafetyMode.NORMAL,
    confirmationRequired: true,
    message: ""
  });
  
  const [operationsReport, setOperationsReport] = useState<OperationsReport>({
    operations: [],
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<{
    confirmed: boolean;
    expiresAt?: string;
    message?: string;
  }>({ confirmed: false });
  
  const { toast } = useToast();
  
  // Fetch initial status
  useEffect(() => {
    fetchSafetyStatus();
    fetchOperationsReport();
  }, []);
  
  const fetchSafetyStatus = async () => {
    setLoading(true);
    try {
      const result = await apiRequestSimple<SafetyStatus>('/api/shopify/safety');
      setSafetyStatus(result);
    } catch (error) {
      console.error("Failed to fetch Shopify safety status:", error);
      toast({
        title: "Error",
        description: "Failed to fetch Shopify safety status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchOperationsReport = async () => {
    try {
      const result = await apiRequestSimple<OperationsReport>('/api/shopify/safety/operations-report');
      setOperationsReport(result);
    } catch (error) {
      console.error("Failed to fetch Shopify operations report:", error);
      toast({
        title: "Error",
        description: "Failed to fetch Shopify operations report.",
        variant: "destructive",
      });
    }
  };
  
  const setSafetyMode = async (mode: ShopifySafetyMode) => {
    setUpdating(true);
    try {
      const result = await apiRequestSimple<SafetyStatus>('/api/shopify/safety/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode })
      });
      
      setSafetyStatus(result);
      
      toast({
        title: "Safety Mode Updated",
        description: `Shopify safety mode set to: ${result.mode}`,
      });
      
      // Refresh operations report after mode change
      fetchOperationsReport();
    } catch (error) {
      console.error("Failed to set safety mode:", error);
      toast({
        title: "Error",
        description: "Failed to update safety mode.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const toggleConfirmationRequired = async () => {
    setUpdating(true);
    try {
      const result = await apiRequestSimple<SafetyStatus>('/api/shopify/safety/confirmation-required', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ required: !safetyStatus.confirmationRequired })
      });
      
      setSafetyStatus(result);
      
      toast({
        title: "Confirmation Setting Updated",
        description: result.confirmationRequired 
          ? "Operations now require confirmation before execution" 
          : "Operations no longer require confirmation",
      });
    } catch (error) {
      console.error("Failed to toggle confirmation required:", error);
      toast({
        title: "Error",
        description: "Failed to update confirmation settings.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const confirmOperations = async () => {
    setUpdating(true);
    try {
      const result = await apiRequestSimple<{
        confirmed: boolean;
        expiresAt: string;
        message: string;
      }>('/api/shopify/safety/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setConfirmationStatus(result);
      
      toast({
        title: "Operations Confirmed",
        description: result.message,
      });
      
      // Refresh operations report after confirmation
      fetchOperationsReport();
    } catch (error) {
      console.error("Failed to confirm operations:", error);
      toast({
        title: "Error",
        description: "Failed to confirm operations.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const clearConfirmation = async () => {
    setUpdating(true);
    try {
      const result = await apiRequestSimple<{
        confirmed: boolean;
        message: string;
      }>('/api/shopify/safety/clear-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setConfirmationStatus({ confirmed: false });
      
      toast({
        title: "Confirmation Cleared",
        description: result.message,
      });
      
      // Refresh operations report after clearing confirmation
      fetchOperationsReport();
    } catch (error) {
      console.error("Failed to clear confirmation:", error);
      toast({
        title: "Error",
        description: "Failed to clear confirmation.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };
  
  // Helper function to get the appropriate icon for the current safety mode
  const getSafetyModeIcon = () => {
    switch (safetyStatus.mode) {
      case ShopifySafetyMode.NORMAL:
        return <Shield className="h-6 w-6 text-blue-500" />;
      case ShopifySafetyMode.STRICT:
        return <ShieldAlert className="h-6 w-6 text-amber-500" />;
      case ShopifySafetyMode.READONLY:
        return <ShieldCheck className="h-6 w-6 text-green-500" />;
      case ShopifySafetyMode.DISABLED:
        return <ShieldX className="h-6 w-6 text-red-500" />;
      default:
        return <ShieldQuestion className="h-6 w-6 text-gray-500" />;
    }
  };
  
  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Get color for safety mode badge
  const getSafetyModeColor = (mode: string) => {
    switch (mode) {
      case ShopifySafetyMode.NORMAL:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case ShopifySafetyMode.STRICT:
        return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case ShopifySafetyMode.READONLY:
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case ShopifySafetyMode.DISABLED:
        return "bg-red-500/20 text-red-500 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
    }
  };
  
  return (
    <Card className="border-gold/30 bg-black text-white">
      <CardHeader className="border-b border-gold/20 bg-gradient-to-r from-black to-black/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSafetyModeIcon()}
            <CardTitle className="text-gold">Shopify Safety Controls</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gold/40 text-gold hover:bg-gold/10"
            onClick={() => {
              fetchSafetyStatus();
              fetchOperationsReport();
            }}
            disabled={loading}
          >
            <Clock className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
        <CardDescription className="text-gray-400">
          Control safety features and permissions for Shopify integration
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Current Safety Mode */}
        <div className="flex flex-col space-y-2">
          <h3 className="text-lg font-medium text-gold">Current Safety Status</h3>
          <div className="flex items-center justify-between p-4 rounded border border-gold/20 bg-black/50">
            <div className="flex items-center gap-3">
              {getSafetyModeIcon()}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">
                    Safety Mode: {safetyStatus.mode}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs rounded border ${getSafetyModeColor(safetyStatus.mode)}`}>
                    {safetyStatus.mode.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {safetyStatus.confirmationRequired 
                    ? "Operations require explicit confirmation before execution" 
                    : "Operations do not require confirmation"}
                </p>
              </div>
            </div>
            
            {confirmationStatus.confirmed && confirmationStatus.expiresAt && (
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-green-400" />
                <div className="text-sm">
                  <p className="text-green-400 font-medium">Operations Confirmed</p>
                  <p className="text-xs text-gray-400">Expires: {new Date(confirmationStatus.expiresAt).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Safety Mode Selection */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-medium text-gold">Set Safety Mode</h3>
            <p className="text-sm text-gray-400">
              Control how Shopify operations are handled and permissions required
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`p-4 rounded border hover:bg-black/70 cursor-pointer flex flex-col items-center transition-all duration-200 ${safetyStatus.mode === ShopifySafetyMode.NORMAL ? 'border-blue-500 bg-blue-900/20' : 'border-gold/20 bg-black/50'}`}
              onClick={() => setSafetyMode(ShopifySafetyMode.NORMAL)}
            >
              <Shield className="h-8 w-8 text-blue-500 mb-2" />
              <h4 className="font-medium text-white">Normal Mode</h4>
              <p className="text-xs text-center text-gray-400 mt-1">
                Regular operation with push enabled/disabled check
              </p>
            </div>
            
            <div 
              className={`p-4 rounded border hover:bg-black/70 cursor-pointer flex flex-col items-center transition-all duration-200 ${safetyStatus.mode === ShopifySafetyMode.STRICT ? 'border-amber-500 bg-amber-900/20' : 'border-gold/20 bg-black/50'}`}
              onClick={() => setSafetyMode(ShopifySafetyMode.STRICT)}
            >
              <ShieldAlert className="h-8 w-8 text-amber-500 mb-2" />
              <h4 className="font-medium text-white">Strict Mode</h4>
              <p className="text-xs text-center text-gray-400 mt-1">
                Requires confirmation for each operation
              </p>
            </div>
            
            <div 
              className={`p-4 rounded border hover:bg-black/70 cursor-pointer flex flex-col items-center transition-all duration-200 ${safetyStatus.mode === ShopifySafetyMode.READONLY ? 'border-green-500 bg-green-900/20' : 'border-gold/20 bg-black/50'}`}
              onClick={() => setSafetyMode(ShopifySafetyMode.READONLY)}
            >
              <ShieldCheck className="h-8 w-8 text-green-500 mb-2" />
              <h4 className="font-medium text-white">Read-Only Mode</h4>
              <p className="text-xs text-center text-gray-400 mt-1">
                Only allows read operations, no modifications
              </p>
            </div>
            
            <div 
              className={`p-4 rounded border hover:bg-black/70 cursor-pointer flex flex-col items-center transition-all duration-200 ${safetyStatus.mode === ShopifySafetyMode.DISABLED ? 'border-red-500 bg-red-900/20' : 'border-gold/20 bg-black/50'}`}
              onClick={() => setSafetyMode(ShopifySafetyMode.DISABLED)}
            >
              <ShieldX className="h-8 w-8 text-red-500 mb-2" />
              <h4 className="font-medium text-white">Disabled Mode</h4>
              <p className="text-xs text-center text-gray-400 mt-1">
                Completely blocks all Shopify API calls
              </p>
            </div>
          </div>
        </div>
        
        {/* Confirmation Controls */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-medium text-gold">Confirmation Settings</h3>
            <p className="text-sm text-gray-400">
              Control whether operations require explicit confirmation before execution
            </p>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded border border-gold/20 bg-black/50">
            <div className="flex items-center space-x-2">
              <Switch 
                id="confirmation-required" 
                checked={safetyStatus.confirmationRequired}
                onCheckedChange={toggleConfirmationRequired}
                disabled={updating}
                className={safetyStatus.confirmationRequired ? "bg-amber-600" : ""}
              />
              <Label htmlFor="confirmation-required" className="text-white cursor-pointer">
                {safetyStatus.confirmationRequired ? 'Confirmation Required' : 'No Confirmation Required'}
              </Label>
            </div>
            
            <div className="flex items-center">
              {safetyStatus.confirmationRequired ? (
                <span className="px-2 py-1 text-xs rounded bg-amber-600/20 text-amber-500 border border-amber-500/30">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Confirmations Required
                </span>
              ) : (
                <span className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-500 border border-blue-500/30">
                  <Check className="h-3 w-3 inline mr-1" />
                  Auto-Approved
                </span>
              )}
            </div>
          </div>
          
          {/* Confirmation Actions */}
          <div className="flex items-center justify-between p-4 rounded border border-gold/20 bg-black/50">
            <div>
              <h4 className="font-medium text-white">Operation Confirmation</h4>
              <p className="text-sm text-gray-400 mt-1">
                {confirmationStatus.confirmed 
                  ? "Operations are currently confirmed and can be executed" 
                  : "Operations are waiting for confirmation"}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                className="bg-green-700 hover:bg-green-600 text-white"
                disabled={updating || confirmationStatus.confirmed}
                onClick={confirmOperations}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm Operations
              </Button>
              
              <Button 
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-900/20"
                disabled={updating || !confirmationStatus.confirmed}
                onClick={clearConfirmation}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Clear Confirmation
              </Button>
            </div>
          </div>
        </div>
        
        {/* Operations Log */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-medium text-gold">Operations Log</h3>
            <p className="text-sm text-gray-400">
              Review recent Shopify operations and their status
            </p>
          </div>
          
          <div className="rounded border border-gold/20 bg-black/50 overflow-hidden">
            <div className="p-4 bg-black/70 border-b border-gold/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-gold" />
                <h4 className="font-medium text-white">Recent Operations</h4>
              </div>
              
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-500/30">
                  Success: {operationsReport.successfulOperations}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 border border-red-500/30">
                  Failed: {operationsReport.failedOperations}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-gray-900/20 text-gray-400 border border-gray-500/30">
                  Total: {operationsReport.totalOperations}
                </span>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gold/5 border-b border-gold/10">
                    <TableHead className="text-gold">Operation</TableHead>
                    <TableHead className="text-gold">Time</TableHead>
                    <TableHead className="text-gold">Status</TableHead>
                    <TableHead className="text-gold">Mode</TableHead>
                    <TableHead className="text-gold">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationsReport.operations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                        No operations recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    operationsReport.operations.map((op, index) => (
                      <TableRow key={index} className="hover:bg-gold/5 border-b border-gold/10">
                        <TableCell className="font-medium">{op.operation}</TableCell>
                        <TableCell className="text-sm text-gray-400">{formatTimestamp(op.timestamp)}</TableCell>
                        <TableCell>
                          {op.successful ? (
                            <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-500/30">
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-500/30">
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getSafetyModeColor(op.safetyMode)}`}>
                            {op.safetyMode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-400 max-w-[200px] truncate">
                          {JSON.stringify(op.details)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-gold/20 pt-4 flex justify-between">
        <Button 
          variant="outline" 
          className="border-gold/40 text-gold hover:bg-gold/10"
          onClick={() => {
            fetchSafetyStatus();
            fetchOperationsReport();
          }}
        >
          <Clock className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
        
        <Button 
          className="gold-btn bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-gold/80"
          onClick={() => {
            // Reset to safest defaults
            setSafetyMode(ShopifySafetyMode.READONLY);
            // Force confirmation to be required
            if (!safetyStatus.confirmationRequired) {
              toggleConfirmationRequired();
            }
            // Clear any existing confirmation
            if (confirmationStatus.confirmed) {
              clearConfirmation();
            }
            
            toast({
              title: "Safety Reset",
              description: "Reset to maximum safety: Read-only mode with required confirmation.",
            });
          }}
        >
          Reset to Safe Defaults
        </Button>
      </CardFooter>
    </Card>
  );
}