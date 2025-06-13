import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const algorithm = 'aes-256-ctr';

// Use a combination of environment variable and static salt for key derivation
const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

async function deriveKey(password: string): Promise<Buffer> {
  const salt = Buffer.from('inventory-credentials-salt', 'utf8');
  return (await scryptAsync(password, salt, 32)) as Buffer;
}

export async function encrypt(text: string): Promise<string> {
  const key = await deriveKey(ENCRYPTION_PASSWORD);
  const iv = randomBytes(16);
  
  const cipher = createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export async function decrypt(encryptedText: string): Promise<string> {
  const key = await deriveKey(ENCRYPTION_PASSWORD);
  
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = createDecipheriv(algorithm, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function encryptCredentials(credentials: any): Promise<string> {
  return encrypt(JSON.stringify(credentials));
}

export async function decryptCredentials(encryptedData: string): Promise<any> {
  const decryptedText = await decrypt(encryptedData);
  return JSON.parse(decryptedText);
}