import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Plus, DownloadCloud, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { 
  THCaFlowerInventoryTable, 
  THCaFlowerProduct 
} from '@/components/inventory/thca-flower-inventory-table';
import { THCaFlowerDetail } from '@/components/inventory/thca-flower-detail';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';

// For Joyride onboarding tour
import { OnboardingTour } from '@/components/onboarding';
import { OnboardingStep } from '@/hooks/use-onboarding';

const THCaFlowerInventoryPage = () => {
  const [selectedProduct, setSelectedProduct] = useState<THCaFlowerProduct | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  // Define tour steps specific to this page
  const tourSteps: OnboardingStep[] = [
    {
      target: '.thca-inventory-header',
      content: 'Welcome to the THCa Flower Inventory. Here you can manage all your cannabis products, pricing tiers, and stock levels.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.inventory-table',
      content: 'This table shows all your THCa flower products. You can filter by strain, tier, or THC percentage.',
      placement: 'top',
    },
    {
      target: '.inventory-actions',
      content: 'Use these buttons to add new products, import or export your inventory.',
      placement: 'bottom',
    },
    {
      target: '.import-csv-button',
      content: 'Quickly import your THCa flower inventory from CSV files like the one from your shared spreadsheet.',
      placement: 'bottom',
    }
  ];

  const handleViewProduct = (product: THCaFlowerProduct) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  const handleEditProduct = (product: THCaFlowerProduct) => {
    // In a real implementation, this would open an edit form
    toast({
      title: "Edit Feature",
      description: `Editing product: ${product.strain}`,
    });
  };

  const handleDeleteProduct = (id: number) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    // In a real implementation, this would call the API to delete the product
    toast({
      title: "Product Deleted",
      description: `Product ID ${productToDelete} has been deleted.`,
      variant: "destructive",
    });
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>THCa Flower Inventory | Gold Standard CBD</title>
      </Helmet>

      {/* Onboarding tour */}
      <OnboardingTour steps={tourSteps} />

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4 thca-inventory-header">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold gold-gradient-text">THCa Flower Inventory</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your THCa flower products, pricing tiers, and inventory levels
              </p>
            </div>
            
            {/* Mobile: Show only functional actions */}
            <div className="flex md:hidden gap-2 inventory-actions">
              <Button variant="outline" className="gap-1.5 flex-1" size="sm" onClick={() => window.location.href = '/api/price-sheet'}>
                <FileSpreadsheet className="h-4 w-4" />
                Price Sheet
              </Button>
              <Button variant="outline" className="gap-1.5 flex-1" size="sm" onClick={() => window.location.href = '/api/export-csv?format=all'}>
                <DownloadCloud className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            {/* Desktop: Show functional actions */}
            <div className="hidden md:flex flex-wrap gap-2 inventory-actions">
              <Button variant="outline" className="gap-1.5" onClick={() => window.location.href = '/api/export-csv?format=all'}>
                <DownloadCloud className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => window.location.href = '/api/price-sheet'}>
                <FileSpreadsheet className="h-4 w-4" />
                Price Sheet
              </Button>
            </div>
          </div>
        </div>

        <THCaFlowerInventoryTable 
          onView={handleViewProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />

        {/* Product detail dialog */}
        <THCaFlowerDetail 
          product={selectedProduct}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEditProduct}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this product from your inventory.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default THCaFlowerInventoryPage;