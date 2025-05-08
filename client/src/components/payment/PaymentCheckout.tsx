import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PayPalButton } from './PayPalButton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader, CheckCircle } from 'lucide-react';

interface PaymentCheckoutProps {
  affiliateId: number;
  qrCode: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentCheckout({ affiliateId, qrCode, onSuccess, onCancel }: PaymentCheckoutProps) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input with up to 2 decimal places
    const value = e.target.value;
    if (/^(\d+)?(\.\d{0,2})?$/.test(value) || value === '') {
      setAmount(value);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    setIsProcessing(true);
    try {
      // Record the conversion with the payment data
      const response = await apiRequest('POST', `/api/qrcodes/${qrCode}/conversion`, {
        paymentId: paymentData.id,
        amount: parseFloat(amount),
        paymentMethod: 'paypal',
        affiliateId
      }, false);

      if (!response.ok) {
        throw new Error('Failed to record conversion');
      }

      setIsComplete(true);
      toast({
        title: 'Purchase Complete',
        description: 'Thank you for your purchase! The affiliate has been credited.'
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error recording conversion:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while processing your payment',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toast({
      title: 'Payment Failed',
      description: error.message || 'There was an error processing your payment',
      variant: 'destructive'
    });
  };

  if (isComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Payment Successful</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-center mb-4">
            Thank you for your purchase! The affiliate has been credited with this sale.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onSuccess} 
            className="w-full"
          >
            Return to Store
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Purchase</CardTitle>
        <CardDescription>
          This purchase will be credited to your referrer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="pl-8"
              disabled={isProcessing}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <PayPalButton
          amount={amount}
          currency="USD"
          disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
          className="w-full"
          buttonText="Pay with PayPal"
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          affiliateId={affiliateId}
          qrCode={qrCode}
        />
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full mt-2"
        >
          {isProcessing ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Cancel'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}