import { build } from 'vite';
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Creating deployment-ready build...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Run frontend build
  console.log('Building frontend...');
  await build({
    root: 'client',
    build: {
      outDir: '../dist/public',
      emptyOutDir: true,
      rollupOptions: {
        input: 'client/index.html'
      }
    }
  });

  // Build backend
  console.log('Building backend...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

  console.log('✓ Deployment build complete');
  console.log('✓ Frontend built to dist/public');
  console.log('✓ Backend built to dist/index.js');

} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}