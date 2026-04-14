import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/breastcancer-app/',
  plugins: [react()],
  build: {
    outDir: 'docs'
  }
});
