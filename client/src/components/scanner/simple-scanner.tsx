// Consolidated scanner using proper barcode decoding
import { BarcodeScanner } from './barcode-scanner';

interface SimpleScannerProps {
  onItemScanned?: (item: any) => void;
  onActionComplete?: (result: any) => void;
}

export function SimpleScanner({
  onItemScanned,
  onActionComplete
}: SimpleScannerProps) {
  return (
    <BarcodeScanner 
      onItemScanned={onItemScanned}
      onActionComplete={onActionComplete}
      actionType="scan"
    />
  );
}