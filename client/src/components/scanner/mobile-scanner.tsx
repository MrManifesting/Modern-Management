// This component has been replaced by SimpleScanner to avoid DOM access crashes
// MobileScanner used HTML5 QR Code library which caused "NotFoundError: The object can not be found here"
// All scanner functionality is now handled by the reliable SimpleScanner component

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import SimpleScanner from './simple-scanner';

interface MobileScannerProps {
  onItemScanned?: (item: any) => void;
  onActionComplete?: (result: any) => void;
}

const MobileScanner: React.FC<MobileScannerProps> = (props) => {
  // Redirect to SimpleScanner to avoid DOM access crashes
  return <SimpleScanner />;
};

export default MobileScanner;