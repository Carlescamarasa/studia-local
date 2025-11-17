import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
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
          // React y React DOM - DEBE cargarse primero, en su propio chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          
          // React Router - depende de React, pero separado
          if (id.includes('node_modules/react-router')) {
            return 'react-router';
          }
          
          // Recharts - librería grande e independiente
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          
          // Supabase y React Query - chunk de datos
          if (id.includes('node_modules/@supabase') || id.includes('node_modules/@tanstack/react-query')) {
            return 'data-vendor';
          }
          
          // Utilidades grandes pero independientes
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/zod')) {
            return 'utils-vendor';
          }
          
          // Lucide React - iconos (puede ser grande)
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          
          // React Hook Form y validadores
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
            return 'forms-vendor';
          }
          
          // Framer Motion - animaciones (puede ser grande)
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }
          
          // Radix UI - mantener todos juntos para evitar problemas de inicialización
          // PERO asegurar que se carga después de React
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui';
          }
          
          // Otras dependencias de node_modules - vendor general
          // Esto incluye cosas como sonner, cmdk, @hello-pangea/dnd, etc.
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Asegurar que los módulos se resuelvan correctamente
    modulePreload: {
      polyfill: true,
    },
  },
}) 