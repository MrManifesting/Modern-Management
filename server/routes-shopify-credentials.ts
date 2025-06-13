/**
 * Routes for managing Shopify credentials
 */
import { Express, Request, Response } from "express";
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { IStorage } from './storage';

/**
 * Register Shopify credentials routes
 */
export function registerShopifyCredentialsRoutes(app: Express, storage: IStorage) {
  // Get current credentials (masked for security)
  app.get("/api/shopify/credentials", async (_req: Request, res: Response) => {
    try {
      // Return masked versions of the credentials for display purposes only
      const shopifyStore = process.env.SHOPIFY_STORE || '';
      const actualAccessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
      // Create a masked version of the token for UI display, not for internal use
      const shopifyAccessToken = actualAccessToken 
        ? '••••••••' + (actualAccessToken.slice(-4) || '')
        : '';

      res.json({
        shopifyStore,
        shopifyAccessToken,
        // Include token metadata for debugging but never the actual token
        tokenLength: actualAccessToken.length,
        tokenPrefix: actualAccessToken.substring(0, 5) + '...',
        isAdminToken: actualAccessToken.startsWith('shpat_')
      });
    } catch (error) {
      console.error("Failed to get Shopify credentials:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get Shopify credentials"
      });
    }
  });

  // Update Shopify credentials
  app.post("/api/shopify/update-credentials", async (req: Request, res: Response) => {
    try {
      const { shopifyStore, shopifyAccessToken } = req.body;

      if (!shopifyStore || !shopifyAccessToken) {
        return res.status(400).json({
          success: false,
          message: "Store URL and access token are required"
        });
      }

      // Clean up and format the store URL properly
      let cleanedStoreUrl = shopifyStore.trim();
      
      // Remove any protocol prefixes (http://, https://)
      cleanedStoreUrl = cleanedStoreUrl.replace(/^https?:\/\//, '');
      
      // Handle admin.shopify.com/store/ format
      if (cleanedStoreUrl.includes('admin.shopify.com/store/')) {
        const storeNameMatch = cleanedStoreUrl.match(/admin\.shopify\.com\/store\/([^\/\s]+)/);
        if (storeNameMatch && storeNameMatch[1]) {
          cleanedStoreUrl = storeNameMatch[1];
        }
      }
      
      // Remove any trailing slashes or paths
      if (cleanedStoreUrl.includes('/')) {
        cleanedStoreUrl = cleanedStoreUrl.split('/')[0];
      }
      
      // Add .myshopify.com suffix if not present
      if (!cleanedStoreUrl.endsWith('.myshopify.com')) {
        // If it's just a store name without any domain
        if (!cleanedStoreUrl.includes('.')) {
          cleanedStoreUrl = `${cleanedStoreUrl}.myshopify.com`;
        }
      }
      
      // Debug the store URL formatting and access token
      console.log(`Original store URL: "${shopifyStore}"`);
      console.log(`Cleaned store URL: "${cleanedStoreUrl}"`);
      console.log(`Access token length: ${shopifyAccessToken.length}, first 5 chars: ${shopifyAccessToken.substring(0, 5)}`);
      
      // Check token type and validate it's correct for Admin API
      const isStorefrontToken = shopifyAccessToken.startsWith('shpat_');
      const isAdminToken = shopifyAccessToken.startsWith('shppa_') || shopifyAccessToken.startsWith('shpat_');
      console.log(`Token type: ${isStorefrontToken ? 'Storefront API' : (isAdminToken ? 'Admin API' : 'Unknown')}`);
      
      // Validate token length (Admin API tokens are typically 32+ characters)
      if (shopifyAccessToken.length < 20) {
        return res.status(400).json({
          success: false,
          message: "Admin API token appears to be incomplete. Please ensure you copied the full token."
        });
      }
      
      // Validate final store URL format with a more lenient regex
      // Allow domains that end with .myshopify.com
      if (!cleanedStoreUrl.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
        console.log(`Store URL validation failed for: "${cleanedStoreUrl}"`);
        return res.status(400).json({
          success: false,
          message: "Invalid Shopify store URL format. Expected format: your-store.myshopify.com"
        });
      }

      // Update .env file
      const envPath = path.resolve('.env');
      
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Replace or add SHOPIFY_STORE
      if (envContent.includes('SHOPIFY_STORE=')) {
        envContent = envContent.replace(
          /SHOPIFY_STORE=.*(\r?\n|$)/,
          `SHOPIFY_STORE=${cleanedStoreUrl}$1`
        );
      } else {
        envContent += `SHOPIFY_STORE=${cleanedStoreUrl}\n`;
      }
      
      // Replace or add SHOPIFY_ACCESS_TOKEN
      if (envContent.includes('SHOPIFY_ACCESS_TOKEN=')) {
        envContent = envContent.replace(
          /SHOPIFY_ACCESS_TOKEN=.*(\r?\n|$)/,
          `SHOPIFY_ACCESS_TOKEN=${shopifyAccessToken}$1`
        );
      } else {
        envContent += `SHOPIFY_ACCESS_TOKEN=${shopifyAccessToken}\n`;
      }
      
      // Write the updated content back to the .env file
      fs.writeFileSync(envPath, envContent);
      
      // Update process.env in the current process
      process.env.SHOPIFY_STORE = cleanedStoreUrl;
      process.env.SHOPIFY_ACCESS_TOKEN = shopifyAccessToken;
      
      // Log the change
      console.log(`Shopify credentials updated. Store: ${cleanedStoreUrl}`);
      
      // Return success
      res.json({
        success: true,
        message: "Shopify credentials updated successfully"
      });
    } catch (error) {
      console.error("Failed to update Shopify credentials:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update Shopify credentials"
      });
    }
  });
}