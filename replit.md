# Gold-Standard_Management

## Overview

This project is a comprehensive inventory management system designed for e-commerce, built with Node.js, React, and PostgreSQL. It focuses on streamlined inventory tracking, multi-marketplace integrations (especially Shopify), and advanced features like AI-powered analysis, barcode/QR code generation, and real-time data synchronization. The system supports complex operations such as bulk item breakdown, affiliate management, and automated reporting, aiming to enhance efficiency for online businesses.

## User Preferences

- I prefer simple language.
- I like functional programming.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder Z.
- Do not make changes to the file Y.

## System Architecture

**UI/UX Decisions:**
The frontend uses React with TypeScript, styled with Tailwind CSS and Shadcn/UI components, following a gold color scheme.

**Technical Implementations:**
- **Frontend**: React, TypeScript, Vite, React Hooks, Context API.
- **Backend**: Node.js, Express.js, TypeScript (ES modules), Drizzle ORM for PostgreSQL.
- **Authentication**: Multi-provider support (local, Google OAuth, Replit OAuth) with PostgreSQL-backed session management.
- **File Handling**: Multer for file uploads, including CSV parsing.
- **Data Flow**: Direct data display from PostgreSQL for maximum transparency, with minimal transformation at the API and UI layers.
- **Inventory System**: Comprehensive CRUD for items, SKU and barcode generation, bulk operations, and real-time quantity updates. Includes a breakdown system for converting bulk items into smaller units.
- **Marketplace Integration**: Extensible architecture for multiple platforms, with a strong focus on Shopify (product sync, order processing, webhooks, scheduled syncs). Includes safety modes for controlled operations.
- **AI/ML Features**: Integration with OpenAI for product analysis and description generation, and Google Vision for OCR and image recognition, used for inventory insights and forecasting.
- **E-commerce Features**: Payment processing via PayPal and Stripe, an affiliate system with QR code generation and commission tracking, and robust order management with sales tracking.
- **Reporting & Analytics**: Google Sheets integration for automated reports and CSV export capabilities.

**System Design Choices:**
- Prioritizes raw database value display in API and UI.
- Emphasizes duplicate prevention across all import methods.
- Comprehensive customer tier management based on lifetime spending.
- Robust error handling and validation across all services.

## External Dependencies

- **Neon PostgreSQL**: Primary database.
- **OpenAI API**: AI analysis and content generation.
- **Google Cloud Vision**: Image analysis and OCR.
- **Google Sheets API**: Automated reporting.
- **Shopify API**: Product, order, and inventory management.
- **PayPal SDK**: Payment processing.
- **Stripe API**: Payment processing and Stripe Connect for affiliates.
- **SendGrid**: Email notifications.
- **Google OAuth**: User authentication.
- **Replit OAuth**: User authentication.
- **Passport.js**: Authentication middleware.