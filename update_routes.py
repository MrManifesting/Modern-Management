#!/usr/bin/env python3

# Script to update Shopify view endpoints with enhanced fuzzy matching

import re

# Read the routes file
with open('server/routes.ts', 'r') as f:
    content = f.read()

# Pattern to match the old matching logic in both endpoints
old_pattern = r'''            // Extract strain name from local item
            const strainName = item\.name!\.toLowerCase\(\)\.split\('-'\)\[0\]; // "blueberry"
            
            // Find exact or closest match
            const matchingProduct = products\.find\(\(product: any\) => \{
              const productTitle = product\.title\.toLowerCase\(\);
              const itemName = item\.name!\.toLowerCase\(\);
              
              // Try exact match first
              if \(productTitle\.includes\(itemName\)\) return true;
              
              // Try strain name match with THCa and quality descriptors
              if \(productTitle\.includes\(strainName\) && productTitle\.includes\('thca'\)\) \{
                // Check for quality match \(smalls, aa indoor, etc\.\)
                const itemQuality = itemName\.includes\('smalls'\) \? 'smalls' : itemName\.includes\('aa'\) \? 'aa' : '';
                if \(itemQuality && productTitle\.includes\(itemQuality\)\) return true;
                if \(productTitle\.includes\('muffin'\) && strainName === 'blueberry'\) return true;
              \}
              
              return false;
            \}\);
            
            if \(matchingProduct\) \{
              directProductUrl = `https://admin\.shopify\.com/store/gold-standard-cbd/products/\$\{matchingProduct\.id\}`;
              log\(`Enhanced fuzzy match for "\$\{item\.name\}": \$\{matchingProduct\.title\} \(ID: \$\{matchingProduct\.id\}\)`, 'shopify'\);
            \}'''

# New enhanced fuzzy matching logic
new_logic = '''            // Use enhanced fuzzy matching
            const matchResult = findBestShopifyMatch(item.name!, products);
            
            if (matchResult.product) {
              directProductUrl = `https://admin.shopify.com/store/gold-standard-cbd/products/${matchResult.product.id}`;
              log(`Enhanced fuzzy match for "${item.name}": ${matchResult.product.title} (Score: ${matchResult.score})`, 'shopify');
            }'''

# Replace all occurrences
updated_content = re.sub(old_pattern, new_logic, content, flags=re.MULTILINE)

# Write back to file
with open('server/routes.ts', 'w') as f:
    f.write(updated_content)

print("Successfully updated Shopify view endpoints with enhanced fuzzy matching")