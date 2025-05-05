/**
 * Routes for managing affiliates and QR codes
 */
import { Request, Response } from "express";
import { Express } from "express";
import { IStorage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { affiliates, insertAffiliateSchema, insertQrCodeSchema, qrCodes } from "../shared/schema";

const upload = multer({ dest: "uploads/" });

/**
 * Register affiliate routes
 */
export function registerAffiliateRoutes(app: Express, storage: IStorage) {
  /**
   * Get all affiliates
   */
  app.get("/api/affiliates", async (_req: Request, res: Response) => {
    try {
      const allAffiliates = await storage.getAllAffiliates();
      res.json({ success: true, data: allAffiliates });
    } catch (error) {
      console.error("Error getting affiliates:", error);
      res.status(500).json({ success: false, message: "Failed to get affiliates" });
    }
  });

  /**
   * Get a specific affiliate by ID
   */
  app.get("/api/affiliates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid ID" });
      }

      const affiliate = await storage.getAffiliateById(id);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }

      res.json({ success: true, data: affiliate });
    } catch (error) {
      console.error("Error getting affiliate:", error);
      res.status(500).json({ success: false, message: "Failed to get affiliate" });
    }
  });

  /**
   * Create a new affiliate
   */
  app.post("/api/affiliates", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAffiliateSchema.parse(req.body);
      
      // Generate a unique code if not provided
      if (!validatedData.code) {
        validatedData.code = `AFF-${randomUUID().substring(0, 8).toUpperCase()}`;
      }
      
      const newAffiliate = await storage.createAffiliate(validatedData);
      res.status(201).json({ success: true, data: newAffiliate });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      res.status(400).json({ success: false, message: "Failed to create affiliate", error });
    }
  });

  /**
   * Update an existing affiliate
   */
  app.patch("/api/affiliates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid ID" });
      }

      const affiliate = await storage.getAffiliateById(id);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }

      // Only update provided fields
      const updatedAffiliate = await storage.updateAffiliate(id, req.body);
      res.json({ success: true, data: updatedAffiliate });
    } catch (error) {
      console.error("Error updating affiliate:", error);
      res.status(400).json({ success: false, message: "Failed to update affiliate", error });
    }
  });

  /**
   * Delete an affiliate
   */
  app.delete("/api/affiliates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid ID" });
      }

      await storage.deleteAffiliate(id);
      res.json({ success: true, message: "Affiliate deleted" });
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      res.status(500).json({ success: false, message: "Failed to delete affiliate" });
    }
  });

  /**
   * Get QR codes for an affiliate
   */
  app.get("/api/affiliates/:id/qrcodes", async (req: Request, res: Response) => {
    try {
      const affiliateId = parseInt(req.params.id);
      if (isNaN(affiliateId)) {
        return res.status(400).json({ success: false, message: "Invalid affiliate ID" });
      }

      const qrCodes = await storage.getQrCodesByAffiliateId(affiliateId);
      res.json({ success: true, data: qrCodes });
    } catch (error) {
      console.error("Error getting QR codes:", error);
      res.status(500).json({ success: false, message: "Failed to get QR codes" });
    }
  });

  /**
   * Generate a new QR code for an affiliate
   */
  app.post("/api/affiliates/:id/qrcodes", async (req: Request, res: Response) => {
    try {
      const affiliateId = parseInt(req.params.id);
      if (isNaN(affiliateId)) {
        return res.status(400).json({ success: false, message: "Invalid affiliate ID" });
      }

      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }

      // Generate a unique code for the QR code
      const uniqueCode = `QR-${randomUUID().substring(0, 8).toUpperCase()}`;
      
      // Combine with the affiliate's code
      const trackingCode = `${affiliate.code}-${uniqueCode}`;
      
      // Create the URL for tracking (this should be your storefront URL with tracking code)
      const baseUrl = process.env.STORE_URL || "https://yourstore.com";
      const trackingUrl = `${baseUrl}/?ref=${trackingCode}`;
      
      // Generate the QR code image
      const qrImageDataUrl = await QRCode.toDataURL(trackingUrl);
      
      // Prepare the QR code data for storage
      const qrCodeData = {
        affiliateId,
        code: trackingCode,
        url: trackingUrl,
        title: req.body.title || `${affiliate.name}'s QR Code`,
        description: req.body.description || `Affiliate tracking code for ${affiliate.name}`,
        imageUrl: qrImageDataUrl,
        type: req.body.type || "affiliate",
        status: "active",
      };
      
      // Validate the data
      const validatedData = insertQrCodeSchema.parse(qrCodeData);
      
      // Save the QR code to database
      const newQrCode = await storage.createQrCode(validatedData);
      
      res.status(201).json({ 
        success: true, 
        data: { 
          ...newQrCode, 
          imageUrl: qrImageDataUrl 
        } 
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(400).json({ success: false, message: "Failed to generate QR code", error });
    }
  });

  /**
   * Get affiliate statistics
   */
  app.get("/api/affiliates/:id/stats", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid ID" });
      }

      const affiliate = await storage.getAffiliateById(id);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }

      const stats = await storage.getAffiliateStats(id);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Error getting affiliate stats:", error);
      res.status(500).json({ success: false, message: "Failed to get affiliate statistics" });
    }
  });

  /**
   * Record a QR code scan
   */
  app.post("/api/qrcodes/:code/scan", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      
      // Find the QR code
      const qrCode = await storage.getQrCodeByCode(code);
      if (!qrCode) {
        return res.status(404).json({ success: false, message: "QR code not found" });
      }
      
      // Update scan count
      const updatedQrCode = await storage.incrementQrCodeScans(qrCode.id);
      
      res.json({ success: true, data: updatedQrCode });
    } catch (error) {
      console.error("Error recording QR code scan:", error);
      res.status(500).json({ success: false, message: "Failed to record QR code scan" });
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
      
      // Find the QR code
      const qrCode = await storage.getQrCodeByCode(code);
      if (!qrCode) {
        return res.status(404).json({ success: false, message: "QR code not found" });
      }
      
      // Get the affiliate
      const affiliate = await storage.getAffiliateById(qrCode.affiliateId);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }
      
      // Update conversion count
      const updatedQrCode = await storage.incrementQrCodeConversions(qrCode.id);
      
      // Calculate commission (typically a percentage of the sale amount)
      const commissionRate = affiliate.commissionRate; // Should be stored as a decimal, e.g., 0.04 for 4%
      const commissionAmount = amount * commissionRate;
      
      // Record the commission transaction
      const transaction = await storage.createAffiliateTransaction({
        affiliateId: affiliate.id,
        saleId: parseInt(saleId),
        transactionType: "commission",
        amount: commissionAmount,
        description: `Commission for sale #${saleId}`,
        status: "pending"
      });
      
      // Update the affiliate's total earnings and sales
      await storage.updateAffiliateEarnings(affiliate.id, commissionAmount);
      
      res.json({ 
        success: true, 
        data: { 
          qrCode: updatedQrCode, 
          transaction, 
          commissionRate, 
          commissionAmount 
        } 
      });
    } catch (error) {
      console.error("Error recording QR code conversion:", error);
      res.status(500).json({ success: false, message: "Failed to record conversion" });
    }
  });
}