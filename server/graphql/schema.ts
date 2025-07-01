import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Query {
    inventory: [InventoryItem!]!
    inventoryItem(id: ID!): InventoryItem
    availableInventory: [InventoryItem!]!
    shopifyInventory: [ShopifyInventoryItem!]!
  }

  type InventoryItem {
    id: ID!
    name: String!
    sku: String
    description: String
    category: String
    brand: String
    status: String!
    quantity: Int!
    weight: String
    weightData: WeightData
    pricing: PricingInfo!
    media: MediaInfo!
    links: ProductLinks!
    shopifyData: ShopifyData
    availability: AvailabilityInfo!
    lastUpdated: String!
  }

  type WeightData {
    formattedWeight: String!
    shopifyWeight: Float
    shopifyWeightUnit: String
    weightInGrams: Float
    localWeight: String
  }

  type ShopifyInventoryItem {
    id: ID!
    shopifyId: String!
    title: String!
    handle: String!
    vendor: String
    productType: String
    status: String!
    variants: [ShopifyVariant!]!
    images: [ShopifyImage!]!
    pricing: ShopifyPricing!
    links: ShopifyLinks!
    inventory: ShopifyInventoryLevel!
    tags: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  type ShopifyVariant {
    id: String!
    title: String!
    sku: String
    price: Float!
    compareAtPrice: Float
    inventoryQuantity: Int!
    inventoryManagement: String
    inventoryPolicy: String
    weight: Float
    weightUnit: String
  }

  type ShopifyImage {
    id: String!
    src: String!
    altText: String
    width: Int
    height: Int
    position: Int
  }

  type ShopifyPricing {
    minPrice: Float!
    maxPrice: Float!
    compareAtMinPrice: Float
    compareAtMaxPrice: Float
    currency: String!
  }

  type ShopifyLinks {
    storefront: String!
    admin: String!
    api: String!
  }

  type ShopifyInventoryLevel {
    totalQuantity: Int!
    availableQuantity: Int!
    committedQuantity: Int!
    onHandQuantity: Int!
  }

  type PricingInfo {
    basePrice: Float
    salePrice: Float
    costPrice: Float
    wholesalePrice: Float
    displayPrice: Float!
    currency: String!
    priceRange: String
    hasDiscount: Boolean!
    discountPercentage: Float
  }

  type MediaInfo {
    thumbnailUrl: String
    imageUrls: [String!]!
    hasImages: Boolean!
    imageCount: Int!
    primaryImage: ImageDetails
    gallery: [ImageDetails!]!
  }

  type ImageDetails {
    url: String!
    thumbnail: String!
    alt: String
    width: Int
    height: Int
  }

  type ProductLinks {
    shopifyStore: String!
    shopifyAdmin: String!
    googleSheets: String!
    coaCertificate: String
    mediaDownload: String
    directPurchase: String!
  }

  type ShopifyData {
    productId: String
    variantId: String
    handle: String
    inventoryItemId: String
    lastSyncDate: String
    syncStatus: String!
  }

  type AvailabilityInfo {
    quantity: Int!
    shopifyQuantity: Int
    localQuantity: Int!
    inStock: Boolean!
    lowStock: Boolean!
    stockLevel: String!
    restockDate: String
    preOrderAvailable: Boolean!
    estimatedDelivery: String
  }
`;