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

## Changelog

Changelog:
- June 13, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.