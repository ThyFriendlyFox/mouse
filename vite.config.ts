import { defineConfig } from 'vite';

// Relative base so Capacitor native WebViews and Electron file:// loads resolve assets correctly.
export default defineConfig({
  base: './',
});
