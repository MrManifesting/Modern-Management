-- Gold Standard Management Database Schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    replit_id VARCHAR(255),
    name VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_image_url VARCHAR(255),
    provider VARCHAR(255) DEFAULT 'local',
    role VARCHAR(255) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Items table (main inventory)
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand VARCHAR(255),
    sku VARCHAR(255) UNIQUE,
    cost_price DECIMAL(10,2),
    base_price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    wholesale_price DECIMAL(10,2),
    quantity INTEGER DEFAULT 0,
    weight VARCHAR(255),
    category VARCHAR(255) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'draft',
    vendor VARCHAR(255),
    tier VARCHAR(255),
    condition VARCHAR(255),
    strain_type VARCHAR(255),
    thca_percentage DECIMAL(5,2),
    barcode VARCHAR(255),
    qr_code VARCHAR(255),
    image_url TEXT,
    images JSON DEFAULT '[]',
    tags JSON DEFAULT '[]',
    shopify_id VARCHAR(255),
    shopify_url VARCHAR(255),
    shopify_variant_id VARCHAR(255),
    is_synced BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP,
    dimensions VARCHAR(255),
    package_size VARCHAR(255),
    marketplace_id INTEGER,
    publish_status VARCHAR(255) DEFAULT 'draft',
    external_id VARCHAR(255),
    marketplace_url VARCHAR(255),
    marketplace JSON DEFAULT '[]',
    location VARCHAR(255),
    published_to_shopify BOOLEAN DEFAULT false,
    item_type VARCHAR(255) DEFAULT 'standard',
    visibility VARCHAR(255) DEFAULT 'visible',
    processing_status VARCHAR(255),
    assigned_employee_id INTEGER,
    parent_item_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSON DEFAULT '{}'
);

-- Sales table
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    items JSON NOT NULL,
    subtotal VARCHAR(255) NOT NULL,
    total VARCHAR(255) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    shipping DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50),
    notes TEXT,
    customer_id INTEGER,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(255),
    billing_address JSON,
    shipping_address JSON,
    payment_method VARCHAR(255),
    payment_status VARCHAR(50),
    fulfillment_status VARCHAR(50),
    tracking_number VARCHAR(255),
    item_id INTEGER,
    sale_price DECIMAL(10,2),
    marketplace VARCHAR(255),
    store_id INTEGER,
    metadata JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Other required tables
CREATE TABLE affiliates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(255),
    status VARCHAR(50),
    commission_rate DECIMAL(5,2),
    total_sales INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    pending_payout DECIMAL(10,2) DEFAULT 0,
    stripe_account_id VARCHAR(255),
    payment_method VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    marketplace_type_id INTEGER NOT NULL,
    store_url VARCHAR(255),
    api_key VARCHAR(255),
    api_secret VARCHAR(255),
    access_token TEXT,
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_connected BOOLEAN DEFAULT false,
    is_sync_enabled BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP,
    last_push_at TIMESTAMP,
    sync_pull_interval INTEGER,
    sync_push_interval INTEGER,
    sync_settings JSON,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE marketplace_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(255),
    api_version VARCHAR(255),
    auth_type VARCHAR(255) DEFAULT 'api_key',
    required_fields JSON DEFAULT '[]',
    supported_features JSON DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    position VARCHAR(255),
    department VARCHAR(255),
    manager_id INTEGER REFERENCES employees(id),
    salary DECIMAL(10,2),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    status VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_actions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    action_type VARCHAR(50) NOT NULL,
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample flower inventory with prioritization
INSERT INTO items (name, description, sku, base_price, quantity, category, status, weight, brand, tier, strain_type) VALUES 
('Purple Punch - Premium Indoor', 'High-quality indoor grown Purple Punch strain with excellent potency and flavor profile', 'PP-TOP-001', 140.00, 25, 'Flower', 'active', '1 pound', 'Gold Standard', 'Top Shelf', 'Indica'),
('Gelato 47 - Exotic', 'Premium exotic Gelato 47 strain with exceptional terpene profile', 'GEL47-EX-002', 165.00, 18, 'Flower', 'active', 'half pound', 'Gold Standard', 'Exotic', 'Hybrid'),
('Wedding Cake - AA Indoor', 'Popular Wedding Cake hybrid strain, AA grade indoor cultivation', 'WC-AA-003', 120.00, 32, 'Flower', 'active', 'quarter pound', 'Gold Standard', 'AA Indoor', 'Hybrid'),
('Blue Dream - Top Shelf', 'Classic Blue Dream sativa-dominant hybrid, top shelf quality', 'BD-TS-004', 135.00, 28, 'Flower', 'active', '1 pound', 'Gold Standard', 'Top Shelf', 'Sativa'),
('OG Kush - Classic Reserve', 'Original OG Kush strain, classic reserve quality', 'OGK-CR-005', 110.00, 15, 'Flower', 'active', 'half pound', 'Gold Standard', 'Classic Reserve', 'Indica'),
('Strawberry Cough - Exotic Indoor', 'Premium Strawberry Cough with distinctive berry aroma', 'SC-EI-006', 155.00, 22, 'Flower', 'active', 'quarter pound', 'Gold Standard', 'Exotic Indoor', 'Sativa'),
('Gorilla Glue #4 - AA Indoor', 'Potent Gorilla Glue #4 strain, AA indoor cultivation', 'GG4-AA-007', 125.00, 19, 'Flower', 'active', '1 pound', 'Gold Standard', 'AA Indoor', 'Hybrid'),
('Sour Diesel - Top Shelf', 'Classic Sour Diesel energizing sativa strain', 'SD-TS-008', 130.00, 26, 'Flower', 'active', 'half pound', 'Gold Standard', 'Top Shelf', 'Sativa'),
('Granddaddy Purple - Classic Reserve', 'Traditional Granddaddy Purple indica strain', 'GDP-CR-009', 115.00, 21, 'Flower', 'active', 'quarter pound', 'Gold Standard', 'Classic Reserve', 'Indica'),
('White Widow - Exotic', 'Premium White Widow hybrid with balanced effects', 'WW-EX-010', 150.00, 17, 'Flower', 'active', '1 pound', 'Gold Standard', 'Exotic', 'Hybrid');

-- Insert marketplace types
INSERT INTO marketplace_types (name, description, is_active) VALUES 
('Shopify', 'Shopify e-commerce platform', true),
('eBay', 'eBay marketplace', false),
('Amazon', 'Amazon marketplace', false),
('Etsy', 'Etsy handmade marketplace', false);

-- Create indexes for performance
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_items_shopify_id ON items(shopify_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_sales_order_id ON sales(order_id);
CREATE INDEX idx_inventory_actions_item_id ON inventory_actions(item_id);
CREATE INDEX idx_sessions_expire ON sessions(expire);