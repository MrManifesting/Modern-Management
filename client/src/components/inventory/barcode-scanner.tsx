import { useState, useRef, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Barcode, ScanLine, Plus, Minus, Check } from "lucide-react";

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
  const [sku, setSku] = useState("");
  const [action, setAction] = useState("check");
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: { sku: string; action: string; quantity: number }) => {
      const response = await apiRequest("/api/scan", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      setScanResult(data);
      toast({
        title: "Scan successful",
        description: `${data.action === 'check' ? 'Checked' : data.action === 'add' ? 'Added' : 'Removed'} ${data.action !== 'check' ? quantity : ''} ${data.name}`,
      });
      setSku("");
      setQuantity(1);
      
      // Focus back on input field for continuous scanning
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    onError: (error) => {
      toast({
        title: "Scan failed",
        description: error.message || "Item not found or server error",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!sku) return;
    
    mutate({ sku, action, quantity });
  };
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU or Barcode</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="sku"
                  placeholder="Enter SKU or scan barcode"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="flex-1"
                  autoFocus
                  disabled={isPending}
                />
                <Button
                  type="submit"
                  disabled={!sku || isPending}
                  className="flex-shrink-0"
                >
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Action</Label>
              <RadioGroup 
                value={action} 
                onValueChange={setAction}
                className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
                disabled={isPending}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="check" id="check" />
                  <Label htmlFor="check" className="flex items-center">
                    <Check className="mr-1 h-4 w-4 text-green-500" />
                    Check
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="flex items-center">
                    <Plus className="mr-1 h-4 w-4 text-blue-500" />
                    Add Stock
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remove" id="remove" />
                  <Label htmlFor="remove" className="flex items-center">
                    <Minus className="mr-1 h-4 w-4 text-red-500" />
                    Remove Stock
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {(action === "add" || action === "remove") && (
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  disabled={isPending}
                />
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Item Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : scanResult ? (
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">{scanResult.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">SKU</p>
                  <p className="font-medium">{scanResult.sku}</p>
                </div>
                <div>
                  <p className="text-gray-500">Price</p>
                  <p className="font-medium">${scanResult.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Current Quantity</p>
                  <p className="font-medium">{scanResult.quantity}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium">
                    {scanResult.quantity > 0 ? "In Stock" : "Out of Stock"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-dashed border-gray-300 p-3">
                <p className="text-sm text-gray-500">
                  Last Action: <span className="font-medium text-gray-700">
                    {scanResult.action === "check" 
                      ? "Inventory Check" 
                      : scanResult.action === "add" 
                        ? `Added ${quantity} units` 
                        : `Removed ${quantity} units`}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <ScanLine className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Scan an item to see details</p>
              <p className="text-xs">Enter SKU or use barcode scanner</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-gray-500">
            Scan history is recorded and synchronized with inventory
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}