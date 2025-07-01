import { storage } from './storage.js';

// Targeted weight correction for items with pound names but incorrect weight values
export async function fixIncorrectPoundWeights() {
  console.log('Starting targeted weight fix for pound items with incorrect weights...');
  
  try {
    // Get all items
    const items = await storage.getAllItems();
    console.log(`Found ${items.length} total items`);
    
    // Find items with pound indicators in name but incorrect weight values
    const itemsToFix = items.filter((item: any) => {
      if (!item.name) return false;
      
      const nameLower = item.name.toLowerCase();
      const hasPoundInName = nameLower.includes('pound');
      
      // Check if weight field doesn't match what the name indicates
      if (hasPoundInName) {
        const correctWeight = getCorrectWeightFromName(item.name);
        return correctWeight !== item.weight;
      }
      
      return false;
    });
    
    console.log(`Found ${itemsToFix.length} items with incorrect weight values`);
    
    let fixedCount = 0;
    for (const item of itemsToFix) {
      const correctWeight = getCorrectWeightFromName(item.name);
      
      await storage.updateItem(item.id, { weight: correctWeight });
      console.log(`Fixed item ${item.id}: "${item.name}" -> weight: "${correctWeight}" (was: "${item.weight}")`);
      fixedCount++;
    }
    
    return {
      success: true,
      totalItems: items.length,
      itemsFixed: fixedCount,
      message: `Successfully fixed ${fixedCount} items with incorrect weight values`
    };
    
  } catch (error) {
    console.error('Error fixing incorrect pound weights:', error);
    return {
      success: false,
      error: 'Failed to fix incorrect pound weights'
    };
  }
}

function getCorrectWeightFromName(name: string): string {
  if (!name) return 'Not specified';
  
  const nameLower = name.toLowerCase();
  
  // Check for pound variants in parentheses
  const poundMatch = name.match(/\(([^)]*pound[^)]*)\)/i);
  if (poundMatch) {
    const weightText = poundMatch[1].toLowerCase().trim();
    
    if (weightText.includes('1 pound') || weightText === 'pound') {
      return '1 pound';
    } else if (weightText.includes('half pound') || weightText.includes('1/2 pound') || weightText.includes('0.5 pound')) {
      return 'half pound';  
    } else if (weightText.includes('quarter pound') || weightText.includes('1/4 pound') || weightText.includes('0.25 pound')) {
      return 'quarter pound';
    }
  }
  
  // Check main name for weight indicators
  if (nameLower.includes('1 pound') || nameLower.includes('one pound')) {
    return '1 pound';
  } else if (nameLower.includes('half pound') || nameLower.includes('1/2 pound') || nameLower.includes('0.5 pound')) {
    return 'half pound';
  } else if (nameLower.includes('quarter pound') || nameLower.includes('1/4 pound') || nameLower.includes('0.25 pound')) {
    return 'quarter pound';
  }
  
  return 'Not specified';
}