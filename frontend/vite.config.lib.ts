import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.lib.ts'),
      name: 'StampVue',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'stampvue.mjs' : 'stampvue.umd.js')
    },
    rollupOptions: {
      // 確保 UMD 打包時輸出正確全域物件
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'stampvue.css';
          }
          return '[name][extname]';
        }
      }
    }
  }
});
