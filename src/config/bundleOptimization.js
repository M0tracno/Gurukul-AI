      importFunc().catch(error => {

/**
 * Webpack Bundle Optimization Configuration - Phase 1
 * Advanced optimization strategies for production builds
 */

const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { GenerateSW } = require('workbox-webpack-plugin');

/**
 * Enhanced webpack configuration for optimal bundle performance
 */
const createOptimizedConfig = (isProduction) => ({
  // Optimization configuration
  optimization: {
    minimize: isProduction,
    minimizer: [
      // JavaScript minification with advanced options
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: isProduction,
            drop_debugger: isProduction,
            pure_getters: true,
            unsafe: true,
            unsafe_comps: true,
            unsafe_Function: true,
            unsafe_math: true,
            unsafe_symbols: true,
            unsafe_methods: true,
            unsafe_arrows: true,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
        extractComments: false,
      }),
      
      // CSS minification
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],

    // Advanced code splitting
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunks for better caching
        vendor: {
          test: /[\/]node_modules[\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all',
          enforce: true,
        },
        
        // React and related libraries
        react: {
          test: /[\/]node_modules[\/](react|react-dom|react-router|react-router-dom)[\/]/,
          name: 'react',
          priority: 20,
          chunks: 'all',
          enforce: true,
        },
        
        // Material-UI components
        mui: {
          test: /[\/]node_modules[\/]@mui[\/]/,
          name: 'mui',
          priority: 15,
          chunks: 'all',
          enforce: true,
        },
        
        // Common utilities
        utils: {
          test: /[\/]src[\/]utils[\/]/,
          name: 'utils',
          priority: 5,
          chunks: 'all',
          minChunks: 2,
        },
        
        // Common components
        components: {
          test: /[\/]src[\/]components[\/]/,
          name: 'components',
          priority: 5,
          chunks: 'all',
          minChunks: 2,
        },
        
        // Default chunk
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },

    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime',
    },

    // Module concatenation for better tree shaking
    concatenateModules: true,
    
    // Side effects optimization
    sideEffects: false,
  },

  // Performance budgets and hints
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000, // 500KB
    assetFilter: (assetFilename) => {
      return !assetFilename.endsWith('.map');
    },
  },

  // Resolve optimizations
  resolve: {
    // Module resolution optimization
    modules: [
      path.resolve(__dirname, 'src'),
      'node_modules',
    ],
    
    // Extension resolution order
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    
    // Alias for commonly used modules
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@theme': path.resolve(__dirname, 'src/theme'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
    
    // Symlinks resolution
    symlinks: false,
  },

  // Module rules optimization
  module: {
    rules: [
      // Tree shaking for CSS modules
      {
        test: /\.css$/,
        sideEffects: false,
      },
      
      // Optimize image loading
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB
          },
        },
        generator: {
          filename: 'static/media/[name].[hash:8][ext]',
        },
      },
      
      // Font optimization
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },

  // Production plugins
  plugins: isProduction ? [
    // Gzip compression
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),

    // Brotli compression
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        level: 11,
      },
      threshold: 8192,
      minRatio: 0.8,
    }),

    // Service Worker for caching
    new GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^/_/, //[^/?]+\.[^/]+$/],
      runtimeCaching: [
        {
          urlPattern: /^https://fonts\.googleapis\.com/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets',
          },
        },
        {
          urlPattern: /^https://fonts\.gstatic\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
      ],
    }),

    // Bundle analyzer (conditionally)
    ...(process.env.ANALYZE_BUNDLE ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'bundle-report.html',
        openAnalyzer: false,
      })
    ] : []),
  ] : [],

  // Development optimizations
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  
  // Cache configuration for faster rebuilds
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
});

/**
 * Tree shaking configuration for better dead code elimination
 */
const treeShakingConfig = {
  // Mark package.json sideEffects
  sideEffects: [
    '**/*.css',
    '**/*.scss',
    '**/*.sass',
    '**/*.less',
    '**/polyfills.js',
  ],
  
  // Babel preset env configuration for tree shaking
  babel: {
    presets: [
      [
        '@babel/preset-env',
        {
          modules: false, // Let webpack handle modules for tree shaking
          useBuiltIns: 'usage',
          corejs: 3,
          targets: {
            browsers: ['> 1%', 'last 2 versions', 'not ie <= 11'],
          },
        },
      ],
      '@babel/preset-react',
    ],
    plugins: [
      // Import optimization
      [
        'babel-plugin-import',
        {
          libraryName: '@mui/material',
          libraryDirectory: '',
          camel2DashComponentName: false,
        },
        'core',
      ],
      [
        'babel-plugin-import',
        {
          libraryName: '@mui/icons-material',
          libraryDirectory: '',
          camel2DashComponentName: false,
        },
        'icons',
      ],
    ],
  },
};

/**
 * Performance monitoring webpack plugin
 */
class PerformanceMonitoringPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('PerformanceMonitoringPlugin', (stats) => {
      const { time, assets, chunks } = stats.toJson();
      
      console.log('\n📊 Build Performance Report:');
      console.log(`⏱️  Build Time: ${time}ms`);
      console.log(`📦 Total Assets: ${assets.length}`);
      console.log(`🧩 Total Chunks: ${chunks.length}`);
      
      // Calculate total bundle size
      const totalSize = assets.reduce((acc, asset) => acc + asset.size, 0);
      console.log(`📏 Total Bundle Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Identify large assets
      const largeAssets = assets
        .filter(asset => asset.size > 100 * 1024) // > 100KB
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);
      
      if (largeAssets.length > 0) {
        console.log('\n🔍 Large Assets (>100KB):');
        largeAssets.forEach(asset => {
          console.log(`   ${asset.name}: ${(asset.size / 1024).toFixed(2)}KB`);
        });
      }
      
      // Performance warnings
      if (totalSize > 5 * 1024 * 1024) { // > 5MB
        console.warn('⚠️  Bundle size is quite large. Consider code splitting.');
      }
      
      if (time > 30000) { // > 30 seconds
        console.warn('⚠️  Build time is slow. Consider optimizing webpack config.');
      }
      
      console.log('');
    });
  }
}

/**
 * Code splitting utilities
 */
const codeSplittingUtils = {
  // Dynamic import wrapper with error handling
  lazyImport: (importFunc, fallback = null) => {
    return React.lazy(() => 
        console.error('Code splitting error:', error);
        return fallback ? { default: fallback } : Promise.reject(error);
      })
    );
  },
  
  // Preload critical chunks
  preloadChunk: (chunkName) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = `/${chunkName}`;
    document.head.appendChild(link);
  },
    // Route-based code splitting
  createRouteComponent: (importFunc, options = {}) => {
    const Component = React.lazy(importFunc);
    
    return (props) => {
      const fallback = options.fallback || React.createElement('div', null, 'Loading...');
      return React.createElement(
        React.Suspense,
        { fallback },
        React.createElement(Component, props)
      );
    };
  },
};

module.exports = {
  createOptimizedConfig,
  treeShakingConfig,
  PerformanceMonitoringPlugin,
  codeSplittingUtils,
};

