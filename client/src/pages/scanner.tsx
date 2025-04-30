import { useState } from "react";
import { Helmet } from "react-helmet";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BarcodeScanner from "@/components/inventory/barcode-scanner";
import { ScanLine, QrCode, Warehouse } from "lucide-react";

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState("scan");
  
  return (
    <MainLayout>
      <Helmet>
        <title>Inventory Scanner | MrManifestLister</title>
      </Helmet>
      
      <div className="p-4 md:p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <Warehouse className="mr-2 h-6 w-6" />
            Warehouse Inventory Scanner
          </h1>
          <p className="text-slate-500 mt-1">
            Scan barcodes or QR codes to track inventory changes
          </p>
        </header>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="scan" className="flex items-center justify-center">
              <ScanLine className="mr-2 h-4 w-4" />
              Barcode Scanner
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center">
              <QrCode className="mr-2 h-4 w-4" />
              Recent Scans
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="space-y-6">
            <BarcodeScanner />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Scan Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Would normally load this from an API */}
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <p className="font-medium">Added 3 units of "Vintage Desk Lamp"</p>
                    <p className="text-sm text-slate-500">SKU: LIG-N-384721 • 10 minutes ago</p>
                  </div>
                  
                  <div className="border-l-4 border-red-500 pl-4 py-2">
                    <p className="font-medium">Removed
                     2 units of "Antique Typewriter"</p>
                    <p className="text-sm text-slate-500">SKU: MEC-U-472910 • 35 minutes ago</p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <p className="font-medium">Checked "Mid-Century Coffee Table"</p>
                    <p className="text-sm text-slate-500">SKU: FUR-G-675123 • 50 minutes ago</p>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">Scan history will be stored once database integration is complete</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold mb-2">Scanner Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Enter the SKU manually or scan using a barcode scanner</li>
            <li>Select an action: Check (view item), Add (stock), or Remove (unstock)</li>
            <li>For Add/Remove, enter the quantity being added or removed</li>
            <li>Submit to update inventory records</li>
          </ol>
          <p className="mt-4 text-xs text-gray-500">
            For best results, use a USB or Bluetooth barcode scanner connected to your device
          </p>
        </div>
      </div>
    </MainLayout>
  );
}