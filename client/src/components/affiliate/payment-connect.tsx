import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StripeAccountForm } from "@/components/payment/StripeAccountForm";

interface PaymentConnectProps {
  affiliateId: number;
  onAccountConnected?: () => void;
}

export function PaymentConnect({ affiliateId, onAccountConnected }: PaymentConnectProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<string>("stripe");
  const [loading, setLoading] = useState(true);
  const [paypalStatus, setPaypalStatus] = useState<{
    isConfigured: boolean;
    email?: string;
  }>({ isConfigured: false });

  useEffect(() => {
    if (affiliateId) {
      checkPayPalStatus();
    }
  }, [affiliateId]);

  const checkPayPalStatus = async () => {
    try {
      setLoading(true);
      // We could add a real endpoint here to check PayPal status
      // For now, we'll use a simulated status
      
      // Check if the PayPal environment variables are set
      const response = await apiRequest(
        "GET",
        `/api/paypal/setup`
      );
      const data = await response.json();

      if (data.success) {
        setPaypalStatus({ 
          isConfigured: true,
          email: "affiliate@example.com" // In a real app, this would come from the backend
        });
      } else {
        setPaypalStatus({ isConfigured: false });
      }
    } catch (error) {
      console.error("Error checking PayPal status:", error);
      setPaypalStatus({ isConfigured: false });
      toast({
        title: "Error",
        description: "Failed to check PayPal account status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectPayPalAccount = async () => {
    // In a real app, this would redirect to PayPal OAuth flow
    toast({
      title: "PayPal Connection",
      description: "In a real app, this would connect your PayPal account.",
    });
    
    // Simulate successful connection
    setTimeout(() => {
      setPaypalStatus({ 
        isConfigured: true,
        email: "affiliate@example.com"
      });
      
      if (onAccountConnected) {
        onAccountConnected();
      }
    }, 1500);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="h-5 w-5 mr-2" />
          Payment Account Setup
        </CardTitle>
        <CardDescription>
          Connect a payment account to receive commission payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="stripe">
              <CreditCard className="w-4 h-4 mr-2" />
              Stripe Connect
            </TabsTrigger>
            <TabsTrigger value="paypal">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.4 3H15.6C16.7 3 17.6 3.8 17.7 4.9L17.8 5.4C18.4 8.1 16.4 10.3 13.7 10.3H10.8C10.4 10.3 10 10.6 9.9 11L9.1 15.9C9 16.4 8.6 16.7 8.1 16.7H5.2C4.8 16.7 4.5 16.4 4.6 16L6.4 4C6.5 3.4 6.9 3 7.4 3Z" fill="currentColor" />
                <path d="M11.3 11L10.2 17.8C10.1 18.3 10.4 18.7 10.9 18.7H13.8C14.3 18.7 14.7 18.4 14.8 17.9L15.9 11C16 10.5 15.7 10.1 15.2 10.1H12C11.8 10.1 11.5 10.2 11.4 10.3C11.3 10.5 11.3 10.8 11.3 11Z" fill="currentColor" />
                <path d="M18.1 10.4L19.5 3.5C19.6 3.1 19.3 2.7 18.9 2.7H15.4C15.1 2.7 14.8 3 14.8 3.3L13.4 10.2C13.3 10.6 13.6 11 14 11H17.5C17.8 11 18.1 10.7 18.1 10.4Z" fill="currentColor" />
              </svg>
              PayPal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stripe">
            <StripeAccountForm 
              affiliateId={affiliateId} 
              onAccountConnected={onAccountConnected} 
            />
          </TabsContent>
          
          <TabsContent value="paypal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.4 3H15.6C16.7 3 17.6 3.8 17.7 4.9L17.8 5.4C18.4 8.1 16.4 10.3 13.7 10.3H10.8C10.4 10.3 10 10.6 9.9 11L9.1 15.9C9 16.4 8.6 16.7 8.1 16.7H5.2C4.8 16.7 4.5 16.4 4.6 16L6.4 4C6.5 3.4 6.9 3 7.4 3Z" fill="currentColor" />
                      <path d="M11.3 11L10.2 17.8C10.1 18.3 10.4 18.7 10.9 18.7H13.8C14.3 18.7 14.7 18.4 14.8 17.9L15.9 11C16 10.5 15.7 10.1 15.2 10.1H12C11.8 10.1 11.5 10.2 11.4 10.3C11.3 10.5 11.3 10.8 11.3 11Z" fill="currentColor" />
                      <path d="M18.1 10.4L19.5 3.5C19.6 3.1 19.3 2.7 18.9 2.7H15.4C15.1 2.7 14.8 3 14.8 3.3L13.4 10.2C13.3 10.6 13.6 11 14 11H17.5C17.8 11 18.1 10.7 18.1 10.4Z" fill="currentColor" />
                    </svg>
                    PayPal Account
                  </span>
                  {paypalStatus.isConfigured && (
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      Connected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {paypalStatus.isConfigured 
                    ? `Connected as ${paypalStatus.email}` 
                    : "Connect your PayPal account to receive commission payouts"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!paypalStatus.isConfigured ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <AlertCircle className="h-12 w-12 text-amber-500" />
                    <p className="text-center text-sm">
                      You need to connect your PayPal account to receive commission payouts.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <CheckCircle className="h-12 w-12 text-blue-500" />
                    <p className="text-center text-sm">
                      Your PayPal account is connected and ready to receive payouts.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                {!paypalStatus.isConfigured ? (
                  <Button
                    onClick={connectPayPalAccount}
                    className="w-full bg-[#0070ba] hover:bg-[#003087]"
                  >
                    Connect PayPal Account
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full flex items-center gap-2"
                    onClick={() => window.open("https://www.paypal.com", "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open PayPal Dashboard
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}