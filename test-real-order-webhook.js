// Test script with real SKU from live inventory
import crypto from 'crypto';

const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || 'a76e1514ff3410a6293d1288779e74c6633f6c08875e33aed55a5070ca7a71d1';

// Test order with real SKU from live inventory
const testOrder = {
  "id": Date.now(),
  "name": "#TEST-" + Date.now(),
  "order_number": "TEST-" + Date.now(),
  "email": "test@example.com",
  "created_at": new Date().toISOString(),
  "total_price": "80.00",
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
      "sku": "BLACKRUNTZTH-7358", // Real SKU from live inventory
      "name": "Black Runtz - THCA FLOWER - EXOTIC INDOOR - Treemason",
      "title": "Black Runtz - THCA FLOWER - EXOTIC INDOOR - Treemason",
      "quantity": 2,
      "price": "80.00"
    }
  ]
};

const body = JSON.stringify(testOrder);
const hmac = crypto.createHmac('sha256', webhookSecret)
  .update(body, 'utf8')
  .digest('base64');

console.log('🔄 Testing Real Order Webhook...\n');
console.log('Test Order:', testOrder.name);
console.log('SKU:', testOrder.line_items[0].sku);
console.log('Quantity:', testOrder.line_items[0].quantity);
console.log('Expected: Reduce Black Runtz from 10 to 8 units');
console.log('\n📡 Sending to webhook endpoint...\n');

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
      console.log('\n🎉 SUCCESS! Real order processing worked');
      console.log('- Black Runtz quantity should be reduced by 2 units');
      console.log('- Check live catalog to verify inventory update');
    } else {
      console.log('\n❌ FAILED:', data.message);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });