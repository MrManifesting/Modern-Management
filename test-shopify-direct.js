// Direct test script without using the node-shopify package
// Run with: node test-shopify-direct.js

import https from 'https';

const STORE = 'mrlisters-aesthetics'; // Try with different formats
const API_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Test different store URL formats
const urlFormats = [
  `${STORE}.myshopify.com`,
  `${STORE.replace(/-/g, '')}.myshopify.com`, // No hyphens
  `admin.shopify.com/store/${STORE}`,
  `admin.shopify.com/store/${STORE.replace(/-/g, '')}` // No hyphens
];

// Test simple HTTPS access to each URL format
urlFormats.forEach(url => {
  console.log(`\nTesting HTTPS access to: ${url}`);
  
  const req = https.request({
    hostname: url,
    port: 443,
    path: '/',
    method: 'GET'
  }, (res) => {
    console.log(`${url} - Status Code: ${res.statusCode}`);
    
    // Look for particular headers that might indicate it's a valid Shopify store
    if (res.headers['x-shopify-stage']) {
      console.log(`Confirmed Shopify store! Stage: ${res.headers['x-shopify-stage']}`);
    }
    
    if (res.headers['shopify-edge-ip']) {
      console.log(`Confirmed Shopify CDN! Edge IP: ${res.headers['shopify-edge-ip']}`);
    }
  });
  
  req.on('error', (error) => {
    console.error(`Error accessing ${url}: ${error.message}`);
  });
  
  req.end();
});

// Also try API endpoints directly (admin API)
console.log('\n\nTesting direct API access...');
urlFormats.slice(0, 2).forEach(url => { // Only try the myshopify.com formats
  console.log(`\nTesting API access to: ${url}`);
  
  const apiReq = https.request({
    hostname: url,
    port: 443,
    path: '/admin/api/2023-04/shop.json',
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': API_TOKEN,
      'Content-Type': 'application/json'
    }
  }, (res) => {
    console.log(`API ${url} - Status Code: ${res.statusCode}`);
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('API response:', data.substring(0, 200) + '...');
      } else {
        console.log('API response:', data);
      }
    });
  });
  
  apiReq.on('error', (error) => {
    console.error(`Error accessing API ${url}: ${error.message}`);
  });
  
  apiReq.end();
});