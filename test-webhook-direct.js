// Direct webhook test to verify order processing
const testOrder = {
  id: 999999,
  name: "#TEST001",
  email: "test@example.com",
  customer: {
    first_name: "Test",
    last_name: "Customer",
    email: "test@example.com"
  },
  line_items: [
    {
      id: 1,
      product_id: 1,
      variant_id: 1,
      sku: "SKU-1", // Using an actual SKU from your inventory
      name: "Test Product",
      title: "Test Product",
      quantity: 1,
      price: "10.00"
    }
  ],
  total_price: "10.00",
  created_at: new Date().toISOString(),
  fulfillment_status: null,
  financial_status: "paid"
};

console.log('Testing webhook with order:', JSON.stringify(testOrder, null, 2));

fetch('http://localhost:5000/api/shopify/webhooks/orders/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Topic': 'orders/create',
    'X-Shopify-Shop-Domain': 'mrlisterscurations.myshopify.com'
  },
  body: JSON.stringify(testOrder)
})
.then(response => response.json())
.then(data => {
  console.log('Webhook response:', data);
})
.catch(error => {
  console.error('Webhook error:', error);
});