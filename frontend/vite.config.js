import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Rename the main JS entry file
        entryFileNames: '_better_markdown_anki.js',
        
        // Keep existing chunk naming for code splitting
        chunkFileNames: 'assets/[name]-[hash].js',
        
        // Updated assetFileNames using the new API
        assetFileNames: (assetInfo) => {
          // Get the first name from the names array (fallback for compatibility)
          const fileName = assetInfo.names?.[0] || 'unknown';
          
          // Check if the asset is a CSS file
          if (/\.css$/.test(fileName)) {
            return '_better_markdown_anki.css';
          }
          
          // Check if the asset is a common font type
          if (/\.(ttf|woff|woff2|eot|otf)$/.test(fileName)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          // Default behavior for other assets
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
});
