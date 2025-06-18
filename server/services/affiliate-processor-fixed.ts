/**
 * Affiliate Commission Processing Service - Fixed Version
 * Handles commission calculation, payment processing, and transaction tracking
 */
import type { IStorage } from "../storage";

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
    const commissionRate = typeof commissionRateStr === 'string' ? parseFloat(commissionRateStr) : Number(commissionRateStr);
    const commissionAmount = Math.round(orderAmount * commissionRate * 100) / 100;

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
 * Process commission payment - simplified version
 */
export async function processCommission(
  storage: IStorage,
  calculation: CommissionCalculation
): Promise<ProcessedCommission> {
  try {
    // Create transaction record with proper schema matching
    const transactionData = {
      affiliateId: calculation.affiliateId,
      type: 'commission',
      amount: calculation.commissionAmount.toString(),
      status: 'pending',
      description: `Commission for order ${calculation.orderId}`,
      orderId: calculation.orderId,
      qrCodeId: calculation.qrCodeId || null
    };

    const transaction = await storage.createAffiliateTransaction(transactionData);
    
    // Update affiliate earnings with proper type conversion
    const affiliate = await storage.getAffiliateById(calculation.affiliateId);
    if (affiliate) {
      const currentEarnings = typeof affiliate.totalEarnings === 'string' 
        ? parseFloat(affiliate.totalEarnings) || 0 
        : affiliate.totalEarnings || 0;
      const currentSales = affiliate.totalSales || 0;

      await storage.updateAffiliate(calculation.affiliateId, {
        totalEarnings: (currentEarnings + calculation.commissionAmount).toString(),
        totalSales: currentSales + 1
      });
    }
    
    // Update QR code conversion if applicable
    if (calculation.qrCodeId) {
      try {
        await storage.incrementQrCodeConversions(calculation.qrCodeId);
      } catch (error) {
        console.warn("Failed to update QR code conversions:", error);
      }
    }

    return {
      success: true,
      transactionId: transaction.id,
      commissionAmount: calculation.commissionAmount,
      paymentProcessor: 'pending'
    };

  } catch (error) {
    console.error("Error processing commission:", error);
    return {
      success: false,
      commissionAmount: calculation.commissionAmount,
      error: `Commission processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      paymentProcessor: 'pending'
    };
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