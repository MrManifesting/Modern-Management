/**
 * Comprehensive test of the order processing and inventory update flow
 */

const testCompleteOrderFlow = async () => {
  console.log('Testing complete order processing flow...\n');

  try {
    // First, create a test item with sufficient inventory
    const testItemData = {
      name: 'Test Order Item',
      sku: `TEST-ORDER-${Date.now()}`,
      quantity: 10,
      basePrice: '25.99',
      category: 'test',
      status: 'active',
      weight: '1.0',
      description: 'Test item for order processing'
    };

    console.log('Creating test item...');
    const createResponse = await fetch('http://localhost:5000/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testItemData)
    });

    const createdItem = await createResponse.json();
    if (!createdItem.id) {
      console.log('Failed to create test item');
      return;
    }

    console.log(`Created test item: ${createdItem.name} (ID: ${createdItem.id}, SKU: ${createdItem.sku})`);
    console.log(`Initial quantity: ${createdItem.quantity}`);

    // Test 1: Direct inventory action (remove stock)
    console.log('\n--- Test 1: Direct Inventory Action ---');
    const actionResponse = await fetch('http://localhost:5000/api/items/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: createdItem.sku,
        action: 'remove',
        quantity: 3
      })
    });

    if (actionResponse.ok) {
      const actionResult = await actionResponse.json();
      console.log(`✅ Direct action successful: ${createdItem.quantity} → ${actionResult.item?.quantity}`);
    } else {
      console.log('❌ Direct action failed');
    }

    // Get updated item state
    const updatedResponse = await fetch(`http://localhost:5000/api/items/${createdItem.id}`);
    const updatedItem = await updatedResponse.json();
    console.log(`Current quantity after direct action: ${updatedItem.quantity}`);

    // Test 2: Sale creation (should auto-update inventory)
    console.log('\n--- Test 2: Sale Creation ---');
    const saleData = {
      item_id: updatedItem.id,
      quantity: 2,
      sale_price: 25.99,
      marketplace: 'test',
      order_number: `TEST-SALE-${Date.now()}`,
      buyer_info: { name: 'Test Buyer', email: 'test@example.com' },
      sale_date: new Date().toISOString().split('T')[0],
      status: 'completed'
    };

    const saleResponse = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });

    if (saleResponse.ok) {
      const saleResult = await saleResponse.json();
      console.log('✅ Sale created successfully');

      // Check if inventory was automatically updated
      const postSaleResponse = await fetch(`http://localhost:5000/api/items/${createdItem.id}`);
      const postSaleItem = await postSaleResponse.json();
      
      const expectedQuantity = updatedItem.quantity - saleData.quantity;
      if (postSaleItem.quantity === expectedQuantity) {
        console.log(`✅ Inventory auto-updated: ${updatedItem.quantity} → ${postSaleItem.quantity}`);
      } else {
        console.log(`❌ Inventory not updated correctly: expected ${expectedQuantity}, got ${postSaleItem.quantity}`);
      }
    } else {
      const errorText = await saleResponse.text();
      console.log('❌ Sale creation failed:', errorText);
    }

    // Test 3: Webhook simulation (Shopify order)
    console.log('\n--- Test 3: Webhook Order Processing ---');
    const webhookOrder = {
      id: Date.now(),
      order_number: `WEBHOOK-${Date.now()}`,
      created_at: new Date().toISOString(),
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled',
      total_price: '50.00',
      line_items: [{
        id: Date.now() + 1,
        product_id: updatedItem.id,
        variant_id: updatedItem.id,
        sku: updatedItem.sku,
        name: updatedItem.name,
        quantity: 1,
        price: '25.99'
      }],
      customer: {
        first_name: 'Webhook',
        last_name: 'Customer',
        email: 'webhook@example.com'
      }
    };

    const webhookResponse = await fetch('http://localhost:5000/api/shopify/webhooks/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookOrder)
    });

    const webhookResult = await webhookResponse.json();
    if (webhookResult.success) {
      console.log('✅ Webhook processing successful');
      
      const finalResponse = await fetch(`http://localhost:5000/api/items/${createdItem.id}`);
      const finalItem = await finalResponse.json();
      console.log(`Final quantity after webhook: ${finalItem.quantity}`);
    } else {
      console.log('❌ Webhook processing failed:', webhookResult.message);
    }

    // Summary
    console.log('\n--- Summary ---');
    const finalCheckResponse = await fetch(`http://localhost:5000/api/items/${createdItem.id}`);
    const finalCheckItem = await finalCheckResponse.json();
    
    console.log(`Test item: ${finalCheckItem.name}`);
    console.log(`Starting quantity: ${createdItem.quantity}`);
    console.log(`Final quantity: ${finalCheckItem.quantity}`);
    console.log(`Total reduction: ${createdItem.quantity - finalCheckItem.quantity}`);

    // Clean up - delete test item
    await fetch(`http://localhost:5000/api/items/${createdItem.id}`, { method: 'DELETE' });
    console.log('Test item cleaned up');

  } catch (error) {
    console.error('Error during comprehensive test:', error.message);
  }
};

// Run the test
testCompleteOrderFlow();