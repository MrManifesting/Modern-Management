// Test script to verify GraphQL integration with Shopify
import fetch from 'node-fetch';

async function testGraphQLIntegration() {
  console.log('Testing GraphQL integration with Shopify data...');
  
  try {
    // Test the GraphQL endpoint
    const response = await fetch('http://localhost:5000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query TestInventoryWithShopify {
            inventory {
              id
              name
              sku
              weight
              pricing {
                displayPrice
                basePrice
                currency
              }
              availability {
                inStock
                stockLevel
              }
            }
          }
        `
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      return;
    }

    console.log('✅ GraphQL integration successful!');
    console.log(`📊 Retrieved ${result.data.inventory.length} items`);
    
    // Show first few items with Shopify data
    const itemsWithShopify = result.data.inventory.filter(item => item.shopifyData);
    console.log(`🔗 ${itemsWithShopify.length} items have Shopify integration`);
    
    if (itemsWithShopify.length > 0) {
      const sample = itemsWithShopify[0];
      console.log('📄 Sample item with Shopify data:');
      console.log(`  Name: ${sample.name}`);
      console.log(`  Weight: ${sample.weightData.formattedWeight} (Shopify: ${sample.weightData.shopifyWeight} ${sample.weightData.shopifyWeightUnit})`);
      console.log(`  Price: $${sample.pricing.displayPrice} (${sample.pricing.currency})`);
      console.log(`  Stock: ${sample.availability.quantity} (Shopify: ${sample.availability.shopifyQuantity})`);
      console.log(`  Shopify Handle: ${sample.shopifyData.handle}`);
    }
    
    // Test pricing accuracy
    const itemsWithPricing = result.data.inventory.filter(item => item.pricing.displayPrice > 0);
    console.log(`💰 ${itemsWithPricing.length} items have authentic pricing`);
    
    // Test weight formatting
    const itemsWithWeight = result.data.inventory.filter(item => item.weightData.formattedWeight !== 'N/A');
    console.log(`⚖️ ${itemsWithWeight.length} items have formatted weight data`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGraphQLIntegration();