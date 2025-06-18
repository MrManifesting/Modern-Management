/**
 * Affiliate Commission Processing Service
 * Handles commission calculation, payment processing, and transaction tracking
 */
import type { IStorage } from "../storage";
import { z } from "zod";

// Stripe and PayPal imports with error handling
let stripeService: any = null;
let paypalService: any = null;

try {
  stripeService = require("./stripe").default;
} catch (error) {
  console.warn("Stripe service not available for affiliate processing");
}

try {
  paypalService = require("../paypal");
} catch (error) {
  console.warn("PayPal service not available for affiliate processing");
}

export interface CommissionCalculation {
  affiliateId: number;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  qrCodeId?: number;
  metadata?: Record<string, any>;
}

export interface ProcessedCommission {
  success: boolean;
  transactionId?: number;
  commissionAmount: number;
  error?: string;
  paymentProcessor: 'stripe' | 'paypal' | 'pending';
}

/**
 * Calculate commission for an affiliate based on order
 */
export async function calculateCommission(
  storage: IStorage,
  affiliateId: number,
  orderAmount: number,
  qrCode?: string
): Promise<CommissionCalculation | null> {
  try {
    // Get affiliate details
    const affiliate = await storage.getAffiliateById(affiliateId);
    if (!affiliate || affiliate.status !== 'active') {
      console.log(`Affiliate ${affiliateId} not found or inactive`);
      return null;
    }

    // Get QR code details if provided
    let qrCodeRecord = null;
    if (qrCode) {
      qrCodeRecord = await storage.getQrCodeByCode(qrCode);
      if (!qrCodeRecord || qrCodeRecord.affiliateId !== affiliateId) {
        console.log(`QR code ${qrCode} not found or doesn't belong to affiliate ${affiliateId}`);
        return null;
      }
    }

    // Calculate commission with proper type handling
    const commissionRateStr = affiliate.commissionRate || "0.05";
    const commissionRate = typeof commissionRateStr === 'string' ? parseFloat(commissionRateStr) : commissionRateStr;
    const commissionAmount = Math.round(orderAmount * commissionRate * 100) / 100; // Round to 2 decimal places

    return {
      affiliateId,
      orderId: `order_${Date.now()}_${affiliateId}`,
      orderAmount,
      commissionRate,
      commissionAmount,
      qrCodeId: qrCodeRecord?.id,
      metadata: {
        affiliateCode: affiliate.code,
        affiliateName: affiliate.name,
        qrCode: qrCode || null
      }
    };
  } catch (error) {
    console.error("Error calculating commission:", error);
    return null;
  }
}

/**
 * Process commission payment through available payment processor
 */
export async function processCommission(
  storage: IStorage,
  calculation: CommissionCalculation
): Promise<ProcessedCommission> {
  try {
    // Create initial transaction record with proper type conversion
    const transactionData = {
      affiliateId: calculation.affiliateId,
      type: 'commission',
      amount: calculation.commissionAmount.toString(), // Convert to string as required by schema
      status: 'pending',
      description: `Commission for order ${calculation.orderId}`,
      orderId: calculation.orderId,
      qrCodeId: calculation.qrCodeId || null
    };

    const transaction = await storage.createAffiliateTransaction(transactionData);
    
    // Get affiliate for payment processing
    const affiliate = await storage.getAffiliateById(calculation.affiliateId);
    if (!affiliate) {
      throw new Error("Affiliate not found");
    }

    // Try Stripe first if account is set up
    if (stripeService && affiliate.stripeAccountId) {
      try {
        const stripeResult = await processStripeCommission(
          storage,
          affiliate,
          calculation,
          transaction.id
        );
        
        if (stripeResult.success) {
          // Update transaction status
          await storage.updateAffiliateTransactionStatus(transaction.id, 'processed');
          
          // Update affiliate earnings
          await updateAffiliateEarnings(storage, calculation.affiliateId, calculation.commissionAmount);
          
          // Update QR code conversion if applicable
          if (calculation.qrCodeId) {
            await storage.incrementQrCodeConversions(calculation.qrCodeId);
          }

          return {
            success: true,
            transactionId: transaction.id,
            commissionAmount: calculation.commissionAmount,
            paymentProcessor: 'stripe'
          };
        }
      } catch (stripeError) {
        console.error("Stripe commission processing failed:", stripeError);
      }
    }

    // Try PayPal if Stripe failed or not available
    if (paypalService && affiliate.paypalEmail) {
      try {
        const paypalResult = await processPayPalCommission(
          storage,
          affiliate,
          calculation,
          transaction.id
        );
        
        if (paypalResult.success) {
          await storage.updateAffiliateTransactionStatus(transaction.id, 'processed');
          await updateAffiliateEarnings(storage, calculation.affiliateId, calculation.commissionAmount);
          
          if (calculation.qrCodeId) {
            await storage.incrementQrCodeConversions(calculation.qrCodeId);
          }

          return {
            success: true,
            transactionId: transaction.id,
            commissionAmount: calculation.commissionAmount,
            paymentProcessor: 'paypal'
          };
        }
      } catch (paypalError) {
        console.error("PayPal commission processing failed:", paypalError);
      }
    }

    // If both payment processors failed, keep as pending
    await storage.updateAffiliateTransactionStatus(transaction.id, 'pending');
    
    return {
      success: false,
      transactionId: transaction.id,
      commissionAmount: calculation.commissionAmount,
      error: "Payment processing temporarily unavailable. Commission will be processed manually.",
      paymentProcessor: 'pending'
    };

  } catch (error) {
    console.error("Error processing commission:", error);
    return {
      success: false,
      commissionAmount: calculation.commissionAmount,
      error: `Commission processing failed: ${error.message}`,
      paymentProcessor: 'pending'
    };
  }
}

