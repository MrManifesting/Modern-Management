import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const algorithm = 'aes-256-ctr';

// Use environment variables for both encryption key and salt
const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_KEY;
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT;

if (!ENCRYPTION_PASSWORD || !ENCRYPTION_SALT) {
  throw new Error('ENCRYPTION_KEY and ENCRYPTION_SALT environment variables are required for production use');
}

async function deriveKey(password: string): Promise<Buffer> {
  const salt = Buffer.from(ENCRYPTION_SALT, 'hex');
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