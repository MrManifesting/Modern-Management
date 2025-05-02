import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import ShopifySyncPreview from '@/components/shopify/shopify-sync-preview';
import DemoDataCreator from '@/components/demo-data-creator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ExternalLink, Upload, Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const ShopifySyncPage: React.FC = () => {
  const [shopifyStatus, setShopifyStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  
  // Check Shopify connection status
  useEffect(() => {
    const checkShopifyStatus = async () => {
      try {
        const response = await fetch('/api/shopify/test-connection');
        const data = await response.json();
        
        if (data.success) {
          setShopifyStatus('connected');
        } else {
          setShopifyStatus('disconnected');
        }
      } catch (error) {
        console.error('Error checking Shopify connection:', error);
        setShopifyStatus('disconnected');
      }
    };
    
    checkShopifyStatus();
  }, []);
  
  return (
    <>
      <Helmet>
        <title>Shopify Sync | Inventory Management</title>
      </Helmet>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gold-gradient-text">Shopify Sync</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Safely synchronize your inventory with Shopify
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
            <div className="flex items-center mr-4">
              <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                shopifyStatus === 'connected' ? 'bg-green-500' : 
                shopifyStatus === 'loading' ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">
                {shopifyStatus === 'connected' ? 'Shopify Connected' : 
                 shopifyStatus === 'loading' ? 'Checking Connection...' : 
                 'Shopify Disconnected'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Link href="/shopify-import">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 bg-gradient-to-r from-gold/10 to-transparent border-gold/50 hover:bg-gold/20 text-gold"
                >
                  <Upload className="h-4 w-4" /> Import from Shopify
                </Button>
              </Link>
              
              <Link href="/shopify-settings">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Settings className="h-4 w-4" /> Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {shopifyStatus === 'disconnected' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Shopify Not Connected</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>Your Shopify account is not connected or there is an issue with your credentials.</p>
              <Button variant="outline" size="sm" className="w-auto self-start gap-1.5">
                <ExternalLink className="h-4 w-4" /> Go to Settings
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertTitle className="text-amber-800 dark:text-amber-500">Development Mode</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-500">
            In development mode, you can create sample items to test the sync preview functionality.
            No actual data will be pushed to Shopify until explicitly confirmed.
          </AlertDescription>
        </Alert>
        
        <Card className="bg-black/40 border-gold/30">
          <CardHeader>
            <CardTitle className="text-lg text-gold">Test Data</CardTitle>
            <CardDescription>
              Create sample inventory items to test the Shopify sync integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DemoDataCreator />
          </CardContent>
        </Card>
        
        <ShopifySyncPreview />
      </div>
    </>
  );
};

export default ShopifySyncPage;