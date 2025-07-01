import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SKURegenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function SKURegenerationDialog({ 
  open, 
  onOpenChange, 
  onComplete 
}: SKURegenerationDialogProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    
    try {
      const response = await apiRequest("/api/sku/regenerate-all", {
        method: "POST",
      });

      if (response.success) {
        toast({
          title: "SKU Regeneration Complete",
          description: `Successfully updated ${response.updated} items with new standardized SKUs`,
        });
        
        onComplete?.();
        onOpenChange(false);
      } else {
        throw new Error(response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error regenerating SKUs:", error);
      toast({
        title: "SKU Regeneration Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Regenerate All SKUs
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <strong>Important:</strong> This will clear all existing SKUs and regenerate them using the new standardized format.
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <p><strong>New SKU Format:</strong></p>
              <p className="font-mono bg-gray-100 p-2 rounded text-xs">
                [3-LETTER-STRAIN]-[TIER]-[POTENCY%]-[SEQUENCE]
              </p>
              <p><strong>Examples:</strong></p>
              <ul className="font-mono text-xs space-y-1 bg-gray-50 p-2 rounded">
                <li>• BD-TS-3400-1 (Blue Dream, Top Shelf, 34%, #1)</li>
                <li>• BD-TS-3400-2 (Blue Dream, Top Shelf, 34%, #2)</li>
                <li>• BD-TS-3400-3 (Blue Dream, Top Shelf, 34%, #3)</li>
              </ul>
              
              <div className="mt-3 space-y-1">
                <p><strong>Tier Abbreviations:</strong></p>
                <div className="text-xs grid grid-cols-2 gap-1 font-mono bg-gray-50 p-2 rounded">
                  <span>Top Shelf → TS</span>
                  <span>Mid Shelf → MS</span>
                  <span>Premium → PR</span>
                  <span>Regular → RG</span>
                  <span>Bottom Shelf → BS</span>
                  <span>Budget → BU</span>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate All SKUs
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}