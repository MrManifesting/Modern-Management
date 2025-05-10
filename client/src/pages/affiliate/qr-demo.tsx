import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  AlertCircle, 
  Clock, 
  DollarSign, 
  QrCode, 
  ShoppingBag, 
  User 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import PayPalCheckoutButton from '@/components/payment/PayPalCheckoutButton';

interface DemoProductProps {
  title: string;
  price: string;
  description: string;
  affiliateId?: number;
  qrCode?: string;
}

function DemoProduct({ title, price, description, affiliateId, qrCode }: DemoProductProps) {
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  
  useEffect(() => {
    // Check if PayPal is configured
    const checkPayPalStatus = async () => {
      try {
        const response = await apiRequest('GET', '/api/paypal/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.isConfigured) {
            setPaypalReady(true);
          }
        }
      } catch (error) {
        console.error("Error checking PayPal status:", error);
      }
      
      setIsReady(true);
    };
    
    checkPayPalStatus();
  }, []);
  
  const handlePaymentSuccess = (data: any) => {
    toast({
      title: "Payment Successful",
      description: "Thank you for your purchase! Affiliate commission has been tracked.",
      variant: "default"
    });
  };
  
  const handlePaymentError = (error: any) => {
    toast({
      title: "Payment Failed",
      description: error?.message || "An error occurred during payment processing.",
      variant: "destructive"
    });
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center text-lg font-semibold">
            <DollarSign className="w-5 h-5 mr-1" />
            {price}
          </div>
          {(affiliateId && qrCode) && (
            <div className="flex items-center text-sm text-muted-foreground">
              <QrCode className="w-4 h-4 mr-1" />
              <span>Affiliate: {qrCode}</span>
            </div>
          )}
        </div>
        
        {!isReady ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !paypalReady ? (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>PayPal Not Configured</AlertTitle>
            <AlertDescription>
              PayPal integration is not configured. Please add your PayPal credentials to enable checkout.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <PayPalCheckoutButton 
              amount={price.replace('$', '')}
              currency="USD"
              intent="CAPTURE"
              affiliateId={affiliateId}
              qrCode={qrCode}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              className="w-full"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-2">
        <div className="text-sm text-muted-foreground flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          <span>Ships within 24 hours</span>
        </div>
        {(affiliateId && qrCode) && (
          <div className="w-full pt-3">
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground">
              This purchase will earn a 4% commission for the affiliate.
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default function AffiliateQrDemo() {
  const [location] = useLocation();
  const params = useParams();
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadQrData = async () => {
      try {
        const qrCode = params?.code;
        if (!qrCode) {
          setError("No QR code provided in the URL");
          setLoading(false);
          return;
        }
        
        // Fetch QR code data
        const response = await apiRequest('GET', `/api/qrcodes/${qrCode}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to load QR code data");
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || "Invalid QR code");
        }
        
        setQrData(data.data);
        
        // Record the scan
        await apiRequest('POST', `/api/qrcodes/${qrCode}/scan`, {
          referrer: document.referrer,
          userAgent: navigator.userAgent
        });
        
      } catch (err: any) {
        console.error("Error loading QR code data:", err);
        setError(err.message || "An unknown error occurred");
        toast({
          title: "Error",
          description: err.message || "Failed to load affiliate data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadQrData();
  }, [params?.code, toast]);
  
  // For direct access with no QR code in URL, show a demo product
  if (!params?.code) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Affiliate Demo Product</h1>
        <p className="text-muted-foreground mb-6">
          This is a demonstration of the affiliate product purchase flow with no QR code.
          In a real scenario, customers would scan a QR code generated by an affiliate to reach this page.
        </p>
        
        <div className="max-w-md mx-auto">
          <DemoProduct
            title="Premium Product"
            price="49.99"
            description="High-quality premium product with exclusive features"
          />
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  if (error || !qrData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load QR code data. Please try again or contact support."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-2">{qrData.title}</h1>
        <p className="text-muted-foreground">
          {qrData.description || "Affiliate product recommendation"}
        </p>
        
        <div className="flex items-center my-4 text-sm">
          <User className="w-4 h-4 mr-1" />
          <span>Recommended by: {qrData.affiliateName}</span>
        </div>
      </div>
      
      <DemoProduct
        title="Premium Product"
        price="49.99"
        description="High-quality premium product with exclusive features"
        affiliateId={qrData.affiliateId}
        qrCode={qrData.code}
      />
    </div>
  );
}