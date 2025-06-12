/**
 * Test script to verify that order processing automatically updates inventory
 */

const testOrderInventoryUpdate = async () => {
  console.log('🧪 Testing order inventory update functionality...\n');

  try {
    // First, let's get some existing inventory items to test with
    console.log('📦 Fetching current inventory...');
    const inventoryResponse = await fetch('http://localhost:5000/api/items?limit=5');
    const inventoryData = await inventoryResponse.json();
    
    if (!inventoryData || inventoryData.length === 0) {
      console.log('❌ No inventory items found to test with');
      return;
    }

    console.log(`✅ Found ${inventoryData.length} inventory items`);
    
    // Select the first item with a SKU and quantity > 0
    const testItem = inventoryData.find(item => item.sku && item.quantity > 0);
    
    if (!testItem) {
      console.log('❌ No suitable test item found (need SKU and quantity > 0)');
      return;
    }

    console.log(`🎯 Selected test item: ${testItem.name} (SKU: ${testItem.sku})`);
    console.log(`📊 Current quantity: ${testItem.quantity}`);

    // Create a mock Shopify order webhook payload
    const mockOrder = {
      id: Date.now(),
      order_number: `TEST-${Date.now()}`,
      created_at: new Date().toISOString(),
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled',
      total_price: '29.99',
      line_items: [
        {
          id: Date.now() + 1,
          product_id: testItem.id,
          variant_id: testItem.id,
          sku: testItem.sku,
          name: testItem.name,
          quantity: 2, // Order 2 units
          price: '14.99'
        }
      ],
      customer: {
        first_name: 'Test',
        last_name: 'Customer',
        email: 'test@example.com'
      }
    };

    console.log('\n🚀 Simulating Shopify order webhook...');
    console.log(`📝 Order details: ${mockOrder.order_number} - ${mockOrder.line_items[0].quantity} units of ${testItem.sku}`);

    // Send the webhook to our order processing endpoint
    const webhookResponse = await fetch('http://localhost:5000/api/shopify/webhooks/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockOrder)
    });

    const webhookResult = await webhookResponse.json();
    console.log('\n📋 Webhook processing result:');
    console.log(JSON.stringify(webhookResult, null, 2));

    // Check if inventory was updated
    console.log('\n🔍 Checking inventory after order processing...');
    const updatedItemResponse = await fetch(`http://localhost:5000/api/items/${testItem.id}`);
    const updatedItem = await updatedItemResponse.json();

    const expectedQuantity = testItem.quantity - mockOrder.line_items[0].quantity;
    const actualQuantity = updatedItem.quantity;

    console.log(`📊 Original quantity: ${testItem.quantity}`);
    console.log(`📦 Ordered quantity: ${mockOrder.line_items[0].quantity}`);
    console.log(`🎯 Expected new quantity: ${expectedQuantity}`);
    console.log(`✅ Actual new quantity: ${actualQuantity}`);

    if (actualQuantity === expectedQuantity) {
      console.log('\n🎉 SUCCESS: Inventory was correctly updated!');
      console.log(`✅ Quantity reduced from ${testItem.quantity} to ${actualQuantity}`);
      
      // Check for low stock alerts
      if (actualQuantity <= 5) {
        console.log(`⚠️  LOW STOCK ALERT: ${testItem.sku} now has ${actualQuantity} units remaining`);
      }
      
      if (actualQuantity === 0) {
        console.log(`🚨 OUT OF STOCK: ${testItem.sku} is now out of stock`);
      }
    } else {
      console.log('\n❌ FAILURE: Inventory was NOT updated correctly');
      console.log(`Expected: ${expectedQuantity}, Got: ${actualQuantity}`);
    }

    // Check if sale record was created
    console.log('\n🧾 Checking if sale record was created...');
    const salesResponse = await fetch('http://localhost:5000/api/sales');
    const salesData = await salesResponse.json();
    
    const testSale = salesData.find(sale => sale.orderId === mockOrder.order_number);
    
    if (testSale) {
      console.log('✅ Sale record created successfully');
      console.log(`💰 Sale amount: $${testSale.total}`);
      console.log(`👤 Customer: ${testSale.customerName || 'Test Customer'}`);
    } else {
      console.log('❌ Sale record was NOT created');
    }

    // Test inventory action logging
    console.log('\n📝 Checking inventory action logs...');
    try {
      const actionsResponse = await fetch(`http://localhost:5000/api/inventory-actions?itemId=${testItem.id}`);
      const actions = await actionsResponse.json();
      
      const recentAction = actions.find(action => 
        action.actionType === 'remove' && 
        action.quantity === mockOrder.line_items[0].quantity
      );
      
      if (recentAction) {
        console.log('✅ Inventory action logged successfully');
        console.log(`📋 Action: ${recentAction.actionType} ${recentAction.quantity} units`);
      } else {
        console.log('⚠️  Inventory action may not have been logged');
      }
    } catch (error) {
      console.log('⚠️  Could not check inventory actions (endpoint may not exist)');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  }
};

// Run the test
testOrderInventoryUpdate();