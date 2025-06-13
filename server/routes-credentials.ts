/**
 * Routes for managing user credentials (Shopify, Google Sheets, etc.)
 */

import { Request, Response, Express } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { userCredentials, UserCredentials, InsertUserCredentials } from "@shared/schema";
import { encryptCredentials, decryptCredentials } from "./services/encryption";

// Mock user ID for session-based credentials (in production, get from authenticated session)
const getCurrentUserId = (req: Request): number => {
  // For now, use a default user ID - in production this would come from the authenticated session
  return 1;
};

interface ShopifyCredentials {
  store: string;
  accessToken: string;
}

interface GoogleSheetsCredentials {
  clientId: string;
  clientSecret: string;
  spreadsheetId: string;
}

async function testShopifyConnection(credentials: ShopifyCredentials): Promise<{ valid: boolean; shopName?: string; error?: string }> {
  try {
    const { store, accessToken } = credentials;
    const cleanStore = store.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    const response = await fetch(`https://${cleanStore}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { valid: true, shopName: data.shop?.name || 'Unknown Store' };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function testGoogleSheetsConnection(credentials: GoogleSheetsCredentials): Promise<{ valid: boolean; title?: string; error?: string }> {
  try {
    // For now, we'll just validate the format - actual OAuth flow would be more complex
    const { clientId, clientSecret, spreadsheetId } = credentials;
    
    if (!clientId.includes('googleusercontent.com')) {
      return { valid: false, error: 'Invalid Client ID format' };
    }
    
    if (!clientSecret.startsWith('GOCSPX-')) {
      return { valid: false, error: 'Invalid Client Secret format' };
    }
    
    // Basic spreadsheet ID validation
    if (spreadsheetId.length < 40) {
      return { valid: false, error: 'Invalid Spreadsheet ID format' };
    }
    
    return { valid: true, title: `Spreadsheet ${spreadsheetId.substring(0, 8)}...` };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function registerCredentialsRoutes(app: Express) {
  /**
   * Get credentials status for the current user
   */
  app.get("/api/credentials/status", async (req: Request, res: Response) => {
    try {
      const userId = getCurrentUserId(req);
      
      const credentials = await db
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, userId));

      const result = {
        shopify: null as any,
        googleSheets: null as any,
      };

      for (const cred of credentials) {
        try {
          const decryptedData = await decryptCredentials(cred.encryptedData);
          
          if (cred.provider === 'shopify') {
            result.shopify = {
              store: decryptedData.store,
              accessToken: '***', // Don't send actual token
              isValid: cred.isValid,
            };
          } else if (cred.provider === 'google_sheets') {
            result.googleSheets = {
              clientId: decryptedData.clientId,
              clientSecret: '***', // Don't send actual secret
              spreadsheetId: decryptedData.spreadsheetId,
              isValid: cred.isValid,
            };
          }
        } catch (error) {
          console.error(`Error decrypting ${cred.provider} credentials:`, error);
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching credentials status:", error);
      res.status(500).json({ error: "Failed to fetch credentials status" });
    }
  });

  /**
   * Save Shopify credentials
   */
  app.post("/api/credentials/shopify", async (req: Request, res: Response) => {
    try {
      const userId = getCurrentUserId(req);
      const { store, accessToken } = req.body as ShopifyCredentials;

      if (!store || !accessToken) {
        return res.status(400).json({ error: "Store and access token are required" });
      }

      // Test the connection first
      const testResult = await testShopifyConnection({ store, accessToken });
      
      // Encrypt the credentials
      const encryptedData = await encryptCredentials({ store, accessToken });

      // Check if credentials already exist for this user
      const existingCreds = await db
        .select()
        .from(userCredentials)
        .where(and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.provider, 'shopify')
        ));

      if (existingCreds.length > 0) {
        // Update existing credentials
        await db
          .update(userCredentials)
          .set({
            encryptedData,
            isValid: testResult.valid,
            lastValidated: testResult.valid ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(userCredentials.id, existingCreds[0].id));
      } else {
        // Create new credentials
        await db.insert(userCredentials).values({
          userId,
          provider: 'shopify',
          encryptedData,
          isValid: testResult.valid,
          lastValidated: testResult.valid ? new Date() : null,
        });
      }

      res.json({ 
        success: true, 
        valid: testResult.valid,
        shopName: testResult.shopName,
        error: testResult.error,
      });
    } catch (error) {
      console.error("Error saving Shopify credentials:", error);
      res.status(500).json({ error: "Failed to save Shopify credentials" });
    }
  });

  /**
   * Save Google Sheets credentials
   */
  app.post("/api/credentials/google-sheets", async (req: Request, res: Response) => {
    try {
      const userId = getCurrentUserId(req);
      const { clientId, clientSecret, spreadsheetId } = req.body as GoogleSheetsCredentials;

      if (!clientId || !clientSecret || !spreadsheetId) {
        return res.status(400).json({ error: "All Google Sheets credentials are required" });
      }

      // Test the connection first
      const testResult = await testGoogleSheetsConnection({ clientId, clientSecret, spreadsheetId });
      
      // Encrypt the credentials
      const encryptedData = await encryptCredentials({ clientId, clientSecret, spreadsheetId });

      // Check if credentials already exist for this user
      const existingCreds = await db
        .select()
        .from(userCredentials)
        .where(and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.provider, 'google_sheets')
        ));

      if (existingCreds.length > 0) {
        // Update existing credentials
        await db
          .update(userCredentials)
          .set({
            encryptedData,
            isValid: testResult.valid,
            lastValidated: testResult.valid ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(userCredentials.id, existingCreds[0].id));
      } else {
        // Create new credentials
        await db.insert(userCredentials).values({
          userId,
          provider: 'google_sheets',
          encryptedData,
          isValid: testResult.valid,
          lastValidated: testResult.valid ? new Date() : null,
        });
      }

      res.json({ 
        success: true, 
        valid: testResult.valid,
        title: testResult.title,
        error: testResult.error,
      });
    } catch (error) {
      console.error("Error saving Google Sheets credentials:", error);
      res.status(500).json({ error: "Failed to save Google Sheets credentials" });
    }
  });

  /**
   * Test Shopify connection
   */
  app.post("/api/credentials/test/shopify", async (req: Request, res: Response) => {
    try {
      const userId = getCurrentUserId(req);
      
      const creds = await db
        .select()
        .from(userCredentials)
        .where(and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.provider, 'shopify')
        ));

      if (creds.length === 0) {
        return res.status(404).json({ error: "No Shopify credentials found" });
      }

      const decryptedData = await decryptCredentials(creds[0].encryptedData);
      const testResult = await testShopifyConnection(decryptedData);

      // Update the validation status
      await db
        .update(userCredentials)
        .set({
          isValid: testResult.valid,
          lastValidated: new Date(),
        })
        .where(eq(userCredentials.id, creds[0].id));

      if (testResult.valid) {
        res.json({ success: true, shopName: testResult.shopName });
      } else {
        res.status(400).json({ error: testResult.error });
      }
    } catch (error) {
      console.error("Error testing Shopify connection:", error);
      res.status(500).json({ error: "Failed to test Shopify connection" });
    }
  });

  /**
   * Test Google Sheets connection
   */
  app.post("/api/credentials/test/google-sheets", async (req: Request, res: Response) => {
    try {
      const userId = getCurrentUserId(req);
      
      const creds = await db
        .select()
        .from(userCredentials)
        .where(and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.provider, 'google_sheets')
        ));

      if (creds.length === 0) {
        return res.status(404).json({ error: "No Google Sheets credentials found" });
      }

      const decryptedData = await decryptCredentials(creds[0].encryptedData);
      const testResult = await testGoogleSheetsConnection(decryptedData);

      // Update the validation status
      await db
        .update(userCredentials)
        .set({
          isValid: testResult.valid,
          lastValidated: new Date(),
        })
        .where(eq(userCredentials.id, creds[0].id));

      if (testResult.valid) {
        res.json({ success: true, title: testResult.title });
      } else {
        res.status(400).json({ error: testResult.error });
      }
    } catch (error) {
      console.error("Error testing Google Sheets connection:", error);
      res.status(500).json({ error: "Failed to test Google Sheets connection" });
    }
  });

  /**
   * Get decrypted credentials for internal use (not exposed externally)
   */
  app.get("/api/credentials/internal/:provider", async (req: Request, res: Response) => {
    try {
      const userId = getCurrentUserId(req);
      const { provider } = req.params;
      
      const creds = await db
        .select()
        .from(userCredentials)
        .where(and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.provider, provider)
        ));

      if (creds.length === 0 || !creds[0].isValid) {
        return res.status(404).json({ error: `No valid ${provider} credentials found` });
      }

      const decryptedData = await decryptCredentials(creds[0].encryptedData);
      res.json(decryptedData);
    } catch (error) {
      console.error(`Error fetching ${req.params.provider} credentials:`, error);
      res.status(500).json({ error: `Failed to fetch ${req.params.provider} credentials` });
    }
  });
}