/**
 * Fixed Affiliate Marketing Routes
 * Clean implementation with proper TypeScript and schema compliance
 */
import type { Express, Request, Response } from "express";
import type { IStorage } from "./storage";
import { z } from "zod";
import qrcode from "qrcode";
import { generateUniqueCode } from "./services/codes";
import { insertAffiliateSchema, insertQrCodeSchema } from "@shared/schema";
import { calculateCommission, processCommission, processOrderCommission } from "./services/affiliate-processor-fixed";

/**
 * Generate QR code data URL
 */
async function generateQRCodeDataURL(url: string): Promise<string> {
  try {
    return await qrcode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
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
   * Get all affiliates
   */
  app.get("/api/affiliates", async (_req: Request, res: Response) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      res.json({ success: true, data: affiliates });
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching affiliates"
      });
    }
  });

  /**
   * Get affiliate stats
   */
  app.get("/api/affiliates/stats", async (_req: Request, res: Response) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      const totalAffiliates = affiliates.length;
      const totalEarnings = affiliates.reduce((sum, affiliate) => {
        const earnings = typeof affiliate.totalEarnings === 'string' 
          ? parseFloat(affiliate.totalEarnings) || 0 
          : affiliate.totalEarnings || 0;
        return sum + earnings;
      }, 0);
      const totalSales = affiliates.reduce((sum, affiliate) => sum + (affiliate.totalSales || 0), 0);
      
      // Count active QR codes
      let activeQrCodes = 0;
      for (const affiliate of affiliates) {
        try {
          const qrCodes = await storage.getQrCodesByAffiliateId(affiliate.id);
          activeQrCodes += qrCodes.filter(qr => qr.status === 'active').length;
        } catch (error) {
          console.warn(`Failed to get QR codes for affiliate ${affiliate.id}`);
        }
      }

      res.json({
        success: true,
        data: {
          totalAffiliates,
          totalEarnings,
          totalSales,
          activeQrCodes
        }
      });
    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching affiliate stats"
      });
    }
  });

  /**
   * Create new affiliate
   */
  app.post("/api/affiliates", async (req: Request, res: Response) => {
    try {
      const uniqueCode = await generateUniqueCode('AFF');
      const validatedData = insertAffiliateSchema.parse({
        ...req.body,
        code: req.body.code || uniqueCode,
        status: 'active',
        commissionRate: req.body.commissionRate ? req.body.commissionRate.toString() : '0.05'
      });

      const affiliate = await storage.createAffiliate(validatedData);
      res.json({ success: true, data: affiliate });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      res.status(500).json({
        success: false,
        message: "Error creating affiliate"
      });
    }
  });

  /**
   * Get affiliate stats by ID
   */
  app.get("/api/affiliates/:id/stats", async (req: Request, res: Response) => {
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

      // Get QR codes for this affiliate
      const qrCodes = await storage.getQrCodesByAffiliateId(id);
      const totalScans = qrCodes.reduce((sum, qr) => sum + (qr.scans || 0), 0);
      const totalConversions = qrCodes.reduce((sum, qr) => sum + (qr.conversions || 0), 0);
      const conversionRate = totalScans > 0 ? (totalConversions / totalScans) * 100 : 0;

      // Get recent transactions
      const transactions = await storage.getAffiliateTransactionsByAffiliateId(id);
      const pendingPayouts = transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

      res.json({
        success: true,
        data: {
          totalSales: affiliate.totalSales || 0,
          totalEarnings: parseFloat(affiliate.totalEarnings || '0'),
          pendingPayouts,
          conversionRate: conversionRate.toFixed(2),
          recentTransactions: transactions.slice(0, 10)
        }
      });
    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching affiliate stats"
      });
    }
  });

  /**
   * Get affiliate by ID
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

      res.json({ success: true, data: affiliate });
    } catch (error) {
      console.error("Error fetching affiliate:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching affiliate"
      });
    }
  });

  /**
   * Get QR codes for affiliate
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

      const qrCodes = await storage.getQrCodesByAffiliateId(affiliateId);
      res.json({ success: true, data: qrCodes });
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching QR codes"
      });
    }
  });

  /**
   * Create QR code for affiliate
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

      const code = await generateUniqueCode('QR');
      const baseUrl = process.env.BASE_URL || 'https://localhost:5000';
      const qrUrl = `${baseUrl}/affiliate/${affiliate.code}?qr=${code}`;
      const imageUrl = await generateQRCodeDataURL(qrUrl);

      const qrCodeData = {
        affiliateId,
        code,
        url: qrUrl,
        title: req.body.title || `QR Code for ${affiliate.name}`,
        description: req.body.description || '',
        type: req.body.type || 'affiliate',
        imageUrl,
        status: 'active'
      };

      const qrCode = await storage.createQrCode(qrCodeData);
      res.json({ success: true, data: qrCode });
    } catch (error) {
      console.error("Error creating QR code:", error);
      res.status(500).json({
        success: false,
        message: "Error creating QR code"
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

      const transactions = await storage.getAffiliateTransactionsByAffiliateId(affiliateId);
      res.json({ success: true, data: transactions });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching transactions"
      });
    }
  });

  /**
   * Record QR code scan
   */
  app.post("/api/qrcodes/:code/scan", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found"
        });
      }

      // Increment scan count
      await storage.incrementQrCodeScans(qrCode.id);
      
      // Get affiliate info
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
      console.error("Error recording QR scan:", error);
      res.status(500).json({
        success: false,
        message: "Error recording QR scan"
      });
    }
  });

  /**
   * Record QR code conversion
   */
  app.post("/api/qrcodes/:code/conversion", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const { orderAmount, orderId } = req.body;

      const qrCode = await storage.getQrCodeByCode(code);
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found"
        });
      }

      // Increment conversion count
      await storage.incrementQrCodeConversions(qrCode.id);

      // Process commission
      const commission = await processOrderCommission(storage, {
        orderId: orderId || `order_${Date.now()}`,
        amount: orderAmount,
        qrCode: code
      });

      res.json({
        success: true,
        data: {
          conversion: true,
          commission: commission
        }
      });
    } catch (error) {
      console.error("Error recording conversion:", error);
      res.status(500).json({
        success: false,
        message: "Error recording conversion"
      });
    }
  });

  /**
   * Process commission manually
   */
  app.post("/api/affiliates/process-commission", async (req: Request, res: Response) => {
    try {
      const { affiliateCode, orderAmount, orderId, qrCode } = req.body;

      const commission = await processOrderCommission(storage, {
        orderId: orderId || `manual_${Date.now()}`,
        amount: parseFloat(orderAmount),
        affiliateCode,
        qrCode
      });

      if (!commission) {
        return res.status(400).json({
          success: false,
          message: "Failed to process commission"
        });
      }

      res.json({
        success: true,
        data: commission
      });
    } catch (error) {
      console.error("Error processing commission:", error);
      res.status(500).json({
        success: false,
        message: "Error processing commission"
      });
    }
  });
}