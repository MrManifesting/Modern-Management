/**
 * Utility to mock Shopify API responses
 * This allows the app to continue functioning when actual Shopify API access is unavailable
 */

import { log } from './vite';

// Mock shop information
const mockShopInfo = {
  id: 123456789,
  name: 'Inventory Pro Demo Store',
  email: 'demo@inventorypro.com',
  domain: 'inventory-pro-demo.myshopify.com',
  province: 'California',
  country: 'US',
  address1: '123 Demo Street',
  zip: '90210',
  city: 'Beverly Hills',
  source: 'mock',
  phone: '+1-555-123-4567',
  primary_locale: 'en',
  country_code: 'US',
  country_name: 'United States',
  currency: 'USD',
  iana_timezone: 'America/Los_Angeles',
  money_format: '${{amount}}',
  money_with_currency_format: '${{amount}} USD',
  myshopify_domain: 'inventory-pro-demo.myshopify.com',
  plan_display_name: 'Enterprise',
  plan_name: 'enterprise',
  has_discounts: true,
  has_gift_cards: true,
  created_at: '2023-01-01T00:00:00-07:00',
  updated_at: '2023-12-01T00:00:00-07:00',
};

// Mock product information
const mockProducts = [
  {
    id: 1001,
    title: 'Sample Product 1',
    body_html: '<p>This is a sample product description.</p>',
    vendor: 'Inventory Pro',
    product_type: 'Electronics',
    created_at: '2023-01-15T00:00:00-07:00',
    handle: 'sample-product-1',
    updated_at: '2023-09-01T00:00:00-07:00',
    published_at: '2023-01-15T00:00:00-07:00',
    template_suffix: null,
    status: 'active',
    published_scope: 'web',
    tags: 'Electronics, Featured',
    variants: [
      {
        id: 10011,
        product_id: 1001,
        title: 'Default Title',
        price: '99.99',
        sku: 'ELEC-SP1-001',
        position: 1,
        inventory_policy: 'deny',
        compare_at_price: '129.99',
        fulfillment_service: 'manual',
        inventory_management: 'shopify',
        option1: 'Default Title',
        option2: null,
        option3: null,
        created_at: '2023-01-15T00:00:00-07:00',
        updated_at: '2023-10-01T00:00:00-07:00',
        taxable: true,
        barcode: '1234567890123',
        grams: 500,
        image_id: null,
        weight: 0.5,
        weight_unit: 'kg',
        inventory_item_id: 10111,
        inventory_quantity: 25,
        old_inventory_quantity: 25,
        requires_shipping: true,
      }
    ],
    options: [
      {
        id: 12341,
        product_id: 1001,
        name: 'Title',
        position: 1,
        values: ['Default Title']
      }
    ],
    images: [
      {
        id: 11011,
        product_id: 1001,
        position: 1,
        created_at: '2023-01-15T00:00:00-07:00',
        updated_at: '2023-01-15T00:00:00-07:00',
        alt: null,
        width: 1000,
        height: 1000,
        src: 'https://placehold.co/600x600/FFFFFF/2563eb?text=Sample+Product+1',
        variant_ids: [],
      }
    ],
  },
  {
    id: 1002,
    title: 'Sample Product 2',
    body_html: '<p>This is another sample product description.</p>',
    vendor: 'Inventory Pro',
    product_type: 'Home Goods',
    created_at: '2023-02-15T00:00:00-07:00',
    handle: 'sample-product-2',
    updated_at: '2023-11-01T00:00:00-07:00',
    published_at: '2023-02-15T00:00:00-07:00',
    template_suffix: null,
    status: 'active',
    published_scope: 'web',
    tags: 'Home Goods, Featured, Sale',
    variants: [
      {
        id: 10021,
        product_id: 1002,
        title: 'Small',
        price: '49.99',
        sku: 'HOME-SP2-SM',
        position: 1,
        inventory_policy: 'deny',
        compare_at_price: '59.99',
        fulfillment_service: 'manual',
        inventory_management: 'shopify',
        option1: 'Small',
        option2: 'Blue',
        option3: null,
        created_at: '2023-02-15T00:00:00-07:00',
        updated_at: '2023-10-01T00:00:00-07:00',
        taxable: true,
        barcode: '2234567890123',
        grams: 300,
        image_id: null,
        weight: 0.3,
        weight_unit: 'kg',
        inventory_item_id: 10211,
        inventory_quantity: 15,
        old_inventory_quantity: 15,
        requires_shipping: true,
      },
      {
        id: 10022,
        product_id: 1002,
        title: 'Medium',
        price: '59.99',
        sku: 'HOME-SP2-MD',
        position: 2,
        inventory_policy: 'deny',
        compare_at_price: '69.99',
        fulfillment_service: 'manual',
        inventory_management: 'shopify',
        option1: 'Medium',
        option2: 'Blue',
        option3: null,
        created_at: '2023-02-15T00:00:00-07:00',
        updated_at: '2023-10-01T00:00:00-07:00',
        taxable: true,
        barcode: '3234567890123',
        grams: 500,
        image_id: null,
        weight: 0.5,
        weight_unit: 'kg',
        inventory_item_id: 10212,
        inventory_quantity: 10,
        old_inventory_quantity: 10,
        requires_shipping: true,
      }
    ],
    options: [
      {
        id: 12351,
        product_id: 1002,
        name: 'Size',
        position: 1,
        values: ['Small', 'Medium', 'Large']
      },
      {
        id: 12352,
        product_id: 1002,
        name: 'Color',
        position: 2,
        values: ['Blue', 'Red', 'Green']
      }
    ],
    images: [
      {
        id: 11021,
        product_id: 1002,
        position: 1,
        created_at: '2023-02-15T00:00:00-07:00',
        updated_at: '2023-02-15T00:00:00-07:00',
        alt: null,
        width: 1000,
        height: 1000,
        src: 'https://placehold.co/600x600/FFFFFF/2563eb?text=Sample+Product+2',
        variant_ids: [],
      }
    ],
  }
];

