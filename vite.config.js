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
          // React y React Router - chunk separado (debe cargarse primero)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          
          // Recharts - chunk separado (librería de gráficos grande e independiente)
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          
          // Supabase y React Query - chunk de datos
          if (id.includes('node_modules/@supabase') || id.includes('node_modules/@tanstack/react-query')) {
            return 'data-vendor';
          }
          
          // Utilidades grandes
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/zod') || id.includes('node_modules/lucide-react')) {
            return 'utils-vendor';
          }
          
          // React Hook Form y validadores
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
            return 'forms-vendor';
          }
          
          // Framer Motion - chunk separado (puede ser grande)
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }
          
          // Radix UI y otras dependencias de UI juntas para evitar problemas de inicialización
          // Incluimos Radix UI en el vendor principal para evitar dependencias circulares
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor';
          }
          
          // Otras dependencias de node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Asegurar que los chunks se generen con nombres consistentes
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000, // Aumentar el límite a 1MB para evitar warnings innecesarios
    // Asegurar que CommonJS se maneje correctamente
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}) 