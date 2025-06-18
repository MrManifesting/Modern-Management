/**
 * Register Shopify Webhooks for Real-time Inventory Sync
 */

const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'mrlisterscurations.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const WEBHOOK_BASE_URL = 'https://e9d822f6-6f67-49db-b2b6-1d7e113e651a-00-1jii6pd4tn765.worf.replit.dev';

async function registerWebhook(topic, endpoint) {
  const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-10/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      webhook: {
        topic: topic,
        address: `${WEBHOOK_BASE_URL}${endpoint}`,
        format: 'json'
      }
    })
  });
  
  const result = await response.json();
  console.log(`${topic}: ${response.ok ? 'SUCCESS' : 'FAILED'}`, result);
  return response.ok;
}

async function main() {
  console.log('Registering critical webhooks for real-time inventory sync...');
  
  // Register order creation webhook (CRITICAL for inventory sync)
  await registerWebhook('orders/create', '/api/shopify/webhooks/orders/create');
  
  // Register order cancellation webhook (restore inventory)
  await registerWebhook('orders/cancelled', '/api/shopify/webhooks/orders/cancelled');
  
  // Register refund webhook (restore inventory)
  await registerWebhook('refunds/create', '/api/shopify/webhooks/refunds/create');
  
  console.log('Webhook registration completed. Real-time sync should now work!');
}

main().catch(console.error);