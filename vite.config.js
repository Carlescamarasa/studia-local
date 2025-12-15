import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
        manualChunks: (id) => {
          // React core - siempre separado
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          // Recharts es muy grande, separarlo
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          // Agrupar Radix UI (muchos componentes pequeños)
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui';
          }
          // Agrupar utilidades comunes
          if (id.includes('node_modules/date-fns') ||
            id.includes('node_modules/clsx') ||
            id.includes('node_modules/tailwind-merge') ||
            id.includes('node_modules/class-variance-authority')) {
            return 'utils';
          }
          // Agrupar framer-motion
          if (id.includes('node_modules/framer-motion')) {
            return 'framer';
          }
          // Agrupar react-router
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          // Agrupar @tanstack/react-query
          if (id.includes('node_modules/@tanstack')) {
            return 'tanstack';
          }
          // Agrupar lucide-react (iconos)
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // Resto de node_modules en un chunk "vendor"
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1100,
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