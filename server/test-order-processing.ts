/**
 * Test script for Google Sheets order processing functionality
 * Demonstrates reading orders from spreadsheet and updating inventory
 */

import { GoogleSheetsService } from './services/google-sheets.js';
import { DatabaseStorage } from './storage.js';

export async function testOrderProcessing() {
  const sheetsService = new GoogleSheetsService();
  const storage = new DatabaseStorage();

  console.log('🧪 Testing Google Sheets Order Processing System');
  console.log('================================================');

  // Test spreadsheet IDs from user
  const orderSpreadsheetId = '1SW_o292VqhW0_RAIBIEb3J_9srmZGg2uyo1Kob3CU-s';
  const inventorySpreadsheetId = '1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU';

  try {
    // Check Google Sheets configuration
    const isConfigured = sheetsService.isConfigured();
    console.log('📊 Google Sheets configured:', isConfigured);

    if (!isConfigured) {
      console.log('⚠️  Google Sheets requires authentication setup');
      console.log('   Required environment variables:');
      console.log('   - GOOGLE_CLIENT_ID');
      console.log('   - GOOGLE_CLIENT_SECRET');
      console.log('   - GOOGLE_REFRESH_TOKEN');
      return {
        success: false,
        message: 'Google Sheets authentication not configured'
      };
    }

    // Test reading orders from spreadsheet
    console.log('\n📖 Reading orders from Google Sheets...');
    const orders = await sheetsService.getOrdersFromSheet(orderSpreadsheetId);
    console.log(`   Found ${orders.length} orders in spreadsheet`);

    if (orders.length > 0) {
      console.log('\n📦 Sample order data:');
      const sampleOrder = orders[0];
      console.log(`   Order ID: ${sampleOrder.orderId}`);
      console.log(`   Product: ${sampleOrder.lineItemName}`);
      console.log(`   SKU: ${sampleOrder.lineItemSku}`);
      console.log(`   Quantity: ${sampleOrder.lineItemQuantity}`);
      console.log(`   Customer: ${sampleOrder.email}`);
    }

    // Test order processing
    console.log('\n⚙️  Processing orders and updating inventory...');
    const results = await sheetsService.readAndProcessOrders(
      orderSpreadsheetId,
      inventorySpreadsheetId
    );

    console.log(`   Orders processed: ${results.ordersProcessed}`);
    console.log(`   Inventory items updated: ${results.inventoryUpdated}`);
    
    if (results.errors.length > 0) {
      console.log(`   Errors encountered: ${results.errors.length}`);
      results.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }

    // Get current inventory stats
    const items = await storage.getItems();
    const totalItems = items.length;
    const itemsWithStock = items.filter(item => (item.quantity || 0) > 0).length;
    
    console.log('\n📊 Current Inventory Status:');
    console.log(`   Total items: ${totalItems}`);
    console.log(`   Items in stock: ${itemsWithStock}`);
    console.log(`   Items out of stock: ${totalItems - itemsWithStock}`);

    return {
      success: true,
      message: `Successfully processed ${results.ordersProcessed} orders`,
      ordersProcessed: results.ordersProcessed,
      inventoryUpdated: results.inventoryUpdated,
      totalItems,
      itemsWithStock,
      errors: results.errors
    };

  } catch (error) {
    console.error('❌ Error during order processing test:', error);
    return {
      success: false,
      message: 'Order processing test failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Test Telegram image integration
export async function testTelegramIntegration() {
  console.log('\n🤖 Testing Telegram Image Integration');
  console.log('=====================================');

  try {
    // Check if Telegram bot is configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const mediaChat = process.env.TELEGRAM_MEDIA_CHAT_ID;

    console.log('🔑 Telegram bot token:', botToken ? 'Present' : 'Missing');
    console.log('💬 Media chat ID:', mediaChat ? 'Present' : 'Missing');

    if (!botToken || !mediaChat) {
      console.log('⚠️  Telegram integration requires configuration:');
      console.log('   - TELEGRAM_BOT_TOKEN: Your bot token from @BotFather');
      console.log('   - TELEGRAM_MEDIA_CHAT_ID: Chat ID for media uploads');
      return {
        success: false,
        message: 'Telegram integration not configured'
      };
    }

    console.log('✅ Telegram integration is configured');
    console.log('\n📱 How to test Telegram image integration:');
    console.log('   1. Send an image to your Telegram media chat');
    console.log('   2. Add a caption with item SKU or name (e.g., "SKU-123")');
    console.log('   3. The image will automatically associate with matching inventory items');
    console.log('   4. If the item has a Shopify ID, the image syncs to Shopify');
    console.log('   5. Images appear in the inventory interface with thumbnails');

    return {
      success: true,
      message: 'Telegram integration ready for testing'
    };

  } catch (error) {
    console.error('❌ Error testing Telegram integration:', error);
    return {
      success: false,
      message: 'Telegram integration test failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Combined test function
export async function runCompleteTest() {
  console.log('🚀 Running Complete System Test');
  console.log('================================\n');

  const orderResults = await testOrderProcessing();
  const telegramResults = await testTelegramIntegration();

  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log(`Order Processing: ${orderResults.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`Telegram Integration: ${telegramResults.success ? '✅ Ready' : '❌ Not Ready'}`);

  return {
    orderProcessing: orderResults,
    telegramIntegration: telegramResults,
    overallSuccess: orderResults.success && telegramResults.success
  };
}