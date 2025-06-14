// Complete Google Apps Script with Service Account Integration
// Replace the URLs with your actual Replit app URL

const CONFIG = {
  INVENTORY_WEBHOOK_URL: 'https://modern-inventory-and-sales-management-whateversclever.replit.app/api/google-apps-script/webhook',
  INVENTORY_SYNC_URL: 'https://modern-inventory-and-sales-management-whateversclever.replit.app/api/google-apps-script/sync-inventory',
  SYNC_SHEET_ID: '1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s',
  INVENTORY_SHEET_ID: '1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU',
  SERVICE_ACCOUNT_EMAIL: 'inventory-sync-service@autoshopifysheet.iam.gserviceaccount.com'
};

// Auto-assign SKUs function (keep your existing function)
function autoAssignSKUsUniversal() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (!data.length) return;
  var headers = data[0].map(h => (h || '').toString());
  function idx(col) { return headers.findIndex(h => h.trim().toLowerCase() === col.trim().toLowerCase()); }
  var handleCol = idx('Handle');
  var weightCol = idx('Option1 Value');
  var skuCol = idx('SKU');
  if (skuCol === -1) skuCol = idx('Variant SKU');
  if ([handleCol, weightCol, skuCol].some(i => i === -1)) {
    SpreadsheetApp.getUi().alert('❌ One or more columns not found!\nActual headers: ' + headers.join(', '));
    return;
  }

  var weightMap = {
    '1 pound': '454','28 grams': '28','14 grams': '14','7 grams': '7','3.5 grams': '3.5',
    '1 g': '1','1 gram': '1','1 lb': '454','pound': '454'
  };

  var updated = 0;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[skuCol]) {
      var handle = (row[handleCol] || '').toString().trim();
      var weight = (row[weightCol] || '').toString().toLowerCase().trim();
      var abbr = handle.split(/[^a-zA-Z0-9]+/).map(part => part.charAt(0)).join('').toUpperCase();
      var weightNum = weightMap[weight];
      if (weightNum === undefined) {
        var found = weight.match(/(\d+(\.\d+)?)/);
        weightNum = found ? found[1] : '';
      }
      var sku = abbr + (weightNum ? '-' + weightNum : '');
      sheet.getRange(i + 1, skuCol + 1).setValue(sku.toUpperCase());
      updated++;
    }
  }
  SpreadsheetApp.getUi().alert(`✅ Auto-assigned ${updated} UPPERCASE SKUs on "${sheet.getName()}".`);
}

// Main webhook handler - receives data from your Replit app and other sources
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    Logger.log('Received webhook data: ' + JSON.stringify(data));
    
    // Handle different types of incoming data
    switch(data.action) {
      case 'inventory_sync':
        return handleInventorySync(data);
      case 'shopify_order':
        return handleShopifyOrder(data);
      default:
        return forwardToInventorySystem(data);
    }
    
  } catch (error) {
    Logger.log('Error processing webhook: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle inventory sync from your Replit system
function handleInventorySync(data) {
  try {
    if (data.items && data.items.length > 0) {
      updateSyncSheet(data.items);
      updateInventorySheet(data.items);
      Logger.log('Successfully synced ' + data.items.length + ' items to Google Sheets');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({status: 'ok', synced: data.items?.length || 0}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Sync error: ' + error.toString());
    throw error;
  }
}

// Update the sync tracking sheet
function updateSyncSheet(items) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SYNC_SHEET_ID).getActiveSheet();
    
    // Set headers if sheet is empty
    if (sheet.getRange(1, 1).getValue() === '') {
      sheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Items Synced', 'Source', 'Status', 'Last Update', 'Notes']
      ]);
    }
    
    // Add sync record
    sheet.appendRow([
      new Date(),
      items?.length || 0,
      'Inventory System',
      'Success',
      new Date(),
      'Bidirectional sync active via Google Apps Script'
    ]);
    
    Logger.log('Updated sync tracking sheet');
  } catch (error) {
    Logger.log('Error updating sync sheet: ' + error.toString());
  }
}

