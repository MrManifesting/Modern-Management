import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { THCaFlowerProduct } from './thca-flower-inventory-table';
import { FileText, ShoppingCart, Edit, BarChart, QrCode, LinkIcon } from 'lucide-react';

interface THCaFlowerDetailProps {
  product: THCaFlowerProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: THCaFlowerProduct) => void;
}

export const THCaFlowerDetail: React.FC<THCaFlowerDetailProps> = ({
  product,
  open,
  onOpenChange,
  onEdit,
}) => {
  if (!product) return null;

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Get badge color based on strain type
  const getStrainTypeBadgeClass = (strainType: string) => {
    if (strainType.includes("INDICA")) return "bg-purple-600 text-white";
    if (strainType.includes("SATIVA")) return "bg-orange-500 text-white";
    if (strainType.includes("HYBRID")) return "bg-green-500 text-white";
    return "bg-gray-400 text-white";
  };

  // Get badge color based on tier
  const getTierBadgeClass = (tier: string) => {
    if (tier.includes("TOP SHELF")) return "bg-gold text-black";
    if (tier.includes("CLASSIC RESERVE")) return "bg-blue-500 text-white";
    if (tier.includes("AA INDOOR")) return "bg-green-600 text-white";
    if (tier.includes("AAA INDOOR")) return "bg-purple-700 text-white";
    if (tier.includes("EXOTIC INDOOR")) return "bg-red-600 text-white";
    return "bg-gray-500 text-white";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gold-gradient-text text-2xl">{product.strain}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 mt-2">
            <Badge className={getTierBadgeClass(product.tier)}>{product.tier}</Badge>
            <Badge className={getStrainTypeBadgeClass(product.strainType)}>{product.strainType}</Badge>
            <Badge variant="outline">SKU: {product.sku}</Badge>
            <Badge variant="outline">THC: {product.percentage}</Badge>
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Tiers</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Strain</p>
                <p className="text-lg font-semibold">{product.strain}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-lg">{product.category}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">THC Percentage</p>
                <p className="text-lg font-semibold">{product.percentage}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Tier</p>
                <Badge className={getTierBadgeClass(product.tier)}>{product.tier}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Strain Type</p>
                <Badge className={getStrainTypeBadgeClass(product.strainType)}>{product.strainType}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                <p className="text-lg font-semibold">{product.amount} lbs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">SKU</p>
                <p className="text-lg font-mono">{product.sku}</p>
              </div>
              {product.barcode && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Barcode</p>
                  <p className="text-lg font-mono">{product.barcode}</p>
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <h3 className="text-lg font-semibold mb-2">Stock Status</h3>
              <div className="bg-muted rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span>Available Quantity:</span>
                  <Badge variant={product.amount > 10 ? "default" : "destructive"} className="ml-2">
                    {product.amount} lbs
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Tiers</CardTitle>
                <CardDescription>
                  Different pricing levels based on purchase volume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Bulk Price</p>
                    <p className="text-xl font-semibold">{formatPrice(product.bulkPrice)}</p>
                    <p className="text-xs text-muted-foreground">Standard pricing</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Distro (25lbs+)</p>
                    <p className="text-xl font-semibold">{formatPrice(product.distroPrice)}</p>
                    <p className="text-xs text-muted-foreground">
                      Save {Math.round((1 - product.distroPrice / product.bulkPrice) * 100)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Master (50lbs+)</p>
                    <p className="text-xl font-semibold">{formatPrice(product.masterPrice)}</p>
                    <p className="text-xs text-muted-foreground">
                      Save {Math.round((1 - product.masterPrice / product.bulkPrice) * 100)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Master 2 (100lbs+)</p>
                    <p className="text-xl font-semibold">{formatPrice(product.master2Price)}</p>
                    <p className="text-xs text-muted-foreground">
                      Save {Math.round((1 - product.master2Price / product.bulkPrice) * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> All sales on THCa flower are final. If there are any issues with your order, please contact us immediately.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">COA Documents</CardTitle>
                  <CardDescription>Certificate of Analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">COA: {product.coa}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <FileText className="h-4 w-4" />
                      View COA
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <QrCode className="h-4 w-4" />
                      COA QR
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Media Resources</CardTitle>
                  <CardDescription>Product images and videos</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">Media Link: {product.media}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <LinkIcon className="h-4 w-4" />
                      View Media
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-4" />
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline"
            onClick={() => onEdit && onEdit(product)}
            className="gap-1.5"
          >
            <Edit className="h-4 w-4" />
            Edit Product
          </Button>
          <Button 
            variant="default"
            className="gap-1.5 bg-gold hover:bg-gold-dark text-black"
          >
            <ShoppingCart className="h-4 w-4" />
            Create Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default THCaFlowerDetail;