import { db } from './db';
import { eq, and, or, like } from 'drizzle-orm';
import { items } from '@shared/schema';

async function analyzeBadImports() {
  console.log('Analyzing remaining problematic imports...\n');
  
  try {
    // Get all items still with $30 price
    const problematicItems = await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.sale_price, 30),
          or(
            eq(items.category, 'Shopify Import'),
            eq(items.category, 'Imported')
          )
        )
      );
    
    // Categorize the problems
    const categories = {
      htmlContent: [],
      defaultTitle: [],
      fragments: [],
      concentrates: [],
      validProducts: [],
      other: []
    };
    
    for (const item of problematicItems) {
      const name = item.name;
      const nameLower = name.toLowerCase();
      
      // HTML content
      if (name.includes('<') || name.includes('>')) {
        categories.htmlContent.push(item);
      }
      // Default titles
      else if (name === 'Default Title' || name === 'Title') {
        categories.defaultTitle.push(item);
      }
      // Text fragments (sentences or descriptions)
      else if (name.includes('strain') || name.includes('genetics') || 
               name.includes('ensure') || name.includes('class=') ||
               name.length > 100) {
        categories.fragments.push(item);
      }
      // Concentrates/extracts (might be legitimate)
      else if (nameLower.includes('crumble') || nameLower.includes('concentrate') ||
               nameLower.includes('wax') || nameLower.includes('shatter')) {
        categories.concentrates.push(item);
      }
      // Count variations
      else if (nameLower.includes('count') && (nameLower.includes('tube') || nameLower.includes('pack'))) {
        categories.other.push(item);
      }
      // Potentially valid products
      else {
        categories.validProducts.push(item);
      }
    }
    
    // Report findings
    console.log(`Total items with $30 price: ${problematicItems.length}\n`);
    
    console.log(`HTML Content (${categories.htmlContent.length} items) - Should be deleted:`);
    categories.htmlContent.slice(0, 5).forEach(item => console.log(`  - ${item.name.substring(0, 50)}...`));
    if (categories.htmlContent.length > 5) console.log(`  ... and ${categories.htmlContent.length - 5} more`);
    
    console.log(`\nDefault Titles (${categories.defaultTitle.length} items) - Should be deleted:`);
    console.log(`  - All are "Default Title" entries`);
    
    console.log(`\nText Fragments (${categories.fragments.length} items) - Should be deleted:`);
    categories.fragments.slice(0, 5).forEach(item => console.log(`  - ${item.name.substring(0, 50)}...`));
    if (categories.fragments.length > 5) console.log(`  ... and ${categories.fragments.length - 5} more`);
    
    console.log(`\nConcentrates (${categories.concentrates.length} items) - Need price review:`);
    categories.concentrates.slice(0, 5).forEach(item => console.log(`  - ${item.name}`));
    if (categories.concentrates.length > 5) console.log(`  ... and ${categories.concentrates.length - 5} more`);
    
    console.log(`\nPotentially Valid Products (${categories.validProducts.length} items) - Need manual review:`);
    categories.validProducts.slice(0, 10).forEach(item => console.log(`  - ${item.name}`));
    if (categories.validProducts.length > 10) console.log(`  ... and ${categories.validProducts.length - 10} more`);
    
    // Provide recommendations
    console.log('\n\nRECOMMENDATIONS:');
    console.log(`1. Delete ${categories.htmlContent.length + categories.defaultTitle.length + categories.fragments.length} items that are clearly bad data`);
    console.log(`2. Review and reprice ${categories.concentrates.length} concentrate items`);
    console.log(`3. Manually review ${categories.validProducts.length} items that might be legitimate products`);
    
    return categories;
  } catch (error) {
    console.error('Error analyzing imports:', error);
    throw error;
  }
}

// Delete clearly bad data
async function deleteBadImports() {
  console.log('\nDeleting bad import data...');
  
  try {
    // Delete HTML content
    const htmlDeleted = await db
      .delete(items)
      .where(
        and(
          eq(items.sale_price, 30),
          or(
            like(items.name, '%<%'),
            like(items.name, '%>%')
          )
        )
      );
    
    // Delete Default Titles
    const defaultDeleted = await db
      .delete(items)
      .where(
        and(
          eq(items.sale_price, 30),
          eq(items.name, 'Default Title')
        )
      );
    
    console.log('Deletion complete!');
    
    return { htmlDeleted, defaultDeleted };
  } catch (error) {
    console.error('Error deleting bad imports:', error);
    throw error;
  }
}

// Run analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBadImports()
    .then(async (categories) => {
      console.log('\nWould you like to delete the bad data? (This will remove HTML content and Default Titles)');
      
      // Auto-proceed with deletion for this script
      await deleteBadImports();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { analyzeBadImports, deleteBadImports };