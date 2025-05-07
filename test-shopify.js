// Simple test script to verify Shopify connectivity directly
// Run with: node test-shopify.js

import Shopify from 'shopify-api-node';
import https from 'https';

// Shopify store name (without myshopify.com)
const STORE_NAME = 'mrlistersaesthetics';
const STORE_URL = `${STORE_NAME}.myshopify.com`;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

console.log(`Testing connection to Shopify store: ${STORE_URL}`);
console.log(`Access token length: ${ACCESS_TOKEN?.length || 0}`);

// First test if the domain is reachable via HTTPS
console.log('\nTesting HTTPS connectivity to store domain...');
const req = https.request({
  hostname: STORE_URL,
  port: 443,
  path: '/',
  method: 'GET'
}, (res) => {
  console.log(`HTTPS Status Code: ${res.statusCode}`);
  console.log(`HTTPS Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  // Now try connecting via the Shopify API
  testShopifyAPI();
});

req.on('error', (error) => {
  console.error(`HTTPS Error: ${error.message}`);
  console.log('Proceeding to test Shopify API anyway...');
  testShopifyAPI();
});

req.end();

function testShopifyAPI() {
  console.log('\nTesting Shopify API connection...');
  
  try {
    // Create Shopify client
    const shopify = new Shopify({
      shopName: STORE_URL,
      accessToken: ACCESS_TOKEN,
      apiVersion: '2023-04',
      timeout: 15000,
      maxRetries: 0
    });
    
    console.log('Shopify client created successfully. Trying to fetch shop info...');
    
    // Test API connectivity
    shopify.shop.get()
      .then(shopInfo => {
        console.log('\nShopify Connection Successful!');
        console.log(`Store Name: ${shopInfo.name}`);
        console.log(`Domain: ${shopInfo.domain}`);
        console.log(`Email: ${shopInfo.email}`);
        console.log(`Country: ${shopInfo.country_name}`);
      })
      .catch(error => {
        console.error('\nAPI Error:', error.message);
        if (error.response && error.response.body) {
          console.error('Response Body:', error.response.body);
        }
      });
  } catch (error) {
    console.error('\nFailed to initialize Shopify client:', error.message);
  }
}