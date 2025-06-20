# Shopify Flow Configuration for Instant CSV Sync

## Overview
This document explains how to configure Shopify Flow to trigger instant CSV synchronization whenever inventory levels or product information changes in your Shopify store.

## Webhook Endpoints

### For Inventory Changes
**Endpoint**: `https://gold-standard-management.replit.app/api/shopify/webhooks/inventory_levels/csv-sync`
**Trigger**: When inventory levels change
**Method**: POST

### For Product Updates  
**Endpoint**: `https://gold-standard-management.replit.app/api/shopify/webhooks/products/csv-sync`
**Trigger**: When products are created, updated, or deleted
**Method**: POST

## Shopify Flow Setup Instructions

### 1. Create Inventory Level Flow
1. Go to Shopify Admin → Apps → Flow
2. Create new flow: "CSV Sync on Inventory Change"
3. **Trigger**: Inventory level changed
4. **Action**: HTTP request
   - URL: `https://gold-standard-management.replit.app/api/shopify/webhooks/inventory_levels/csv-sync`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Body: `{"trigger": "inventory_change", "timestamp": "{{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}"}`

### 2. Create Product Update Flow
1. Create new flow: "CSV Sync on Product Change"
2. **Trigger**: Product saved (covers create, update, delete)
3. **Action**: HTTP request
   - URL: `https://gold-standard-management.replit.app/api/shopify/webhooks/products/csv-sync`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Body: `{"trigger": "product_change", "product_id": "{{ product.id }}", "timestamp": "{{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}"}`

## Benefits

### Real-Time Updates
- CSV files update instantly when Shopify inventory changes
- No waiting for scheduled sync intervals
- Immediate reflection of stock changes

### Automatic Triggers
- Inventory adjustments → Instant CSV sync
- Product updates → Immediate price sheet regeneration
- Bulk inventory changes → Automatic synchronization

## Current Configuration

### Sync Frequency
- **Scheduled**: Every 1 minute (fallback)
- **Instant**: Triggered by Shopify Flow webhooks
- **Manual**: Available through admin interface

### Data Sources
- 260 flower variants from All Flower Variants CSV
- 42 menu tab items with live Shopify quantities
- 1,127 Shopify inventory quantities
- 12 active items with current stock (323 total lbs)

## CSV Output Features

### Enhanced Links
- **COA_Link**: Certificate of Analysis documents
- **Media_Download_Link**: Product photos for reposting
- **Store_Order_Link**: Direct Shopify product ordering

### File Format
- Downloads as: `gold-standard-menu-updated-{date}.csv`
- Includes all pricing tiers: Bulk, Distro 25lbs+, Master 50lbs+, Master 100lbs+
- Real-time inventory quantities from Shopify

## Testing

### Manual Trigger
```bash
curl -X POST "https://gold-standard-management.replit.app/api/csv-sync/scheduler/trigger"
```

### Webhook Test
```bash
curl -X POST "https://gold-standard-management.replit.app/api/shopify/webhooks/inventory_levels/csv-sync" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "test", "timestamp": "2025-06-20 18:07:00"}'
```

## Monitoring

### Status Check
- View scheduler status at `/menu-sync` in admin interface
- Real-time sync monitoring with 30-second updates
- Manual sync controls available

### Log Monitoring
- Console logs show: `[csv-sync-webhook] Shopify inventory update received`
- Sync completion logs: `[csv-sync-scheduler] Sync completed: X/Y items with quantities`