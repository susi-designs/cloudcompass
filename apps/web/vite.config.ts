/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Carbon's Sass references IBM Plex fonts with the webpack-style `~` prefix.
    alias: [{ find: /^~(@ibm\/plex.*)$/, replacement: '$1' }],
  },
  server: { port: 5173, strictPort: true },
  css: {
    preprocessorOptions: {
      scss: { quietDeps: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
