import { MemStorage } from './server/storage';

async function verify() {
  try {
    const storage = new MemStorage();
    console.log('Fetching inventory summary from MemStorage...');
    const summary = await storage.getInventorySummary();
    console.log('Summary:', summary);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verify();
