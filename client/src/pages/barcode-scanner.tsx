import { SimpleScanner } from "@/components/scanner/simple-scanner";
import { ErrorBoundary } from "@/components/error-boundary";

export default function BarcodeScannerPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Barcode Scanner</h1>
        <p className="text-muted-foreground mt-2">
          Scan barcodes to check inventory, add stock, or remove items from your system
        </p>
      </div>
      
      <ScannerErrorBoundary>
        <SimpleScanner />
      </ScannerErrorBoundary>
    </div>
  );
}