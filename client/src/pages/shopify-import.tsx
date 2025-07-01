import React from 'react';
import { Helmet } from 'react-helmet';
import { ShopifyImportDashboard } from '@/components/shopify/shopify-import-dashboard';

export default function ShopifyImportPage() {
  return (
    <>
      <Helmet>
        <title>Shopify Import | Gold-Standard_Management</title>
        <meta name="description" content="Import Shopify inventory and generate pound variants menu" />
      </Helmet>
      <div className="container mx-auto py-6">
        <ShopifyImportDashboard />
      </div>
    </>
  );
}