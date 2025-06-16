import fetch from 'node-fetch';

const testWebhook = async () => {
  const testOrder = {
    "id": 999999,
    "name": "#TEST-WEBHOOK-" + Date.now(),
    "order_number": "TEST-WEBHOOK-" + Date.now(),
    "email": "test@example.com",
    "created_at": new Date().toISOString(),
    "total_price": "85.00",
    "financial_status": "paid",
    "customer": {
      "first_name": "Test",
      "last_name": "Customer",
      "email": "test@example.com"
    },
    "line_items": [
      {
        "id": 1,
        "product_id": 1,
        "variant_id": 1,
        "sku": "TEST-SKU",
        "name": "Test Cannabis Product",
        "quantity": 1,
        "price": "85.00"
      }
    ]
  };

  try {
    const response = await fetch('https://modern-inventory-and-sales-management-whateversclever.replit.app/api/shopify/webhooks/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'orders/create',
        'X-Shopify-Shop-Domain': 'mrlisterscurations.myshopify.com'
      },
      body: JSON.stringify(testOrder)
    });

    const result = await response.json();
    console.log('Webhook Test Result:', result);
    
    if (result.success) {
      console.log('✅ Webhook is working correctly!');
      console.log('- Items updated:', result.itemsUpdated);
      if (result.inventoryUpdates) {
        console.log('- Inventory updates:', result.inventoryUpdates);
      }
    } else {
      console.log('❌ Webhook test failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
};

testWebhook();