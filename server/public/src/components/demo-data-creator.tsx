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
      // Create a Premium Oil sample
      const premiumOilSample = {
        name: "Full Spectrum Oil - Premium",
        status: "in-stock",
        description: "Premium grade Full Spectrum Oil with vanilla flavor. High quality ingredients and great reviews.",
        price: 89.99,
        quantity: 45,
        sku: "IP-FSOIL-P-30ML",
        category: "Supplements",
        condition: "New",
        images: [],
        tags: ["oil", "premium", "full-spectrum", "top-seller"],
        barcode: "IP1234567",
        lowStockThreshold: 10,
        marketplace: [],
        syncedToMarketplaces: [],
        aiEnhanced: true,
        aiTags: ["full spectrum", "premium", "oil", "vanilla"],
        seoTitle: "Premium Full Spectrum Oil 30ml | Inventory Pro",
        attributes: {
          brand: "Inventory Pro",
          tier: "Premium",
          variant: "Vanilla",
          strengthPercentage: "5.0",
          packageSize: "30ml",
          totalCost: 45.00,
          weight: 30
        }
      };
      
      return await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(premiumOilSample)
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
        className="border-primary/30 text-primary hover:bg-primary/10"
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