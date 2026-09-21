import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    host: true
  }
});
