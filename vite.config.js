// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', '@supabase/supabase-js'],
  },
  // Merged build settings to disable minification for debugging
  build: {
    minify: false, 
    target: 'esnext'
  },
  server: {
    port: 5174,
    proxy: {
      // Proxy /auth/* requests to Express backend
      '/auth': {
        target: 'http://localhost:3000', // Your Express server port
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Keep /auth prefix
      },
      // Optional: Proxy API calls
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
