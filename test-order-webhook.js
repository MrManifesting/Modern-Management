// Test script to verify Shopify order webhook is working
import crypto from 'crypto';

// Your webhook secret (from Shopify webhook configuration)
const webhookSecret = 'a76e1514ff3410a6293d1288779e74c6633f6c08875e33aed55a5070ca7a71d1';

// Sample order data that matches your store format
const testOrder = {
  "id": 999999,
  "name": "#TEST-" + Date.now(),
  "order_number": "TEST-" + Date.now(),
  "email": "test@example.com",
  "created_at": new Date().toISOString(),
  "total_price": "85.00",
  "financial_status": "paid",
  "fulfillment_status": null,
  "customer": {
    "first_name": "Test",
    "last_name": "Customer",
    "email": "test@example.com"
  },
  "billing_address": {
    "first_name": "Test",
    "last_name": "Customer"
  },
  "line_items": [
    {
      "id": 1,
      "product_id": 1,
      "variant_id": 1,
      "sku": "JTFAI-14", // Using a real SKU from your inventory
      "name": "Jokers THCA Flower AA Indoor - 14 grams",
      "title": "Jokers THCA Flower AA Indoor",
      "quantity": 1,
      "price": "85.00"
    }
  ]
};

// Create HMAC signature
const body = JSON.stringify(testOrder);
const hmac = crypto.createHmac('sha256', webhookSecret)
  .update(body, 'utf8')
  .digest('base64');

console.log('🔄 Testing Shopify Order Webhook...\n');
console.log('Test Order:', testOrder.name);
console.log('SKU:', testOrder.line_items[0].sku);
console.log('Quantity:', testOrder.line_items[0].quantity);
console.log('HMAC Signature:', hmac);
console.log('\n📡 Sending to webhook endpoint...\n');

// Send test webhook
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Hmac-Sha256': hmac,
    'X-Shopify-Topic': 'orders/create',
    'X-Shopify-Shop-Domain': 'mrlisterscurations.myshopify.com'
  },
  body: body
};

fetch('http://localhost:5000/api/shopify/webhooks/orders/create', options)
  .then(response => response.json())
  .then(data => {
    console.log('✅ Webhook Response:', data);
    if (data.success) {
      console.log('\n🎉 SUCCESS! Order processing worked:');
      console.log('- Items updated:', data.itemsUpdated);
      console.log('- Inventory updates:', data.inventoryUpdates);
    } else {
      console.log('\n❌ FAILED:', data.message);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });