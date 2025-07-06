// Corrected section for the /api/items route
const items = rawItems.map((item: any) => {
  let strainName = '';
  
  // Extract strain name, removing ALL weight references
  if (item.name) {
    // Start with the original name
    strainName = item.name;
    
    // Remove all weight-related terms aggressively
    strainName = strainName
      // Remove all numeric weights with units
      .replace(/\b\d+\s*(gram|grams|g|gr|gm|pound|pounds|lb|lbs|ounce|ounces|oz|ozs|kilo|kilogram|kg|mg|milligram)s?\b/gi, '')
      // Remove fractional weights
      .replace(/\b(half|quarter|eighth|third|1\/2|1\/4|1\/8|1\/3)\s*(gram|grams|g|pound|pounds|lb|lbs|ounce|ounces|oz)s?\b/gi, '')
      // Remove spelled out numbers with weights
      .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(gram|grams|g|pound|pounds|lb|lbs|ounce|ounces|oz)s?\b/gi, '')
      // Remove weight descriptors
      .replace(/\b(weight|bulk|size)\b/gi, '')
      // Remove everything after "- THCA" or similar
      .replace(/\s*-\s*(THCA|thca|THC|thc|CBD|cbd).*$/i, '')
      // Remove weight/tier info in parentheses
      .replace(/\s*\([^)]*\)/g, '')
      // Remove quality/tier terms
      .replace(/\b(flower|smalls|mediums|indoor|outdoor|classic|reserve|top|shelf|aa|aaa|exotic|premium|quality)\b/gi, '')
      // Clean up
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Final cleanup - remove any remaining weight terms
    const weightTerms = ['gram', 'grams', 'g', 'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz', 'half', 'quarter', 'eighth'];
    weightTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      strainName = strainName.replace(regex, '').trim();
    });
    
    // Capitalize properly
    if (strainName && strainName.length > 2) {
      strainName = strainName.split(' ')
        .filter((word: string) => word.length > 0)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // If we still don't have a strain name, check description as fallback
    if (!strainName && item.description) {
      // Extract strain name from description, avoiding quality descriptors
      const descMatch = item.description.match(/(?:Cannabis|Hemp|THCa)?\s*([A-Za-z\s]+?)(?:\s*-|\s*\(|$)/i);
      if (descMatch && descMatch[1] && descMatch[1].trim().length > 2) {
        strainName = descMatch[1].trim()
          .replace(/\b(premium|quality|cannabis|hemp|thca|flower|strain)\b/gi, '')
          .trim();
      }
    }
  }
  
  // Extract proper weight
  let extractedWeight = 'Weight not specified';
  
  // Use database weight if available
  if (item.weight && item.weight !== 'Weight not specified' && item.weight.trim() !== '') {
    extractedWeight = item.weight;
  }
  // Extract from product name if no database weight
  else if (item.name) {
    const nameLower = item.name.toLowerCase();
    
    // Extract specific weights
    if (nameLower.includes('2 gram') || nameLower.includes('2g')) {
      extractedWeight = '2 grams';
    } else if (nameLower.includes('3 gram') || nameLower.includes('3g')) {
      extractedWeight = '3 grams';
    } else if (nameLower.includes('half gram') || nameLower.includes('0.5g')) {
      extractedWeight = 'half gram';
    } else if (nameLower.includes('1 gram') || nameLower.includes('1g ')) {
      extractedWeight = '1 gram';
    } else if (nameLower.includes('7 gram') || nameLower.includes('7g')) {
      extractedWeight = '7 grams';
    } else if (nameLower.includes('14 gram') || nameLower.includes('14g')) {
      extractedWeight = '14 grams';
    } else if (nameLower.includes('28 gram') || nameLower.includes('28g')) {
      extractedWeight = '28 grams';
    } else if (nameLower.includes('eighth') || nameLower.includes('1/8')) {
      extractedWeight = 'eighth (3.5g)';
    } else if (nameLower.includes('quarter oz') || nameLower.includes('1/4 oz')) {
      extractedWeight = 'quarter ounce';
    } else if (nameLower.includes('half oz') || nameLower.includes('1/2 oz')) {
      extractedWeight = 'half ounce';
    } else if (nameLower.includes('1 oz') || nameLower.includes('1oz') || nameLower.includes(' ounce')) {
      extractedWeight = '1 ounce';
    } else if (nameLower.includes('1 pound') || nameLower.includes('(1 pound)') || nameLower.includes('one pound')) {
      extractedWeight = '1 pound';
    } else if (nameLower.includes('half pound') || nameLower.includes('1/2 pound')) {
      extractedWeight = 'half pound';
    } else if (nameLower.includes('quarter pound') || nameLower.includes('1/4 pound')) {
      extractedWeight = 'quarter pound';
    } else if (nameLower.includes('bulk flower') || nameLower.includes('book flower')) {
      extractedWeight = '1 pound';
    }
  }
  
  // ENSURE ALL ITEMS HAVE REAL PRICES
  let finalBasePrice = parseFloat(item.base_price) || parseFloat(item.basePrice) || 0;
  let finalSalePrice = parseFloat(item.sale_price) || parseFloat(item.salePrice) || 0;
  let finalCostPrice = parseFloat(item.cost_price) || parseFloat(item.costPrice) || 0;
  
  // If no existing prices, generate based on weight
  if (finalBasePrice === 0 && finalSalePrice === 0 && finalCostPrice === 0) {
    const pricing = generateRealisticPrice({...item, weight: extractedWeight});
    
    // If still no price, generate default based on category
    if (pricing.base_price === 0) {
      const nameLower = (item.name || '').toLowerCase();
      const categoryLower = (item.category || '').toLowerCase();
      
      // Default pricing by product type
      if (nameLower.includes('flower') || categoryLower.includes('flower')) {
        finalBasePrice = 1200; // Default pound price for flower
        finalSalePrice = 1020;
        finalCostPrice = 720;
      } else if (nameLower.includes('concentrate') || categoryLower.includes('concentrate')) {
        finalBasePrice = 40; // Default gram price for concentrates
        finalSalePrice = 34;
        finalCostPrice = 24;
      } else if (nameLower.includes('edible') || categoryLower.includes('edible')) {
        finalBasePrice = 25; // Default price for edibles
        finalSalePrice = 21;
        finalCostPrice = 15;
      } else {
        // General cannabis product default
        finalBasePrice = 35;
        finalSalePrice = 30;
        finalCostPrice = 21;
      }
    } else {
      finalBasePrice = pricing.base_price;
      finalSalePrice = pricing.sale_price;
      finalCostPrice = pricing.cost_price;
    }
  }
  
  return {
    ...item,
    // Use strain name if extracted, otherwise fall back to original name
    name: strainName || item.name,
    // Keep original name for reference
    original_name: item.name,
    // Display name for UI
    display_name: strainName || item.name,
    base_price: finalBasePrice,
    sale_price: finalSalePrice,
    cost_price: finalCostPrice,
    basePrice: finalBasePrice,  // Legacy field name
    salePrice: finalSalePrice,  // Legacy field name  
    costPrice: finalCostPrice,  // Legacy field name
    // Ensure no NaN values
    quantity: parseInt(item.quantity) || 0,
    weight: extractedWeight
  };
});