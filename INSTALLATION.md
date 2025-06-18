# Installation Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database access
- Git installed on your system

## Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MrManifesting/GoldStandardInventoryManagement.git
   cd GoldStandardInventoryManagement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL=your_postgresql_connection_string
   
   # Shopify Integration
   SHOPIFY_STORE=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_admin_api_token
   SHOPIFY_STOREFRONT_TOKEN=your_storefront_token
   
   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   
   # Payment Processing
   STRIPE_SECRET_KEY=your_stripe_secret_key
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   
   # Communication
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   SENDGRID_API_KEY=your_sendgrid_api_key
   
   # Google Sheets Integration
   GOOGLE_SHEETS_ID=your_inventory_spreadsheet_id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm run start
   ```

## API Keys Setup Guide

### Shopify Integration
1. Go to your Shopify admin → Settings → Apps and sales channels
2. Click "Develop apps" → "Create an app"
3. Configure Admin API scopes: `read_products`, `write_products`, `read_inventory`, `write_inventory`
4. Generate Admin API access token

### Google Services
1. Go to Google Cloud Console
2. Enable Google Sheets API and Google Vision API
3. Create OAuth 2.0 credentials
4. Download the credentials file

### OpenAI Integration
1. Visit OpenAI API platform
2. Create an API key with appropriate permissions
3. Add to environment variables

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure PostgreSQL server is running

**Shopify API Errors**
- Check token permissions include required scopes
- Verify store URL format: `store-name.myshopify.com`

**Google Sheets Access Denied**
- Ensure service account has access to the spreadsheet
- Check Google Cloud project permissions

### Support
For additional help, check the main README.md or create an issue in the repository.