import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { LeafLoadingPattern } from '@/components/ui/leaf-loader';

// This component redirects from the older inventory page to the new products-inventory page
const InventoryRedirectPage: React.FC = () => {
  const [, setLocation] = useLocation();
  
  // Redirect to the new products-inventory page as soon as this component mounts
  useEffect(() => {
    setLocation('/products-inventory');
  }, [setLocation]);
  
  // For the brief moment this component is visible, show a loading state with leaf animation
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <LeafLoadingPattern message="Redirecting to inventory management..." />
    </div>
  );
};

export default InventoryRedirectPage;