// Mock orders
const mockOrders = [
  {
    id: 20001,
    email: 'customer1@example.com',
    closed_at: null,
    created_at: '2023-09-01T10:00:00-07:00',
    updated_at: '2023-09-01T10:05:00-07:00',
    number: 1001,
    note: null,
    token: 'abc123',
    gateway: 'credit_card',
    total_price: '109.99',
    subtotal_price: '99.99',
    total_weight: 500,
    total_tax: '10.00',
    taxes_included: false,
    currency: 'USD',
    financial_status: 'paid',
    confirmed: true,
    total_discounts: '20.00',
    total_line_items_price: '119.99',
    cart_token: 'cart_abc123',
    buyer_accepts_marketing: true,
    name: '#1001',
    referring_site: null,
    landing_site: null,
    cancelled_at: null,
    cancel_reason: null,
    total_price_usd: '109.99',
    checkout_token: 'checkout_abc123',
    reference: null,
    user_id: null,
    location_id: null,
    source_identifier: null,
    source_url: null,
    processed_at: '2023-09-01T10:02:00-07:00',
    device_id: null,
    phone: null,
    customer_locale: 'en',
    app_id: 123456,
    browser_ip: '192.168.1.1',
    landing_site_ref: null,
    order_number: 1001,
    discount_applications: [],
    discount_codes: [],
    note_attributes: [],
    payment_gateway_names: ['credit_card'],
    processing_method: 'direct',
    checkout_id: 9001,
    source_name: 'web',
    fulfillment_status: 'fulfilled',
    tax_lines: [],
    tags: '',
    contact_email: 'customer1@example.com',
    order_status_url: 'https://mockshop.myshopify.com/orders/123456',
    presentment_currency: 'USD',
    total_line_items_price_set: {
      shop_money: { amount: '119.99', currency_code: 'USD' },
      presentment_money: { amount: '119.99', currency_code: 'USD' }
    },
    total_discounts_set: {
      shop_money: { amount: '20.00', currency_code: 'USD' },
      presentment_money: { amount: '20.00', currency_code: 'USD' }
    },
    total_shipping_price_set: {
      shop_money: { amount: '0.00', currency_code: 'USD' },
      presentment_money: { amount: '0.00', currency_code: 'USD' }
    },
    subtotal_price_set: {
      shop_money: { amount: '99.99', currency_code: 'USD' },
      presentment_money: { amount: '99.99', currency_code: 'USD' }
    },
    total_price_set: {
      shop_money: { amount: '109.99', currency_code: 'USD' },
      presentment_money: { amount: '109.99', currency_code: 'USD' }
    },
    total_tax_set: {
      shop_money: { amount: '10.00', currency_code: 'USD' },
      presentment_money: { amount: '10.00', currency_code: 'USD' }
    },
    line_items: [
      {
        id: 100001,
        variant_id: 10011,
        title: 'Sample Product 1',
        quantity: 1,
        sku: 'ELEC-SP1-001',
        variant_title: null,
        vendor: 'Inventory Pro',
        fulfillment_service: 'manual',
        product_id: 1001,
        requires_shipping: true,
        taxable: true,
        gift_card: false,
        name: 'Sample Product 1',
        variant_inventory_management: 'shopify',
        properties: [],
        product_exists: true,
        fulfillable_quantity: 0,
        grams: 500,
        price: '99.99',
        total_discount: '0.00',
        fulfillment_status: 'fulfilled',
        price_set: {
          shop_money: { amount: '99.99', currency_code: 'USD' },
          presentment_money: { amount: '99.99', currency_code: 'USD' }
        },
        total_discount_set: {
          shop_money: { amount: '0.00', currency_code: 'USD' },
          presentment_money: { amount: '0.00', currency_code: 'USD' }
        },
        discount_allocations: [],
        duties: [],
        tax_lines: [
          {
            title: 'State Tax',
            price: '10.00',
            rate: 0.1
          }
        ]
      }
    ],
    shipping_lines: [
      {
        id: 100001,
        title: 'Standard Shipping',
        price: '0.00',
        code: 'Standard',
        source: 'shopify',
        phone: null,
        requested_fulfillment_service_id: null,
        delivery_category: null,
        carrier_identifier: null,
        discounted_price: '0.00',
        price_set: {
          shop_money: { amount: '0.00', currency_code: 'USD' },
          presentment_money: { amount: '0.00', currency_code: 'USD' }
        },
        discounted_price_set: {
          shop_money: { amount: '0.00', currency_code: 'USD' },
          presentment_money: { amount: '0.00', currency_code: 'USD' }
        },
        discount_allocations: [],
        tax_lines: []
      }
    ],
    billing_address: {
      first_name: 'John',
      address1: '123 Demo St',
      phone: '555-123-4567',
      city: 'Beverly Hills',
      zip: '90210',
      province: 'CA',
      country: 'United States',
      last_name: 'Doe',
      address2: null,
      company: null,
      latitude: null,
      longitude: null,
      name: 'John Doe',
      country_code: 'US',
      province_code: 'CA'
    },
    shipping_address: {
      first_name: 'John',
      address1: '123 Demo St',
      phone: '555-123-4567',
      city: 'Beverly Hills',
      zip: '90210',
      province: 'CA',
      country: 'United States',
      last_name: 'Doe',
      address2: null,
      company: null,
      latitude: null,
      longitude: null,
      name: 'John Doe',
      country_code: 'US',
      province_code: 'CA'
    },
    fulfillments: [],
    refunds: [],
    customer: {
      id: 90001,
      email: 'customer1@example.com',
      accepts_marketing: true,
      created_at: '2023-08-01T10:00:00-07:00',
      updated_at: '2023-08-01T10:00:00-07:00',
      first_name: 'John',
      last_name: 'Doe',
      orders_count: 1,
      state: 'enabled',
      total_spent: '109.99',
      last_order_id: 20001,
      note: null,
      verified_email: true,
      multipass_identifier: null,
      tax_exempt: false,
      phone: '555-123-4567',
      tags: '',
      last_order_name: '#1001',
      currency: 'USD',
      accepts_marketing_updated_at: '2023-08-01T10:00:00-07:00',
      marketing_opt_in_level: null,
      admin_graphql_api_id: 'gid://shopify/Customer/90001'
    }
  }
];

