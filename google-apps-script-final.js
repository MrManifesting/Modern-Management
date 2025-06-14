/**
 * CORRECTED Google Apps Script for Bidirectional Inventory Sync
 * Fixed external URL routing issues - API endpoints now return JSON properly
 * 
 * Setup Instructions:
 * 1. Replace YOUR_REPLIT_URL with your actual Replit app URL
 * 2. Set up time-based triggers for automatic sync
 * 3. Configure webhook endpoints in your inventory system
 */

// Configuration - UPDATE THESE URLs
const INVENTORY_API_BASE = 'https://inventory-management-system-myusernamehere.replit.app/api';
const SYNC_SHEET_ID = '1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s';

// Spreadsheet configuration
const SHEET_NAMES = {
  INVENTORY: 'Inventory Sync',
  LOG: 'Sync Log'
};

/**
 * Test API connectivity - run this first to verify endpoints work
 */
function testAPIConnectivity() {
  console.log('Testing API connectivity...');
  
  try {
    // Test diagnostic endpoint
    const diagnosticUrl = `${INVENTORY_API_BASE}/google-apps-script/diagnostic`;
    const diagnosticResponse = UrlFetchApp.fetch(diagnosticUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Diagnostic Response Status:', diagnosticResponse.getResponseCode());
    console.log('Diagnostic Response:', diagnosticResponse.getContentText());
    
    if (diagnosticResponse.getResponseCode() === 200) {
      const diagnosticData = JSON.parse(diagnosticResponse.getContentText());
      console.log('✅ API endpoints are accessible');
      console.log('Webhook configured:', diagnosticData.webhookConfigured);
      console.log('Sync sheet configured:', diagnosticData.syncSheetConfigured);
      
      // Test inventory sync endpoint
      const syncUrl = `${INVENTORY_API_BASE}/google-apps-script/sync-inventory`;
      const syncResponse = UrlFetchApp.fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          action: 'test_connectivity',
          timestamp: new Date().toISOString()
        })
      });
      
      console.log('Sync Test Response Status:', syncResponse.getResponseCode());
      console.log('Sync Test Response:', syncResponse.getContentText());
      
      if (syncResponse.getResponseCode() === 200) {
        console.log('✅ All API endpoints working correctly');
        return true;
      } else {
        console.log('❌ Sync endpoint not responding properly');
        return false;
      }
      
    } else {
      console.log('❌ Diagnostic endpoint not responding');
      return false;
    }
    
  } catch (error) {
    console.error('❌ API connectivity test failed:', error);
    return false;
  }
}

/**
 * Manual inventory sync - gets all items from inventory system
 */
