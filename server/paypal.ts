// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { Request, Response } from "express";

/* PayPal Controllers Setup */

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

const getPayPalClient = () => {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.warn("PayPal credentials not found. PayPal integration will be disabled until credentials are provided.");
    return null;
  }

  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CLIENT_ID,
      oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment:
      process.env.NODE_ENV === "production"
        ? Environment.Production
        : Environment.Sandbox,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: {
        logBody: true,
      },
      logResponse: {
        logHeaders: true,
      },
    },
  });
};

/* Token generation helpers */

export async function getClientToken(req: Request, res: Response) {
  try {
    const client = getPayPalClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        message: "PayPal integration is not configured. Please add your PayPal credentials to continue."
      });
    }

    const oAuthAuthorizationController = new OAuthAuthorizationController(client);
    
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");

    const { result } = await oAuthAuthorizationController.requestToken(
      {
        authorization: `Basic ${auth}`,
      },
      { intent: "sdk_init", response_type: "client_token" },
    );

    return res.json({
      success: true,
      clientToken: result.accessToken
    });
  } catch (error) {
    console.error("Error getting PayPal client token:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate PayPal client token"
    });
  }
}

/*  Process transactions */

export async function createPaypalOrder(req: Request, res: Response) {
  try {
    const client = getPayPalClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        message: "PayPal integration is not configured. Please add your PayPal credentials to continue."
      });
    }

    const ordersController = new OrdersController(client);
    const { amount, currency, intent } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid amount. Amount must be a positive number.",
        });
    }

    if (!currency) {
      return res
        .status(400)
        .json({ 
          success: false,
          error: "Invalid currency. Currency is required." 
        });
    }

    if (!intent) {
      return res
        .status(400)
        .json({ 
          success: false,
          error: "Invalid intent. Intent is required." 
        });
    }

    const collect = {
      body: {
        intent: intent,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: amount,
            },
          },
        ],
      },
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.createOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    res.status(httpStatusCode).json({
      success: true,
      ...jsonResponse
    });
  } catch (error) {
    console.error("Failed to create PayPal order:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create order." 
    });
  }
}

export async function capturePaypalOrder(req: Request, res: Response) {
  try {
    const client = getPayPalClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        message: "PayPal integration is not configured. Please add your PayPal credentials to continue."
      });
    }

    const ordersController = new OrdersController(client);
    const { orderID } = req.params;
    const collect = {
      id: orderID,
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.captureOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    res.status(httpStatusCode).json({
      success: true, 
      ...jsonResponse
    });
  } catch (error) {
    console.error("Failed to capture PayPal order:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to capture order." 
    });
  }
}

export async function loadPaypalDefault(req: Request, res: Response) {
  try {
    // Check if PayPal credentials are available
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      return res.status(503).json({
        success: false,
        message: "PayPal integration is not configured. Please add your PayPal credentials to continue."
      });
    }

    const client = getPayPalClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        message: "Failed to initialize PayPal client"
      });
    }

    const oAuthAuthorizationController = new OAuthAuthorizationController(client);
    
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");

    const { result } = await oAuthAuthorizationController.requestToken(
      {
        authorization: `Basic ${auth}`,
      },
      { intent: "sdk_init", response_type: "client_token" },
    );

    return res.json({
      success: true,
      clientToken: result.accessToken
    });
  } catch (error) {
    console.error("Error loading PayPal default settings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize PayPal integration"
    });
  }
}
// <END_EXACT_CODE>

// Additional PayPal service functions
export default {
  isConfigured: (): boolean => !!PAYPAL_CLIENT_ID && !!PAYPAL_CLIENT_SECRET,
  
  // Create a PayPal payment with affiliate tracking
  async createPaymentWithAffiliateTracking(amount: number, currency: string = 'USD', metadata: Record<string, any> = {}) {
    try {
      const client = getPayPalClient();
      if (!client) {
        throw new Error("PayPal integration is not configured");
      }

      const ordersController = new OrdersController(client);
      
      const purchaseUnit = {
        amount: {
          currencyCode: currency,
          value: amount.toString(),
        },
        description: metadata.description || "Affiliate purchase",
        custom_id: JSON.stringify({
          affiliate_id: metadata.affiliate_id,
          affiliate_code: metadata.affiliate_code,
          qr_code: metadata.qr_code,
          commission_rate: metadata.commission_rate,
        }),
      };

      const collect = {
        body: {
          intent: "CAPTURE",
          purchaseUnits: [purchaseUnit],
        },
        prefer: "return=minimal",
      };

      const { body } = await ordersController.createOrder(collect);
      return JSON.parse(String(body));
    } catch (error) {
      console.error("Failed to create PayPal payment with affiliate tracking:", error);
      throw error;
    }
  },

  // Process affiliate commission for a PayPal order
  async processAffiliateCommission(orderID: string, affiliateId: number, commissionRate: number = 0.04) {
    try {
      const client = getPayPalClient();
      if (!client) {
        throw new Error("PayPal integration is not configured");
      }

      const ordersController = new OrdersController(client);
      
      // Get the order details
      const { body } = await ordersController.getOrder(orderID);
      const orderDetails = JSON.parse(String(body));
      
      // Calculate commission
      const purchaseUnit = orderDetails.purchaseUnits[0];
      const amount = parseFloat(purchaseUnit.amount.value);
      const commissionAmount = amount * commissionRate;
      
      // In a real implementation, we would use PayPal's payouts API to transfer the commission
      // to the affiliate's PayPal account. For simplicity in this example, we'll just return
      // the calculated commission.
      
      return {
        orderID,
        affiliateId,
        commissionAmount,
        commissionRate,
        currency: purchaseUnit.amount.currency_code,
        purchaseAmount: amount,
      };
    } catch (error) {
      console.error("Failed to process affiliate commission for PayPal order:", error);
      throw error;
    }
  }
};