// Mock customers
const mockCustomers = [
  {
    id: 90001,
    email: 'customer1@example.com',
    accepts_marketing: true,
    created_at: '2023-08-01T10:00:00-07:00',
    updated_at: '2023-08-01T10:00:00-07:00',
    first_name: 'John',
    last_name: 'Doe',
    orders_count: 1,
    state: 'enabled',
    total_spent: '109.99',
    last_order_id: 20001,
    note: null,
    verified_email: true,
    multipass_identifier: null,
    tax_exempt: false,
    phone: '555-123-4567',
    tags: '',
    last_order_name: '#1001',
    currency: 'USD',
    accepts_marketing_updated_at: '2023-08-01T10:00:00-07:00',
    marketing_opt_in_level: null,
    admin_graphql_api_id: 'gid://shopify/Customer/90001'
  },
  {
    id: 90002,
    email: 'customer2@example.com',
    accepts_marketing: false,
    created_at: '2023-07-15T10:00:00-07:00',
    updated_at: '2023-07-15T10:00:00-07:00',
    first_name: 'Jane',
    last_name: 'Smith',
    orders_count: 3,
    state: 'enabled',
    total_spent: '350.00',
    last_order_id: 20002,
    note: 'VIP customer',
    verified_email: true,
    multipass_identifier: null,
    tax_exempt: false,
    phone: '555-987-6543',
    tags: 'VIP',
    last_order_name: '#1002',
    currency: 'USD',
    accepts_marketing_updated_at: '2023-07-15T10:00:00-07:00',
    marketing_opt_in_level: null,
    admin_graphql_api_id: 'gid://shopify/Customer/90002'
  }
];

