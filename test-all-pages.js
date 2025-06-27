#!/usr/bin/env node

const endpoints = [
  // Core API endpoints
  { name: 'Stats', url: 'http://localhost:5000/api/stats' },
  { name: 'Items', url: 'http://localhost:5000/api/items' },
  { name: 'User Auth', url: 'http://localhost:5000/api/user' },
  { name: 'Shopify Connection', url: 'http://localhost:5000/api/shopify/test-connection' },
  { name: 'Shopify Sales Report', url: 'http://localhost:5000/api/shopify/reports/sales/7d' },
  { name: 'Google Sheets Status', url: 'http://localhost:5000/api/google-sheets/status' },
  { name: 'Google Sheets Test', url: 'http://localhost:5000/api/google-sheets/test' },
  { name: 'Enhanced Inventory', url: 'http://localhost:5000/api/inventory/enhanced' },
  { name: 'Price Sheet', url: 'http://localhost:5000/api/generate-price-sheet' },
  { name: 'Live Menu', url: 'http://localhost:5000/api/live-menu' },
  { name: 'Catalog', url: 'http://localhost:5000/api/catalog' },
  
  // Marketplace endpoints
  { name: 'Marketplace Connections', url: 'http://localhost:5000/api/marketplace/connections' },
  { name: 'Marketplace Test', url: 'http://localhost:5000/api/marketplace/test/1' },
  
  // Sales and reporting
  { name: 'Sales Recent', url: 'http://localhost:5000/api/sales/recent' },
  { name: 'System Health', url: 'http://localhost:5000/api/system/health' },
  
  // Item operations
  { name: 'Item View (1384)', url: 'http://localhost:5000/api/items/1384/sheets-view' },
  { name: 'Item Shopify View', url: 'http://localhost:5000/api/items/1384/shopify-view' },
];

const postEndpoints = [
  { name: 'Google Sheets Sync', url: 'http://localhost:5000/api/google-sheets/sync', method: 'POST' },
  { name: 'Google Sheets Import', url: 'http://localhost:5000/api/google-sheets/import', method: 'POST' },
];

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method || 'GET',
      headers: endpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body: endpoint.method === 'POST' ? '{}' : undefined
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
      data = data.substring(0, 100) + (data.length > 100 ? '...' : '');
    }
    
    return {
      name: endpoint.name,
      status: response.status,
      success: response.ok,
      data: typeof data === 'object' ? (data.success !== undefined ? data.success : 'JSON') : 'HTML'
    };
  } catch (error) {
    return {
      name: endpoint.name,
      status: 'ERROR',
      success: false,
      data: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Testing All API Endpoints\n');
  
  // Test GET endpoints
  console.log('📡 GET Endpoints:');
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.status} - ${result.data}`);
  }
  
  console.log('\n📤 POST Endpoints:');
  for (const endpoint of postEndpoints) {
    const result = await testEndpoint(endpoint);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.status} - ${result.data}`);
  }
  
  console.log('\n🎯 Test Complete');
}

runTests().catch(console.error);