function manualInventorySync() {
  console.log('Starting manual inventory sync...');
  
  try {
    const url = `${INVENTORY_API_BASE}/google-apps-script/sync-inventory`;
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        action: 'inventory_sync',
        timestamp: new Date().toISOString(),
        source: 'manual_sync'
      })
    });
    
    console.log('Sync Response Status:', response.getResponseCode());
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      console.log('✅ Received inventory data:', data.items?.length || 0, 'items');
      
      if (data.items && data.items.length > 0) {
        updateInventorySheet(data.items);
        logSyncActivity('inventory_sync', 'success', `Synced ${data.items.length} items`);
        console.log('✅ Manual sync completed successfully');
      } else {
        console.log('⚠️ No inventory items received');
        logSyncActivity('inventory_sync', 'warning', 'No items received from API');
      }
      
    } else {
      console.error('❌ Sync failed with status:', response.getResponseCode());
      console.error('Response:', response.getContentText());
      logSyncActivity('inventory_sync', 'error', `HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    logSyncActivity('inventory_sync', 'error', error.toString());
  }
}

/**
 * Update inventory sheet with synced data
 */
function updateInventorySheet(items) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SYNC_SHEET_ID);
    
    // Get or create inventory sheet
    let sheet = spreadsheet.getSheetByName(SHEET_NAMES.INVENTORY);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAMES.INVENTORY);
    }
    
    // Clear existing data (keep headers)
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    
    // Set headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'ID', 'Name', 'SKU', 'Category', 'Brand', 'Description',
        'Quantity', 'Base Price', 'Sale Price', 'Status', 'Weight',
        'Condition', 'Barcode', 'QR Code', 'Last Updated'
      ];
      sheet.appendRow(headers);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
    }
    
    // Add inventory data
    items.forEach(item => {
      const row = [
        item.id || '',
        item.name || '',
        item.sku || '',
        item.category || '',
        item.brand || '',
        item.description || '',
        item.quantity || 0,
        item.basePrice || '',
        item.salePrice || '',
        item.status || '',
        item.weight || '',
        item.condition || '',
        item.barcode || '',
        item.qrCode || '',
        new Date().toISOString()
      ];
      sheet.appendRow(row);
    });
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 15);
    
    console.log('✅ Inventory sheet updated with', items.length, 'items');
    
  } catch (error) {
    console.error('❌ Failed to update inventory sheet:', error);
    throw error;
  }
}

/**
 * Log sync activities
 */
function logSyncActivity(action, status, details) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SYNC_SHEET_ID);
    
    // Get or create log sheet
    let logSheet = spreadsheet.getSheetByName(SHEET_NAMES.LOG);
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(SHEET_NAMES.LOG);
      // Add headers
      logSheet.appendRow(['Timestamp', 'Action', 'Status', 'Details']);
      const headerRange = logSheet.getRange(1, 1, 1, 4);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#34a853');
      headerRange.setFontColor('white');
    }
    
    // Add log entry
    logSheet.appendRow([
      new Date().toISOString(),
      action,
      status,
      details
    ]);
    
    // Auto-resize columns
    logSheet.autoResizeColumns(1, 4);
    
  } catch (error) {
    console.error('Failed to log sync activity:', error);
  }
}

/**
 * Webhook handler for inventory system notifications
 */
function doPost(e) {
  console.log('Webhook received');
  
  try {
    if (!e || !e.postData) {
      console.log('No post data received');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'No data received'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = JSON.parse(e.postData.contents);
    console.log('Webhook data:', data);
    
    switch (data.action) {
      case 'inventory_sync':
        handleInventorySync(data);
        break;
        
      case 'shopify_order_update':
        handleShopifyOrder(data);
        break;
        
      case 'inventory_update':
        handleInventoryUpdate(data);
        break;
        
      case 'sync_request':
        // Trigger manual sync
        manualInventorySync();
        break;
        
      default:
        console.log('Unknown webhook action:', data.action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      action: data.action
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Webhook processing failed:', error);
    logSyncActivity('webhook', 'error', error.toString());
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Webhook processing failed',
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle inventory sync webhook
 */
function handleInventorySync(data) {
  console.log('Processing inventory sync webhook');
  
  if (data.items && data.items.length > 0) {
    updateInventorySheet(data.items);
    logSyncActivity('webhook_inventory_sync', 'success', `Synced ${data.items.length} items via webhook`);
  } else {
    logSyncActivity('webhook_inventory_sync', 'warning', 'No items in webhook data');
  }
}

/**
 * Handle Shopify order webhook
 */
function handleShopifyOrder(data) {
  console.log('Processing Shopify order webhook');
  
  try {
    // Forward order data back to inventory system for processing
    const url = `${INVENTORY_API_BASE}/google-apps-script/webhook`;
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        action: 'shopify_order_processed',
        orderData: data.orderData,
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.getResponseCode() === 200) {
      logSyncActivity('shopify_order', 'success', `Order ${data.orderData?.order_number || 'unknown'} processed`);
    } else {
      logSyncActivity('shopify_order', 'error', `Failed to process order: HTTP ${response.getResponseCode()}`);
    }
    
  } catch (error) {
    console.error('Failed to process Shopify order:', error);
    logSyncActivity('shopify_order', 'error', error.toString());
  }
}

/**
 * Handle inventory update webhook
 */
function handleInventoryUpdate(data) {
  console.log('Processing inventory update webhook');
  
  // Trigger a fresh sync to get updated inventory
  manualInventorySync();
  
  logSyncActivity('inventory_update', 'success', `Updated item ${data.itemId || 'unknown'}`);
}

/**
 * Set up automatic sync triggers
 */
function setupAutomaticSync() {
  console.log('Setting up automatic sync triggers...');
  
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'manualInventorySync') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger for every 15 minutes
    ScriptApp.newTrigger('manualInventorySync')
      .timeBased()
      .everyMinutes(15)
      .create();
    
    console.log('✅ Automatic sync trigger created (every 15 minutes)');
    logSyncActivity('trigger_setup', 'success', 'Automatic sync configured for every 15 minutes');
    
  } catch (error) {
    console.error('❌ Failed to set up automatic sync:', error);
    logSyncActivity('trigger_setup', 'error', error.toString());
  }
}

/**
 * Export sheet data as CSV
 */
function exportSheetToCsv() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SYNC_SHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAMES.INVENTORY);
    
    if (!sheet) {
      throw new Error('Inventory sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    let csv = '';
    
    data.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Create a blob and save to Drive
    const blob = Utilities.newBlob(csv, 'text/csv', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
    const file = DriveApp.createFile(blob);
    
    console.log('✅ CSV exported to Google Drive:', file.getUrl());
    logSyncActivity('csv_export', 'success', `Exported to: ${file.getName()}`);
    
    return file.getUrl();
    
  } catch (error) {
    console.error('❌ CSV export failed:', error);
    logSyncActivity('csv_export', 'error', error.toString());
    throw error;
  }
}

/**
 * Get sync status and statistics
 */
function getSyncStatus() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SYNC_SHEET_ID);
    const inventorySheet = spreadsheet.getSheetByName(SHEET_NAMES.INVENTORY);
    const logSheet = spreadsheet.getSheetByName(SHEET_NAMES.LOG);
    
    const status = {
      lastSync: null,
      itemCount: 0,
      recentActivity: []
    };
    
    // Get inventory count
    if (inventorySheet && inventorySheet.getLastRow() > 1) {
      status.itemCount = inventorySheet.getLastRow() - 1; // Exclude header
    }
    
    // Get recent log entries
    if (logSheet && logSheet.getLastRow() > 1) {
      const logData = logSheet.getRange(2, 1, Math.min(logSheet.getLastRow() - 1, 10), 4).getValues();
      status.recentActivity = logData.reverse().map(row => ({
        timestamp: row[0],
        action: row[1],
        status: row[2],
        details: row[3]
      }));
      
      // Get last sync time
      const syncEntries = logData.filter(row => row[1].includes('sync') && row[2] === 'success');
      if (syncEntries.length > 0) {
        status.lastSync = syncEntries[0][0];
      }
    }
    
    console.log('Sync Status:', status);
    return status;
    
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      error: error.toString(),
      itemCount: 0,
      recentActivity: []
    };
  }
}