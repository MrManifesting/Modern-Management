# Environment Variables Configuration

This document lists all required and optional environment variables for the Gold Standard Inventory Management System.

## Required Environment Variables

### Database
- `DATABASE_URL` - PostgreSQL connection string
  - Example: `postgresql://user:password@host:5432/database`

### Security (Production Only)
- `SESSION_SECRET` - Secret key for session encryption (required in production)
  - Generate with: `openssl rand -hex 32`
  - Minimum 32 characters recommended

- `ENCRYPTION_KEY` - Key for encrypting sensitive data (required)
  - Generate with: `openssl rand -hex 32`

- `ENCRYPTION_SALT` - Salt for encryption key derivation (required)
  - Generate with: `openssl rand -hex 16`
  - Note: Changing this will invalidate existing encrypted data

## Optional Environment Variables

### Application
- `NODE_ENV` - Environment mode (`development` | `production`)
  - Default: `development`
- `PORT` - Server port
  - Default: `5000`

### Shopify Integration
- `SHOPIFY_STORE` - Your Shopify store URL
  - Example: `your-store.myshopify.com`
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API access token
- `SHOPIFY_API_KEY` - Shopify API key
- `SHOPIFY_API_SECRET` - Shopify API secret

### Google OAuth
- `GOOGLE_CLIENT_ID` - Google OAuth 2.0 client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 2.0 client secret

### AI Services
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `GOOGLE_CLOUD_PROJECT` - Google Cloud project ID for Vision API

### Payment Processing
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_CLIENT_SECRET` - PayPal client secret

### Email
- `SENDGRID_API_KEY` - SendGrid API key for email notifications

## Setup Instructions

### Development Environment

1. Copy `.env.example` to `.env` (if available)
2. Set minimum required variables:
   ```env
   DATABASE_URL=your_database_url
   ENCRYPTION_KEY=your_encryption_key
   ENCRYPTION_SALT=your_encryption_salt
   ```

3. Generate secure keys:
   ```bash
   # Session secret
   openssl rand -hex 32

   # Encryption key
   openssl rand -hex 32

   # Encryption salt
   openssl rand -hex 16
   ```

### Production Environment

1. Ensure ALL required variables are set
2. Use strong, unique values for all secrets
3. Never commit `.env` files to version control
4. Use a secure secret management service (e.g., AWS Secrets Manager, HashiCorp Vault)
5. Set `NODE_ENV=production`

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never use default values in production**
2. **Store secrets securely** - use environment-specific secret management
3. **Rotate secrets regularly** - especially after team member changes
4. **Limit access** - only authorized personnel should have access to production secrets
5. **Monitor usage** - log and alert on unusual secret access patterns

## Migration Note

If you're upgrading from an older version that used hardcoded salts:

1. **Data will need to be re-encrypted** with new keys
2. Set up new `ENCRYPTION_SALT` environment variable
3. Run migration script (if provided) to re-encrypt existing data
4. Backup database before migration

## Troubleshooting

### "ENCRYPTION_KEY and ENCRYPTION_SALT environment variables are required"
- Ensure both variables are set in your `.env` file
- Restart the server after adding variables

### "SESSION_SECRET environment variable is required in production"
- Set `SESSION_SECRET` when `NODE_ENV=production`
- In development, a default is used (for convenience only)

### Database Connection Errors
- Verify `DATABASE_URL` format is correct
- Ensure database server is accessible
- Check firewall rules and network connectivity
