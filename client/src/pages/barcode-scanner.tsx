import AdvancedBarcodeScanner from "@/components/inventory/advanced-barcode-scanner";

export default function BarcodeScannerPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Advanced Barcode Scanner</h1>
        <p className="text-muted-foreground mt-2">
          Complete barcode scanning solution with intake mode, batch processing, order matching, and customer notifications
        </p>
      </div>
      
      <AdvancedBarcodeScanner />
    </div>
  );
}