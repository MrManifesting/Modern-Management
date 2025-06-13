import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function quickBuild() {
  try {
    console.log('Starting optimized build for enhanced interface...');
    
    await build({
      root: resolve(__dirname),
      build: {
        outDir: 'dist/public',
        minify: false,
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: undefined
          }
        },
        chunkSizeWarningLimit: 2000
      },
      optimizeDeps: {
        force: true
      }
    });
    
    console.log('Enhanced interface build completed successfully');
  } catch (error) {
    console.error('Build error:', error);
    process.exit(1);
  }
}

quickBuild();