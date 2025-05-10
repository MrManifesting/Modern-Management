
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          // Use a dynamic import function instead of top-level await
          // This will only be used in development, not in production builds
          () => ({
            name: 'cartographer-lazy',
            async configResolved() {
              if (process.env.NODE_ENV !== "production") {
                try {
                  const cartographer = await import("@replit/vite-plugin-cartographer");
                  return cartographer.cartographer();
                } catch (e) {
                  console.warn("Failed to load cartographer plugin:", e);
                }
              }
            }
          })
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
