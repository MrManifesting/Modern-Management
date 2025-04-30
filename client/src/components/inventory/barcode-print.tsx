import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, Repeat } from "lucide-react";
import JsBarcode from 'jsbarcode';

// Import types
import { Item } from '@shared/schema';

interface BarcodePrintProps {
  item: Item;
  onClose: () => void;
}

export default function BarcodePrint({ item, onClose }: BarcodePrintProps) {
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("barcode");
  
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  
  // Generate barcode using JsBarcode library
  useEffect(() => {
    if (barcodeRef.current && item.sku) {
      try {
        JsBarcode(barcodeRef.current, item.sku, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 16,
          margin: 10
        });
      } catch (err) {
        console.error('Error generating barcode:', err);
      }
    }
  }, [item.sku]);
  
  // Handle print action
  const handlePrint = () => {
    setIsPrinting(true);
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '', 'width=800,height=600');
      
      if (printWindow) {
        // Create print content
        printWindow.document.write(`
          <html>
            <head>
              <title>Print ${item.name} - ${item.sku}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 20px;
                }
                .print-container {
                  width: 100%;
                  max-width: 400px;
                  margin: 0 auto;
                }
                .item-details {
                  margin-bottom: 10px;
                  text-align: center;
                }
                .barcode-container {
                  text-align: center;
                  margin-bottom: 15px;
                }
                .qr-container {
                  text-align: center;
                  margin-bottom: 15px;
                }
                .sku {
                  font-size: 14px;
                  margin-top: 5px;
                  text-align: center;
                }
                .print-footer {
                  font-size: 12px;
                  text-align: center;
                  margin-top: 20px;
                  color: #666;
                }
                @media print {
                  @page {
                    size: 3in 2in;
                    margin: 0.5cm;
                  }
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                <div class="item-details">
                  <h2>${item.name}</h2>
                  <p>Price: $${item.price.toFixed(2)} | ${item.category}</p>
                </div>
                ${activeTab === 'barcode' ? `
                  <div class="barcode-container">
                    ${barcodeRef.current?.outerHTML || ''}
                  </div>
                ` : `
                  <div class="qr-container">
                    <img src="${item.qrCode}" alt="QR Code" style="width: 200px; height: 200px;">
                  </div>
                `}
                <div class="sku">
                  SKU: ${item.sku}
                </div>
                <div class="print-footer">
                  MrManifestLister Inventory System
                </div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        
        printWindow.document.close();
      }
      
      toast({
        title: "Printing initiated",
        description: "Your barcode/QR code has been sent to the printer.",
      });
    } catch (error) {
      console.error('Error printing barcode:', error);
      toast({
        title: "Printing failed",
        description: "There was an error sending to printer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };
  
  // Handle download action
  const handleDownload = () => {
    try {
      // Create a download link
      const link = document.createElement('a');
      
      if (activeTab === 'barcode' && barcodeRef.current) {
        // SVG to Blob conversion
        const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        // Set download attributes
        link.href = url;
        link.download = `barcode-${item.sku}.svg`;
      } else if (item.qrCode) {
        // QR code is already a data URL
        link.href = item.qrCode;
        link.download = `qrcode-${item.sku}.png`;
      } else {
        throw new Error('No barcode or QR code available');
      }
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download complete",
        description: `Your ${activeTab} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading barcode:', error);
      toast({
        title: "Download failed",
        description: "There was an error creating the download. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Print {item.name} Codes</CardTitle>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="barcode">Barcode</TabsTrigger>
          <TabsTrigger value="qrcode">QR Code</TabsTrigger>
        </TabsList>
        
        <TabsContent value="barcode" className="p-4">
          <div className="flex justify-center mb-4">
            <svg ref={barcodeRef} className="w-full"></svg>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">SKU: {item.sku}</p>
        </TabsContent>
        
        <TabsContent value="qrcode" className="p-4">
          <div className="flex justify-center mb-4" ref={qrContainerRef}>
            {item.qrCode ? (
              <img src={item.qrCode} alt="QR Code" className="h-64 w-64" />
            ) : (
              <div className="h-64 w-64 flex items-center justify-center bg-gray-100 rounded-md">
                <p className="text-gray-500">QR Code unavailable</p>
              </div>
            )}
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">QR Code contains complete item data</p>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting}>
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? 'Printing...' : 'Print'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}