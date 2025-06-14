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

- June 14, 2025: **Fixed Bulk Generation Functions with Product Names in Barcodes**
  - Resolved syntax errors in routes.ts that were preventing bulk generation functions from working
  - Implemented product name inclusion in barcode generation as requested
  - Barcodes now format as `SKU-ProductName` (e.g., `FLW-GEN-CRTT-057621-CRTTS0CRTT`)
  - All three bulk generation endpoints now functional: barcodes, QR codes, and SKUs
  - Fixed application startup issues and ensured proper API endpoint functionality
- June 14, 2025: **Added Shopify and Google Sheets View Buttons to Inventory**
  - Added "View in Shopify" and "View in Google Sheets" buttons to inventory item action dropdown menus
  - Implemented backend endpoints `/api/items/:id/shopify-store-view` and `/api/items/:id/sheets-view`
  - Shopify view redirects directly to admin product page for items with shopifyId
  - Google Sheets view opens with search functionality to locate items by SKU or name
  - Both features integrate seamlessly with existing inventory management workflow
- June 14, 2025: **Comprehensive Codebase Cleanup and Consolidation Complete**
  - Removed 6 duplicate route files (routes-shopify-enhanced, routes-shopify-fix, routes-shopify-safety)
  - Eliminated 8 duplicate service files (shopify-enhanced, csv-parser variants, shopify-utils, etc.)
  - Fixed all import errors and module not found issues caused by duplicate files
  - Consolidated overlapping functionality into main routes.ts file
  - Application starts successfully with all 330 items loading properly
  - Systematic removal of backup files and old duplicates across the workspace
- June 14, 2025: **Complete Scanner Functionality with Auto-Item Creation**
  - Scanner successfully detects barcodes using @zxing/library (confirmed working with test barcode "FLWGOLTEST317809QTY")
  - When barcodes aren't found in inventory, scanner automatically shows dialog to create new items
  - Auto-generates intelligent item names from barcodes (e.g., "Flower Product (FLWGOLTEST317809QTY10)")
  - New scanned items automatically set to "available" status and marked as active
  - Fixed database schema issue: changed weight field from numeric to text to support weight descriptions like "1 pound"
  - Added missing /api/items/:id/quantity endpoint for inventory actions (intake/fulfillment)
  - End-to-end scanner workflow complete: scan → detect → create item if not found → perform inventory actions
- June 14, 2025: **Scanner Consolidation and Proper Barcode Decoding Complete**
  - Removed 5 duplicate scanner components (mobile-scanner, quick-scanner, scanner-error-boundary, universal-scanner, plus complex duplicated logic)
  - Replaced text-extraction approach with proper @zxing/library barcode decoding functionality
  - Consolidated all scanner functionality into single BarcodeScanner component with actual barcode scanning capabilities
  - Fixed import errors and component references throughout scanner pages
  - Scanner now uses real barcode decoding instead of attempting to extract text patterns from images
  - Eliminated overly complex multi-variant image processing approach that was fundamentally flawed
  - Application starts successfully with proper barcode scanning functionality ready for testing
- June 14, 2025: **Fixed Bulk Code Generation "Update Failed" Error**
  - Resolved critical bug in bulk update endpoint that was causing "Update Failed" error during code generation
  - Implemented missing generateCodes functionality in /api/items/bulk-update endpoint
  - Fixed SKU generation, barcode creation, and QR code generation for bulk operations
  - Bulk code generation dialog now works properly for selected inventory items
- June 14, 2025: **Eliminated Scanner DOM Access Crashes**
  - Completely removed problematic MobileScanner component causing "NotFoundError: The object can not be found here"
  - Replaced HTML5 QR Code library with reliable SimpleScanner component across all scanner pages
  - Scanner now opens without errors and provides stable manual entry with photo capture
  - All scanner functionality redirects to SimpleScanner to prevent DOM access crashes
  - Connected scanner to existing inventory update endpoints for seamless stock management
- June 13, 2025: **Database Cleanup and Bug Fixes Complete**
  - Removed 9 duplicate user accounts sharing the same email address, maintaining only the most recent entry
  - Fixed runtime errors: null checking for event targets preventing crashes when clicking inventory items
  - Resolved DialogDescription import error in AddItemModal component eliminating accessibility warnings
  - Fixed NaN value warnings in QuickBreakdown component with proper numeric input validation
  - Standardized comprehensive detailed view structure from flower section across all product categories
  - All category views now include consistent image preview with hover effects, detailed product dialogs, and complete action menus
  - Resolved build warnings by cleaning up duplicate code in storage.ts file
  - Application builds and deploys successfully with error-free operation and all 327 items loading properly
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