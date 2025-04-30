import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const DemoDataCreator: React.FC = () => {
  const { toast } = useToast();
  
  // Mutation for creating demo data
  const createDemoDataMutation = useMutation({
    mutationFn: async () => {
      // Create a THCa Flower sample
      const thcaFlowerSample = {
        name: "Wedding Cake - Top Shelf",
        status: "in-stock",
        description: "Top shelf Wedding Cake THCa flower, indoor grown. High terpene profile with sweet vanilla notes.",
        price: 129.99,
        quantity: 45,
        sku: "GS-WEDCAK-TS-14G",
        category: "THCa Flower",
        condition: "New",
        images: [],
        tags: ["thca", "flower", "indoor", "top-shelf"],
        barcode: "GSB1234567",
        lowStockThreshold: 10,
        marketplace: [],
        syncedToMarketplaces: [],
        aiEnhanced: true,
        aiTags: ["wedding cake", "top shelf", "indica", "vanilla"],
        seoTitle: "Premium Wedding Cake THCa Flower | Gold Standard CBD",
        attributes: {
          brand: "Gold Standard",
          tier: "Top Shelf",
          strain: "Wedding Cake",
          thcaPercentage: "26.8",
          cbdPercentage: "0.1",
          packageSize: "14g",
          totalCost: 65.00,
          weight: 14
        }
      };
      
      return await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(thcaFlowerSample)
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: 'Demo data created',
        description: 'Sample inventory item has been added to your system.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create demo data',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  });
  
  const handleCreateDemoData = () => {
    createDemoDataMutation.mutate();
  };
  
  return (
    <div className="flex items-center justify-center my-4">
      <Button 
        variant="outline" 
        onClick={handleCreateDemoData}
        disabled={createDemoDataMutation.isPending}
        className="border-gold/30 text-gold hover:bg-gold/10"
      >
        {createDemoDataMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          'Create Demo Item'
        )}
      </Button>
    </div>
  );
};

export default DemoDataCreator;