import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreditCard, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PayPalButton from "./PayPalButton";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<any> | null = null;

// Initialize Stripe only if the API key is available
if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
}

interface PaymentMethodSelectorProps {
  amount: number;
  currency?: string;
  onPaymentComplete?: (paymentData: any) => void;
  onPaymentError?: (error: any) => void;
  onPaymentCancel?: () => void;
  metadata?: Record<string, any>;
  stripeClientSecret?: string;
  disabled?: boolean;
}

function StripeCheckoutForm({ 
  onPaymentComplete,
  onPaymentError, 
  disabled = false 
}: {
  onPaymentComplete?: (paymentData: any) => void;
  onPaymentError?: (error: any) => void;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || disabled) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        console.error("Stripe payment error:", error);
        
        toast({
          title: "Payment Failed",
          description: error.message || "Your payment could not be processed.",
          variant: "destructive",
        });
        
        if (onPaymentError) {
          onPaymentError(error);
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        
        if (onPaymentComplete) {
          onPaymentComplete(paymentIntent);
        }
      }
    } catch (error) {
      console.error("Stripe form submission error:", error);
      
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment processing.",
        variant: "destructive",
      });
      
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isSubmitting || disabled}
        className="w-full"
      >
        {isSubmitting ? "Processing..." : "Pay with Card"}
      </Button>
    </form>
  );
}

export default function PaymentMethodSelector({
  amount,
  currency = "USD",
  onPaymentComplete,
  onPaymentError,
  onPaymentCancel,
  metadata = {},
  stripeClientSecret,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("stripe");
  const { toast } = useToast();
  const formattedAmount = amount.toFixed(2);
  const isStripeConfigured = !!stripePromise && !!stripeClientSecret;
  
  const handlePayPalSuccess = (data: any) => {
    if (onPaymentComplete) {
      onPaymentComplete({
        type: 'paypal',
        data
      });
    }
  };
  
  const handlePayPalError = (error: any) => {
    if (onPaymentError) {
      onPaymentError({
        type: 'paypal',
        error
      });
    }
  };
  
  const handlePayPalCancel = (data: any) => {
    if (onPaymentCancel) {
      onPaymentCancel();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Method</span>
          <span className="text-sm font-normal">
            Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="stripe" disabled={!isStripeConfigured || disabled}>
              <CreditCard className="w-4 h-4 mr-2" />
              Card
            </TabsTrigger>
            <TabsTrigger value="paypal" disabled={disabled}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.4 3H15.6C16.7 3 17.6 3.8 17.7 4.9L17.8 5.4C18.4 8.1 16.4 10.3 13.7 10.3H10.8C10.4 10.3 10 10.6 9.9 11L9.1 15.9C9 16.4 8.6 16.7 8.1 16.7H5.2C4.8 16.7 4.5 16.4 4.6 16L6.4 4C6.5 3.4 6.9 3 7.4 3Z" fill="currentColor" />
                <path d="M11.3 11L10.2 17.8C10.1 18.3 10.4 18.7 10.9 18.7H13.8C14.3 18.7 14.7 18.4 14.8 17.9L15.9 11C16 10.5 15.7 10.1 15.2 10.1H12C11.8 10.1 11.5 10.2 11.4 10.3C11.3 10.5 11.3 10.8 11.3 11Z" fill="currentColor" />
                <path d="M18.1 10.4L19.5 3.5C19.6 3.1 19.3 2.7 18.9 2.7H15.4C15.1 2.7 14.8 3 14.8 3.3L13.4 10.2C13.3 10.6 13.6 11 14 11H17.5C17.8 11 18.1 10.7 18.1 10.4Z" fill="currentColor" />
              </svg>
              PayPal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stripe">
            {isStripeConfigured ? (
              <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                <StripeCheckoutForm 
                  onPaymentComplete={onPaymentComplete}
                  onPaymentError={onPaymentError}
                  disabled={disabled}
                />
              </Elements>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md flex items-center">
                <Info className="w-5 h-5 mr-2" />
                <span>Stripe is not configured. Please add your Stripe API keys.</span>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="paypal">
            <PayPalButton
              amount={formattedAmount}
              currency={currency}
              intent="CAPTURE"
              onSuccess={handlePayPalSuccess}
              onError={handlePayPalError}
              onCancel={handlePayPalCancel}
              disabled={disabled}
              className="mt-2"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}