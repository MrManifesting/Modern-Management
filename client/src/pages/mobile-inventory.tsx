import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MobileOptimizedInventory from '@/components/inventory/mobile-optimized-inventory';
import MobileNavigation from '@/components/mobile/mobile-navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  basePrice: number;
  salePrice?: number;
  category: string;
  status: string;
  thcaPercentage?: string;
  weight?: string;
  brand?: string;
}

// Transform API data to match our mobile component interface
const transformInventoryData = (items: InventoryItem[]) => {
  return items.map(item => ({
    id: item.id,
    strain: item.name.split(' - ')[0] || item.name, // Extract strain name
    amount: item.quantity,
    percentage: item.thcaPercentage || "N/A",
    tier: extractTier(item.name),
    bulkPrice: item.basePrice || item.salePrice || 0,
    askingPrice: item.salePrice || item.basePrice,
    coa: `COA-${item.sku}`,
    media: "Available",
    strainType: extractStrainType(item.name),
    sku: item.sku,
    quantity: item.quantity,
    packageType: extractPackageType(item.name, item.weight),
    brand: item.brand || extractBrand(item.name),
    packageSize: item.weight || extractWeight(item.name),
    category: item.category,
    status: item.status
  }));
};

// Helper functions to extract product details from name
const extractTier = (name: string): string => {
  if (name.includes('TOP SHELF')) return 'TOP SHELF';
  if (name.includes('EXOTIC')) return 'EXOTIC INDOOR';
  if (name.includes('AAA')) return 'AAA INDOOR';
  if (name.includes('CLASSIC')) return 'CLASSIC RESERVE';
  if (name.includes('AA')) return 'AA INDOOR';
  return 'STANDARD';
};

const extractStrainType = (name: string): string => {
  if (name.toLowerCase().includes('indica')) return 'INDICA';
  if (name.toLowerCase().includes('sativa')) return 'SATIVA';
  if (name.toLowerCase().includes('hybrid')) return 'HYBRID';
  return 'HYBRID'; // Default assumption
};

const extractPackageType = (name: string, weight?: string): string => {
  const nameWeight = weight || name;
  if (nameWeight.includes('1 pound') || nameWeight.includes('1lb')) return 'Bulk Pounds';
  if (nameWeight.includes('0.5lb') || nameWeight.includes('half')) return 'Half Pound';
  if (nameWeight.includes('0.25lb') || nameWeight.includes('quarter')) return 'Quarter Pound';
  if (nameWeight.includes('28g') || nameWeight.includes('ounce')) return 'Golden Nuggets (oz)';
  if (nameWeight.includes('14g')) return 'Tree Mason Little Trees (1/2 oz)';
  return 'Packaged Product';
};

const extractBrand = (name: string): string => {
  if (name.toLowerCase().includes('gold standard')) return 'Gold Standard';
  if (name.toLowerCase().includes('tree mason')) return 'Tree Mason';
  return 'Gold Standard'; // Default brand
};

const extractWeight = (name: string): string => {
  if (name.includes('1 pound') || name.includes('1lb')) return '1lb';
  if (name.includes('0.5lb')) return '0.5lb';
  if (name.includes('0.25lb')) return '0.25lb';
  if (name.includes('28g')) return '28g';
  if (name.includes('14g')) return '14g';
  if (name.includes('7g')) return '7g';
  if (name.includes('3.5g')) return '3.5g';
  return '1lb'; // Default for bulk
};

export const MobileInventoryPage: React.FC = () => {
  // Fetch inventory data with real-time updates
  const { data: inventoryData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/items'],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Handle product actions
  const handleViewProduct = (product: any) => {
    console.log('Viewing product:', product);
    // Open product detail modal or navigate to detail page
    alert(`Viewing ${product.strain} - Full details coming soon!`);
  };

  const handleEditProduct = (product: any) => {
    console.log('Editing product:', product);
    // Open edit modal or navigate to edit page
    alert(`Editing ${product.strain} - Edit functionality coming soon!`);
  };

  const handleDeleteProduct = (id: number) => {
    console.log('Deleting product:', id);
    // Show confirmation and delete
    if (confirm('Are you sure you want to delete this product?')) {
      alert('Delete functionality coming soon!');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gold" />
            <p className="text-lg font-medium">Loading your inventory...</p>
            <p className="text-sm text-muted-foreground">Fetching latest product data</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Failed to load inventory data. Please check your connection and try again.
            <button 
              onClick={() => refetch()} 
              className="ml-2 underline text-gold hover:text-gold/80"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Transform the API data for our mobile component
  const transformedData = transformInventoryData(Array.isArray(inventoryData) ? inventoryData : []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold gold-gradient-text">Mobile Inventory</h1>
              <p className="text-sm text-muted-foreground">
                {transformedData.length} products • Touch-optimized
              </p>
            </div>
            <button 
              onClick={() => refetch()}
              className="flex items-center gap-2 text-sm bg-gold/10 hover:bg-gold/20 px-3 py-2 rounded-lg transition-colors touch-manipulation"
            >
              <Loader2 className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main content with mobile padding */}
      <div className="container mx-auto px-4 py-6">
        <MobileOptimizedInventory
          data={transformedData}
          onView={handleViewProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default MobileInventoryPage;