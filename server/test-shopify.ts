/**
 * Simple script to test Shopify API connectivity
 * 
 * Run with: npx tsx server/test-shopify.ts
 */

// Direct fetch approach
async function testShopifyDirectFetch() {
  const storeUrl = process.env.SHOPIFY_STORE || '';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  
  console.log("Testing direct fetch method:");
  console.log(`- Store URL: ${storeUrl}`);
  console.log(`- Token (first 4 chars): ${accessToken.substring(0, 4)}***`);
  
  try {
    // Clean the URL
    const cleanStoreUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    
    // API call to get shop info
    const apiUrl = `https://${cleanStoreUrl}/admin/api/2023-10/shop.json`;
    console.log(`Making API request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Success! Shop name:', data.shop.name);
    return true;
  } catch (error) {
    console.error('❌ Direct fetch error:', error);
    return false;
  }
}

// Using the shopify-api-node module
async function testShopifyModule() {
  try {
    console.log("\nTesting via shopify-api-node module:");
    
    // Dynamically import to avoid issues
    const { default: Shopify } = await import('shopify-api-node');
    
    const storeUrl = process.env.SHOPIFY_STORE || '';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    
    console.log(`- Store URL: ${storeUrl}`);
    console.log(`- Token (first 4 chars): ${accessToken.substring(0, 4)}***`);
    
    const shopify = new Shopify({
      shopName: storeUrl.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
      accessToken: accessToken,
      apiVersion: '2023-10' // try different versions if needed
    });
    
    console.log('Initialized Shopify client, fetching shop info...');
    const shopInfo = await shopify.shop.get();
    
    console.log('Success! Shop details:');
    console.log('- Name:', shopInfo.name);
    console.log('- Email:', shopInfo.email);
    console.log('- Domain:', shopInfo.domain);
    
    return true;
  } catch (error) {
    console.error('❌ shopify-api-node module error:', error);
    return false;
  }
}

// Try API version fallback test 
async function testApiVersions() {
  console.log("\nTesting different API versions:");
  
  const versions = ['2023-10', '2023-07', '2023-04', '2023-01', '2022-10'];
  const storeUrl = process.env.SHOPIFY_STORE || '';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  const cleanStoreUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  
  for (const version of versions) {
    try {
      console.log(`\nTrying API version: ${version}`);
      const apiUrl = `https://${cleanStoreUrl}/admin/api/${version}/shop.json`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success with API version ${version}!`);
        console.log('Shop name:', data.shop.name);
        return version; // Return the working version
      } else {
        console.log(`❌ Failed with API version ${version}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error with API version ${version}:`, error);
    }
  }
  
  console.log("❌ All API versions failed");
  return null;
}

// Run the tests
async function runTests() {
  console.log("--------------------------");
  console.log("SHOPIFY API CONNECTION TEST");
  console.log("--------------------------");
  
  const directResult = await testShopifyDirectFetch();
  const moduleResult = await testShopifyModule();
  
  if (!directResult && !moduleResult) {
    console.log("\n❌ Both connection methods failed, trying API version fallback test...");
    const workingVersion = await testApiVersions();
    
    if (workingVersion) {
      console.log(`\n✅ Found working API version: ${workingVersion}`);
      console.log(`✨ Update your code to use API version: ${workingVersion}`);
    } else {
      console.log("\n❌ All tests failed. Please check:");
      console.log("1. Your Shopify access token is valid and has proper permissions");
      console.log("2. Your store URL is correct");
      console.log("3. Your Shopify store's API access is enabled");
      console.log("4. Network connectivity");
    }
  } else {
    console.log("\n✅ At least one test succeeded!");
  }
}

// Execute the tests
runTests().catch(console.error);