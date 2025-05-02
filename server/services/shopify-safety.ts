/**
 * Shopify Safety Service
 * 
 * This service provides additional safety mechanisms and logging for Shopify operations
 * to prevent accidental product publishing and track all Shopify API interactions.
 */

import { log } from '../vite';
import fs from 'fs';
import path from 'path';
import { pushEnabled } from './shopify';

// Constants
const SAFETY_LOG_DIR = './logs';
const SAFETY_LOG_FILE = path.join(SAFETY_LOG_DIR, 'shopify-operations.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// Safety modes
export enum ShopifySafetyMode {
  NORMAL = 'normal',     // Regular operation with push enabled/disabled check
  STRICT = 'strict',     // Requires confirmation for each operation
  READONLY = 'readonly', // Only allows read operations, no modifications
  DISABLED = 'disabled'  // Completely blocks all Shopify API calls
}

// Current safety settings
let currentSafetyMode: ShopifySafetyMode = ShopifySafetyMode.NORMAL;
let confirmationRequiredForItems = true;
let lastConfirmationTime = 0;
const CONFIRMATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Initialize the log directory
try {
  if (!fs.existsSync(SAFETY_LOG_DIR)) {
    fs.mkdirSync(SAFETY_LOG_DIR, { recursive: true });
  }
} catch (error) {
  log(`Failed to create Shopify safety log directory: ${error}`, 'shopify-safety');
}

/**
 * Log a Shopify operation with timestamp and details
 */
export function logShopifyOperation(
  operation: string,
  details: any,
  successful: boolean,
  errorMessage?: string
): void {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      operation,
      details,
      successful,
      errorMessage,
      safetyMode: currentSafetyMode,
      pushEnabled: pushEnabled()
    };
    
    const logString = JSON.stringify(logEntry) + '\n';
    
    // Check if log file exists and is not too large
    let shouldAppend = true;
    try {
      if (fs.existsSync(SAFETY_LOG_FILE)) {
        const stats = fs.statSync(SAFETY_LOG_FILE);
        if (stats.size > MAX_LOG_SIZE) {
          // Create a backup of the old log
          const backupFile = `${SAFETY_LOG_FILE}.${timestamp.replace(/:/g, '-')}.bak`;
          fs.renameSync(SAFETY_LOG_FILE, backupFile);
          shouldAppend = false;
        }
      }
    } catch (error) {
      log(`Error checking log file: ${error}`, 'shopify-safety');
    }
    
    // Write the log entry
    fs.appendFileSync(SAFETY_LOG_FILE, logString);
    
    // Also log to console
    log(`SHOPIFY ${successful ? 'SUCCESS' : 'FAILED'}: ${operation}`, 'shopify-safety');
  } catch (error) {
    log(`Failed to log Shopify operation: ${error}`, 'shopify-safety');
  }
}

/**
 * Check if an operation is allowed based on current safety settings
 */
export function isOperationAllowed(operation: 'read' | 'create' | 'update' | 'delete'): boolean {
  switch (currentSafetyMode) {
    case ShopifySafetyMode.DISABLED:
      return false;
    
    case ShopifySafetyMode.READONLY:
      return operation === 'read';
    
    case ShopifySafetyMode.STRICT:
    case ShopifySafetyMode.NORMAL:
      if (operation === 'read') return true;
      
      // For write operations, check if push is enabled
      return pushEnabled();
  }
}

/**
 * Set the current safety mode
 */
export function setSafetyMode(mode: ShopifySafetyMode): { 
  mode: ShopifySafetyMode;
  message: string;
} {
  currentSafetyMode = mode;
  
  logShopifyOperation(
    'setSafetyMode',
    { newMode: mode },
    true
  );
  
  return {
    mode: currentSafetyMode,
    message: `Shopify safety mode set to ${mode}`
  };
}

/**
 * Get the current safety mode
 */
export function getSafetyMode(): { 
  mode: ShopifySafetyMode;
  confirmationRequired: boolean;
  message: string;
} {
  return {
    mode: currentSafetyMode,
    confirmationRequired: confirmationRequiredForItems,
    message: `Current Shopify safety mode: ${currentSafetyMode}. Confirmation required: ${confirmationRequiredForItems}`
  };
}

/**
 * Set whether confirmation is required for item operations
 */
export function setConfirmationRequired(required: boolean): {
  confirmationRequired: boolean;
  message: string;
} {
  confirmationRequiredForItems = required;
  
  logShopifyOperation(
    'setConfirmationRequired',
    { required },
    true
  );
  
  return {
    confirmationRequired,
    message: `Confirmation requirement for Shopify operations set to: ${required}`
  };
}

/**
 * Check if a confirmation is still valid based on timeout
 */
export function isConfirmationValid(): boolean {
  const now = Date.now();
  return (now - lastConfirmationTime) < CONFIRMATION_TIMEOUT;
}

/**
 * Confirm an operation for the specified timeout period
 */
export function confirmOperation(): {
  confirmed: boolean;
  expiresAt: Date;
  message: string;
} {
  lastConfirmationTime = Date.now();
  const expiresAt = new Date(lastConfirmationTime + CONFIRMATION_TIMEOUT);
  
  logShopifyOperation(
    'confirmOperation',
    { expiresAt },
    true
  );
  
  return {
    confirmed: true,
    expiresAt,
    message: `Shopify operations confirmed until ${expiresAt.toISOString()}`
  };
}

/**
 * Create a detailed report of all Shopify operations
 */
export function getOperationsReport(): {
  operations: any[];
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
} {
  try {
    if (!fs.existsSync(SAFETY_LOG_FILE)) {
      return {
        operations: [],
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0
      };
    }
    
    const content = fs.readFileSync(SAFETY_LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const operations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    }).filter(Boolean);
    
    const successfulOperations = operations.filter(op => op.successful).length;
    
    return {
      operations,
      totalOperations: operations.length,
      successfulOperations,
      failedOperations: operations.length - successfulOperations
    };
  } catch (error) {
    log(`Failed to generate operations report: ${error}`, 'shopify-safety');
    return {
      operations: [],
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0
    };
  }
}

/**
 * Clear confirmation status
 */
export function clearConfirmation(): {
  message: string;
} {
  lastConfirmationTime = 0;
  
  logShopifyOperation(
    'clearConfirmation',
    {},
    true
  );
  
  return {
    message: 'Shopify operation confirmation cleared'
  };
}