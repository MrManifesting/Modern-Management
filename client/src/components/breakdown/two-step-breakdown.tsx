import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, PlusSquare, Trash2, Package, ArrowRight, Layers, ArrowDownUp, Scissors, Clock } from "lucide-react";

type Product = {
  id: number;
  name: string;
  description: string;
  sku: string;
  quantity: number;
  price: number;
  category: string;
  weight?: string;
  images?: string[];
};

type SetAsideItem = {
  id: number;
  productId: number;
  productName: string;
  strain: string;
  originalQuantity: number;
  setAsideQuantity: number;
  setAsideAt: Date;
  status: 'pending' | 'in-progress' | 'completed';
};

type BreakdownTarget = {
  id: string;
  name: string;
  weight: string;
  targetQuantity: number;
  unitPrice: number;
  totalValue: number;
};

export function TwoStepBreakdown() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Step 1: Set-aside selection state
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [setAsideQuantities, setSetAsideQuantities] = useState<{ [key: number]: number }>({});
  const [setAsideOpen, setSetAsideOpen] = useState(false);
  
  // Step 2: Transfer and breakdown state
  const [selectedSetAside, setSelectedSetAside] = useState<SetAsideItem | null>(null);
  const [selectedStrain, setSelectedStrain] = useState<string>('');
  const [breakdownTargets, setBreakdownTargets] = useState<BreakdownTarget[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);

  // Quick job menu options
  const quickJobOptions = [
    { id: 'grams', name: '1 Gram Units', weight: '1g', defaultPrice: 15 },
    { id: 'eighths', name: 'Eighth Ounces (3.5g)', weight: '1/8 oz', defaultPrice: 35 },
    { id: 'quarters', name: 'Quarter Ounces (7g)', weight: '1/4 oz', defaultPrice: 65 },
    { id: 'half-oz', name: 'Half Ounces (14g)', weight: '1/2 oz', defaultPrice: 120 },
    { id: 'ounces', name: 'Full Ounces (28g)', weight: '1 oz', defaultPrice: 220 },
    { id: 'quarter-lb', name: 'Quarter Pounds (4oz)', weight: '1/4 lb', defaultPrice: 800 },
    { id: 'half-lb', name: 'Half Pounds (8oz)', weight: '1/2 lb', defaultPrice: 1500 }
  ];

  // Get all pound items available for breakdown
  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/items'],
    select: (data: Product[]) => 
      data.filter(item => 
        (item.weight?.includes('pound') || item.weight?.includes('lb')) && 
        item.quantity > 0
      )
  });

  // Get set-aside items
  const { data: setAsideItems, isLoading: isLoadingSetAside } = useQuery({
    queryKey: ['/api/set-aside-items'],
    staleTime: 1000 * 30, // 30 seconds
  });

  // Mutation to set aside products
  const setAsideMutation = useMutation({
    mutationFn: async (data: { products: { id: number; quantity: number }[] }) => {
      return apiRequest('/api/items/set-aside', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Products Set Aside",
        description: "Selected products have been set aside for breakdown.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/set-aside-items'] });
      setSetAsideOpen(false);
      setSelectedProducts([]);
      setSetAsideQuantities({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to set aside products: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  });

  // Mutation to create breakdown products
  const createBreakdownMutation = useMutation({
    mutationFn: async (data: { 
      setAsideId: number; 
      strain: string; 
      targets: BreakdownTarget[] 
    }) => {
      return apiRequest('/api/items/breakdown', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Breakdown Created",
        description: "Breakdown products have been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/set-aside-items'] });
      setTransferOpen(false);
      setSelectedSetAside(null);
      setBreakdownTargets([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create breakdown: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  });

  const handleProductSelect = (product: Product) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
      setSetAsideQuantities(prev => {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setSelectedProducts(prev => [...prev, product]);
      setSetAsideQuantities(prev => ({ ...prev, [product.id]: 1 }));
    }
  };

  const handleSetAsideQuantityChange = (productId: number, quantity: number) => {
    setSetAsideQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const handleSetAside = () => {
    const productsToSetAside = selectedProducts.map(product => ({
      id: product.id,
      quantity: setAsideQuantities[product.id] || 1
    }));

    setAsideMutation.mutate({ products: productsToSetAside });
  };

  const addQuickJobTarget = (option: typeof quickJobOptions[0]) => {
    const newTarget: BreakdownTarget = {
      id: `${option.id}-${Date.now()}`,
      name: `${selectedStrain} - ${option.name}`,
      weight: option.weight,
      targetQuantity: 1,
      unitPrice: option.defaultPrice,
      totalValue: option.defaultPrice
    };
    setBreakdownTargets(prev => [...prev, newTarget]);
  };

  const updateBreakdownTarget = (id: string, field: keyof BreakdownTarget, value: any) => {
    setBreakdownTargets(prev => prev.map(target => {
      if (target.id === id) {
        const updated = { ...target, [field]: value };
        if (field === 'targetQuantity' || field === 'unitPrice') {
          updated.totalValue = updated.targetQuantity * updated.unitPrice;
        }
        return updated;
      }
      return target;
    }));
  };

  const removeBreakdownTarget = (id: string) => {
    setBreakdownTargets(prev => prev.filter(target => target.id !== id));
  };

  const handleCreateBreakdown = () => {
    if (!selectedSetAside || !selectedStrain || breakdownTargets.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select strain and add breakdown targets.",
        variant: "destructive",
      });
      return;
    }

    createBreakdownMutation.mutate({
      setAsideId: selectedSetAside.id,
      strain: selectedStrain,
      targets: breakdownTargets
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Two-Step Breakdown Workflow</h2>
          <p className="text-muted-foreground">
            Step 1: Set aside products from inventory. Step 2: Select strain and create breakdown targets.
          </p>
        </div>
      </div>

      <Tabs defaultValue="step1" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="step1" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Step 1: Set Aside
          </TabsTrigger>
          <TabsTrigger value="step2" className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Step 2: Transfer & Breakdown
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Set Aside Products */}
        <TabsContent value="step1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Available Pound Products
              </CardTitle>
              <CardDescription>
                Select products to set aside from inventory for breakdown processing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products?.map((product) => (
                  <Card 
                    key={product.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedProducts.find(p => p.id === product.id) 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium line-clamp-2">{product.name}</h4>
                        <div className="text-sm text-muted-foreground">
                          <div>SKU: {product.sku}</div>
                          <div>Quantity: {product.quantity}</div>
                          <div>Weight: {product.weight}</div>
                        </div>
                        {selectedProducts.find(p => p.id === product.id) && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label htmlFor={`qty-${product.id}`}>Set Aside Quantity:</Label>
                            <Input
                              id={`qty-${product.id}`}
                              type="number"
                              min="1"
                              max={product.quantity}
                              value={setAsideQuantities[product.id] || 1}
                              onChange={(e) => handleSetAsideQuantityChange(
                                product.id, 
                                parseInt(e.target.value) || 1
                              )}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedProducts.length > 0 && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Selected Products ({selectedProducts.length})</h4>
                  <div className="space-y-2">
                    {selectedProducts.map(product => (
                      <div key={product.id} className="flex justify-between items-center">
                        <span>{product.name}</span>
                        <Badge variant="secondary">
                          {setAsideQuantities[product.id] || 1} unit(s)
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleSetAside}
                    disabled={setAsideMutation.isPending}
                  >
                    {setAsideMutation.isPending ? 'Setting Aside...' : 'Set Aside Selected Products'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Transfer and Breakdown */}
        <TabsContent value="step2" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Set Aside Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Set Aside Items
                </CardTitle>
                <CardDescription>
                  Items ready for breakdown processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {setAsideItems?.filter((item: SetAsideItem) => item.status === 'pending').map((item: SetAsideItem) => (
                    <Card 
                      key={item.id}
                      className={`cursor-pointer transition-colors ${
                        selectedSetAside?.id === item.id 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedSetAside(item)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-1">
                          <h5 className="font-medium">{item.productName}</h5>
                          <div className="text-sm text-muted-foreground">
                            <div>Set Aside: {item.setAsideQuantity} unit(s)</div>
                            <div>Status: <Badge variant="outline">{item.status}</Badge></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No items set aside. Complete Step 1 first.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Breakdown Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Breakdown Configuration
                </CardTitle>
                <CardDescription>
                  Configure strain and breakdown targets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSetAside ? (
                  <>
                    {/* Strain Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="strain">Strain Name</Label>
                      <Input
                        id="strain"
                        placeholder="Enter strain name (e.g., Blue Dream)"
                        value={selectedStrain}
                        onChange={(e) => setSelectedStrain(e.target.value)}
                      />
                    </div>

                    {/* Quick Job Menu */}
                    <div className="space-y-2">
                      <Label>Quick Job Menu</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {quickJobOptions.map((option) => (
                          <Button
                            key={option.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addQuickJobTarget(option)}
                            disabled={!selectedStrain}
                          >
                            Add {option.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Breakdown Targets */}
                    {breakdownTargets.length > 0 && (
                      <div className="space-y-2">
                        <Label>Breakdown Targets</Label>
                        <div className="space-y-2">
                          {breakdownTargets.map((target) => (
                            <Card key={target.id}>
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-start">
                                    <h6 className="font-medium text-sm">{target.name}</h6>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeBreakdownTarget(target.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs">Quantity</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={target.targetQuantity}
                                        onChange={(e) => updateBreakdownTarget(
                                          target.id, 
                                          'targetQuantity', 
                                          parseInt(e.target.value) || 1
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Unit Price</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={target.unitPrice}
                                        onChange={(e) => updateBreakdownTarget(
                                          target.id, 
                                          'unitPrice', 
                                          parseFloat(e.target.value) || 0
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Total Value</Label>
                                      <Input
                                        value={`$${target.totalValue.toFixed(2)}`}
                                        disabled
                                      />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        
                        <Button 
                          className="w-full" 
                          onClick={handleCreateBreakdown}
                          disabled={createBreakdownMutation.isPending || !selectedStrain}
                        >
                          {createBreakdownMutation.isPending ? 'Creating Breakdown...' : 'Create Breakdown Products'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a set-aside item to configure breakdown.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Breakdown History</CardTitle>
              <CardDescription>
                View completed breakdown operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Strain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Targets Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setAsideItems?.filter((item: SetAsideItem) => item.status === 'completed').map((item: SetAsideItem) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.setAsideAt).toLocaleDateString()}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.strain}</TableCell>
                      <TableCell>
                        <Badge variant="default">{item.status}</Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No breakdown history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}