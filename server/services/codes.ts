/**
 * Utility functions for generating unique codes
 */
import { storage } from "../storage";
import crypto from 'crypto';

/**
 * Generate a random alphanumeric code
 * 
 * @param length Length of the code to generate
 * @returns Random alphanumeric string
 */
function generateRandomCode(length: number): string {
  // Characters to use in the code (alphanumeric without ambiguous characters)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  // Generate a random buffer and use it to select characters
  const randomBuffer = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    // Use modulo to ensure we stay within the character set
    const index = randomBuffer[i] % chars.length;
    code += chars.charAt(index);
  }
  
  return code;
}

/**
 * Check if an affiliate code already exists
 * 
 * @param code The code to check
 * @returns True if the code already exists, false otherwise
 */
async function affiliateCodeExists(code: string): Promise<boolean> {
  try {
    const affiliate = await storage.getAffiliateByCode(code);
    return !!affiliate;
  } catch (error) {
    console.error('Error checking if affiliate code exists:', error);
    return false;
  }
}

/**
 * Check if a QR code already exists
 * 
 * @param code The code to check
 * @returns True if the code already exists, false otherwise
 */
async function qrCodeExists(code: string): Promise<boolean> {
  try {
    const qrCode = await storage.getQrCodeByCode(code);
    return !!qrCode;
  } catch (error) {
    console.error('Error checking if QR code exists:', error);
    return false;
  }
}

/**
 * Generate a unique code that doesn't exist in the database
 * 
 * @param length Length of the code to generate
 * @param type Type of code to generate ('affiliate' or 'qrcode')
 * @returns A unique code
 */
export async function generateUniqueCode(length: number, type: 'affiliate' | 'qrcode' = 'affiliate'): Promise<string> {
  let isUnique = false;
  let code = '';
  
  // Safety counter to prevent infinite loops
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    code = generateRandomCode(length);
    
    if (type === 'affiliate') {
      isUnique = !(await affiliateCodeExists(code));
    } else {
      isUnique = !(await qrCodeExists(code));
    }
    
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error(`Failed to generate a unique ${type} code after multiple attempts`);
  }
  
  return code;
}