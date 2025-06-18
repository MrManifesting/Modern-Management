import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PayPalButtonProps {
  amount: string;
  currency?: string;
  intent?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  className?: string;
  buttonText?: string;
  affiliateId?: number;
  qrCode?: string;
}

export function PayPalButton({
  amount,
  currency = 'USD',
  intent = 'CAPTURE',
  onSuccess,
  onError,
  disabled = false,
  className = '',
  buttonText = 'Pay with PayPal',
  affiliateId,
  qrCode
}: PayPalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if PayPal is configured
    checkPayPalStatus();
  }, []);

  const checkPayPalStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/paypal/status');
      if (!response.ok) {
        throw new Error('Failed to check PayPal status');
      }
      
      const data = await response.json();
      
      if (data.success && data.data.isConfigured) {
        setIsReady(true);
      } else {
        console.warn('PayPal is not configured');
        setIsReady(false);
      }
    } catch (error) {
      console.error('Failed to check PayPal status:', error);
      setIsReady(false);
    }
  };

  const handlePaymentStart = async () => {
    if (!isReady || isLoading || disabled) return;
    
    setIsLoading(true);
    try {
      // Create order
      const orderResponse = await apiRequest('POST', '/api/paypal/order', {
        amount,
        currency,
        intent,
        metadata: {
          affiliateId,
          qrCode
        }
      }, false);
      
      if (!orderResponse.ok) {
        throw new Error('Failed to create PayPal order');
      }
      
      const orderData = await orderResponse.json();
      
      if (!orderData.id) {
        throw new Error('No order ID returned from PayPal');
      }
      
      // Create a fake form submission to open PayPal checkout in a new window
      const form = document.createElement('form');
      form.method = 'post';
      form.action = process.env.NODE_ENV === 'production'
        ? `https://www.paypal.com/checkout/v2/approval/create/${orderData.id}`
        : `https://www.sandbox.paypal.com/checkout/v2/approval/create/${orderData.id}`;
      form.target = '_blank';
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
      // Poll for completion
      const checkOrderStatus = async () => {
        try {
          const captureResponse = await apiRequest('POST', `/api/paypal/order/${orderData.id}/capture`);
          
          if (captureResponse.ok) {
            const captureData = await captureResponse.json();
            
            toast({
              title: 'Payment Successful',
              description: 'Your PayPal payment has been processed successfully!'
            });
            
            if (onSuccess) {
              onSuccess(captureData);
            }
            clearInterval(statusCheckInterval);
            setIsLoading(false);
          }
        } catch (err) {
          // Don't handle errors during polling - just keep trying
          console.log('Payment not completed yet, continuing to poll...');
        }
      };
      
      // Poll every 3 seconds for up to 5 minutes (100 attempts)
      let attempts = 0;
      const statusCheckInterval = setInterval(() => {
        attempts++;
        if (attempts > 100) {
          clearInterval(statusCheckInterval);
          setIsLoading(false);
          toast({
            title: 'Payment Timeout',
            description: 'The payment process took too long. Please try again.',
            variant: 'destructive'
          });
        } else {
          checkOrderStatus();
        }
      }, 3000);
      
    } catch (error: any) {
      console.error('PayPal payment error:', error);
      setIsLoading(false);
      
      toast({
        title: 'Payment Failed',
        description: error.message || 'An error occurred while processing your payment.',
        variant: 'destructive'
      });
      
      if (onError) {
        onError(error);
      }
    }
  };

  if (!isReady) {
    return (
      <Button 
        disabled 
        className={className}
        variant="outline"
      >
        PayPal Not Available
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePaymentStart}
      disabled={isLoading || disabled || !isReady}
      className={`bg-[#0070ba] hover:bg-[#003087] text-white ${className}`}
    >
      {isLoading ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.4 3H15.6C16.7 3 17.6 3.8 17.7 4.9L17.8 5.4C18.4 8.1 16.4 10.3 13.7 10.3H10.8C10.4 10.3 10 10.6 9.9 11L9.1 15.9C9 16.4 8.6 16.7 8.1 16.7H5.2C4.8 16.7 4.5 16.4 4.6 16L6.4 4C6.5 3.4 6.9 3 7.4 3Z" fill="currentColor" />
            <path d="M11.3 11L10.2 17.8C10.1 18.3 10.4 18.7 10.9 18.7H13.8C14.3 18.7 14.7 18.4 14.8 17.9L15.9 11C16 10.5 15.7 10.1 15.2 10.1H12C11.8 10.1 11.5 10.2 11.4 10.3C11.3 10.5 11.3 10.8 11.3 11Z" fill="currentColor" />
            <path d="M18.1 10.4L19.5 3.5C19.6 3.1 19.3 2.7 18.9 2.7H15.4C15.1 2.7 14.8 3 14.8 3.3L13.4 10.2C13.3 10.6 13.6 11 14 11H17.5C17.8 11 18.1 10.7 18.1 10.4Z" fill="currentColor" />
          </svg>
          {buttonText}
        </>
      )}
    </Button>
  );
}