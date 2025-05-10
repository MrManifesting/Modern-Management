/**
 * Inventory Breakdown Service
 * 
 * This service handles the breakdown of bulk items into smaller items
 */

import { 
  Item, 
  InsertItem, 
  BreakdownTarget, 
  InsertProductBreakdown,
  ProductBreakdown,
  ProcessingStatus,
  ItemType,
  BreakdownStatus
} from '@shared/schema';
import { IStorage } from '../storage';
import { generateBarcodeData } from './barcode';
import { generateQRCodeDataURL } from './qrcode';
import { log } from '../vite';

/**
 * Calculate the price per unit based on the original bulk item
 * 
 * @param bulkItem The original bulk item
 * @param weight The weight of the smaller item
 * @param bulkWeight The weight of the bulk item
 * @returns The calculated price per unit
 */
export function calculatePricePerUnit(bulkItem: Item, weight: number, bulkWeight: number): number {
  // Calculate the price per unit weight
  if (!bulkWeight || bulkWeight <= 0) {
    throw new Error('Bulk weight must be greater than zero');
  }
  
  const ratio = weight / bulkWeight;
  const basePrice = bulkItem.basePrice * ratio;
  
  // Round to 2 decimal places
  return Math.round(basePrice * 100) / 100;
}

/**
 * Generate a SKU for a breakdown item
 * 
 * @param bulkItem The original bulk item
 * @param weight The weight of the breakdown item
 * @param index The index of the breakdown item in the batch
 * @returns The generated SKU
 */
export function generateBreakdownSKU(bulkItem: Item, weight: number, index: number): string {
  const date = new Date();
  const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  return `${bulkItem.sku}-${weight}-${index}-${timestamp}`;
}

/**
 * Create a breakdown of a bulk item into smaller items
 * 
 * @param storage The storage instance
 * @param bulkItemId The ID of the bulk item
 * @param employeeId The ID of the employee creating the breakdown
 * @param breakdownTargets The target breakdown items to create
 * @returns The created product breakdown record
 */
export async function createBulkBreakdown(
  storage: IStorage,
  bulkItemId: number,
  employeeId: number,
  breakdownTargets: BreakdownTarget[]
): Promise<ProductBreakdown> {
  // Get the bulk item
  const bulkItem = await storage.getItem(bulkItemId);
  
  if (!bulkItem) {
    throw new Error(`Bulk item with ID ${bulkItemId} not found`);
  }
  
  // Validate the bulk item is marked as a bulk item
  if (bulkItem.itemType !== ItemType.BULK) {
    throw new Error('Item must be marked as a bulk item to be broken down');
  }
  
  // Create a record of the breakdown process
  const breakdown: InsertProductBreakdown = {
    bulkItemId,
    employeeId,
    status: ProcessingStatus.WAITING,
    targetProducts: breakdownTargets,
    startedAt: new Date()
  };
  
  const createdBreakdown = await storage.createProductBreakdown(breakdown);
  
  // Mark the bulk item as being in the breakdown process
  await storage.updateItem(bulkItemId, {
    breakdownStatus: BreakdownStatus.IN_PROGRESS
  });
  
  return createdBreakdown;
}

/**
 * Process and complete a bulk item breakdown
 * 
 * @param storage The storage instance
 * @param breakdownId The ID of the breakdown to process
 * @param targets Optional array of target products to override existing targets
 * @param employeeId Optional employee ID performing the breakdown
 * @returns The updated breakdown record with created items
 */
