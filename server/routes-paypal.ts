/**
 * Routes for PayPal payment processing
 */
import { Request, Response } from "express";
import { Express } from "express";
import { IStorage } from "./storage";
import {
  getClientToken,
  createPaypalOrder,
  capturePaypalOrder,
  loadPaypalDefault
} from "./paypal";

/**
 * Register PayPal API routes
 */
export function registerPayPalRoutes(app: Express, storage: IStorage) {
  /**
   * Check if PayPal is properly configured
   */
  app.get("/api/paypal/status", async (_req: Request, res: Response) => {
    try {
      const isPayPalConfigured = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
      
      res.json({
        success: true,
        data: {
          isConfigured: !!isPayPalConfigured
        }
      });
    } catch (error: any) {
      console.error("Error checking PayPal configuration:", error);
      res.status(500).json({
        success: false,
        message: "Error checking PayPal configuration",
        error: error.message
      });
    }
  });

  /**
   * Get PayPal client token for frontend initialization
   */
  app.get("/api/paypal/setup", async (req: Request, res: Response) => {
    try {
      await loadPaypalDefault(req, res);
    } catch (error: any) {
      console.error("Error getting PayPal client token:", error);
      res.status(500).json({
        success: false,
        message: "Error getting PayPal client token",
        error: error.message
      });
    }
  });
  
  /**
   * Create a PayPal order
   */
  app.post("/api/paypal/order", async (req: Request, res: Response) => {
    try {
      await createPaypalOrder(req, res);
    } catch (error: any) {
      console.error("Error creating PayPal order:", error);
      res.status(500).json({
        success: false,
        message: "Error creating PayPal order",
        error: error.message
      });
    }
  });
  
  /**
   * Capture a PayPal order payment
   */
  app.post("/api/paypal/order/:orderID/capture", async (req: Request, res: Response) => {
    try {
      await capturePaypalOrder(req, res);
    } catch (error: any) {
      console.error("Error capturing PayPal order:", error);
      res.status(500).json({
        success: false,
        message: "Error capturing PayPal order",
        error: error.message
      });
    }
  });
  
  /**
   * Create a PayPal order with affiliate tracking
   */
  app.post("/api/affiliates/payment/order", async (req: Request, res: Response) => {
    try {
      const { amount, currency, intent, affiliateId, qrCode } = req.body;
      
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required for affiliate payments"
        });
      }
      
      // Verify affiliate exists
      const affiliate = await storage.getAffiliateById(Number(affiliateId));
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // If QR code provided, verify it exists and belongs to affiliate
      if (qrCode) {
        const qrCodeData = await storage.getQrCodeByCode(qrCode);
        if (!qrCodeData) {
          return res.status(404).json({
            success: false,
            message: "QR code not found"
          });
        }
        
        if (qrCodeData.affiliateId !== affiliate.id) {
          return res.status(400).json({
            success: false,
            message: "QR code does not belong to the provided affiliate"
          });
        }
      }
      
      // Create PayPal order with affiliate metadata
      req.body.metadata = {
        affiliateId,
        qrCode
      };
      
      await createPaypalOrder(req, res);
      
    } catch (error: any) {
      console.error("Error creating affiliated PayPal order:", error);
      res.status(500).json({
        success: false,
        message: "Error creating affiliated PayPal order",
        error: error.message
      });
    }
  });
  
  /**
   * Capture a PayPal order payment with affiliate commission
   */
  app.post("/api/affiliates/payment/order/:orderID/capture", async (req: Request, res: Response) => {
    try {
      const { orderID } = req.params;
      const { affiliateId, qrCode } = req.body;
      
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required for affiliate commission processing"
        });
      }
      
      // Capture the payment first
      const captureResponse = await capturePaypalOrder(req, res);
      
      // After successful capture, process the affiliate commission
      // Note: this might not execute since capturePaypalOrder will send response
      // Need to modify paypal.ts to handle affiliate commission processing
      
    } catch (error: any) {
      console.error("Error capturing affiliated PayPal order:", error);
      res.status(500).json({
        success: false,
        message: "Error capturing affiliated PayPal order",
        error: error.message
      });
    }
  });
  
  /**
   * Process commission for an affiliate based on a PayPal sale
   */
  app.post("/api/affiliates/process-paypal-commission", async (req: Request, res: Response) => {
    try {
      const { affiliateId, orderId, amount, qrCode } = req.body;
      
      if (!affiliateId || !orderId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID, order ID, and amount are required"
        });
      }
      
      // Verify affiliate exists
      const affiliate = await storage.getAffiliateById(Number(affiliateId));
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Process commission with a 4% rate
      const commissionRate = 0.04;
      const commissionAmount = parseFloat(amount) * commissionRate;
      
      // Record QR code conversion if present
      let qrCodeRecord = null;
      if (qrCode) {
        qrCodeRecord = await storage.getQrCodeByCode(qrCode);
        if (qrCodeRecord) {
          await storage.incrementQrCodeConversions(qrCodeRecord.id);
        }
      }
      
      // Create transaction record
      const transaction = await storage.createAffiliateTransaction({
        affiliateId: Number(affiliateId),
        saleId: orderId,
        transactionType: "commission",
        amount: commissionAmount,
        description: `Commission for PayPal order ${orderId}`,
        status: "pending",
        paypalOrderId: orderId,
        feeAmount: 0 // No fee for commissions
      });
      
      // Update affiliate stats
      await storage.updateAffiliateStats(Number(affiliateId), parseFloat(amount));
      
      res.json({
        success: true,
        data: {
          transaction,
          commission: {
            rate: commissionRate,
            amount: commissionAmount
          }
        }
      });
      
    } catch (error: any) {
      console.error("Error processing PayPal commission:", error);
      res.status(500).json({
        success: false,
        message: "Error processing PayPal commission",
        error: error.message
      });
    }
  });
}