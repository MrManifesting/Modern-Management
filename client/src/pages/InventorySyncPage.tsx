import React from 'react';
import { Helmet } from 'react-helmet';
import { InventorySyncDashboard } from '@/components/shopify/inventory-sync-dashboard';

export default function InventorySyncPage() {
  return (
    <>
      <Helmet>
        <title>Inventory Sync - Shopify Integration</title>
      </Helmet>
      
      <div className="container mx-auto py-8">
        <InventorySyncDashboard />
      </div>
    </>
  );
}