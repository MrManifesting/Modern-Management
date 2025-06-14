/**
 * Webhook Testing Script
 * Tests all Shopify webhook endpoints to verify they're working correctly
 */

import https from 'https';
import crypto from 'crypto';
import http from 'http';

const BASE_URL = 'http://localhost:5000';
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

// Test data for different webhook types
const testData = {
  'products/create': {
    id: 999888777,
    title: "Webhook Test Product - Creation",
    body_html: "Test product created via webhook verification",
    vendor: "Gold Standard",
    product_type: "Flower",
    status: "active",
    variants: [{
      id: 555444333,
      product_id: 999888777,
      title: "Default Title",
      price: "25.00",
      sku: "WEBHOOK-CREATE-TEST-001",
      inventory_quantity: 15,
      barcode: "WH-CREATE-001",
      weight: 1,
      weight_unit: "lb"
    }]
  },
  
  'products/update': {
    id: 999888777,
    title: "Webhook Test Product - Updated",
    body_html: "Test product updated via webhook verification",
    vendor: "Gold Standard",
    product_type: "Flower",
    status: "active",
    variants: [{
      id: 555444333,
      product_id: 999888777,
      title: "Default Title",
      price: "30.00",
      sku: "WEBHOOK-UPDATE-TEST-001",
      inventory_quantity: 20,
      barcode: "WH-UPDATE-001",
      weight: 1,
      weight_unit: "lb"
    }]
  },
  
  'products/delete': {
    id: 999888777,
    title: "Webhook Test Product - Deleted",
    vendor: "Gold Standard",
    product_type: "Flower"
  },
  
  'inventory_levels/update': {
    inventory_item_id: 555444333,
    location_id: 123456,
    available: 5,
    updated_at: new Date().toISOString()
  },
  
  'orders/create': {
    id: 777666555,
    name: "#WH-TEST-1001",
    email: "webhook-test@example.com",
    created_at: new Date().toISOString(),
    total_price: "50.00",
    financial_status: "paid",
    line_items: [{
      id: 888777666,
      product_id: 999888777,
      variant_id: 555444333,
      title: "Webhook Test Product",
      name: "Webhook Test Product",
      sku: "WEBHOOK-TEST-001",
      quantity: 2,
      price: "25.00"
    }],
    billing_address: {
      first_name: "Test",
      last_name: "User",
      address1: "123 Test St",
      city: "Test City",
      province: "Test State",
      country: "United States",
      zip: "12345"
    }
  },
  
  'orders/cancelled': {
    id: 777666555,
    name: "#WH-TEST-1001",
    email: "webhook-test@example.com",
    cancelled_at: new Date().toISOString(),
    cancel_reason: "customer",
    line_items: [{
      id: 888777666,
      product_id: 999888777,
      variant_id: 555444333,
      title: "Webhook Test Product",
      name: "Webhook Test Product",
      sku: "WEBHOOK-TEST-001",
      quantity: 2,
      price: "25.00"
    }]
  },
  
  'refunds/create': {
    id: 444333222,
    order_id: 777666555,
    created_at: new Date().toISOString(),
    note: "Webhook test refund",
    refund_line_items: [{
      id: 111222333,
      quantity: 1,
      line_item_id: 888777666,
      line_item: {
        id: 888777666,
        product_id: 999888777,
        variant_id: 555444333,
        title: "Webhook Test Product",
        name: "Webhook Test Product",
        sku: "WEBHOOK-TEST-001",
        quantity: 2,
        price: "25.00"
      }
    }]
  },
  
  'customers/create': {
    id: 123987456,
    email: "webhook-customer-test@example.com",
    first_name: "Webhook",
    last_name: "Customer",
    created_at: new Date().toISOString(),
    phone: "+1234567890",
    accepts_marketing: false
  },
  
  'app/uninstalled': {
    id: 999888777,
    name: "Test Store",
    email: "store-owner@example.com",
    domain: "test-store.myshopify.com"
  }
};

// Generate HMAC signature for webhook verification
function generateSignature(data, secret) {
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('base64');
}

// Test a single webhook endpoint
async function testWebhook(topic, endpoint, data) {
  return new Promise((resolve) => {
    const jsonData = JSON.stringify(data);
    const signature = generateSignature(jsonData, WEBHOOK_SECRET);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData),
        'X-Shopify-Topic': topic,
        'X-Shopify-Shop-Domain': 'mrlisterscurations.myshopify.com',
        'X-Shopify-Hmac-Sha256': signature
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          topic,
          endpoint,
          status: res.statusCode,
          response: responseData,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        topic,
        endpoint,
        status: 'ERROR',
        response: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        topic,
        endpoint,
        status: 'TIMEOUT',
        response: 'Request timed out',
        success: false
      });
    });

    req.write(jsonData);
    req.end();
  });
}

// Main test function
async function runWebhookTests() {
  console.log('🔄 Starting Shopify Webhook Verification...\n');
  
  const webhooks = [
    { topic: 'products/create', endpoint: '/api/shopify/webhooks/products/create' },
    { topic: 'products/update', endpoint: '/api/shopify/webhooks/products/update' },
    { topic: 'products/delete', endpoint: '/api/shopify/webhooks/products/delete' },
    { topic: 'inventory_levels/update', endpoint: '/api/shopify/webhooks/inventory_levels/update' },
    { topic: 'orders/create', endpoint: '/api/shopify/webhooks/orders/create' },
    { topic: 'orders/cancelled', endpoint: '/api/shopify/webhooks/orders/cancelled' },
    { topic: 'refunds/create', endpoint: '/api/shopify/webhooks/refunds/create' },
    { topic: 'customers/create', endpoint: '/api/shopify/webhooks/customers/create' },
    { topic: 'app/uninstalled', endpoint: '/api/shopify/webhooks/app/uninstalled' }
  ];

  const results = [];
  
  for (const webhook of webhooks) {
    const data = testData[webhook.topic];
    console.log(`Testing ${webhook.topic}...`);
    
    const result = await testWebhook(webhook.topic, webhook.endpoint, data);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${webhook.topic}: SUCCESS (${result.status})`);
    } else {
      console.log(`❌ ${webhook.topic}: FAILED (${result.status}) - ${result.response}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Webhook Test Summary:');
  console.log('=' + '='.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Total Webhooks: ${total}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${total - successful}`);
  console.log(`Success Rate: ${Math.round((successful / total) * 100)}%`);
  
  if (successful === total) {
    console.log('\n🎉 ALL WEBHOOKS ARE WORKING CORRECTLY!');
  } else {
    console.log('\n⚠️  Some webhooks need attention. Check the logs above.');
  }
  
  return results;
}

// Run the tests if this file is executed directly
runWebhookTests().catch(console.error);

export { runWebhookTests, testWebhook };