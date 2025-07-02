import { weightService } from './server/services/weight-service.js';

// Test the weight extraction fix
const testCases = [
  "2 GRAMS Frozen Lemons - THCA Flower",
  "3 GRAMS Blueberry Muffin - THCA",  
  "Half Gram Purple Push Pop",
  "1 POUND Zoap - THCA BULK FLOWER",
  "Book Flower - Gelato 47",
  "Quarter Pound Tropicana Cherry"
];

console.log("Testing Weight Extraction Fix:");
console.log("===============================");

testCases.forEach(productName => {
  const weight = weightService.extractFromProductName(productName);
  console.log(`"${productName}" → "${weight}"`);
});

console.log("\nCRITICAL TEST:");
console.log("2 GRAMS product should return '2 grams', NOT '1 pound'");
console.log(`Result: "${weightService.extractFromProductName('2 GRAMS Frozen Lemons - THCA Flower')}"`);

// Test with mock Shopify data structure
const mockShopifyData = {
  variants: {
    edges: [{
      node: {
        weight: 2,
        weightUnit: 'GRAMS',
        price: "850.00"
      }
    }]
  }
};

console.log("\nShopify GraphQL Test:");
console.log(`Shopify weight extraction: "${weightService.extractFromShopify(mockShopifyData)}"`);