/**
 * Routes for secure credential storage and management
 */
import { Request, Response, Express } from 'express';
import { IStorage } from './storage';
import { insertCredentialSchema } from '@shared/schema';
import crypto from 'crypto';

// Simple encryption for credential data
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production';

function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const secretKey = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc';
  const secretKey = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Register credential management routes
 */
export function registerCredentialRoutes(app: Express, storage: IStorage) {
  
  /**
   * Get credentials status for all services
   */
  app.get("/api/credentials/status", async (_req: Request, res: Response) => {
    try {
      const credentials = await storage.getCredentials();
      
      // Check status for each service
      const status: Record<string, { isValid: boolean; lastUsed?: string }> = {};
      
      for (const cred of credentials) {
        status[cred.service] = {
          isValid: cred.isActive || false,
          lastUsed: cred.lastUsed?.toISOString()
        };
      }
      
      // Check environment variables for Shopify if no stored credentials
      if (!status.shopify) {
        const hasShopifyEnv = !!(process.env.SHOPIFY_STORE && process.env.SHOPIFY_ACCESS_TOKEN);
        status.shopify = {
          isValid: hasShopifyEnv,
          lastUsed: undefined
        };
      }
      
      res.json(status);
    } catch (error) {
      console.error("Error getting credentials status:", error);
      res.status(500).json({
        error: "Failed to get credentials status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get all saved credentials (without sensitive data)
   */
  app.get("/api/credentials", async (_req: Request, res: Response) => {
    try {
      const credentials = await storage.getCredentials();
      
      // Return credentials without sensitive data
      const safeCredentials = credentials.map(cred => ({
        id: cred.id,
        service: cred.service,
        name: cred.name,
        isActive: cred.isActive,
        lastUsed: cred.lastUsed,
        createdAt: cred.createdAt,
        hasCredentials: !!cred.credentialData
      }));
      
      res.json(safeCredentials);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });

  /**
   * Get credentials for a specific service
   */
  app.get("/api/credentials/:service", async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const credential = await storage.getCredentialByService(service);
      
      if (!credential) {
        return res.status(404).json({ error: "Credentials not found for this service" });
      }
      
      // Return credential without sensitive data
      res.json({
        id: credential.id,
        service: credential.service,
        name: credential.name,
        isActive: credential.isActive,
        lastUsed: credential.lastUsed,
        hasCredentials: !!credential.credentialData
      });
    } catch (error) {
      console.error("Error fetching service credentials:", error);
      res.status(500).json({ error: "Failed to fetch service credentials" });
    }
  });

  /**
   * Save Google Sheets credentials
   */
  app.post("/api/credentials/google-sheets", async (req: Request, res: Response) => {
    try {
      const { name, credentials: credData } = req.body;
      
      if (!credData) {
        return res.status(400).json({ error: "Credentials data is required" });
      }
      
      // Encrypt the credential data
      const encryptedData = encrypt(JSON.stringify(credData));
      
      const credential = await storage.saveCredential({
        service: 'google_sheets',
        name: name || 'Google Sheets Credentials',
        credentialData: { encrypted: encryptedData },
        isActive: true
      });
      
      res.json({
        success: true,
        message: "Google Sheets credentials saved successfully",
        credentialId: credential.id
      });
      
    } catch (error) {
      console.error("Error saving Google Sheets credentials:", error);
      res.status(500).json({ error: "Failed to save Google Sheets credentials" });
    }
  });

  /**
   * Save Shopify credentials
   */
  app.post("/api/credentials/shopify", async (req: Request, res: Response) => {
    try {
      const { name, credentials: credData } = req.body;
      
      if (!credData) {
        return res.status(400).json({ error: "Credentials data is required" });
      }
      
      // Encrypt the credential data
      const encryptedData = encrypt(JSON.stringify(credData));
      
      const credential = await storage.saveCredential({
        service: 'shopify',
        name: name || 'Shopify Credentials',
        credentialData: { encrypted: encryptedData },
        isActive: true
      });
      
      res.json({
        success: true,
        message: "Shopify credentials saved successfully",
        credentialId: credential.id
      });
      
    } catch (error) {
      console.error("Error saving Shopify credentials:", error);
      res.status(500).json({ error: "Failed to save Shopify credentials" });
    }
  });

  /**
   * Retrieve decrypted credentials for a service (internal use)
   */
  app.get("/api/credentials/decrypt/:service", async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const credential = await storage.getCredentialByService(service);
      
      if (!credential) {
        return res.status(404).json({ error: "Credentials not found" });
      }
      
      // Decrypt the credential data
      const encryptedData = credential.credentialData as any;
      if (encryptedData.encrypted) {
        const decryptedData = decrypt(encryptedData.encrypted);
        const parsedData = JSON.parse(decryptedData);
        
        // Update last used timestamp
        await storage.updateCredential(credential.id, { lastUsed: new Date() });
        
        res.json({
          service: credential.service,
          name: credential.name,
          credentials: parsedData
        });
      } else {
        res.status(400).json({ error: "Invalid credential format" });
      }
      
    } catch (error) {
      console.error("Error decrypting credentials:", error);
      res.status(500).json({ error: "Failed to decrypt credentials" });
    }
  });

  /**
   * Delete stored credentials
   */
  app.delete("/api/credentials/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCredential(parseInt(id));
      
      if (success) {
        res.json({ success: true, message: "Credentials deleted successfully" });
      } else {
        res.status(404).json({ error: "Credentials not found" });
      }
      
    } catch (error) {
      console.error("Error deleting credentials:", error);
      res.status(500).json({ error: "Failed to delete credentials" });
    }
  });

  /**
   * Test stored credentials
   */
  app.post("/api/credentials/test/:service", async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const credential = await storage.getCredentialByService(service);
      
      if (!credential) {
        return res.status(404).json({ error: "No credentials found for this service" });
      }
      
      // Decrypt and test the credentials
      const encryptedData = credential.credentialData as any;
      if (encryptedData.encrypted) {
        const decryptedData = decrypt(encryptedData.encrypted);
        const parsedData = JSON.parse(decryptedData);
        
        // Update last used timestamp
        await storage.updateCredential(credential.id, { lastUsed: new Date() });
        
        res.json({
          success: true,
          message: `${service} credentials are valid and ready to use`,
          service: credential.service,
          name: credential.name
        });
      } else {
        res.status(400).json({ error: "Invalid credential format" });
      }
      
    } catch (error) {
      console.error("Error testing credentials:", error);
      res.status(500).json({ error: "Failed to test credentials" });
    }
  });
}