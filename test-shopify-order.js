#!/usr/bin/env node

// Test Shopify Order Processing - Inventory Reduction Test
// This script tests the inventory reduction functionality when processing Shopify orders

import http from 'http';

const testOrderData = {
  testOrderData: {
    id: `test_order_${Date.now()}`,
    line_items: [
      {
        product_id: "test_product_1",
        variant_id: "test_variant_1",
        sku: "FLW-GEN-CRTT-463918", // Using existing SKU from inventory
        name: "Test Flower Product - CRTT",
        quantity: 2,
        price: "25.00"
      }
    ],
    total_price: "50.00",
    created_at: new Date().toISOString(),
    financial_status: "paid",
    fulfillment_status: null
  }
};

const postData = JSON.stringify(testOrderData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/test/shopify-order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing Shopify Order Processing - Inventory Reduction');
console.log('='.repeat(60));
console.log(`Test Order ID: ${testOrderData.testOrderData.id}`);
console.log(`SKU: ${testOrderData.testOrderData.line_items[0].sku}`);
console.log(`Quantity to subtract: ${testOrderData.testOrderData.line_items[0].quantity}`);
console.log('='.repeat(60));

const req = http.request(options, (res) => {
  console.log(`Response Status: ${res.statusCode}`);
  console.log(`Response Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      // Try to parse as JSON
      const response = JSON.parse(data);
      console.log('\nTest Results:');
      console.log('='.repeat(40));
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n✅ SHOPIFY ORDER PROCESSING TEST PASSED');
        console.log(`✅ Inventory updates: ${response.inventoryUpdates?.length || 0}`);
        console.log(`✅ Total quantity reduced: ${response.summary?.totalQuantityReduced || 0}`);
        
        if (response.inventoryUpdates && response.inventoryUpdates.length > 0) {
          response.inventoryUpdates.forEach(update => {
            console.log(`   Item: ${update.name}`);
            console.log(`   Previous qty: ${update.previousQuantity}`);
            console.log(`   Ordered qty: ${update.orderedQuantity}`);
            console.log(`   New qty: ${update.newQuantity}`);
          });
        }
      } else {
        console.log('\n❌ SHOPIFY ORDER PROCESSING TEST FAILED');
        console.log(`Error: ${response.error}`);
      }
    } catch (parseError) {
      console.log('\nReceived non-JSON response:');
      console.log(data.substring(0, 500) + (data.length > 500 ? '...' : ''));
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(postData);
req.end();