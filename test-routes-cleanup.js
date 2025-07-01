#!/usr/bin/env node

import http from 'http';
import { URL } from 'url';

const BASE_URL = 'http://localhost:5000';

// List of all routes to test
const routes = [
  { method: 'GET', path: '/api/health', expected: 200 },
  { method: 'GET', path: '/api/user', expected: 401 },
  { method: 'GET', path: '/api/stats', expected: 200 },
  
  // Google Sheets routes
  { method: 'GET', path: '/api/google-sheets/status', expected: 200 },
  { method: 'GET', path: '/api/google-sheets/config', expected: 200 },
  { method: 'GET', path: '/api/google-sheets/test', expected: 200 },
  
  // Marketplace routes
  { method: 'GET', path: '/api/marketplaces', expected: 200 },
  { method: 'GET', path: '/api/marketplace/connections', expected: 200 },
  
  // Inventory routes
  { method: 'GET', path: '/api/items', expected: 200 },
  { method: 'GET', path: '/api/inventory/current-summary', expected: 200 },
  { method: 'GET', path: '/api/inventory/enhanced', expected: 200 },
  { method: 'GET', path: '/api/items/mobile', expected: 200 },
  
  // Individual item routes
  { method: 'GET', path: '/api/items/1', expected: [200, 404] },
  { method: 'GET', path: '/api/items/1/shopify-view', expected: [200, 404] },
  { method: 'GET', path: '/api/items/1/shopify-storefront', expected: [302, 404] },
  
  // Shopify routes
  { method: 'GET', path: '/api/shopify/test-connection', expected: 200 },
  { method: 'GET', path: '/api/shopify/reports/sales', expected: 200 },
  { method: 'GET', path: '/api/shopify/reports/inventory', expected: 200 },
  { method: 'GET', path: '/api/shopify/reports/customers', expected: 200 },
  
  // AI Assistant routes
  { method: 'GET', path: '/api/ai/status', expected: 200 },
  { method: 'GET', path: '/api/ai/conversations', expected: 200 },
  
  // Scanner routes
  { method: 'GET', path: '/api/scanner/lookup?code=test123', expected: [200, 404] },
  
  // Sales routes
  { method: 'GET', path: '/api/sales', expected: 200 },
  { method: 'GET', path: '/api/sales/recent', expected: 200 },
  
  // System routes
  { method: 'GET', path: '/api/system/health', expected: 200 },
  
  // Menu generation routes
  { method: 'GET', path: '/api/generate-price-sheet', expected: 200 },
  { method: 'GET', path: '/api/menu', expected: 200 },
  { method: 'GET', path: '/api/live-menu', expected: 200 },
  { method: 'GET', path: '/api/catalog', expected: 200 },
  { method: 'GET', path: '/api/bulk-flower', expected: 200 },
  { method: 'GET', path: '/api/book-flower-menu', expected: 200 },
];

async function testRoute(route) {
  return new Promise((resolve) => {
    const url = new URL(route.path, BASE_URL);
    const options = {
      method: route.method,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      const expected = Array.isArray(route.expected) ? route.expected : [route.expected];
      const success = expected.includes(res.statusCode);
      
      resolve({
        ...route,
        actualStatus: res.statusCode,
        success,
        message: success ? 'OK' : `Expected ${route.expected}, got ${res.statusCode}`
      });
    });

    req.on('error', (error) => {
      resolve({
        ...route,
        actualStatus: 'ERROR',
        success: false,
        message: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ...route,
        actualStatus: 'TIMEOUT',
        success: false,
        message: 'Request timed out'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing all API routes...\n');
  
  const results = [];
  
  for (const route of routes) {
    process.stdout.write(`Testing ${route.method} ${route.path}... `);
    const result = await testRoute(route);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.actualStatus}`);
    } else {
      console.log(`❌ ${result.message}`);
    }
  }
  
  console.log('\n--- SUMMARY ---');
  const working = results.filter(r => r.success);
  const broken = results.filter(r => !r.success);
  
  console.log(`✅ Working routes: ${working.length}`);
  console.log(`❌ Broken routes: ${broken.length}`);
  
  if (broken.length > 0) {
    console.log('\nBroken routes:');
    broken.forEach(route => {
      console.log(`  ${route.method} ${route.path} - ${route.message}`);
    });
  }
  
  console.log('\nRoute testing complete.');
}

runTests().catch(console.error);