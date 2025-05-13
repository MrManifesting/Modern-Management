import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// PayPal button temporarily commented out to avoid token fetch errors
// import PayPalButton from '../components/PayPalButton';
import { Separator } from '@/components/ui/separator';

export function CheckoutPage() {
  const [amount, setAmount] = useState('19.99');
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('paypal');
  
  const handleStripePayment = () => {
    toast({
      title: "Stripe Payment",
      description: "Stripe integration will be implemented soon.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-center">Payment Testing</h1>
          <a href="/" className="text-blue-600 hover:underline">Back to Login</a>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Review your order details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Product:</span>
                <span>Premium Subscription</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${amount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Choose your preferred payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Button
                variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('paypal')}
                className="flex-1"
              >
                PayPal
              </Button>
              <Button
                variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('stripe')}
                className="flex-1"
              >
                Credit Card
              </Button>
            </div>
            
            <div className="mb-4">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="text"
                placeholder="Enter amount"
              />
            </div>
          </CardContent>
          <CardFooter>
            {paymentMethod === 'paypal' ? (
              <div className="w-full">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
                  onClick={() => {
                    toast({
                      title: "PayPal Integration Issue",
                      description: "PayPal client authentication failed. Please check your PayPal credentials and try again.",
                      variant: "destructive"
                    });
                  }}
                >
                  Pay with PayPal
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  PayPal integration requires valid API credentials
                </p>
              </div>
            ) : (
              <Button onClick={handleStripePayment} className="w-full">
                Pay with Stripe
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      </div>
    </div>
  );
}

export default CheckoutPage;