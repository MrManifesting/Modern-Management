# Complete Shopify Webhook Configuration

## Webhook URLs for MrListersCurations Store

Configure these webhooks in your Shopify Admin → Settings → Notifications → Webhooks:

### 1. Product Management Webhooks
```
Topic: products/create
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/products/create
Format: JSON
```

```
Topic: products/update  
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/products/update
Format: JSON
```

```
Topic: products/delete
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/products/delete
Format: JSON
```

### 2. Inventory Management Webhooks
```
Topic: inventory_levels/update
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/inventory_levels/update
Format: JSON
```

### 3. Order Processing Webhooks (CRITICAL FOR BUSINESS)
```
Topic: orders/create
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/orders/create
Format: JSON
```

```
Topic: orders/cancelled
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/orders/cancelled
Format: JSON
```

```
Topic: refunds/create
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/refunds/create
Format: JSON
```

### 4. Customer Management Webhooks
```
Topic: customers/create
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/customers/create
Format: JSON
```

### 5. App Management Webhooks
```
Topic: app/uninstalled
URL: https://your-replit-domain.replit.app/api/shopify/webhooks/app/uninstalled
Format: JSON
```

## Webhook Secret
Use this webhook secret for HMAC verification:
```
a76e1514ff3410a6293d1288779e74c6633f6c08875e33aed55a5070ca7a71d1
```

## What Each Webhook Does

### orders/create (MOST IMPORTANT)
- Automatically reduces inventory quantities when orders are placed
- Logs orders to Google Sheets with customer details
- Creates sale records in database
- Tracks inventory changes with audit trail

### inventory_levels/update
- Syncs stock level changes from Shopify back to your system
- Keeps inventory quantities in sync bidirectionally

### products/create & products/update
- Automatically adds new Shopify products to your inventory system
- Updates product information, pricing, and details
- Maintains SKU mapping between systems

### orders/cancelled & refunds/create
- Restores inventory quantities when orders are cancelled or refunded
- Maintains accurate stock levels

### products/delete
- Removes deleted Shopify products from your inventory
- Keeps systems synchronized

### customers/create
- Logs new customer information for tracking
- Builds customer database for analytics

### app/uninstalled
- Cleanup webhook for when integration is removed
- Maintains data integrity

## Setup Instructions

1. Go to your Shopify Admin: admin.shopify.com/store/mrlisterscurations
2. Navigate to Settings → Notifications
3. Scroll down to "Webhooks" section
4. Click "Create webhook" for each of the 9 URLs above
5. Set Format to "JSON" for all webhooks
6. Use the webhook secret for secure verification

## Testing

After setup, test with a small order to verify:
- Inventory quantities decrease automatically
- Order appears in Google Sheets
- All webhooks show "Active" status in Shopify admin