import React from 'react';
import { ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/layout/main-layout';
import ShopifyImport from '@/components/inventory/shopify-import';

export default function ShopifyImportPage() {
  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gold-gradient-text flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" /> Shopify Inventory Import
          </h1>
        </div>
        
        <div className="grid gap-6">
          <div className="bg-black/20 rounded-lg p-4 border border-gold/30">
            <h2 className="text-lg font-medium text-gold mb-2">Shopify Import Instructions</h2>
            <p className="text-gray-300">
              This specialized importer is designed specifically for Shopify inventory export CSV files.
              Follow these steps for a successful import:
            </p>
            <ol className="list-decimal pl-6 mt-2 text-gray-300 space-y-1">
              <li>Export your inventory from Shopify admin panel</li>
              <li>Select the CSV file using the uploader below</li>
              <li>Click "Import Shopify Inventory" to start the import process</li>
              <li>The importer will automatically extract product details and quantities</li>
            </ol>
          </div>
          
          <ShopifyImport />
        </div>
      </div>
    </MainLayout>
  );
}