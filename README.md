# Gold Standard Inventory Management System

A comprehensive AI-powered inventory management platform for cannabis and hemp products, offering intelligent multi-platform synchronization with advanced analytics and robust integration capabilities.

## 🌟 Features

### Core Inventory Management
- **Advanced Item Tracking**: Full CRUD operations with SKU generation, barcode creation, and QR codes
- **Bulk Operations**: Batch updates, bulk deletion, and CSV import/export
- **Cannabis Breakdown System**: Convert bulk items (1lb+) into smaller units automatically
- **Real-time Inventory Sync**: Live quantity updates with comprehensive action logging

### Multi-Platform Integrations
- **Shopify Integration**: Bidirectional sync with product management, order processing, and webhook handling
- **Google Sheets**: Automated inventory reports and real-time synchronization
- **Telegram Bot**: Automated photo tagging and inventory image management
- **Multi-marketplace Support**: Extensible architecture for additional platforms

### AI-Powered Analytics
- **OpenAI Integration**: Image analysis and automated product description generation
- **Google Vision API**: OCR and advanced image recognition capabilities
- **ML Forecasting**: Inventory optimization and demand prediction
- **Smart Categorization**: Automated product classification and tagging

### E-commerce Features
- **Payment Processing**: PayPal and Stripe integration with affiliate support
- **Order Management**: Automated order processing with inventory deduction
- **Affiliate System**: QR code generation and commission tracking
- **Webhook System**: Real-time order and inventory synchronization

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type-safe development
- **Shadcn/UI** components with Radix UI primitives
- **Tailwind CSS** with custom gold-themed styling
- **Vite** for fast development and optimized builds
- **TanStack Query** for efficient data fetching and caching

### Backend
- **Node.js** with Express.js and TypeScript
- **PostgreSQL** database with Drizzle ORM
- **Multi-provider Authentication** (Google OAuth, Replit OAuth, local auth)
- **Session Management** with PostgreSQL-backed sessions
- **RESTful API** with comprehensive webhook support

### Database
- **PostgreSQL** via Neon serverless connection
- **Drizzle ORM** for type-safe database operations
- **Automated Migrations** with schema versioning
- **Encrypted Credential Storage** for API keys and tokens

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database access
- Shopify store (optional)
- Google Cloud Platform account (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MrManifesting/GoldStandardInventoryManagement.git
   cd GoldStandardInventoryManagement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   SHOPIFY_STORE=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_admin_api_token
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   ```

4. **Database Migration**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 📊 Key Capabilities

### Inventory Management
- **245+ Items** currently managed with real-time synchronization
- **Automatic SKU Generation** with sequential numbering (SKU-1, SKU-2, etc.)
- **Weight Standardization** for cannabis products (pounds, ounces, grams)
- **Barcode/QR Code Generation** for individual item tracking
- **Multi-label Printing** with standard formats (Avery 5160, 5261, etc.)

### Shopify Integration
- **Real-time Sync** with MrListersCurations store
- **Webhook Processing** for orders, products, and inventory changes
- **Automated Order Processing** with inventory deduction
- **Live Pricing Integration** with authentic store data
- **Product Creation** and bulk management

### Google Sheets Integration
- **Bidirectional Sync** with inventory spreadsheets
- **Order Logging** with customer details and fulfillment tracking
- **THCa Inventory Deduction** using KEY-ID matching
- **Automated Reports** with current stock summaries

### Cannabis-Specific Features
- **Breakdown System**: Convert bulk items into sellable units
- **Weight Standards**: 1 pound, half pound, quarter pound, ounce, etc.
- **THCa Percentage Tracking** with potency management
- **Strain Classification** with tier-based pricing
- **Compliance Tracking** for regulatory requirements

## 🔧 API Endpoints

### Inventory Management
- `GET /api/items` - List all inventory items
- `POST /api/items` - Create new inventory item
- `PUT /api/items/:id` - Update inventory item
- `DELETE /api/items/:id` - Delete inventory item
- `POST /api/items/bulk-update` - Bulk operations

### Shopify Integration
- `GET /api/shopify/products` - Fetch Shopify products
- `POST /api/shopify/sync` - Sync inventory to Shopify
- `POST /api/shopify/webhooks/*` - Handle Shopify webhooks

### Google Sheets
- `GET /api/sheets/inventory` - Get sheet data
- `POST /api/sheets/sync` - Sync to Google Sheets

### Analytics & Reports
- `GET /api/stats` - Get inventory statistics
- `GET /api/reports/sales` - Sales analytics
- `GET /api/reports/inventory` - Inventory reports

## 🔐 Security Features

- **Environment Variable Management** for sensitive credentials
- **HMAC SHA-256 Verification** for webhook security
- **Session-based Authentication** with secure cookies
- **Input validation** with Zod schemas
- **HTTPS enforcement** in production

## 📱 Mobile Support

- **Responsive Design** for mobile inventory management
- **Barcode Scanner** integration for quick item lookup
- **Touch-optimized Interface** with 44px minimum touch targets
- **Mobile-first Navigation** with collapsible menus

## 🧪 Testing & Quality

- **TypeScript** for compile-time error detection
- **ESLint** for code quality enforcement
- **Error Handling** with comprehensive logging
- **Database Transactions** for data integrity

## 🔄 Recent Updates

- **June 2025**: Complete automatic Shopify inventory sync system deployed
- **Enhanced Display**: Newest-first inventory sorting with pricing validation
- **Webhook System**: 9 secure endpoints for bidirectional sync
- **THCa Integration**: Automated deduction system with Google Sheets
- **AI Enhancement**: OpenAI-powered product analysis and descriptions

## 📈 Performance

- **Real-time Sync**: Sub-second inventory updates
- **Optimized Queries**: Efficient database operations with Drizzle ORM
- **Caching Strategy**: TanStack Query for optimal data fetching
- **Batch Processing**: Bulk operations for large datasets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in `/docs`
- Review the `replit.md` file for technical details

---

**Built with ❤️ for cannabis industry professionals**