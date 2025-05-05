// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface PayPalButtonProps {
  amount: string;
  currency: string;
  intent: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onCancel?: (data: any) => void;
  disabled?: boolean;
  className?: string;
}

export default function PayPalButton({
  amount,
  currency,
  intent,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  className = "",
}: PayPalButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  const createOrder = async () => {
    try {
      const orderPayload = {
        amount: amount,
        currency: currency,
        intent: intent,
      };
      const response = await fetch("/api/paypal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      
      const output = await response.json();
      
      if (!output.success) {
        throw new Error(output.message || "Failed to create order");
      }
      
      return { orderId: output.id };
    } catch (error) {
      console.error("Failed to create PayPal order:", error);
      throw error;
    }
  };

  const captureOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/paypal/order/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to capture order");
      }
      
      return data;
    } catch (error) {
      console.error("Failed to capture PayPal order:", error);
      throw error;
    }
  };

  const handleApprove = async (data: any) => {
    try {
      console.log("PayPal onApprove", data);
      const orderData = await captureOrder(data.orderId);
      console.log("PayPal capture result", orderData);

      if (onSuccess) {
        onSuccess(orderData);
      } else {
        toast({
          title: "Payment Successful",
          description: "Your PayPal payment was processed successfully.",
        });
      }

      return orderData;
    } catch (error) {
      console.error("PayPal approve error:", error);
      if (onError) {
        onError(error);
      } else {
        toast({
          title: "Payment Failed",
          description: "There was an error processing your payment.",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const handleCancel = async (data: any) => {
    console.log("PayPal onCancel", data);
    if (onCancel) {
      onCancel(data);
    } else {
      toast({
        title: "Payment Cancelled",
        description: "You cancelled the PayPal payment process.",
        variant: "default",
      });
    }
  };

  const handleError = async (data: any) => {
    console.error("PayPal onError", data);
    if (onError) {
      onError(data);
    } else {
      toast({
        title: "Payment Error",
        description: "There was an error with the PayPal payment process.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        // First check if PayPal is configured on the server
        const setupResponse = await fetch("/api/paypal/setup");
        const setupData = await setupResponse.json();
        
        if (!setupData.success) {
          console.warn("PayPal integration not configured:", setupData.message);
          setIsConfigured(false);
          setIsLoading(false);
          return;
        }

        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = import.meta.env.PROD
            ? "https://www.paypal.com/web-sdk/v6/core"
            : "https://www.sandbox.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal(setupData.clientToken);
          document.body.appendChild(script);
        } else {
          await initPayPal(setupData.clientToken);
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
        setIsLoading(false);
        setIsConfigured(false);
      }
    };

    if (!disabled) {
      loadPayPalSDK();
    } else {
      setIsLoading(false);
    }
  }, [disabled]);

  const initPayPal = async (clientToken: string) => {
    try {
      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });

      const paypalCheckout =
        sdkInstance.createPayPalOneTimePaymentSession({
          onApprove: handleApprove,
          onCancel: handleCancel,
          onError: handleError,
        });

      const onClick = async () => {
        try {
          const checkoutOptionsPromise = createOrder();
          await paypalCheckout.start(
            { paymentFlow: "auto" },
            checkoutOptionsPromise,
          );
        } catch (e) {
          console.error("PayPal checkout error:", e);
          if (onError) {
            onError(e);
          } else {
            toast({
              title: "Payment Error",
              description: "There was an error starting the PayPal checkout process.",
              variant: "destructive",
            });
          }
        }
      };

      const paypalButton = document.getElementById("paypal-button");

      if (paypalButton) {
        paypalButton.addEventListener("click", onClick);
      }

      setIsLoading(false);
      
      return () => {
        if (paypalButton) {
          paypalButton.removeEventListener("click", onClick);
        }
      };
    } catch (e) {
      console.error("PayPal initialization error:", e);
      setIsLoading(false);
      setIsConfigured(false);
    }
  };

  if (disabled) {
    return (
      <Card className={`${className} opacity-50 cursor-not-allowed`}>
        <CardContent className="p-4 flex justify-center items-center">
          <div className="bg-slate-200 w-full h-12 rounded-md flex items-center justify-center text-slate-500 font-medium">
            PayPal Payment Disabled
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 flex justify-center items-center h-12">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span>Loading PayPal...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isConfigured) {
    return (
      <Card className={className}>
        <CardContent className="p-4 flex justify-center items-center">
          <div className="bg-amber-50 border border-amber-200 text-amber-700 w-full p-3 rounded-md text-center text-sm">
            PayPal integration is not configured. Please add your PayPal API credentials.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <paypal-button id="paypal-button" className="w-full h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"></paypal-button>
    </div>
  );
}
// <END_EXACT_CODE>