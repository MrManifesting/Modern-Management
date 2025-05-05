/**
 * Routes for managing affiliates and QR codes
 */
import type { Express, Request, Response } from "express";
import type { IStorage } from "./storage";
import { z } from "zod";
import qrcode from "qrcode";
import { generateUniqueCode } from "./services/codes";
import { 
  insertAffiliateSchema, 
  insertQrCodeSchema, 
  insertAffiliateTransactionSchema 
} from "@shared/schema";

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
      
      // Get QR codes for the affiliate
      const qrCodes = await storage.getQrCodesByAffiliateId(affiliateId);
      
      // Get transactions for the affiliate
      const transactions = await storage.getAffiliateTransactionsByAffiliateId(affiliateId);
      
      // Calculate total scans and conversions
      const totalScans = qrCodes.reduce((total, qrCode) => total + qrCode.scanCount, 0);
      const totalConversions = qrCodes.reduce((total, qrCode) => total + qrCode.conversionCount, 0);
      
      // Calculate conversion rate
      const conversionRate = totalScans > 0 ? totalConversions / totalScans : 0;
      
      // Calculate earnings and pending payouts
      const totalEarnings = transactions.reduce((total, transaction) => {
        return total + transaction.amount;
      }, 0);
      
      const pendingPayouts = transactions
        .filter(transaction => transaction.status === 'pending')
        .reduce((total, transaction) => total + transaction.amount, 0);
      
      // Get recent transactions (last 10)
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      
      // Compile statistics
      const stats = {
        totalSales: totalConversions,
        totalEarnings,
        pendingPayouts,
        conversionRate,
        recentTransactions
      };
      
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
      
      // Increment scan count
      await storage.updateQrCode(qrCode.id, {
        scanCount: qrCode.scanCount + 1,
        lastScannedAt: new Date()
      });
      
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
      const { saleId, amount } = req.body;
      
      if (!saleId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Sale ID and amount are required"
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
      await storage.updateQrCode(qrCode.id, {
        conversionCount: qrCode.conversionCount + 1
      });
      
      // Create affiliate transaction
      const transactionData = {
        affiliateId: affiliate.id,
        saleId,
        transactionType: 'commission',
        amount: commissionAmount,
        description: `Commission for sale #${saleId}`,
        status: 'pending'
      };
      
      const validatedData = insertAffiliateTransactionSchema.parse(transactionData);
      const transaction = await storage.createAffiliateTransaction(validatedData);
      
      res.status(201).json({
        success: true,
        data: transaction
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
}