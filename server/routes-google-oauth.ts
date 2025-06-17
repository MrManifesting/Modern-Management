import type { Express, Request, Response } from "express";
import { googleOAuth } from "./services/google-oauth.js";
import { storage } from "./storage.js";

export function registerGoogleOAuthRoutes(app: Express) {
  // Start Google OAuth flow
  app.get("/api/google/auth", async (req: Request, res: Response) => {
    try {
      const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly'
      ];
      
      const authUrl = googleOAuth.getAuthUrl(scopes);
      res.json({ 
        success: true, 
        authUrl,
        message: "Visit this URL to authorize the application"
      });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate authorization URL" 
      });
    }
  });

  // Handle OAuth callback
  app.post("/api/google/callback", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: "Authorization code is required" 
        });
      }

      const tokens = await googleOAuth.getAccessToken(code);
      
      // Store tokens in credentials system
      const stored = await storage.saveCredential({
        service: 'google_oauth',
        name: 'google_oauth_tokens',
        credentialData: tokens,
        isActive: true
      });
      
      if (stored) {
        res.json({
          success: true,
          message: "Google OAuth authentication successful",
          hasRefreshToken: !!tokens.refresh_token
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to store authentication tokens"
        });
      }
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to complete OAuth authentication" 
      });
    }
  });

  // Check Google OAuth status
  app.get("/api/google/status", async (req: Request, res: Response) => {
    try {
      const allCredentials = await storage.getCredentials();
      const googleCred = allCredentials.find(cred => cred.service === 'google_oauth' && cred.isActive);
      
      if (!googleCred || !googleCred.credentialData) {
        return res.json({
          authenticated: false,
          message: "No Google OAuth tokens found"
        });
      }

      const tokens = googleCred.credentialData as any;
      const isExpired = googleOAuth.isTokenExpired(tokens);
      
      res.json({
        authenticated: true,
        isExpired,
        hasRefreshToken: !!tokens.refresh_token,
        scopes: tokens.scope?.split(' ') || [],
        message: isExpired ? "Token expired, refresh needed" : "Authentication active"
      });
    } catch (error) {
      console.error("Error checking OAuth status:", error);
      res.status(500).json({ 
        authenticated: false, 
        message: "Failed to check authentication status" 
      });
    }
  });

  // Refresh access token
  app.post("/api/google/refresh", async (req: Request, res: Response) => {
    try {
      const allCredentials = await storage.getCredentials();
      const googleCred = allCredentials.find(cred => cred.service === 'google_oauth' && cred.isActive);
      
      if (!googleCred || !googleCred.credentialData) {
        return res.status(400).json({
          success: false,
          message: "No stored tokens found"
        });
      }

      const oldTokens = googleCred.credentialData as any;
      
      if (!oldTokens.refresh_token) {
        return res.status(400).json({
          success: false,
          message: "No refresh token available. Re-authentication required."
        });
      }

      const newTokens = await googleOAuth.refreshAccessToken(oldTokens.refresh_token);
      
      // Preserve refresh token if not included in response
      if (!newTokens.refresh_token && oldTokens.refresh_token) {
        newTokens.refresh_token = oldTokens.refresh_token;
      }

      // Update stored tokens
      const credentialData = {
        service: 'google_oauth',
        data: newTokens,
        isActive: true
      };

      await storage.storeCredential('google_oauth_tokens', credentialData);
      
      res.json({
        success: true,
        message: "Access token refreshed successfully"
      });
    } catch (error) {
      console.error("Error refreshing token:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to refresh access token" 
      });
    }
  });

  // Test Google Sheets access
  app.get("/api/google/test-sheets", async (req: Request, res: Response) => {
    try {
      const credentials = await storage.getCredential('google_oauth_tokens');
      
      if (!credentials || !credentials.data) {
        return res.status(400).json({
          success: false,
          message: "No Google OAuth tokens found. Please authenticate first."
        });
      }

      const tokens = credentials.data as any;
      const sheets = await googleOAuth.getSheetsService(tokens);
      
      // Test with a simple spreadsheet read operation
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID || "15GHzyL_C2YqEMS68l7Vy3q6MA0SP9aDrhcZ4GS7HRA0";
      
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties.title'
      });

      res.json({
        success: true,
        message: "Google Sheets access test successful",
        spreadsheet: {
          title: response.data.properties?.title,
          sheets: response.data.sheets?.map(sheet => sheet.properties?.title) || []
        }
      });
    } catch (error) {
      console.error("Error testing Google Sheets access:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to access Google Sheets. Please check authentication." 
      });
    }
  });

  // Revoke Google OAuth tokens
  app.post("/api/google/revoke", async (req: Request, res: Response) => {
    try {
      // Remove stored tokens
      await storage.deleteCredential('google_oauth_tokens');
      
      res.json({
        success: true,
        message: "Google OAuth tokens revoked successfully"
      });
    } catch (error) {
      console.error("Error revoking tokens:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to revoke tokens" 
      });
    }
  });
}