// Update the main inventory sheet
function updateInventorySheet(items) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.INVENTORY_SHEET_ID).getActiveSheet();
    
    // Set headers if empty
    if (sheet.getRange(1, 1).getValue() === '') {
      sheet.getRange(1, 1, 1, 9).setValues([
        ['ID', 'Name', 'SKU', 'Quantity', 'Base Price', 'Status', 'Category', 'Brand', 'Last Updated']
      ]);
    }
    
    // Clear existing data (keep headers)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }
    
    // Add new data
    if (items && items.length > 0) {
      const rows = items.map(item => [
        item.id,
        item.name,
        item.sku,
        item.quantity,
        item.basePrice,
        item.status,
        item.category,
        item.brand,
        new Date()
      ]);
      
      sheet.getRange(2, 1, rows.length, 9).setValues(rows);
    }
    
    Logger.log('Updated inventory sheet with ' + (items?.length || 0) + ' items');
  } catch (error) {
    Logger.log('Error updating inventory sheet: ' + error.toString());
  }
}

// Forward data to your Replit inventory system
function forwardToInventorySystem(data) {
  try {
    const response = UrlFetchApp.fetch(CONFIG.INVENTORY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        action: data.action || 'sync_request',
        data: data,
        timestamp: new Date().toISOString(),
        source: 'google_apps_script'
      })
    });
    
    return ContentService
      .createTextOutput(response.getContentText())
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error forwarding to inventory system: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle Shopify order webhooks
function handleShopifyOrder(orderData) {
  try {
    // Forward Shopify order to inventory system for processing
    const response = UrlFetchApp.fetch(CONFIG.INVENTORY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        action: 'shopify_order_update',
        data: orderData,
        timestamp: new Date().toISOString(),
        source: 'shopify_via_google_apps_script'
      })
    });
    
    Logger.log('Forwarded Shopify order to inventory system');
    return ContentService
      .createTextOutput(JSON.stringify({status: 'ok', processed: 'shopify_order'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error handling Shopify order: ' + error.toString());
    throw error;
  }
}

// Manual sync function - pulls data from your Replit inventory system
function manualInventorySync() {
  try {
    Logger.log('Starting manual inventory sync...');
    
    const response = UrlFetchApp.fetch(CONFIG.INVENTORY_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = JSON.parse(response.getContentText());
    Logger.log('Manual sync result: ' + JSON.stringify(result));
    
    if (result.success && result.syncedItems) {
      // The sync endpoint should trigger the webhook which will update sheets
      Logger.log('Successfully triggered sync of ' + result.syncedItems + ' items');
      return result;
    } else {
      Logger.log('Sync failed: ' + (result.message || 'Unknown error'));
      return result;
    }
    
  } catch (error) {
    Logger.log('Manual sync failed: ' + error.toString());
    throw error;
  }
}

// Set up automatic syncing every 15 minutes
function setupAutomaticSync() {
  try {
    // Delete existing triggers first
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
      
    Logger.log('Set up automatic sync every 15 minutes');
    
    // Run initial sync
    manualInventorySync();
    
  } catch (error) {
    Logger.log('Error setting up automatic sync: ' + error.toString());
  }
}

// Export sheet to CSV (keep your existing function)
function exportSheetToCsv() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    let csv = '';
    data.forEach(row => {
      csv += row.map(cell => `"${cell ? cell.toString().replace(/"/g, '""') : ''}"`).join(',') + '\n';
    });
    const fileName = `${sheet.getName()}_export_${new Date().toISOString().split('T')[0]}.csv`;
    const file = DriveApp.createFile(fileName, csv);
    SpreadsheetApp.getUi().alert(`✅ CSV exported successfully: ${file.getUrl()}`);
  } catch (error) {
    Logger.log('Error exporting CSV: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ Export failed: ' + error.toString());
  }
}

// Test function to verify connectivity
function testConnection() {
  try {
    Logger.log('Testing connection to inventory system...');
    manualInventorySync();
    Logger.log('✅ Connection test completed - check logs for results');
  } catch (error) {
    Logger.log('❌ Connection test failed: ' + error.toString());
  }
}