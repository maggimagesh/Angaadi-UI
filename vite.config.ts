import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'maintained node versions'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      modernPolyfills: true,
      renderLegacyChunks: true,
      // Don't override build.target - let it be configured separately
    }),
  ],
  
  server: { 
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3300',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api/v1')
      }
    }
  },

  build: {
    // Output directory
    outDir: 'dist',
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Generate sourcemaps for debugging
    sourcemap: false,
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_debugger: true,
        pure_funcs: ['console.log'], // Only strip console.log; keep console.info/warn/error
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for better code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'state': ['zustand'],
        },
      },
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand'],
  },

  // CSS processing
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true,
  },
})
