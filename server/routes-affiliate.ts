/**
 * Routes for managing affiliates and QR codes
 */
import type { Express, Request, Response } from "express";
import type { IStorage } from "./storage";
import { z } from "zod";
import qrcode from "qrcode";
import { generateUniqueCode } from "./services/codes";
import { eq } from "drizzle-orm";
import { 
  insertAffiliateSchema, 
  insertQrCodeSchema, 
  insertAffiliateTransactionSchema,
  affiliates,
  qrCodes
} from "@shared/schema";

// Stripe and PayPal imports with proper error handling
let stripeService: any = null;
let paypalService: any = null;

try {
  stripeService = require("./services/stripe").default;
} catch (error) {
  console.warn("Stripe service not available:", error);
}

try {
  paypalService = require("./paypal");
} catch (error) {
  console.warn("PayPal service not available:", error);
}

/**
 * Generate a QR code as a data URL
 * 
 * @param url The URL to encode in the QR code
 * @returns A data URL string for the QR code image
 */
async function generateQRCodeDataURL(url: string): Promise<string> {
  try {
    const dataURL = await qrcode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Register affiliate routes
 */
export function registerAffiliateRoutes(app: Express, storage: IStorage) {
  /**
   * Create a Stripe Connect account for an affiliate
   */
  app.post("/api/affiliates/:id/stripe-account", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      if (!stripeService) {
        return res.status(503).json({
          success: false,
          message: "Stripe service not configured. Please contact administrator to set up STRIPE_SECRET_KEY."
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Check if the affiliate already has a Stripe account
      if (affiliate.stripeAccountId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate already has a Stripe account"
        });
      }
      
      // Create a Stripe Connect account for the affiliate
      const account = await stripeService.createConnectedAccount(
        affiliate.email, 
        affiliate.name,
        { affiliate_id: String(affiliate.id) }
      );
      
      // Update the affiliate with the Stripe account ID
      const updatedAffiliate = await storage.updateAffiliate(id, {
        stripeAccountId: account.id
      });
      
      res.json({
        success: true,
        data: {
          affiliate: updatedAffiliate,
          accountId: account.id
        }
      });
    } catch (error) {
      console.error("Error creating Stripe account:", error);
      res.status(500).json({
        success: false,
        message: "Error creating Stripe account"
      });
    }
  });
  
  /**
   * Generate an onboarding link for a Stripe Connect account
   */
  app.post("/api/affiliates/:id/onboarding-link", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Check if the affiliate has a Stripe account
      if (!affiliate.stripeAccountId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate does not have a Stripe account"
        });
      }
      
      // Generate return URLs
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      const refreshUrl = `${baseUrl}/affiliates/${id}/setup?refresh=true`;
      const returnUrl = `${baseUrl}/affiliates/${id}/setup?success=true`;
      
      // Create an account link for onboarding
      const accountLink = await stripeService.createAccountLink(
        affiliate.stripeAccountId,
        refreshUrl,
        returnUrl
      );
      
      res.json({
        success: true,
        data: {
          url: accountLink.url
        }
      });
    } catch (error) {
      console.error("Error generating onboarding link:", error);
      res.status(500).json({
        success: false,
        message: "Error generating onboarding link"
      });
    }
  });
  
  /**
   * Check the status of a Stripe Connect account
   */
  app.get("/api/affiliates/:id/stripe-status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Check if the affiliate has a Stripe account
      if (!affiliate.stripeAccountId) {
        return res.json({
          success: true,
          data: {
            hasStripeAccount: false
          }
        });
      }
      
      // Check if the account is ready for payouts
      const isReady = await stripeService.isAccountReadyForPayouts(affiliate.stripeAccountId);
      
      // Update onboarding status if needed
      if (isReady && !affiliate.stripeOnboardingComplete) {
        await storage.updateAffiliate(id, {
          stripeOnboardingComplete: true
        });
      }
      
      res.json({
        success: true,
        data: {
          hasStripeAccount: true,
          isOnboardingComplete: isReady
        }
      });
    } catch (error) {
      console.error("Error checking Stripe status:", error);
      res.status(500).json({
        success: false,
        message: "Error checking Stripe status"
      });
    }
  });
  
  /**
   * Process a payout to an affiliate
   */
  app.post("/api/affiliates/:id/payout", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { amount } = req.body;
      
      if (isNaN(id) || !amount) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID or missing amount"
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Check if the affiliate has a Stripe account and is ready for payouts
      if (!affiliate.stripeAccountId || !affiliate.stripeOnboardingComplete) {
        return res.status(400).json({
          success: false,
          message: "Affiliate is not ready to receive payouts"
        });
      }
      
      // Ensure the affiliate has enough pending balance
      if (affiliate.pendingPayout < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient pending balance for payout"
        });
      }
      
      // Process the payout via Stripe
      const transfer = await stripeService.createPayout(
        amount, 
        affiliate.stripeAccountId,
        {
          affiliate_id: String(affiliate.id),
          payout_type: "manual"
        }
      );
      
      // Create a transaction record
      const transactionData = {
        affiliateId: affiliate.id,
        transactionType: 'payout',
        amount: amount,
        stripeTransferId: transfer.id,
        description: `Manual payout to affiliate`,
        status: 'processed',
        processedAt: new Date()
      };
      
      const transaction = await storage.createAffiliateTransaction(transactionData);
      
      // Update the affiliate's pending payout amount
      await storage.updateAffiliate(id, {
        pendingPayout: affiliate.pendingPayout - amount,
        lastPayoutDate: new Date()
      });
      
      res.json({
        success: true,
        data: {
          transaction,
          transfer
        }
      });
    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({
        success: false,
        message: "Error processing payout"
      });
    }
  });
  
  /**
   * Generate a login link for Stripe Connect dashboard
   */
  app.get("/api/affiliates/:id/stripe-login", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Check if the affiliate has a Stripe account
      if (!affiliate.stripeAccountId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate does not have a Stripe account"
        });
      }
      
      // Generate a login link
      const loginLink = await stripeService.createLoginLink(affiliate.stripeAccountId);
      
      res.json({
        success: true,
        data: {
          url: loginLink.url
        }
      });
    } catch (error) {
      console.error("Error generating login link:", error);
      res.status(500).json({
        success: false,
        message: "Error generating login link"
      });
    }
  });
  
  /**
   * Process automated payouts for affiliates
   */
  app.post("/api/affiliates/process-scheduled-payouts", async (req: Request, res: Response) => {
    try {
      const { scheduleType } = req.body;
      
      if (!scheduleType) {
        return res.status(400).json({
          success: false,
          message: "Missing schedule type"
        });
      }
      
      // Get all active affiliates with the specified payout schedule
      const affiliates = await storage.getAllAffiliates();
      const eligibleAffiliates = affiliates.filter(affiliate => 
        affiliate.status === 'active' && 
        affiliate.stripeAccountId && 
        affiliate.stripeOnboardingComplete &&
        affiliate.payoutSchedule === scheduleType &&
        affiliate.pendingPayout > 0
      );
      
      if (eligibleAffiliates.length === 0) {
        return res.json({
          success: true,
          message: "No eligible affiliates found for payout",
          data: {
            processedCount: 0,
            totalAmount: 0
          }
        });
      }
      
      // Generate a batch ID for this payout run
      const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      let processedCount = 0;
      let totalAmount = 0;
      
      // Process payouts for each eligible affiliate
      const payoutResults = await Promise.all(
        eligibleAffiliates.map(async (affiliate) => {
          try {
            if (!affiliate.stripeAccountId) {
              console.error(`Affiliate ${affiliate.id} has no Stripe account ID`);
              return; // Skip this affiliate
            }
            
            // Process the payout via Stripe
            const transfer = await stripeService.createPayout(
              affiliate.pendingPayout, 
              affiliate.stripeAccountId,
              {
                affiliate_id: String(affiliate.id),
                payout_type: "scheduled",
                batch_id: batchId
              }
            );
            
            // Create a transaction record
            const transactionData = {
              affiliateId: affiliate.id,
              transactionType: 'payout',
              amount: affiliate.pendingPayout,
              stripeTransferId: transfer.id,
              payoutBatchId: batchId,
              description: `Scheduled ${scheduleType} payout`,
              status: 'processed',
              processedAt: new Date()
            };
            
            const transaction = await storage.createAffiliateTransaction(transactionData);
            
            // Update the affiliate's pending payout amount
            await storage.updateAffiliate(affiliate.id, {
              pendingPayout: 0,
              lastPayoutDate: new Date()
            });
            
            processedCount++;
            totalAmount += affiliate.pendingPayout;
            
            return {
              affiliateId: affiliate.id,
              amount: affiliate.pendingPayout,
              transactionId: transaction.id,
              transferId: transfer.id,
              success: true
            };
          } catch (error) {
            console.error(`Error processing payout for affiliate ${affiliate.id}:`, error);
            return {
              affiliateId: affiliate.id,
              amount: affiliate.pendingPayout,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );
      
      res.json({
        success: true,
        data: {
          batchId,
          processedCount,
          totalAmount,
          results: payoutResults
        }
      });
    } catch (error) {
      console.error("Error processing scheduled payouts:", error);
      res.status(500).json({
        success: false,
        message: "Error processing scheduled payouts"
      });
    }
  });
  /**
   * Get all affiliates
   */
  app.get("/api/affiliates", async (_req: Request, res: Response) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      
      res.json({
        success: true,
        data: affiliates
      });
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({ 
        success: false,
        message: "Error fetching affiliates" 
      });
    }
  });

  /**
   * Get a specific affiliate by ID
   */
  app.get("/api/affiliates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      res.json({
        success: true,
        data: affiliate
      });
    } catch (error) {
      console.error("Error fetching affiliate:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching affiliate"
      });
    }
  });

  /**
   * Create a new affiliate
   */
  app.post("/api/affiliates", async (req: Request, res: Response) => {
    try {
      // Generate a unique code for the affiliate
      const code = await generateUniqueCode(6);
      
      const affiliateData = {
        ...req.body,
        code,
        commissionRate: req.body.commissionRate || 0.04 // Default to 4%
      };
      
      // Validate data
      const validatedData = insertAffiliateSchema.parse(affiliateData);
      
      // Create affiliate
      const affiliate = await storage.createAffiliate(validatedData);
      
      res.status(201).json({
        success: true,
        data: affiliate
      });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate data",
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Error creating affiliate"
      });
    }
  });

  /**
   * Update an existing affiliate
   */
  app.patch("/api/affiliates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Update affiliate
      const updatedAffiliate = await storage.updateAffiliate(id, req.body);
      
      res.json({
        success: true,
        data: updatedAffiliate
      });
    } catch (error) {
      console.error("Error updating affiliate:", error);
      res.status(500).json({
        success: false,
        message: "Error updating affiliate"
      });
    }
  });

  /**
   * Delete an affiliate
   */
  app.delete("/api/affiliates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(id);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Delete affiliate
      await storage.deleteAffiliate(id);
      
      res.json({
        success: true,
        message: "Affiliate deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting affiliate"
      });
    }
  });

  /**
   * Get QR codes for an affiliate
   */
  app.get("/api/affiliates/:id/qrcodes", async (req: Request, res: Response) => {
    try {
      const affiliateId = parseInt(req.params.id);
      
      if (isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      const qrCodes = await storage.getQrCodesByAffiliateId(affiliateId);
      
      res.json({
        success: true,
        data: qrCodes
      });
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching QR codes"
      });
    }
  });

  /**
   * Generate a new QR code for an affiliate
   */
  app.post("/api/affiliates/:id/qrcodes", async (req: Request, res: Response) => {
    try {
      const affiliateId = parseInt(req.params.id);
      
      if (isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Generate a unique code for the QR code
      const code = await generateUniqueCode(8);
      
      // Generate the URL that the QR code will point to
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      const url = `${baseUrl}/ref/${affiliate.code}/${code}`;
      
      // Generate QR code image data URL
      const imageUrl = await generateQRCodeDataURL(url);
      
      // Create QR code data
      const qrCodeData = {
        affiliateId,
        code,
        url,
        imageUrl,
        title: req.body.title || `QR Code for ${affiliate.name}`,
        description: req.body.description || `Affiliate QR code for ${affiliate.name}`,
        type: req.body.type || 'affiliate',
        scanCount: 0,
        conversionCount: 0
      };
      
      // Validate data
      const validatedData = insertQrCodeSchema.parse(qrCodeData);
      
      // Create QR code
      const qrCode = await storage.createQrCode(validatedData);
      
      res.status(201).json({
        success: true,
        data: qrCode
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code data",
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Error generating QR code"
      });
    }
  });

  /**
   * Delete a QR code
   */
  app.delete("/api/qrcodes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code ID"
        });
      }
      
      const qrCode = await storage.getQrCodeById(id);
      
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found"
        });
      }
      
      // Delete QR code
      await storage.deleteQrCode(id);
      
      res.json({
        success: true,
        message: "QR code deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting QR code:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting QR code"
      });
    }
  });

  /**
   * Get affiliate transactions
   */
  app.get("/api/affiliates/:id/transactions", async (req: Request, res: Response) => {
    try {
      const affiliateId = parseInt(req.params.id);
      
      if (isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Get transactions for the affiliate
      const transactions = await storage.getAffiliateTransactionsByAffiliateId(affiliateId);
      
      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error("Error fetching affiliate transactions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching affiliate transactions"
      });
    }
  });

  /**
   * Get affiliate statistics
   */
  app.get("/api/affiliates/:id/stats", async (req: Request, res: Response) => {
    try {
      const affiliateId = parseInt(req.params.id);
      
      if (isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID"
        });
      }
      
      const affiliate = await storage.getAffiliateById(affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Use the getAffiliateStats method which encapsulates all statistics fetching logic
      const stats = await storage.getAffiliateStats(affiliateId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error fetching affiliate statistics:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching affiliate statistics"
      });
    }
  });

  /**
   * Record a QR code scan
   */
  app.post("/api/qrcodes/:code/scan", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      
      // Get QR code by code
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found"
        });
      }
      
      // Increment scan count and update last scanned timestamp
      try {
        // Our incrementQrCodeScans method already updates the lastScannedAt field
        await storage.incrementQrCodeScans(qrCode.id);
      } catch (error) {
        console.error("Failed to increment scan count:", error);
        // Continue execution even if this fails
      }
      
      // Return success with affiliate info for redirect
      const affiliate = await storage.getAffiliateById(qrCode.affiliateId);
      
      res.json({
        success: true,
        data: {
          affiliateCode: affiliate?.code,
          qrCode: qrCode.code,
          redirectUrl: qrCode.url
        }
      });
    } catch (error) {
      console.error("Error recording QR code scan:", error);
      res.status(500).json({
        success: false,
        message: "Error recording QR code scan"
      });
    }
  });

  /**
   * Record a conversion from a QR code scan (a purchase)
   */
  app.post("/api/qrcodes/:code/conversion", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const { paymentId, amount, paymentMethod, affiliateId } = req.body;
      
      if (!paymentId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Payment ID and amount are required"
        });
      }
      
      // Get QR code by code
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found"
        });
      }
      
      // Get affiliate
      const affiliate = await storage.getAffiliateById(qrCode.affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Calculate commission amount
      const saleAmount = parseFloat(amount);
      const commissionAmount = saleAmount * affiliate.commissionRate;
      
      // Update QR code conversion count
      try {
        // Use a separate method to increment conversions count
        await storage.incrementQrCodeConversions(qrCode.id);
      } catch (error) {
        console.error("Failed to increment conversion count:", error);
        // Continue execution even if this fails
      }
      
      // Variable to store payment ID based on the payment method
      let stripePaymentIntentId = null;
      let paypalOrderId = null;
      
      // Handle Stripe payment
      if (paymentMethod === 'stripe' && affiliate.stripeAccountId && affiliate.stripeOnboardingComplete) {
        try {
          // Create a payment with affiliate tracking metadata
          const paymentIntent = await stripeService.createPaymentWithAffiliateTracking(
            saleAmount,
            'usd',
            'customer@example.com', // In a real app, we'd get this from the customer
            {
              affiliate_id: affiliate.id,
              affiliate_code: affiliate.code,
              qr_code: qrCode.code,
              payment_id: paymentId,
              commission_rate: affiliate.commissionRate,
              commission_amount: commissionAmount
            }
          );
          
          stripePaymentIntentId = paymentIntent.id;
        } catch (stripeError) {
          console.error("Error creating Stripe payment:", stripeError);
          // Continue execution even if Stripe fails - we'll still create a local record
        }
      } 
      // Handle PayPal payment
      else if (paymentMethod === 'paypal' && paypalService.isConfigured()) {
        try {
          // Process the affiliate commission for the PayPal order
          const commissionResult = await paypalService.processAffiliateCommission(
            paymentId, 
            affiliate.id,
            affiliate.commissionRate
          );
          
          paypalOrderId = paymentId;
          console.log("PayPal commission processed:", commissionResult);
        } catch (paypalError) {
          console.error("Error processing PayPal commission:", paypalError);
          // Continue execution even if PayPal fails - we'll still create a local record
        }
      }
      
      // Create affiliate transaction
      const transactionData = {
        affiliateId: affiliate.id,
        saleId: paymentId,
        transactionType: 'commission',
        amount: commissionAmount,
        description: `Commission for ${paymentMethod} payment ${paymentId}`,
        status: 'pending',
        stripePaymentIntentId,
        paypalOrderId
      };
      
      // Update the affiliate's pending payout amount
      await storage.updateAffiliate(affiliate.id, {
        pendingPayout: (affiliate.pendingPayout || 0) + commissionAmount
      });
      
      // Update the affiliate's earnings and sales stats separately
      try {
        await storage.updateAffiliateStats(affiliate.id, {
          totalEarnings: (affiliate.totalEarnings || 0) + commissionAmount,
          totalSales: (affiliate.totalSales || 0) + 1
        });
      } catch (updateError) {
        console.error("Error updating affiliate statistics:", updateError);
        // Continue execution even if stats update fails - this is not critical
      }
      
      const validatedData = insertAffiliateTransactionSchema.parse(transactionData);
      const transaction = await storage.createAffiliateTransaction(validatedData);
      
      res.status(201).json({
        success: true,
        data: {
          transaction,
          stripePaymentIntentId
        }
      });
    } catch (error) {
      console.error("Error recording conversion:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction data",
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Error recording conversion"
      });
    }
  });

  /**
   * Get QR code details by code
   */
  app.get("/api/qrcodes/:code", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      
      // Get QR code by code
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found"
        });
      }
      
      // Get affiliate info
      const affiliate = await storage.getAffiliateById(qrCode.affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      res.json({
        success: true,
        data: {
          id: qrCode.id,
          code: qrCode.code,
          affiliateId: qrCode.affiliateId,
          affiliateName: affiliate.name,
          title: qrCode.title,
          url: qrCode.url,
          scans: qrCode.scans || 0,
          conversions: qrCode.conversions || 0,
          lastScannedAt: qrCode.lastScannedAt
        }
      });
    } catch (error) {
      console.error("Error getting QR code details:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving QR code details"
      });
    }
  });

  /**
   * Check PayPal configuration status
   */
  app.get("/api/paypal/status", async (_req: Request, res: Response) => {
    try {
      // Check if PayPal is configured
      const isConfigured = paypalService.isConfigured();
      
      let environment = null;
      if (isConfigured) {
        // Determine if we're using sandbox or production environment
        environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
      }
      
      res.json({
        success: true,
        data: {
          isConfigured,
          environment,
          clientIdPresent: !!process.env.PAYPAL_CLIENT_ID,
          clientSecretPresent: !!process.env.PAYPAL_CLIENT_SECRET,
          // Provide minimal info about testing status
          status: isConfigured ? "ready" : "not_configured",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error checking PayPal status:", error);
      res.status(500).json({
        success: false,
        message: "Error checking PayPal configuration status"
      });
    }
  });
  
  /**
   * Process commission for an affiliate based on a sale
   */
  app.post("/api/affiliates/process-commission", async (req: Request, res: Response) => {
    try {
      const { affiliateId, qrCode, orderId, amount, paymentProcessor } = req.body;
      
      if (!affiliateId || !orderId || !amount || !qrCode) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: affiliateId, qrCode, orderId, and amount are required"
        });
      }
      
      // Get the affiliate
      const affiliate = await storage.getAffiliateById(affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }
      
      // Get the QR code
      const qrCodeRecord = await storage.getQrCodeByCode(qrCode);
      
      if (!qrCodeRecord) {
        return res.status(404).json({
          success: false,
          message: "QR code not found"
        });
      }
      
      // Verify that the QR code belongs to the affiliate
      if (qrCodeRecord.affiliateId !== affiliateId) {
        return res.status(400).json({
          success: false,
          message: "QR code does not belong to this affiliate"
        });
      }
      
      // Process the commission based on the payment processor
      let commissionResult;
      const commissionRate = affiliate.commissionRate || 0.04; // Default to 4% if not specified
      
      if (paymentProcessor === "paypal") {
        commissionResult = await paypalService.processAffiliateCommission(
          orderId, 
          affiliateId,
          commissionRate
        );
      } else if (paymentProcessor === "stripe") {
        // Handle Stripe commission processing
        // This is handled by webhooks in the Stripe implementation
        return res.status(400).json({
          success: false,
          message: "Stripe commission processing should be handled via webhooks"
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid payment processor"
        });
      }
      
      // Calculate commission amount
      const commissionAmount = amount * commissionRate;
      
      // Record the commission as a transaction
      const transaction = await storage.createAffiliateTransaction({
        affiliateId,
        saleId: orderId,
        transactionType: "commission",
        amount: commissionAmount,
        description: `Commission for order ${orderId} via ${paymentProcessor}`,
        status: "pending",
        paypalOrderId: paymentProcessor === "paypal" ? orderId : undefined,
        stripePaymentIntentId: paymentProcessor === "stripe" ? orderId : undefined,
        feeAmount: 0, // No fee for commissions
      });
      
      // Update the QR code conversion count
      await storage.incrementQrCodeConversions(qrCodeRecord.id);
      
      // Update affiliate stats
      await storage.updateAffiliateStats(affiliateId, amount);
      
      res.json({
        success: true,
        data: {
          transaction,
          commissionAmount,
          commissionRate,
          paymentProcessor
        }
      });
    } catch (error) {
      console.error("Error processing affiliate commission:", error);
      res.status(500).json({
        success: false,
        message: "Error processing affiliate commission"
      });
    }
  });
}