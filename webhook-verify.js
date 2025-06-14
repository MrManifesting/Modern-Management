import http from 'http';

const endpoints = [
  'products/create',
  'products/update', 
  'products/delete',
  'inventory_levels/update',
  'orders/create',
  'orders/cancelled',
  'refunds/create',
  'customers/create',
  'app/uninstalled'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ test: 'webhook' });
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/shopify/webhooks/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Shopify-Topic': endpoint,
        'X-Shopify-Shop-Domain': 'mrlisterscurations.myshopify.com'
      },
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      resolve({ endpoint, status: res.statusCode, success: res.statusCode < 500 });
    });

    req.on('error', () => {
      resolve({ endpoint, status: 'ERROR', success: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ endpoint, status: 'TIMEOUT', success: false });
    });

    req.write(data);
    req.end();
  });
}

console.log('🔄 Verifying Shopify Webhook Endpoints...\n');

const results = [];
for (const endpoint of endpoints) {
  const result = await testEndpoint(endpoint);
  results.push(result);
  console.log(`${result.success ? '✅' : '❌'} ${endpoint}: ${result.status}`);
}

const successful = results.filter(r => r.success).length;
console.log(`\n📊 Summary: ${successful}/${results.length} webhooks working`);

if (successful === results.length) {
  console.log('🎉 ALL WEBHOOKS OPERATIONAL!');
} else {
  console.log('⚠️ Some webhooks need attention');
}