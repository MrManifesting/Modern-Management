// Fixed Google Apps Script for Inventory Sync
// This version handles the HTML response issue and provides better error handling

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

// Webhook handler for incoming data
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    Logger.log('Received webhook data: ' + JSON.stringify(data));
    
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

function handleInventorySync(data) {
  try {
    if (data.items && data.items.length > 0) {
      updateSyncSheet(data.items);
      updateInventorySheet(data.items);
      Logger.log('Successfully synced ' + data.items.length + ' items');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({status: 'ok', synced: data.items?.length || 0}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Sync error: ' + error.toString());
    throw error;
  }
}

function updateSyncSheet(items) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SYNC_SHEET_ID).getActiveSheet();
    
    if (sheet.getRange(1, 1).getValue() === '') {
      sheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Items Synced', 'Source', 'Status', 'Last Update', 'Notes']
      ]);
    }
    
    sheet.appendRow([
      new Date(),
      items?.length || 0,
      'Inventory System',
      'Success',
      new Date(),
      'Service Account Integration'
    ]);
    
  } catch (error) {
    Logger.log('Error updating sync sheet: ' + error.toString());
  }
}

function updateInventorySheet(items) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.INVENTORY_SHEET_ID).getActiveSheet();
    
    if (sheet.getRange(1, 1).getValue() === '') {
      sheet.getRange(1, 1, 1, 9).setValues([
        ['ID', 'Name', 'SKU', 'Quantity', 'Base Price', 'Status', 'Category', 'Brand', 'Last Updated']
      ]);
    }
    
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }
    
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
    
    Logger.log('Updated inventory with ' + (items?.length || 0) + ' items');
  } catch (error) {
    Logger.log('Error updating inventory: ' + error.toString());
  }
}

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
    Logger.log('Error forwarding: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleShopifyOrder(orderData) {
  return forwardToInventorySystem({
    action: 'shopify_order_update',
    data: orderData
  });
}

// FIXED manual sync function with better error handling
function manualInventorySync() {
  try {
    Logger.log('Starting manual sync...');
    
    const response = UrlFetchApp.fetch(CONFIG.INVENTORY_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    Logger.log('Response status: ' + response.getResponseCode());
    
    const responseText = response.getContentText();
    
    // Check if we got HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      Logger.log('ERROR: Received HTML response instead of JSON');
      Logger.log('This usually means the endpoint URL is incorrect or the server is not responding properly');
      Logger.log('Response preview: ' + responseText.substring(0, 200));
      throw new Error('Received HTML response instead of JSON. Check endpoint configuration.');
    }
    
    if (response.getResponseCode() !== 200) {
      Logger.log('HTTP Error: ' + response.getResponseCode());
      Logger.log('Response: ' + responseText);
      throw new Error('HTTP ' + response.getResponseCode() + ': ' + responseText);
    }
    
    const result = JSON.parse(responseText);
    Logger.log('Sync result: ' + JSON.stringify(result));
    
    if (result.success && result.syncedItems) {
      Logger.log('✅ Successfully synced ' + result.syncedItems + ' items');
      
      // Optionally update Google Sheets with confirmation
      const confirmationSheet = SpreadsheetApp.openById(CONFIG.SYNC_SHEET_ID).getActiveSheet();
      confirmationSheet.appendRow([
        new Date(),
        result.syncedItems,
        'Manual Sync',
        'Success',
        new Date(),
        'Manual sync completed successfully'
      ]);
    } else {
      Logger.log('⚠️ Sync completed but with issues: ' + JSON.stringify(result));
    }
    
    return result;
    
  } catch (error) {
    Logger.log('❌ Manual sync failed: ' + error.toString());
    
    // Log the failure to sync sheet
    try {
      const errorSheet = SpreadsheetApp.openById(CONFIG.SYNC_SHEET_ID).getActiveSheet();
      errorSheet.appendRow([
        new Date(),
        0,
        'Manual Sync',
        'Failed',
        new Date(),
        'Error: ' + error.toString()
      ]);
    } catch (sheetError) {
      Logger.log('Could not log error to sheet: ' + sheetError.toString());
    }
    
    throw error;
  }
}

function setupAutomaticSync() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'manualInventorySync') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    ScriptApp.newTrigger('manualInventorySync')
      .timeBased()
      .everyMinutes(15)
      .create();
      
    Logger.log('✅ Automatic sync set up for every 15 minutes');
    
    // Test the connection immediately
    manualInventorySync();
    
  } catch (error) {
    Logger.log('❌ Error setting up sync: ' + error.toString());
  }
}

function testConnection() {
  try {
    Logger.log('=== Testing Connection to Inventory System ===');
    manualInventorySync();
    Logger.log('✅ Connection test completed successfully');
  } catch (error) {
    Logger.log('❌ Connection test failed: ' + error.toString());
    Logger.log('Please check:');
    Logger.log('1. The Replit app URL is correct');
    Logger.log('2. The inventory system is running');
    Logger.log('3. The API endpoint exists and returns JSON');
  }
}

// Debug function to check endpoint configuration
function debugEndpoints() {
  Logger.log('=== Debug Information ===');
  Logger.log('Webhook URL: ' + CONFIG.INVENTORY_WEBHOOK_URL);
  Logger.log('Sync URL: ' + CONFIG.INVENTORY_SYNC_URL);
  Logger.log('Sync Sheet ID: ' + CONFIG.SYNC_SHEET_ID);
  Logger.log('Inventory Sheet ID: ' + CONFIG.INVENTORY_SHEET_ID);
  Logger.log('Service Account: ' + CONFIG.SERVICE_ACCOUNT_EMAIL);
  
  // Test basic connectivity
  try {
    const response = UrlFetchApp.fetch('https://modern-inventory-and-sales-management-whateversclever.replit.app/', {
      method: 'GET',
      muteHttpExceptions: true
    });
    Logger.log('Base URL response status: ' + response.getResponseCode());
  } catch (error) {
    Logger.log('Cannot reach base URL: ' + error.toString());
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