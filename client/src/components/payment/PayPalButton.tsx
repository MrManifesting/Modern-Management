import React, { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

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
  const createOrder = async () => {
    const orderPayload = {
      amount: amount,
      currency: currency,
      intent: intent,
    };
    
    try {
      const response = await apiRequest("POST", "/api/paypal/order", orderPayload);
      const output = await response.json();
      return { orderId: output.id };
    } catch (error) {
      console.error("Failed to create PayPal order:", error);
      if (onError) onError(error);
      throw error;
    }
  };

  const captureOrder = async (orderId: string) => {
    try {
      const response = await apiRequest("POST", `/api/paypal/order/${orderId}/capture`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to capture PayPal order:", error);
      if (onError) onError(error);
      throw error;
    }
  };

  const handleApprove = async (data: any) => {
    console.log("PayPal order approved:", data);
    
    try {
      const orderData = await captureOrder(data.orderId);
      console.log("PayPal capture result:", orderData);
      
      if (onSuccess) {
        onSuccess(orderData);
      }
    } catch (error) {
      console.error("Error capturing PayPal order:", error);
      if (onError) onError(error);
    }
  };

  const handleCancel = (data: any) => {
    console.log("PayPal payment canceled:", data);
    if (onCancel) onCancel(data);
  };

  const handleError = (error: any) => {
    console.error("PayPal payment error:", error);
    if (onError) onError(error);
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
        if (onError) onError(e);
      }
    };

    if (!disabled) {
      loadPayPalSDK();
    }
  }, [disabled]);

  const initPayPal = async () => {
    try {
      // Get client token from server
      const clientToken = await apiRequest("GET", "/api/paypal/setup")
        .then((res) => res.json())
        .then((data) => data.clientToken);

      if (!clientToken) {
        throw new Error("Failed to get PayPal client token");
      }

      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });

      const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
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
          console.error("Error starting PayPal checkout:", e);
          if (onError) onError(e);
        }
      };

      const paypalButton = document.getElementById("paypal-button");

      if (paypalButton) {
        // Clear previous event listeners if any
        const newButton = paypalButton.cloneNode(true);
        if (paypalButton.parentNode) {
          paypalButton.parentNode.replaceChild(newButton, paypalButton);
        }
        
        // Add new event listener
        newButton.addEventListener("click", onClick);
      }
    } catch (e) {
      console.error("Failed to initialize PayPal:", e);
      if (onError) onError(e);
    }
  };

  return (
    <div className={className}>
      <button 
        className="w-full h-12 bg-[#0070ba] hover:bg-[#003087] text-white rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
        id="paypal-button"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.4 3H15.6C16.7 3 17.6 3.8 17.7 4.9L17.8 5.4C18.4 8.1 16.4 10.3 13.7 10.3H10.8C10.4 10.3 10 10.6 9.9 11L9.1 15.9C9 16.4 8.6 16.7 8.1 16.7H5.2C4.8 16.7 4.5 16.4 4.6 16L6.4 4C6.5 3.4 6.9 3 7.4 3Z" fill="currentColor" />
          <path d="M11.3 11L10.2 17.8C10.1 18.3 10.4 18.7 10.9 18.7H13.8C14.3 18.7 14.7 18.4 14.8 17.9L15.9 11C16 10.5 15.7 10.1 15.2 10.1H12C11.8 10.1 11.5 10.2 11.4 10.3C11.3 10.5 11.3 10.8 11.3 11Z" fill="currentColor" />
          <path d="M18.1 10.4L19.5 3.5C19.6 3.1 19.3 2.7 18.9 2.7H15.4C15.1 2.7 14.8 3 14.8 3.3L13.4 10.2C13.3 10.6 13.6 11 14 11H17.5C17.8 11 18.1 10.7 18.1 10.4Z" fill="currentColor" />
        </svg>
        Pay with PayPal
      </button>
    </div>
  );
}