/**
 * Process commission through Stripe Connect
 */
async function processStripeCommission(
  storage: IStorage,
  affiliate: any,
  calculation: CommissionCalculation,
  transactionId: number
): Promise<{ success: boolean; transferId?: string }> {
  if (!stripeService || !affiliate.stripeAccountId) {
    return { success: false };
  }

  try {
    // Create transfer to affiliate's connected account
    const transfer = await stripeService.createTransfer(
      Math.round(calculation.commissionAmount * 100), // Convert to cents
      affiliate.stripeAccountId,
      {
        affiliate_id: String(affiliate.id),
        transaction_id: String(transactionId),
        order_id: calculation.orderId
      }
    );

    // Update transaction with Stripe transfer ID
    await storage.updateAffiliateTransactionStatus(transactionId, 'processed');
    
    return { success: true, transferId: transfer.id };
  } catch (error) {
    console.error("Stripe transfer failed:", error);
    return { success: false };
  }
}

/**
 * Process commission through PayPal
 */
async function processPayPalCommission(
  storage: IStorage,
  affiliate: any,
  calculation: CommissionCalculation,
  transactionId: number
): Promise<{ success: boolean; payoutId?: string }> {
  if (!paypalService || !affiliate.paypalEmail) {
    return { success: false };
  }

  try {
    // Create PayPal payout
    const payout = await paypalService.createPayout(
      affiliate.paypalEmail,
      calculation.commissionAmount,
      `Commission for order ${calculation.orderId}`,
      {
        affiliate_id: affiliate.id,
        transaction_id: transactionId
      }
    );

    return { success: true, payoutId: payout.batch_header.payout_batch_id };
  } catch (error) {
    console.error("PayPal payout failed:", error);
    return { success: false };
  }
}

/**
 * Update affiliate earnings and statistics
 */
async function updateAffiliateEarnings(
  storage: IStorage,
  affiliateId: number,
  commissionAmount: number
): Promise<void> {
  try {
    const affiliate = await storage.getAffiliateById(affiliateId);
    if (!affiliate) return;

    const currentEarnings = affiliate.totalEarnings || 0;
    const currentSales = affiliate.totalSales || 0;

    await storage.updateAffiliate(affiliateId, {
      totalEarnings: currentEarnings + commissionAmount,
      totalSales: currentSales + 1,
      lastEarningDate: new Date()
    });
  } catch (error) {
    console.error("Error updating affiliate earnings:", error);
  }
}

/**
 * Process commission from order webhook
 */
export async function processOrderCommission(
  storage: IStorage,
  orderData: {
    orderId: string;
    amount: number;
    affiliateCode?: string;
    qrCode?: string;
    customerEmail?: string;
  }
): Promise<ProcessedCommission | null> {
  try {
    let affiliate = null;
    
    // Find affiliate by code or QR code
    if (orderData.affiliateCode) {
      affiliate = await storage.getAffiliateByCode(orderData.affiliateCode);
    } else if (orderData.qrCode) {
      const qrCodeRecord = await storage.getQrCodeByCode(orderData.qrCode);
      if (qrCodeRecord) {
        affiliate = await storage.getAffiliateById(qrCodeRecord.affiliateId);
      }
    }

    if (!affiliate) {
      console.log("No affiliate found for order:", orderData.orderId);
      return null;
    }

    // Calculate commission
    const calculation = await calculateCommission(
      storage,
      affiliate.id,
      orderData.amount,
      orderData.qrCode
    );

    if (!calculation) {
      console.log("Commission calculation failed for affiliate:", affiliate.id);
      return null;
    }

    // Update calculation with actual order ID
    calculation.orderId = orderData.orderId;

    // Process the commission
    return await processCommission(storage, calculation);
  } catch (error) {
    console.error("Error processing order commission:", error);
    return null;
  }
}

export default {
  calculateCommission,
  processCommission,
  processOrderCommission
};