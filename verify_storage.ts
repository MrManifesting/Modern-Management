import { storage } from './server/storage';

async function verify() {
  try {
    console.log('Fetching inventory summary...');
    const summary = await storage.getInventorySummary();
    console.log('Summary:', summary);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verify();
