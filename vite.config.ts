import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Set by CI to deploy under a sub-path (GitHub Pages project site).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  // three.js plus the UI is ~1 MB; the 11 MB OpenSCAD worker loads on its own.
  build: { chunkSizeWarningLimit: 1500 },
  server: { host: '0.0.0.0', port: 3000, strictPort: true },
  preview: { host: '0.0.0.0', port: 3000, strictPort: true },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Each render spins up OpenSCAD's WASM build.
    testTimeout: 30_000,
  },
});
