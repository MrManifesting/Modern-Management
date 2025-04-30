import React from 'react';
import { Helmet } from 'react-helmet';
import ShopifySyncPreview from '@/components/shopify/shopify-sync-preview';

const ShopifySyncPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Shopify Sync | Inventory Management</title>
      </Helmet>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gold-gradient-text">Shopify Sync</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Safely synchronize your inventory with Shopify
            </p>
          </div>
        </div>
        <ShopifySyncPreview />
      </div>
    </>
  );
};

export default ShopifySyncPage;