import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

// This component redirects from the older inventory page to the new products-inventory page
const InventoryRedirectPage: React.FC = () => {
  const [, setLocation] = useLocation();
  
  // Redirect to the new products-inventory page as soon as this component mounts
  useEffect(() => {
    setLocation('/products-inventory');
  }, [setLocation]);
  
  // For the brief moment this component is visible, show a loading state
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Redirecting..."/>
      <span className="ml-3">Redirecting to inventory management...</span>
    </div>
  );
};

export default InventoryRedirectPage;