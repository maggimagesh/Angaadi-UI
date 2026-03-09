import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom plugin to serve the 5MB HTML files directly
// and bypass Vite's SPA fallback
function serve5mbPagesPlugin(): Plugin {
  return {
    name: 'serve-5mb-pages',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Check if the request is for our 5mb pages
        if (!req.url) return next()
        
        const match = req.url.match(/^\/5mb-(\d+)\/?$/)
        if (match) {
          try {
            const pageNum = match[1]
            // Calculate absolute path to the generated file in public dir
            const filePath = path.resolve(__dirname, 'public', `5mb-${pageNum}`, 'index.html')
            
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath)
              res.setHeader('Content-Type', 'text/html')
              res.setHeader('Cache-Control', 'no-cache')
              res.end(content)
              return
            }
          } catch (e) {
            console.error('Error serving 5MB page:', e)
          }
        }
        next()
      })
    }
  }
}

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
    serve5mbPagesPlugin(),
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