// Mock Shopify client
export class MockShopifyClient {
  shop = {
    get: async () => {
      log('Returning mock shop information', 'shopify-mock');
      return mockShopInfo;
    }
  };
  
  product = {
    list: async (options: any = {}) => {
      log('Returning mock product list', 'shopify-mock');
      return mockProducts;
    },
    count: async () => {
      log('Returning mock product count', 'shopify-mock');
      return mockProducts.length;
    },
    get: async (productId: number) => {
      log(`Getting mock product with ID: ${productId}`, 'shopify-mock');
      const product = mockProducts.find(p => p.id === productId);
      if (!product) {
        throw new Error(`Product not found with ID: ${productId}`);
      }
      return product;
    },
    create: async (productData: any) => {
      log('Creating mock product (simulation only)', 'shopify-mock');
      return {
        ...productData,
        id: Math.floor(Math.random() * 10000) + 2000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    },
    update: async (productId: number, productData: any) => {
      log(`Updating mock product with ID: ${productId} (simulation only)`, 'shopify-mock');
      return {
        ...productData,
        id: productId,
        updated_at: new Date().toISOString()
      };
    }
  };
  
  order = {
    list: async (options: any = {}) => {
      log('Returning mock order list', 'shopify-mock');
      return mockOrders;
    },
    count: async () => {
      log('Returning mock order count', 'shopify-mock');
      return mockOrders.length;
    },
    get: async (orderId: number) => {
      log(`Getting mock order with ID: ${orderId}`, 'shopify-mock');
      const order = mockOrders.find(o => o.id === orderId);
      if (!order) {
        throw new Error(`Order not found with ID: ${orderId}`);
      }
      return order;
    }
  };
  
  customer = {
    list: async (options: any = {}) => {
      log('Returning mock customer list', 'shopify-mock');
      return mockCustomers;
    },
    count: async () => {
      log('Returning mock customer count', 'shopify-mock');
      return mockCustomers.length;
    },
    get: async (customerId: number) => {
      log(`Getting mock customer with ID: ${customerId}`, 'shopify-mock');
      const customer = mockCustomers.find(c => c.id === customerId);
      if (!customer) {
        throw new Error(`Customer not found with ID: ${customerId}`);
      }
      return customer;
    }
  };
}

// Export functions to get mock data directly
export function getMockShopInfo() {
  return mockShopInfo;
}

export function getMockProducts() {
  return mockProducts;
}

export function getMockOrders() {
  return mockOrders;
}

export function getMockCustomers() {
  return mockCustomers;
}

// Create a functioning mock client
export function createMockShopifyClient() {
  log('Creating mock Shopify client for development/testing', 'shopify-mock');
  return new MockShopifyClient();
}