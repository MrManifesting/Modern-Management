// Inventory Breakdown Test Script
// This script tests the functionality of the inventory breakdown system

const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testInventoryBreakdown() {
  try {
    console.log('Starting Inventory Breakdown Test...');
    
    // Step 1: Create a test bulk item
    console.log('\n1. Creating test bulk item...');
    const bulkItemResponse = await axios.post(`${API_URL}/api/items`, {
      name: 'Test Bulk Product',
      description: 'Test bulk product for breakdown',
      sku: 'BULK-TEST-001',
      basePrice: 1000.00,
      costPrice: 800.00,
      category: 'Test Category',
      brand: 'Test Brand',
      weight: 1000, // 1kg bulk product
      weightUnit: 'g',
      quantity: 10,
      itemType: 'bulk',
      breakdownStatus: 'none'
    });
    
    if (!bulkItemResponse.data || !bulkItemResponse.data.id) {
      throw new Error('Failed to create test bulk item');
    }
    
    const bulkItemId = bulkItemResponse.data.id;
    console.log(`Created bulk item with ID: ${bulkItemId}`);
    
    // Step 2: Generate standard breakdown targets
    console.log('\n2. Generating standard breakdown targets...');
    const targetsResponse = await axios.get(`${API_URL}/api/bulk-items/${bulkItemId}/standard-targets`);
    
    if (!targetsResponse.data || !Array.isArray(targetsResponse.data)) {
      throw new Error('Failed to generate standard breakdown targets');
    }
    
    console.log(`Generated ${targetsResponse.data.length} standard targets`);
    console.log(targetsResponse.data);
    
    // Step 3: Create product breakdown
    console.log('\n3. Creating product breakdown...');
    const breakdownResponse = await axios.post(`${API_URL}/api/product-breakdowns`, {
      bulkItemId: bulkItemId,
      employeeId: 1, // Using employee ID 1 for testing
      targetProducts: targetsResponse.data
    });
    
    if (!breakdownResponse.data || !breakdownResponse.data.id) {
      throw new Error('Failed to create product breakdown');
    }
    
    const breakdownId = breakdownResponse.data.id;
    console.log(`Created breakdown with ID: ${breakdownId}`);
    
    // Step 4: Process the breakdown (create actual breakdown products)
    console.log('\n4. Processing breakdown (creating breakdown products)...');
    const processResponse = await axios.post(`${API_URL}/api/product-breakdowns/${breakdownId}/create-products`, {
      employeeId: 1,
      targetProducts: targetsResponse.data
    });
    
    if (!processResponse.data) {
      throw new Error('Failed to process breakdown');
    }
    
    console.log('Created breakdown products:');
    console.log(processResponse.data);
    
    // Step 5: Verify the created products
    console.log('\n5. Verifying created products...');
    if (processResponse.data.createdItems && processResponse.data.createdItems.length > 0) {
      console.log(`Created ${processResponse.data.createdItems.length} breakdown products`);
      
      processResponse.data.createdItems.forEach((item, index) => {
        console.log(`Product ${index + 1}:`);
        console.log(`- ID: ${item.id}`);
        console.log(`- Name: ${item.name}`);
        console.log(`- SKU: ${item.sku}`);
        console.log(`- Weight: ${item.weight}${item.weightUnit}`);
        console.log(`- Price: $${item.basePrice}`);
        console.log(`- Quantity: ${item.quantity}`);
      });
    } else {
      console.warn('No products were created from the breakdown');
    }
    
    console.log('\nInventory Breakdown Test Completed Successfully!');
  } catch (error) {
    console.error('Error in inventory breakdown test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
  }
}

// Run the test
testInventoryBreakdown();