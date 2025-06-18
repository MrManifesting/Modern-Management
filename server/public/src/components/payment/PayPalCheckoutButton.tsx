// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
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

interface PayPalButtonProps {
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
  className
}: PayPalButtonProps) {
  const createOrder = async () => {
    const orderPayload = {
      amount: amount,
      currency: currency,
      intent: intent,
      affiliateId: affiliateId,
      qrCode: qrCode
    };
    
    // Use appropriate endpoint for affiliate tracking
    const endpoint = affiliateId ? "/api/affiliates/payment/order" : "/api/paypal/order";
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    // Use appropriate endpoint for affiliate tracking
    const endpoint = affiliateId 
      ? `/api/affiliates/payment/order/${orderId}/capture`
      : `/api/paypal/order/${orderId}/capture`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        affiliateId,
        qrCode
      })
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
    } catch (error) {
      console.error("Error capturing order:", error);
      if (onError) {
        onError(error);
      }
    }
  };

  const handleCancel = async (data: any) => {
    console.log("onCancel", data);
    if (onCancel) {
      onCancel(data);
    }
  };

  const handleError = async (error: any) => {
    console.log("onError", error);
    if (onError) {
      onError(error);
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
        if (onError) {
          onError(e);
        }
      }
    };

    loadPayPalSDK();
    
    // Cleanup
    return () => {
      const paypalButton = document.getElementById("paypal-button");
      if (paypalButton) {
        // Remove event listeners when component unmounts
        const oldButton = paypalButton.cloneNode(true);
        paypalButton.parentNode?.replaceChild(oldButton, paypalButton);
      }
    };
  }, [amount, currency, intent, affiliateId, qrCode]);
  
  const initPayPal = async () => {
    try {
      // Get client token from the server
      const clientToken: string = await fetch("/api/paypal/setup")
        .then((res) => res.json())
        .then((data) => {
          return data.clientToken;
        });
        
      // Create PayPal instance
      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });

      // Create one-time payment session
      const paypalCheckout =
            sdkInstance.createPayPalOneTimePaymentSession({
              onApprove: handleApprove,
              onCancel: handleCancel,
              onError: handleError,
            });

      // Handle button click
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
          }
        }
      };

      // Add click listener to button
      const paypalButton = document.getElementById("paypal-button");
      if (paypalButton) {
        // Remove any existing listeners
        const oldButton = paypalButton.cloneNode(true);
        if (paypalButton.parentNode) {
          paypalButton.parentNode.replaceChild(oldButton, paypalButton);
        }
        
        // Add new click listener
        document.getElementById("paypal-button")?.addEventListener("click", onClick);
      }
    } catch (e) {
      console.error("PayPal initialization error:", e);
      if (onError) {
        onError(e);
      }
    }
  };

  return (
    <div className={className}>
      <paypal-button 
        id="paypal-button" 
        className="bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center cursor-pointer transition-colors"
      >
        <span className="flex items-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
            <path d="M7.07105 18.3644H3.07324C2.76233 18.3644 2.52342 18.1255 2.52342 17.8146C2.52342 17.7583 2.53361 17.7021 2.55402 17.65L7.72032 3.57983C7.82175 3.32073 8.08104 3.16187 8.35052 3.19865L15.4695 4.14728C16.1227 4.24127 16.7352 4.50078 17.2442 4.89797C17.7532 5.29517 18.1453 5.80997 18.3653 6.39438C18.5854 6.97879 18.623 7.6146 18.4741 8.22061C18.3252 8.82662 17.9957 9.3804 17.522 9.82311C17.9874 10.2934 18.2993 10.8789 18.4222 11.5156C18.5451 12.1523 18.4734 12.8128 18.216 13.4111C17.9586 14.0094 17.5267 14.5197 16.9774 14.8747C16.4281 15.2298 15.7873 15.4128 15.1341 15.3976H14.8034C14.4924 15.3976 14.2536 15.1587 14.2536 14.8478C14.2536 14.5368 14.4924 14.298 14.8034 14.298H15.1341C15.5751 14.3068 16.0089 14.185 16.3807 13.9479C16.7524 13.7108 17.0451 13.3706 17.218 12.971C17.3909 12.5714 17.4361 12.1308 17.3479 11.706C17.2596 11.2812 17.0413 10.8923 16.7229 10.5897L16.5485 10.4357L16.6415 10.2205C16.8532 9.7781 16.9303 9.28558 16.8637 8.79982C16.797 8.31406 16.5891 7.86029 16.2658 7.49708C15.9426 7.13386 15.5195 6.8786 15.0503 6.76287C14.5811 6.64714 14.0885 6.67592 13.6359 6.8456L13.3255 6.9487L13.2325 6.63779L13.0276 6.09816C12.9873 5.99673 12.9163 5.91048 12.8249 5.85466L8.61511 8.94729L6.23212 15.8167L9.37066 15.8269H9.38594C9.69684 15.8269 9.93575 16.0658 9.93575 16.3767C9.93575 16.6876 9.69684 16.9265 9.38594 16.9265H9.37066L5.66697 16.9152L4.39893 20.1575C4.29751 20.4167 4.03825 20.5756 3.76872 20.5388L1.77028 20.1677C1.47466 20.1298 1.25615 19.8603 1.29409 19.5646C1.33203 19.269 1.60153 19.0505 1.89714 19.0884L3.56857 19.4023L4.69803 16.5145L2.61468 16.5134L1.02809 21.0249C0.926687 21.2841 0.667398 21.443 0.397906 21.4062C0.102283 21.3683 -0.116228 21.0988 -0.0782879 20.8032C-0.0403478 20.5075 0.229216 20.289 0.524838 20.3269L0.785048 20.3841L2.5119 15.4642C2.61333 15.2051 2.87262 15.0462 3.14214 15.0831L6.87583 15.5012L9.18647 8.87618C9.18647 8.87618 9.18647 8.87618 9.18647 8.87618L11.1747 3.56971L9.36047 3.29006L4.42947 16.9152L1.02809 16.9132C0.717186 16.9132 0.478271 16.6743 0.478271 16.3634C0.478271 16.0524 0.717186 15.8136 1.02809 15.8136L1.02809 15.8132L3.92261 15.8152L7.61085 4.43127L11.4545 4.95563L11.8971 5.05724L7.61086 8.17028L7.07105 18.3644ZM12.1175 7.02639L12.2003 7.12782L15.2347 10.3753L16.0502 9.02757C16.2215 8.7421 16.3072 8.42129 16.2981 8.0969C16.289 7.77251 16.1855 7.45758 15.9977 7.18151C15.81 6.90543 15.5451 6.68068 15.235 6.53336C14.9249 6.38605 14.5817 6.32209 14.2414 6.34927L12.1175 7.02639ZM11.053 6.43129L8.32422 14.7275H10.8398C11.1507 14.7275 11.3896 14.9664 11.3896 15.2773C11.3896 15.5882 11.1507 15.8271 10.8398 15.8271H7.77206C7.461 15.8271 7.22204 15.5881 7.22222 15.277V15.2667L7.80762 8.75754L11.053 6.43129Z" fill="white"/>
          </svg>
          Pay with PayPal
        </span>
      </paypal-button>
    </div>
  );
}
// <END_EXACT_CODE>