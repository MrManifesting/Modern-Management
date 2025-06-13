# Inventory Management System

## Overview

This is a comprehensive inventory management system built with Node.js, React, and PostgreSQL. The application provides full-featured inventory tracking, multi-marketplace integrations (particularly Shopify), AI-powered analysis, barcode/QR code generation, and real-time synchronization capabilities. It's designed to handle complex e-commerce operations with features like bulk item breakdown, affiliate management, and automated reporting.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Components**: Shadcn/UI with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming (gold color scheme)
- **Build Tool**: Vite with hot module replacement
- **State Management**: React hooks and context patterns

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ES modules)
- **Framework**: Express.js with middleware-based architecture
- **Database ORM**: Drizzle with PostgreSQL (Neon serverless)
- **Authentication**: Multi-provider auth (local username/password, Google OAuth, Replit OAuth)
- **Session Management**: PostgreSQL-backed session store
- **File Processing**: Multer for uploads with CSV parsing capabilities

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless connection
- **Session Storage**: PostgreSQL sessions table
- **File Storage**: Local filesystem (`uploads/` directory) for temporary files
- **Credential Storage**: Encrypted credential storage for API keys

## Key Components

### Core Inventory System
- **Items Management**: Full CRUD operations with SKU generation, barcode creation, and QR codes
- **Bulk Operations**: Batch updates, bulk deletion, and CSV import/export
- **Breakdown System**: Convert bulk items (1lb+) into smaller units automatically
- **Inventory Tracking**: Real-time quantity updates with action logging

### Marketplace Integrations
- **Shopify Integration**: Product sync, order processing, webhook handling
- **Multi-marketplace Support**: Extensible architecture for additional platforms
- **Safety Modes**: Controlled sync operations with confirmation requirements
- **Automated Scheduling**: Background sync processes

### AI-Powered Features
- **Product Analysis**: OpenAI integration for image analysis and description generation
- **Inventory Insights**: ML-powered forecasting and optimization suggestions
- **Google Vision**: OCR and image recognition capabilities

### E-commerce Features
- **Payment Processing**: PayPal and Stripe integration
- **Affiliate System**: QR code generation, commission tracking, Stripe Connect
- **Order Management**: Sales tracking with marketplace correlation

### Reporting & Analytics
- **Google Sheets Integration**: Automated inventory reports and sync
- **CSV Export**: Flexible data export with custom formatting
- **Time Series Analysis**: Sales trends and inventory forecasting

## Data Flow

### Inventory Updates
1. User creates/updates items through web interface
2. System generates SKU, barcode, and QR code automatically
3. Changes trigger marketplace sync (if enabled)
4. Inventory actions logged for audit trail
5. Google Sheets updated (if configured)

### Order Processing
1. Webhook received from marketplace (Shopify)
2. Order data parsed and validated
3. Inventory quantities automatically decremented
4. Sale record created with marketplace correlation
5. Low stock alerts triggered if needed

### CSV Import Flow
1. File uploaded through web interface
2. Content parsed with robust CSV parser (handles quoted fields, HTML content)
3. Data validated and mapped to internal schema
4. Items created with auto-generated codes
5. Success/error report provided to user

## External Dependencies

### Core Services
- **Neon PostgreSQL**: Primary database hosting
- **OpenAI API**: AI analysis and content generation
- **Google Cloud Vision**: Image analysis and OCR
- **Google Sheets API**: Automated reporting

### Payment & E-commerce
- **Shopify API**: Product and order management
- **PayPal SDK**: Payment processing
- **Stripe API**: Payment processing and Connect for affiliates
- **SendGrid**: Email notifications

### Authentication
- **Google OAuth**: Social authentication
- **Replit OAuth**: Platform-specific authentication
- **Passport.js**: Authentication middleware

## Deployment Strategy

### Development Environment
- **Platform**: Replit with auto-scaling deployment
- **Port Configuration**: Internal port 5000, external port 80
- **Database**: Provisioned PostgreSQL via Replit modules
- **Environment Variables**: Stored in `.env` file with API credentials

### Build Process
1. Frontend built with Vite (`npm run build`)
2. Backend bundled with esbuild for Node.js
3. Static assets served from `dist/public`
4. Production server runs compiled JavaScript

### Environment Configuration
- **Development**: `npm run dev` - TSX for hot reload
- **Production**: `npm run start` - Node.js serving compiled bundle
- **Database**: Automatic migration with Drizzle on startup

### Security Considerations
- Session-based authentication with secure cookies
- Encrypted credential storage for API keys
- HTTPS enforcement in production
- Input validation with Zod schemas

## Recent Changes

- June 13, 2025: **Inventory Features Restoration Complete**
  - Fixed React Query configuration to resolve "No queryFn" errors and restore data loading
  - Restored barcode and QR code generation functionality (both bulk and individual operations)
  - Added Generate Units Dialog for breaking down bulk items into individual sellable units
  - Implemented SKU generation capabilities with unique identifiers per unit
  - Restored print preview functionality for barcode labels with proper formatting
  - Added color-coded categories and status indicators throughout the inventory view
  - Bulk editing capabilities now include barcode/QR code operations and SKU generation
  - All missing inventory features successfully restored after database connection issues
  - Application builds and deploys successfully with 327 items loading properly
- June 13, 2025: **Product Form Standardization Complete**
  - Updated category system: Flower category restored with "Flower" as default
  - Standardized weight options: "1 pound", "half pound", "quarter pound", "ounce", "half ounce", "quarter ounce", "eighth", "gram"
  - Set form defaults: Category="Flower", Weight="1 pound", Vendor="Gold Standard", Quality="Top Shelf"
  - Added vendor dropdown with three options: "Gold Standard", "Mason Jar Co", "Premium Supply"
  - Replaced condition field with flower quality field using standardized options
  - Updated database schema to handle string-based weight values instead of numeric
- June 13, 2025: **Bidirectional Sync System Fully Operational**
  - Fixed critical import error preventing application startup
  - Successfully initialized bidirectional sync with proper configuration
  - Verified all sync API endpoints working correctly (/api/sync/*)
  - App-to-Sheets, Shopify-to-App, and incremental sync operations tested
  - Connection status dashboard displaying proper data (326 app items, 311 Shopify products)
  - Conflict resolution set to "app-wins" with 5-minute sync intervals
- June 13, 2025: Successfully resolved Shopify store connection issues
  - Fixed store URL spelling from "curatioins" to "curations" 
  - Updated credentials validation and Admin API token requirements
  - Successfully synced 47 products from actual Shopify store
  - Store now properly connects to simplifiedcurations.myshopify.com
- June 13, 2025: Fixed database schema issues and port conflicts
- June 13, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.