import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ScanLine, Package, PackagePlus, PackageMinus, Loader2 } from "lucide-react";

interface ScanResult {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  action: string;
}

export default function BarcodeScanner() {
  const { toast } = useToast();
  const [skuInput, setSkuInput] = useState("");
  const [scanAction, setScanAction] = useState("check");
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the SKU input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle form submission
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!skuInput) {
      toast({
        title: "SKU Required",
        description: "Please enter a SKU to scan",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setScanResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/scan", {
        sku: skuInput,
        action: scanAction,
        quantity: scanAction !== "check" ? quantity : undefined
      });
      
      const result = await response.json();
      setScanResult(result);
      
      // Show success toast
      toast({
        title: "Scan Successful",
        description: `${scanAction === 'add' ? 'Added' : scanAction === 'remove' ? 'Removed' : 'Checked'} item: ${result.name}`,
      });
      
      // Clear form if successful
      if (scanAction !== "check") {
        setSkuInput("");
        setQuantity(1);
      }
      
      // Focus back on input
      if (inputRef.current) {
        inputRef.current.focus();
        if (scanAction !== "check") {
          inputRef.current.value = "";
        }
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Scan Failed",
        description: "Could not process the scan. Please check the SKU and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get action icon
  const getActionIcon = () => {
    switch (scanAction) {
      case "add":
        return <PackagePlus className="h-10 w-10 text-green-500" />;
      case "remove":
        return <PackageMinus className="h-10 w-10 text-red-500" />;
      default:
        return <Package className="h-10 w-10 text-blue-500" />;
    }
  };
  
  return (
    <div className="mx-auto max-w-md">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center">
            <ScanLine className="h-6 w-6 mr-2" /> Warehouse Scanner
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleScan}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Barcode</Label>
                <Input
                  id="sku"
                  ref={inputRef}
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  placeholder="Scan or enter SKU"
                  className="font-mono"
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Scan Action</Label>
                <RadioGroup
                  defaultValue="check"
                  value={scanAction}
                  onValueChange={setScanAction}
                  className="flex space-x-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="check" id="check" />
                    <Label htmlFor="check" className="cursor-pointer">Check</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="add" id="add" />
                    <Label htmlFor="add" className="cursor-pointer">Add</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="remove" id="remove" />
                    <Label htmlFor="remove" className="cursor-pointer">Remove</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {scanAction !== "check" && (
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    disabled={isLoading}
                  />
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>Scan Item</>
                )}
              </Button>
            </div>
          </form>
          
          {scanResult && (
            <div className="mt-4 p-4 rounded-md bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{scanResult.name}</h3>
                {getActionIcon()}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">SKU:</span> {scanResult.sku}
                </div>
                <div>
                  <span className="text-gray-500">Price:</span> ${scanResult.price.toFixed(2)}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Current Inventory:</span>{" "}
                  <span className="font-medium">{scanResult.quantity} units</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center text-xs text-gray-500">
          Scan items to manage warehouse inventory
        </CardFooter>
      </Card>
    </div>
  );
}