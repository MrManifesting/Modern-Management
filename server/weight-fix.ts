import { storage } from './storage.js';

// Function to parse weight from item name and return correct weight category
function parseCorrectWeight(name: string): string {
  if (!name) return 'Not specified';
  
  const nameLower = name.toLowerCase();
  
  // Check for pound variants in parentheses first: "(1 pound)", "(half pound)", "(quarter pound)"
  const poundMatch = name.match(/\(([^)]*pound[^)]*)\)/i);
  if (poundMatch) {
    const weightText = poundMatch[1].toLowerCase().trim();
    
    if (weightText.includes('1 pound') || weightText === 'pound') {
      return '1 pound';
    } else if (weightText.includes('half pound') || weightText.includes('0.5 pound')) {
      return 'half pound';  
    } else if (weightText.includes('quarter pound') || weightText.includes('0.25 pound') || weightText.includes('1/4 pound')) {
      return 'quarter pound';
    }
  }
  
  // Check for weight indicators in the main name
  if (nameLower.includes('1 pound') || nameLower.includes('one pound')) {
    return '1 pound';
  } else if (nameLower.includes('half pound') || nameLower.includes('0.5 pound') || nameLower.includes('1/2 pound')) {
    return 'half pound';
  } else if (nameLower.includes('quarter pound') || nameLower.includes('0.25 pound') || nameLower.includes('1/4 pound')) {
    return 'quarter pound';
  } else if (nameLower.includes('ounce') && !nameLower.includes('pound')) {
    if (nameLower.includes('half') || nameLower.includes('0.5')) {
      return 'half ounce';
    } else if (nameLower.includes('quarter') || nameLower.includes('0.25')) {
      return 'quarter ounce';
    }
    return '1 ounce';
  } else if (nameLower.includes('3.5g') || nameLower.includes('eighth')) {
    return '3.5g (eighth)';
  } else if (nameLower.includes('1g') || (nameLower.includes('gram') && !nameLower.includes('3.5'))) {
    return '1g';
  }
  
  return 'Not specified';
}

// Function to fix weight data for all items
export async function fixWeightData() {
  console.log('Starting comprehensive weight data fix...');
  
  try {
    // Get all items
    const items = await storage.getAllItems();
    console.log(`Found ${items.length} total items`);
    
    // Find items that need weight correction
    const itemsToUpdate = items.filter((item: any) => {
      const correctWeight = parseCorrectWeight(item.name);
      return correctWeight !== 'Not specified' && item.weight !== correctWeight;
    });
    
    console.log(`Found ${itemsToUpdate.length} items that need weight correction`);
    
    let updatedCount = 0;
    for (const item of itemsToUpdate) {
      const correctWeight = parseCorrectWeight(item.name);
      
      if (correctWeight !== 'Not specified') {
        await storage.updateItem(item.id, { weight: correctWeight });
        console.log(`Fixed weight for item ${item.id}: "${item.name}" -> "${correctWeight}" (was: "${item.weight}")`);
        updatedCount++;
      }
    }
    
    console.log(`Weight fix completed: ${updatedCount} items updated`);
    return {
      success: true,
      totalItems: items.length,
      itemsUpdated: updatedCount,
      message: `Successfully corrected weight data for ${updatedCount} items`
    };
    
  } catch (error) {
    console.error('Error fixing weight data:', error);
    return {
      success: false,
      error: 'Failed to fix weight data'
    };
  }
}