import React from 'react';
import ShopifyControlPanel from '@/components/shopify/shopify-control-panel';
import { ArrowLeft, Settings } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function ShopifySettingsPage() {
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 text-gold" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gold flex items-center">
            <Settings className="h-6 w-6 mr-2" /> 
            Shopify Integration Settings
          </h1>
        </div>
      </div>
      
      <div className="grid gap-6">
        <ShopifyControlPanel />
        
        <div className="mt-8 p-6 border border-gold/20 rounded-lg bg-black text-gray-300">
          <h2 className="text-xl font-semibold text-gold mb-4">About Shopify Integration</h2>
          <ul className="space-y-3 list-disc pl-5">
            <li>
              <strong className="text-white">Safety First:</strong> By default, Shopify push is disabled to prevent accidental updates.
            </li>
            <li>
              <strong className="text-white">Automatic SKU Generation:</strong> Cannabis products will have SKUs generated according to the pattern: <code className="text-amber-400">INITIALS-TIER-THCVALUE</code>
            </li>
            <li>
              <strong className="text-white">Two-Way Sync:</strong> When enabled, inventory changes will be reflected in both systems.
            </li>
            <li>
              <strong className="text-white">Barcode Generation:</strong> Compatible barcodes are automatically generated for Shopify products.
            </li>
            <li>
              <strong className="text-white">Certificates of Analysis:</strong> COA QR codes for products with valid certificate URLs.
            </li>
          </ul>
          <div className="bg-black/40 p-4 mt-6 border border-gold/30 rounded">
            <p className="text-amber-400 font-medium">Important Note:</p>
            <p className="text-gray-400 mt-1">
              This integration follows the exact same SKU generation logic as your Google Spreadsheet automation, 
              ensuring consistency across all systems. Before enabling push, please test the integration by preparing
              several products and verifying their SKUs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}