// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
import React, { useEffect } from "react";

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

interface PayPalCheckoutButtonProps {
  amount: string;
  currency: string;
  intent: string;
  affiliateId?: number;
  qrCode?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onCancel?: (data: any) => void;
  className?: string;
}

export default function PayPalCheckoutButton({
  amount,
  currency,
  intent,
  affiliateId,
  qrCode,
  onSuccess,
  onError,
  onCancel,
  className,
}: PayPalCheckoutButtonProps) {
  const createOrder = async () => {
    const orderPayload = {
      amount: amount,
      currency: currency,
      intent: intent,
      metadata: {
        affiliate_id: affiliateId,
        qr_code: qrCode,
        commission_rate: 0.04 // 4% commission rate
      }
    };
    const response = await fetch("/api/paypal/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    const response = await fetch(`/api/paypal/order/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    return data;
  };

  const handleApprove = async (data: any) => {
    console.log("onApprove", data);
    try {
      const orderData = await captureOrder(data.orderId);
      console.log("Capture result", orderData);
      
      if (onSuccess) {
        onSuccess(orderData);
      }
      
      // Process affiliate commission if applicable
      if (affiliateId && qrCode) {
        try {
          const commissionResponse = await fetch("/api/affiliates/process-commission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderId,
              affiliateId,
              qrCode,
              amount: parseFloat(amount),
              paymentProcessor: "paypal"
            }),
          });
          
          const commissionResult = await commissionResponse.json();
          console.log("Affiliate commission processed:", commissionResult);
        } catch (commissionError) {
          console.error("Error processing affiliate commission:", commissionError);
        }
      }
    } catch (err) {
      console.error("Error capturing order:", err);
      if (onError) {
        onError(err);
      }
    }
  };

  const handleCancel = (data: any) => {
    console.log("onCancel", data);
    if (onCancel) {
      onCancel(data);
    }
  };

  const handleError = (data: any) => {
    console.error("PayPal error:", data);
    if (onError) {
      onError(data);
    }
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = import.meta.env.PROD
            ? "https://www.paypal.com/web-sdk/v6/core"
            : "https://www.sandbox.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
      }
    };

    loadPayPalSDK();
  }, []);
  
  const initPayPal = async () => {
    try {
      const clientToken: string = await fetch("/api/paypal/setup")
        .then((res) => res.json())
        .then((data) => {
          return data.clientToken;
        });
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
          console.error(e);
        }
      };

      const paypalButton = document.getElementById("paypal-button");

      if (paypalButton) {
        paypalButton.addEventListener("click", onClick);
      }

      return () => {
        if (paypalButton) {
          paypalButton.removeEventListener("click", onClick);
        }
      };
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={className}>
      <paypal-button id="paypal-button" className="w-full h-12 flex items-center justify-center bg-[#0070ba] hover:bg-[#003087] text-white rounded-md cursor-pointer">
        <div className="flex items-center justify-center">
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.4 3H15.6C16.7 3 17.6 3.8 17.7 4.9L17.8 5.4C18.4 8.1 16.4 10.3 13.7 10.3H10.8C10.4 10.3 10 10.6 9.9 11L9.1 15.9C9 16.4 8.6 16.7 8.1 16.7H5.2C4.8 16.7 4.5 16.4 4.6 16L6.4 4C6.5 3.4 6.9 3 7.4 3Z" fill="currentColor" />
            <path d="M11.3 11L10.2 17.8C10.1 18.3 10.4 18.7 10.9 18.7H13.8C14.3 18.7 14.7 18.4 14.8 17.9L15.9 11C16 10.5 15.7 10.1 15.2 10.1H12C11.8 10.1 11.5 10.2 11.4 10.3C11.3 10.5 11.3 10.8 11.3 11Z" fill="currentColor" />
            <path d="M18.1 10.4L19.5 3.5C19.6 3.1 19.3 2.7 18.9 2.7H15.4C15.1 2.7 14.8 3 14.8 3.3L13.4 10.2C13.3 10.6 13.6 11 14 11H17.5C17.8 11 18.1 10.7 18.1 10.4Z" fill="currentColor" />
          </svg>
          Pay with PayPal
        </div>
      </paypal-button>
    </div>
  );
}