import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.jsx'),
      name: 'BetterMarkdownAnki',
      formats: ['iife'],
      fileName: () => '_better_markdown_anki_mobile.js',
      cssFileName: '_better_markdown_anki_mobile',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] || assetInfo.name || 'unknown';
          if (/\.css$/.test(name)) return '_better_markdown_anki_mobile.css';
          return '_better_markdown_anki_[name]-[hash][extname]';
        },
      },
    },
  },
});
