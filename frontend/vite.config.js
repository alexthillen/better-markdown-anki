import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '_better_markdown_anki.js',
        chunkFileNames: '_better_markdown_anki_chunk_[name]-[hash].js',
        
        assetFileNames: (assetInfo) => {
          const fileName = assetInfo.names?.[0] || assetInfo.name || 'unknown';
          if (/\.css$/.test(fileName)) {
            return '_better_markdown_anki.css';
          }
          if (/\.(ttf|woff|woff2|eot|otf)$/.test(fileName)) {
            return `_better_markdown_anki_[name]-[hash][extname]`;
          }
          return `_better_markdown_anki_[name]-[hash][extname]`;
        },
        
        // Simpler, safer chunking
        manualChunks: {
          // Keep React ecosystem together to avoid dependency issues
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries (less likely to have circular deps)
          'ui-libs': [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/form',
            '@mantine/code-highlight',
            '@mantine/dates',
            '@mantine/dropzone',
            '@mantine/notifications'
          ],
          
          // Content processing
          'content-libs': [
            'react-markdown',
            'remark-math',
            'rehype-katex',
            'rehype-raw',
            'rehype-sanitize',
            'react-syntax-highlighter'
          ],
          
          // Icons and visual assets
          'visual-libs': ['@tabler/icons-react', 'react-icons']
        }
      },
    },
  },
});
