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
      // Return masked versions of the credentials
      const shopifyStore = process.env.SHOPIFY_STORE || '';
      const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN 
        ? '••••••••' + (process.env.SHOPIFY_ACCESS_TOKEN.slice(-4) || '')
        : '';

      res.json({
        shopifyStore,
        shopifyAccessToken
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
      let cleanedStoreUrl = shopifyStore.replace(/^https?:\/\//, '');
      
      // Remove admin.shopify.com/store/ prefix if present
      cleanedStoreUrl = cleanedStoreUrl.replace(/^admin\.shopify\.com\/store\//, '');
      
      // Add .myshopify.com suffix if not present
      if (!cleanedStoreUrl.endsWith('.myshopify.com')) {
        // Check if it's just a store name without domain
        if (!cleanedStoreUrl.includes('.')) {
          cleanedStoreUrl = `${cleanedStoreUrl}.myshopify.com`;
        }
      }
      
      // Validate final store URL format
      if (!cleanedStoreUrl.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
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