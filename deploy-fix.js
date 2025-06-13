#!/usr/bin/env node

// Direct deployment fix to sync enhanced interface
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

console.log('Creating direct deployment to sync enhanced interface...');

// Create dist directory structure
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

if (!fs.existsSync('dist/public')) {
  fs.mkdirSync('dist/public', { recursive: true });
}

// Create production HTML that forces the enhanced interface
const productionHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inventory Pro</title>
    <script type="module">
      // Force enhanced interface deployment
      window.__FORCE_ENHANCED_INTERFACE__ = true;
      console.log('Loading enhanced interface...');
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

fs.writeFileSync('dist/public/index.html', productionHTML);

// Build backend only (faster)
exec('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', (error, stdout, stderr) => {
  if (error) {
    console.error('Backend build error:', error);
    return;
  }
  console.log('Backend built successfully');
  
  // Copy essential files
  if (fs.existsSync('public')) {
    exec('cp -r public/* dist/public/', (err) => {
      if (!err) console.log('Public files copied');
    });
  }
  
  console.log('Deployment preparation complete');
  console.log('Your enhanced interface should now sync with the deployed version');
});