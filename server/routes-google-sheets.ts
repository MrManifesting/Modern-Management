/**
 * Google Sheets Integration Routes
 * 
 * Provides API endpoints for connecting and synchronizing inventory data with Google Sheets
 */

import type { Express, Request, Response } from "express";
import { createGoogleSheetsService, GoogleSheetsConfig } from "./services/google-sheets";
import { IStorage } from "./storage";

export function registerGoogleSheetsRoutes(app: Express, storage: IStorage) {
  
  /**
   * Test Google Sheets connection
   */
  app.get("/api/google-sheets/test-connection", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, worksheetName } = req.query;
      
      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: spreadsheetId and worksheetName"
        });
      }

      const config: GoogleSheetsConfig = {
        spreadsheetId: spreadsheetId as string,
        worksheetName: worksheetName as string
      };

      const sheetsService = createGoogleSheetsService(config, storage);
      const info = await sheetsService.getSpreadsheetInfo();

      res.json({
        success: true,
        message: "Successfully connected to Google Sheets",
        spreadsheet: info
      });

    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      });
    }
  });

  /**
   * Create a new inventory spreadsheet
   */
  app.post("/api/google-sheets/create-spreadsheet", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: "Spreadsheet title is required"
        });
      }

      const config: GoogleSheetsConfig = {
        spreadsheetId: '', // Will be set after creation
        worksheetName: 'Inventory'
      };

      const sheetsService = createGoogleSheetsService(config, storage);
      const spreadsheetId = await sheetsService.createInventorySheet(title);

      res.json({
        success: true,
        message: "Spreadsheet created successfully",
        spreadsheetId,
        worksheetName: 'Inventory'
      });

    } catch (error) {
      console.error('Failed to create spreadsheet:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create spreadsheet'
      });
    }
  });

  /**
   * Export inventory to Google Sheets
   */
  app.post("/api/google-sheets/export", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, worksheetName } = req.body;
      
      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: spreadsheetId and worksheetName"
        });
      }

      const config: GoogleSheetsConfig = {
        spreadsheetId,
        worksheetName
      };

      const sheetsService = createGoogleSheetsService(config, storage);
      const result = await sheetsService.exportToSheets();

      res.json({
        success: result.success,
        message: result.success ? 
          `Successfully exported ${result.syncedItems} items to Google Sheets` :
          'Export failed',
        syncedItems: result.syncedItems,
        errors: result.errors
      });

    } catch (error) {
      console.error('Export to Google Sheets failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      });
    }
  });

  /**
   * Import data from Google Sheets
   */
  app.post("/api/google-sheets/import", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, worksheetName } = req.body;
      
      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: spreadsheetId and worksheetName"
        });
      }

      const config: GoogleSheetsConfig = {
        spreadsheetId,
        worksheetName
      };

      const sheetsService = createGoogleSheetsService(config, storage);
      const result = await sheetsService.importFromSheets();

      res.json({
        success: result.success,
        message: result.success ? 
          `Successfully imported ${result.syncedItems} items from Google Sheets` :
          'Import failed',
        syncedItems: result.syncedItems,
        conflicts: result.conflicts,
        errors: result.errors
      });

    } catch (error) {
      console.error('Import from Google Sheets failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      });
    }
  });

  /**
   * Perform bidirectional sync with Google Sheets
   */
  app.post("/api/google-sheets/sync", async (req: Request, res: Response) => {
    try {
      const { spreadsheetId, worksheetName } = req.body;
      
      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: spreadsheetId and worksheetName"
        });
      }

      const config: GoogleSheetsConfig = {
        spreadsheetId,
        worksheetName
      };

      const sheetsService = createGoogleSheetsService(config, storage);
      const result = await sheetsService.syncBidirectional();

      res.json({
        success: result.success,
        message: result.success ? 
          `Successfully synchronized ${result.syncedItems} items with Google Sheets` :
          'Sync failed',
        syncedItems: result.syncedItems,
        conflicts: result.conflicts,
        errors: result.errors
      });

    } catch (error) {
      console.error('Google Sheets sync failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      });
    }
  });

  /**
   * Get Google Sheets connection status
   */
  app.get("/api/google-sheets/status", async (req: Request, res: Response) => {
    try {
      const hasCredentials = !!(
        (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) ||
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      );

      res.json({
        success: true,
        configured: hasCredentials,
        authMethod: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'service-account' : 'oauth2',
        message: hasCredentials ? 
          'Google Sheets integration is configured' : 
          'Google Sheets credentials not found. Please configure authentication.'
      });

    } catch (error) {
      console.error('Failed to check Google Sheets status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check configuration status'
      });
    }
  });
}