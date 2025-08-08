// Simplified config-overrides.js for testing startup performance
module.exports = function override(config, env) {
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';
  // Add crypto polyfill for speakeasy package
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    url: require.resolve('url/'),
    process: require.resolve('process/browser.js'),
    path: require.resolve('path-browserify'),
    os: require.resolve('os-browserify/browser'),
    vm: require.resolve('vm-browserify'),
    fs: false,
    net: false,
    tls: false,
  };
  
  // Add process and Buffer polyfills
  const webpack = require('webpack');
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    })
  );
  
  // Fix webpack-dev-server deprecation warnings
  if (isDevelopment && config.devServer) {
    // Remove deprecated options and replace with setupMiddlewares
    delete config.devServer.onBeforeSetupMiddleware;
    delete config.devServer.onAfterSetupMiddleware;
    
    config.devServer.setupMiddlewares = (middlewares, devServer) => {
      return middlewares;
    };
  }

  // Enhanced development configuration for faster startup
  if (isDevelopment) {
    // Faster rebuilds with persistent caching
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: require('path').resolve(__dirname, 'node_modules/.cache/webpack'),
    };
    
    // Optimize development server for faster startup
    config.devServer = {
      ...config.devServer,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      // Faster hot reload
      hot: true,
      liveReload: false,
      // Reduce memory usage
      compress: false,
      // Faster initial build
      watchFiles: {
        paths: ['src/**/*'],
        options: {
          usePolling: false,
        },
      },
    };
    
    // Faster source maps for development
    config.devtool = 'eval-cheap-module-source-map';
    
    // Reduce bundle analysis overhead in development
    config.stats = 'minimal';
  }
  
  return config;
};
