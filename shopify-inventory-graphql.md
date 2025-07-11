# Shopify GraphQL Query for Active Inventory Items

## Query to fetch all active inventory items with available quantities

```graphql
{
  products(first: 250, query: "status:active") {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        title
        handle
        productType
        vendor
        status
        tags
        createdAt
        updatedAt
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              barcode
              price
              compareAtPrice
              weight
              weightUnit
              inventoryQuantity
              inventoryPolicy
              inventoryManagement
              availableForSale
              selectedOptions {
                name
                value
              }
              inventoryItem {
                id
                tracked
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      id
                      available
                      location {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Query with pagination support for large inventories

```graphql
query GetActiveInventory($cursor: String) {
  products(first: 50, after: $cursor, query: "status:active AND inventory_total:>0") {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        title
        handle
        productType
        vendor
        status
        totalInventory
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              barcode
              price
              inventoryQuantity
              inventoryItem {
                id
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      available
                      location {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Query specifically for items with available inventory

```graphql
{
  productVariants(first: 250, query: "inventory_quantity:>0") {
    edges {
      node {
        id
        title
        sku
        barcode
        price
        compareAtPrice
        inventoryQuantity
        product {
          id
          title
          handle
          productType
          vendor
          status
          tags
        }
        inventoryItem {
          id
          tracked
          inventoryLevels(first: 10) {
            edges {
              node {
                available
                location {
                  id
                  name
                  address {
                    address1
                    city
                    province
                    country
                  }
                }
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## Usage with JavaScript/Node.js

```javascript
const query = `
  query GetActiveInventory($cursor: String) {
    products(first: 50, after: $cursor, query: "status:active") {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          variants(first: 100) {
            edges {
              node {
                id
                sku
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;

// Function to fetch all pages
async function fetchAllActiveInventory(shopifyClient) {
  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const response = await shopifyClient.request(query, {
      variables: { cursor }
    });

    const products = response.data.products;
    allProducts = allProducts.concat(products.edges);
    
    hasNextPage = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
  }

  return allProducts;
}
```

## Notes:
- The `first` parameter can be adjusted (max 250 for products)
- Use the `query` parameter to filter results (e.g., "status:active", "inventory_total:>0")
- The `inventoryQuantity` field gives the total available across all locations
- Use `inventoryLevels` to get location-specific quantities
- Remember to handle pagination for large catalogs