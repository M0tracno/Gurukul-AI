import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Use the classic JSX runtime for compatibility with existing code
      jsxRuntime: 'automatic',
    }),
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },

  // Dev server configuration
  server: {
    port: 3000,
    open: true,
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },

  // Build optimization
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Code splitting for optimal loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // MUI chunk
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@mui/system'],
          // Charts chunk
          'vendor-charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          // Animation chunk
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },

  // Environment variable prefix (Vite uses VITE_ by default)
  // We also support REACT_APP_ for backward compatibility during migration
  envPrefix: ['VITE_', 'REACT_APP_'],

  // Define global constants for compatibility with CRA patterns
  define: {
    // process.env polyfill for libraries that depend on it
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },

  // Handle JSX in .js files (CRA allowed this, Vite/esbuild needs explicit config)
  // Also explicitly map .tsx/.ts for build-html plugin compatibility
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.(js|jsx|ts|tsx)$/,
    exclude: [],
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      'axios',
      'socket.io-client',
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});