export async function processBreakdown(
  storage: IStorage,
  breakdownId: number,
  targets?: BreakdownTarget[],
  employeeId?: number
): Promise<ProductBreakdown | undefined> {
  // Get the breakdown record
  const breakdown = await storage.getProductBreakdown(breakdownId);
  
  if (!breakdown) {
    return undefined;
  }
  
  // Verify the breakdown is in a valid state to process
  if (breakdown.status === ProcessingStatus.COMPLETED) {
    return undefined;
  }
  
  // Get the bulk item
  const bulkItem = await storage.getItem(breakdown.bulkItemId);
  
  if (!bulkItem) {
    return undefined;
  }
  
  // If employeeId is provided, update the breakdown record
  if (employeeId) {
    await storage.updateProductBreakdown(breakdownId, { employeeId });
  }
  
  // Update status to in-progress
  await storage.updateProductBreakdown(breakdownId, {
    status: ProcessingStatus.IN_PROGRESS
  });
  
  // Use the provided targets or the existing ones
  const targetProducts = targets || (breakdown.targetProducts as BreakdownTarget[]);
  
  // Calculate the total weight of all breakdown items
  const totalBreakdownWeight = targetProducts.reduce(
    (sum, target) => sum + (target.weight * target.quantity), 
    0
  );
  
  // Validate the total weight does not exceed the bulk item weight
  const bulkWeight = bulkItem.weight || 0;
  if (bulkWeight > 0 && totalBreakdownWeight > bulkWeight) {
    throw new Error(`Total breakdown weight (${totalBreakdownWeight}) exceeds bulk item weight (${bulkWeight})`);
  }
  
  // Process each target product
  const completedProducts = [];
  const updatedTargets = [...targetProducts];
  
  for (let i = 0; i < updatedTargets.length; i++) {
    const target = updatedTargets[i];
    
    // Calculate price based on weight ratio
    const price = calculatePricePerUnit(bulkItem, target.weight, bulkWeight);
    
    // Create each quantity as a separate item
    for (let j = 0; j < target.quantity; j++) {
      // Generate SKU for the new item
      const sku = target.sku || generateBreakdownSKU(bulkItem, target.weight, j);
      
      // Create new item data
      const itemData: InsertItem = {
        name: `${target.name || bulkItem.name} (${target.weight}${target.weightUnit})`,
        description: bulkItem.description,
        sku,
        barcode: generateBarcodeData(sku),
        basePrice: target.price || price,
        costPrice: bulkItem.costPrice ? (bulkItem.costPrice * (target.weight / bulkWeight)) : undefined,
        category: bulkItem.category,
        subcategory: bulkItem.subcategory,
        quantity: 1,
        weight: target.weight,
        weightUnit: target.weightUnit,
        itemType: ItemType.BREAKDOWN,
        status: 'active',
        parentItemId: bulkItem.id,
        breakdownStatus: BreakdownStatus.BREAKDOWN,
        sourceItemId: bulkItem.id,
        attributes: bulkItem.attributes,
        tags: bulkItem.tags,
        dimensions: bulkItem.dimensions,
        brand: bulkItem.brand,
        marketplace: bulkItem.marketplace,
        condition: bulkItem.condition,
        images: bulkItem.images,
        videos: bulkItem.videos
      };
      
      // Create the new item
      try {
        const createdItem = await storage.createItem(itemData);
        
        // Generate and add QR code
        const qrCode = await generateQRCodeDataURL(createdItem);
        const updatedItem = await storage.updateItem(createdItem.id, { qrCode });
        
        // Update the target with the created item ID
        updatedTargets[i].resultItemId = createdItem.id;
        updatedTargets[i].status = ProcessingStatus.COMPLETED;
        
        // Add to completed products list (just the IDs)
        if (updatedItem) {
          completedProducts.push(updatedItem.id);
        }
      } catch (error) {
        console.error('Error creating breakdown item:', error);
        updatedTargets[i].status = 'error';
      }
    }
  }
  
  // Update the bulk item quantity
  // If we've used all the bulk item, mark it as used
  let newBulkStatus = bulkItem.breakdownStatus;
  let newBulkQuantity = bulkItem.quantity;
  
  if (bulkItem.quantity <= 1) {
    newBulkStatus = BreakdownStatus.COMPLETED;
    newBulkQuantity = 0;
  } else {
    newBulkQuantity = bulkItem.quantity - 1;
  }
  
  // Update the bulk item
  await storage.updateItem(bulkItem.id, {
    breakdownStatus: newBulkStatus,
    quantity: newBulkQuantity
  });
  
  // Update the breakdown record
  const updatedBreakdown = await storage.updateProductBreakdown(breakdownId, {
    status: ProcessingStatus.COMPLETED,
    targetProducts: updatedTargets,
    completedProducts: completedProducts,
    completedAt: new Date()
  });
  
  return updatedBreakdown;
}

/**
 * Generate standard breakdown targets based on common weight divisions
 * 
 * @param bulkItem The bulk item to generate targets for
 * @returns An array of standard breakdown targets
 */
export function generateStandardBreakdownTargets(bulkItem: Item): BreakdownTarget[] {
  if (!bulkItem.weight || bulkItem.weight <= 0) {
    throw new Error('Bulk item must have a weight greater than zero');
  }
  
  const bulkWeight = bulkItem.weight;
  const unit = bulkItem.weightUnit || 'g';
  
  // Standard proportions (could be configured per product category)
  let divisions: number[];
  
  if (unit === 'g' || unit === 'ml') {
    // For grams or milliliters - divide by appropriate increments
    if (bulkWeight >= 1000) {
      divisions = [500, 250, 100, 50, 25];
    } else if (bulkWeight >= 500) {
      divisions = [250, 100, 50, 25, 10];
    } else if (bulkWeight >= 250) {
      divisions = [100, 50, 25, 10, 5];
    } else if (bulkWeight >= 100) {
      divisions = [50, 25, 10, 5, 1];
    } else {
      divisions = [bulkWeight / 2, bulkWeight / 4, bulkWeight / 5, bulkWeight / 10];
    }
  } else if (unit === 'kg' || unit === 'l') {
    // For kilograms or liters
    if (bulkWeight >= 10) {
      divisions = [5, 2, 1, 0.5, 0.25];
    } else if (bulkWeight >= 5) {
      divisions = [2, 1, 0.5, 0.25, 0.1];
    } else {
      divisions = [1, 0.5, 0.25, 0.1, 0.05];
    }
  } else if (unit === 'oz' || unit === 'lb') {
    // For ounces or pounds (imperial)
    if (unit === 'lb' && bulkWeight >= 5) {
      divisions = [2, 1, 0.5, 0.25, 0.125];
    } else {
      divisions = [bulkWeight / 2, bulkWeight / 4, bulkWeight / 8];
    }
  } else {
    // Default divisions if unit not recognized
    divisions = [bulkWeight / 2, bulkWeight / 4, bulkWeight / 5, bulkWeight / 10];
  }
  
  // Create breakdown targets
  return divisions
    .filter(weight => weight > 0 && weight < bulkWeight) // Ensure weights are valid
    .map(weight => {
      // Round to 2 decimal places
      const roundedWeight = Math.round(weight * 100) / 100;
      
      // Calculate quantity (how many can we make from the bulk item)
      const maxQuantity = Math.floor(bulkWeight / roundedWeight);
      const suggestedQuantity = Math.min(maxQuantity, 10); // Default suggestion of up to 10
      
      // Calculate price per unit
      const price = calculatePricePerUnit(bulkItem, roundedWeight, bulkWeight);
      
      return {
        name: `${bulkItem.name} (${roundedWeight}${unit})`,
        weight: roundedWeight,
        weightUnit: unit,
        quantity: suggestedQuantity,
        price,
        status: ProcessingStatus.WAITING
      };
    });
}