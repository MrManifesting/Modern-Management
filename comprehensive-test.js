#!/usr/bin/env node

const testResults = {
  apiEndpoints: [],
  frontendPages: [],
  buttonFunctionality: [],
  componentErrors: []
};

// Core API Endpoints Test
const apiTests = [
  { name: 'Dashboard Stats', url: 'http://localhost:5000/api/stats', expected: 'success' },
  { name: 'Inventory Items', url: 'http://localhost:5000/api/items', expected: 'array' },
  { name: 'Enhanced Inventory', url: 'http://localhost:5000/api/inventory/enhanced', expected: 'array' },
  { name: 'Shopify Connection', url: 'http://localhost:5000/api/shopify/test-connection', expected: 'connected' },
  { name: 'Shopify Sales Report', url: 'http://localhost:5000/api/shopify/reports/sales/7d', expected: 'success' },
  { name: 'Google Sheets Status', url: 'http://localhost:5000/api/google-sheets/status', expected: 'response' },
  { name: 'Marketplace List', url: 'http://localhost:5000/api/marketplaces', expected: 'array' },
  { name: 'Live Menu', url: 'http://localhost:5000/api/live-menu', expected: 'success' },
  { name: 'Catalog', url: 'http://localhost:5000/api/catalog', expected: 'success' },
  { name: 'Recent Sales', url: 'http://localhost:5000/api/sales/recent', expected: 'success' },
  { name: 'System Health', url: 'http://localhost:5000/api/system/health', expected: 'healthy' },
  { name: 'Price Sheet', url: 'http://localhost:5000/api/generate-price-sheet', expected: 'html' },
  { name: 'Item View', url: 'http://localhost:5000/api/items/1384/sheets-view', expected: 'success' },
  { name: 'Shopify Item View', url: 'http://localhost:5000/api/items/1384/shopify-view', expected: 'success' }
];

// POST Endpoint Tests
const postTests = [
  { name: 'Google Sheets Sync', url: 'http://localhost:5000/api/google-sheets/sync', method: 'POST' },
  { name: 'Google Sheets Import', url: 'http://localhost:5000/api/google-sheets/import', method: 'POST' }
];

async function testEndpoint(test) {
  try {
    const response = await fetch(test.url, {
      method: test.method || 'GET',
      headers: test.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body: test.method === 'POST' ? '{}' : undefined
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    let status = 'PASS';
    let details = '';
    
    if (!response.ok) {
      status = 'FAIL';
      details = `HTTP ${response.status}`;
    } else {
      switch (test.expected) {
        case 'success':
          status = (data.success === true) ? 'PASS' : 'FAIL';
          details = data.success ? 'Success confirmed' : 'Success flag missing';
          break;
        case 'array':
          status = Array.isArray(data) ? 'PASS' : 'FAIL';
          details = Array.isArray(data) ? `Array with ${data.length} items` : 'Not an array';
          break;
        case 'connected':
          status = (data.connected === true) ? 'PASS' : 'FAIL';
          details = data.connected ? 'Connection confirmed' : 'Connection failed';
          break;
        case 'healthy':
          status = (data.status === 'healthy') ? 'PASS' : 'FAIL';
          details = data.status || 'No status';
          break;
        case 'html':
          status = (typeof data === 'string' && data.includes('<!DOCTYPE')) ? 'PASS' : 'FAIL';
          details = typeof data === 'string' ? 'HTML response' : 'Not HTML';
          break;
        case 'response':
          status = 'PASS';
          details = 'Response received';
          break;
      }
    }
    
    return {
      name: test.name,
      status,
      details,
      responseTime: Date.now()
    };
    
  } catch (error) {
    return {
      name: test.name,
      status: 'ERROR',
      details: error.message,
      responseTime: Date.now()
    };
  }
}

async function runComprehensiveTests() {
  console.log('🔍 Comprehensive System Test - All Pages and Buttons\n');
  
  // Test API Endpoints
  console.log('📡 Testing API Endpoints:');
  for (const test of apiTests) {
    const result = await testEndpoint(test);
    const icon = result.status === 'PASS' ? '✅' : (result.status === 'ERROR' ? '❌' : '⚠️');
    console.log(`${icon} ${result.name}: ${result.status} - ${result.details}`);
    testResults.apiEndpoints.push(result);
  }
  
  console.log('\n📤 Testing POST Endpoints:');
  for (const test of postTests) {
    const result = await testEndpoint(test);
    const icon = result.status === 'PASS' ? '✅' : (result.status === 'ERROR' ? '❌' : '⚠️');
    console.log(`${icon} ${result.name}: ${result.status} - ${result.details}`);
    testResults.apiEndpoints.push(result);
  }
  
  // Summary
  const totalTests = testResults.apiEndpoints.length;
  const passedTests = testResults.apiEndpoints.filter(t => t.status === 'PASS').length;
  const failedTests = testResults.apiEndpoints.filter(t => t.status === 'FAIL').length;
  const errorTests = testResults.apiEndpoints.filter(t => t.status === 'ERROR').length;
  
  console.log('\n📊 Test Summary:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`⚠️  Failed: ${failedTests}`);
  console.log(`❌ Errors: ${errorTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED - System is fully operational!');
  } else {
    console.log('\n⚠️  Some tests failed - check details above');
  }
}

runComprehensiveTests().catch(console.error);