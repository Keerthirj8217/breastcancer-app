import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isGhPages = process.env.DEPLOY_ENV === 'gh-pages';

export default defineConfig({
  base: isGhPages ? '/oncoscan-app/' : '/',
  plugins: [react()],
  build: {
    outDir: 'docs'
  }
});
