import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

// Helper to run git commands safely
function sh(cmd) {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }
}

// Build info for __APP_BUILD__ injection
const APP_BUILD = {
  versionName: process.env.VERSION_NAME || sh('git describe --tags --always') || 'dev',
  commit: sh('git rev-parse --short HEAD') || 'unknown',
  author: sh('git log -1 --pretty=format:"%an"') || 'unknown',
  buildDate: new Date().toISOString(),
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD__: JSON.stringify(APP_BUILD),
  },
  server: {
    allowedHosts: true,
    hmr: {
      overlay: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.tsx', '.jsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1600,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Desactivar modulePreload
    modulePreload: false,
    minify: 'esbuild',
    target: 'esnext',
  },
}) 