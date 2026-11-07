import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The site reads the repo's corpora, held-out set and results_*.json at build time, so every
// recorded number is imported, never typed, and the live trainer runs on the real corpus text.
export default defineConfig({
  base: '/tokenizer-lab/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
