import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Item } from "@shared/schema";
import { ExternalLink, Store, Search, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ShopifyStorePreviewProps {
  item: Item;
}

interface ShopifyProductInfo {
  title: string;
  handle: string;
  storeUrl: string;
  imageUrl: string | null;
  id: string;
  note?: string;
}

export default function ShopifyStorePreview({ item }: ShopifyStorePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productInfo, setProductInfo] = useState<ShopifyProductInfo | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      fetchShopifyDetails();
    }
  }, [isOpen, item]);

  const fetchShopifyDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${item.id}/shopify-store-view`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Open the Shopify URL directly in a new tab
        window.open(data.url, '_blank');
        setIsOpen(false); // Close the dialog
      } else {
        setError(data.error || "Could not find this product in the Shopify store");
      }
    } catch (err) {
      console.error("Error fetching Shopify details:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisitStore = () => {
    if (productInfo?.storeUrl) {
      window.open(productInfo.storeUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100">
          <Store className="h-4 w-4" />
          View in Store
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product on Shopify Store</DialogTitle>
          <DialogDescription>
            See how this item appears in your Shopify store.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-gray-500">
                  Looking up this product in Shopify...
                </p>
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Found</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          ) : productInfo ? (
            <Card className="border-blue-200 overflow-hidden">
              {productInfo.imageUrl ? (
                <div className="w-full h-48 overflow-hidden bg-gray-100">
                  <img 
                    src={productInfo.imageUrl} 
                    alt={productInfo.title} 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <Store className="h-16 w-16 text-gray-300" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{productInfo.title}</h3>
                  {productInfo.note && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      {productInfo.note}
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-500 mb-3">
                  <p>Handle: <span className="font-mono text-xs">{productInfo.handle}</span></p>
                </div>
                
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Listed on Shopify store</span>
                </div>
              </CardContent>
              
              <Separator />
              
              <CardFooter className="p-4">
                <Button 
                  onClick={handleVisitStore} 
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit Product on Shopify Store
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="text-center p-6">
              <Search className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">
                Click the button below to search for this product in your Shopify store.
              </p>
              <Button 
                onClick={fetchShopifyDetails} 
                className="mt-4"
              >
                Look Up Product
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}