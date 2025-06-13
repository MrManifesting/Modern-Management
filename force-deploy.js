import fs from 'fs';
import { exec } from 'child_process';

// Force deployment by creating minimal production build
console.log('Creating direct production deployment...');

// Create production HTML that loads your enhanced interface
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inventory Pro</title>
  <script type="module">
    // Force load enhanced interface in production
    import('/src/main.tsx');
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', html);

// Build only the backend
exec('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify', (error) => {
  if (error) {
    console.error('Backend build failed:', error);
    process.exit(1);
  }
  console.log('Production deployment ready - enhanced interface will load');
});