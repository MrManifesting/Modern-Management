/**
 * Simple test to verify inventory updates when orders are processed
 */

const testSimpleOrderUpdate = async () => {
  console.log('Testing simple order inventory update...\n');

  try {
    // Get an item with inventory to test
    const inventoryResponse = await fetch('http://localhost:5000/api/items?limit=10');
    const items = await inventoryResponse.json();
    
    const testItem = items.find(item => item.sku && item.quantity > 2);
    if (!testItem) {
      console.log('No suitable test item found (need SKU and quantity > 2)');
      return;
    }

    console.log(`Selected item: ${testItem.name} (SKU: ${testItem.sku})`);
    console.log(`Current quantity: ${testItem.quantity}`);

    // Create a sale record that should trigger inventory update
    const saleData = {
      item_id: testItem.id,
      quantity: 2,
      sale_price: 29.99,
      marketplace: 'shopify',
      order_number: `TEST-${Date.now()}`,
      buyer_info: { name: 'Test Customer', email: 'test@example.com' },
      sale_date: new Date().toISOString().split('T')[0],
      status: 'completed'
    };

    console.log('\nCreating sale record...');
    const saleResponse = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });

    const saleResult = await saleResponse.json();
    console.log('Sale creation result:', saleResult.success ? 'Success' : 'Failed');

    if (saleResult.success) {
      // Check if inventory was updated
      const updatedItemResponse = await fetch(`http://localhost:5000/api/items/${testItem.id}`);
      const updatedItem = await updatedItemResponse.json();

      console.log(`\nInventory Update Check:`);
      console.log(`Original quantity: ${testItem.quantity}`);
      console.log(`Sale quantity: ${saleData.quantity}`);
      console.log(`Expected new quantity: ${testItem.quantity - saleData.quantity}`);
      console.log(`Actual new quantity: ${updatedItem.quantity}`);

      if (updatedItem.quantity === testItem.quantity - saleData.quantity) {
        console.log('\n✅ SUCCESS: Inventory automatically updated on order creation!');
      } else {
        console.log('\n❌ ISSUE: Inventory was not updated correctly');
      }
    } else {
      console.log('Sale creation failed, cannot test inventory update');
    }

  } catch (error) {
    console.error('Error during test:', error.message);
  }
};

// Test direct inventory update via API
const testDirectInventoryUpdate = async () => {
  console.log('\n\nTesting direct inventory update API...\n');

  try {
    // Get an item to test
    const inventoryResponse = await fetch('http://localhost:5000/api/items?limit=5');
    const items = await inventoryResponse.json();
    
    const testItem = items.find(item => item.sku && item.quantity > 0);
    if (!testItem) {
      console.log('No suitable test item found');
      return;
    }

    console.log(`Selected item: ${testItem.name} (SKU: ${testItem.sku})`);
    console.log(`Current quantity: ${testItem.quantity}`);

    // Test removing inventory via SKU and action API
    const actionData = {
      sku: testItem.sku,
      action: 'remove',
      quantity: 1
    };

    console.log('\nTesting inventory action API...');
    const actionResponse = await fetch('http://localhost:5000/api/items/action', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionData)
    });

    const actionResult = await actionResponse.json();
    console.log('Action result:', actionResult.success ? 'Success' : 'Failed');

    if (actionResult.success) {
      console.log(`Updated quantity: ${actionResult.item?.quantity || 'unknown'}`);
      console.log('✅ Direct inventory update working');
    } else {
      console.log('❌ Direct inventory update failed:', actionResult.error);
    }

  } catch (error) {
    console.error('Error during direct inventory test:', error.message);
  }
};

// Run both tests
(async () => {
  await testSimpleOrderUpdate();
  await testDirectInventoryUpdate();
})();