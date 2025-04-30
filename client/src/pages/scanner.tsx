import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine, Barcode, QrCode } from 'lucide-react';
import QuickScanner from '../components/scanner/quick-scanner';
import UniversalScanner from '../components/scanner/universal-scanner';

export default function ScannerPage() {
  const [scanMode, setScanMode] = useState<string>('quick');
  
  const handleItemFound = (item: any) => {
    console.log('Item found:', item);
    // You could add additional functionality here, such as showing a toast
  };
  
  const handleActionComplete = (result: any) => {
    console.log('Action completed:', result);
    // You could add additional functionality here, such as refreshing data
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Scanner Hub</h1>
        <p className="text-muted-foreground">
          Scan barcodes and QR codes for quick inventory management
        </p>
      </div>
      
      <Tabs value={scanMode} onValueChange={setScanMode} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            <span>Quick Scanner</span>
          </TabsTrigger>
          <TabsTrigger value="universal" className="flex items-center gap-2">
            <Barcode className="h-4 w-4" />
            <span>Universal Scanner</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="quick">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Item Scanner</CardTitle>
                <CardDescription>
                  Scan items to check, add, or remove from inventory with minimal steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuickScanner 
                  onItemFound={handleItemFound}
                  onActionComplete={handleActionComplete}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Scanner Features</CardTitle>
                <CardDescription>
                  Benefits of using the Quick Scanner for inventory management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-4 border rounded-lg">
                      <ScanLine className="h-8 w-8 text-primary mb-2" />
                      <h3 className="font-medium text-center">Fast Scanning</h3>
                      <p className="text-sm text-center text-muted-foreground">
                        Scan items with minimal steps for quick inventory updates
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center p-4 border rounded-lg">
                      <QrCode className="h-8 w-8 text-primary mb-2" />
                      <h3 className="font-medium text-center">Multiple Input Methods</h3>
                      <p className="text-sm text-center text-muted-foreground">
                        Use camera to scan or manually enter barcodes and SKUs
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center p-4 border rounded-lg">
                      <Barcode className="h-8 w-8 text-primary mb-2" />
                      <h3 className="font-medium text-center">Inventory Actions</h3>
                      <p className="text-sm text-center text-muted-foreground">
                        Check, add, or remove inventory with a single scan
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="universal">
          <Card>
            <CardHeader>
              <CardTitle>Universal Product Scanner</CardTitle>
              <CardDescription>
                Look up any product by scanning its barcode, even items not in your inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UniversalScanner />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}