import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentCheckout } from '@/components/payment/PaymentCheckout';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader, QrCode, AlertTriangle } from 'lucide-react';

// Get the QR code from the URL
const useQrCode = () => {
  const [, location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  return { code, location };
};

export default function QrScanPage() {
  const { code, location } = useQrCode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{
    id: number;
    code: string;
    affiliateId: number;
    affiliateName: string;
  } | null>(null);
  const [scanRecorded, setScanRecorded] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!code) {
      setError('No QR code provided');
      setLoading(false);
      return;
    }

    // Validate and record the scan
    const validateCode = async () => {
      try {
        setLoading(true);
        
        // Record the scan first
        const scanResponse = await apiRequest('POST', `/api/qrcodes/${code}/scan`);
        
        if (!scanResponse.ok) {
          const errorData = await scanResponse.json();
          throw new Error(errorData.message || 'Invalid QR code');
        }
        
        setScanRecorded(true);
        
        // Then get the QR code details
        const detailsResponse = await apiRequest('GET', `/api/qrcodes/${code}`);
        
        if (!detailsResponse.ok) {
          throw new Error('Failed to get QR code details');
        }
        
        const responseData = await detailsResponse.json();
        
        if (!responseData.success) {
          throw new Error(responseData.message || 'Failed to get QR code details');
        }
        
        setQrData(responseData.data);
        setLoading(false);
      } catch (error: any) {
        console.error('Error validating QR code:', error);
        setError(error.message || 'Failed to validate QR code');
        setLoading(false);
      }
    };

    validateCode();
  }, [code]);

  const handleProceedToCheckout = () => {
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = () => {
    toast({
      title: 'Purchase Complete',
      description: 'Thank you for your purchase!'
    });
    
    // Redirect to home or a success page
    setTimeout(() => {
      location('/');
    }, 2000);
  };

  const handleCheckoutCancel = () => {
    setShowCheckout(false);
  };

  if (loading) {
    return (
      <div className="container max-w-md mx-auto py-10 flex flex-col items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">
              <QrCode className="h-8 w-8 mb-2 mx-auto text-blue-500" />
              Loading QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center p-8">
            <Loader className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-center mt-4">Verifying your QR code...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-md mx-auto py-10 flex flex-col items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center text-red-500">
              <AlertTriangle className="h-8 w-8 mb-2 mx-auto" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center p-8">
            <p className="text-center mb-4">{error}</p>
            <Button onClick={() => location('/')}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCheckout && qrData) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <PaymentCheckout 
          affiliateId={qrData.affiliateId}
          qrCode={qrData.code}
          onSuccess={handleCheckoutSuccess}
          onCancel={handleCheckoutCancel}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-10 flex flex-col items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">
            <QrCode className="h-8 w-8 mb-2 mx-auto text-blue-500" />
            QR Code Scanned
          </CardTitle>
          <CardDescription className="text-center">
            {scanRecorded ? 'Scan recorded successfully!' : 'Processing scan...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-8">
          {qrData && (
            <>
              <div className="text-center mb-6">
                <p className="text-lg font-semibold">You've been referred by</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{qrData.affiliateName}</p>
              </div>
              <p className="text-center mb-6">
                Any purchase you make will credit this affiliate with a commission.
              </p>
              <Button onClick={handleProceedToCheckout} className="w-full">
                Proceed to Checkout
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}