import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import UniversalScanner from '@/components/scanner/universal-scanner';
import { Separator } from '@/components/ui/separator';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

const ScannerPage = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Universal Barcode Scanner</h1>
        
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Enhanced Scanner Features</CardTitle>
            <CardDescription>
              Scan any product barcode to retrieve information, even if it's not in your inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="font-semibold text-lg mb-2 text-blue-700">Universal Lookup</div>
                  <p className="text-sm text-gray-600">
                    Our scanner can identify products from external databases even if they're not in your inventory, giving you accurate product information for any barcode.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-green-50">
                  <div className="font-semibold text-lg mb-2 text-green-700">Voice Recognition</div>
                  <p className="text-sm text-gray-600">
                    Use voice commands to control the scanner or dictate barcode numbers for a hands-free operation experience. Perfect for warehouse environments.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-purple-50">
                  <div className="font-semibold text-lg mb-2 text-purple-700">Mobile Employee QR</div>
                  <p className="text-sm text-gray-600">
                    Generate QR codes that employees can scan with their phones to turn their personal device into an inventory scanner connected to your system.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <UniversalScanner />
        
        <Separator className="my-8" />
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Accessibility Features</h2>
          <p className="text-gray-600">
            Our scanner includes built-in accessibility features to make inventory management easier for everyone:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Voice Dictation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  For times when typing is difficult or impossible, our voice dictation feature allows you to speak barcode numbers. The system converts your speech to text with high accuracy.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Screen Reader Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Our scanner can read product information aloud, making it accessible to users with visual impairments. Information is structured for clear understanding through audio.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Mobile Device Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Allow employees to use their own mobile devices as scanners. The QR code system creates a secure connection to your inventory system without complex setup.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Keyboard Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Full keyboard support allows users to navigate the scanner interface without using a mouse. All interactive elements are properly labeled for screen readers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ScannerPage;