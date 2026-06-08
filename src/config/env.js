/**
 * Environment Variable Compatibility Layer
 * 
 * Provides a unified interface for environment variables that works
 * with both CRA (process.env.REACT_APP_*) and Vite (import.meta.env.VITE_*).
 * 
 * During the migration period, this module bridges both patterns.
 * After full migration, all code should use `env.VARIABLE_NAME` from this module.
 */

// Helper to get env var from either Vite or CRA format
function getEnv(name) {
  // Try Vite format first (import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Try VITE_ prefix
    const viteKey = `VITE_${name}`;
    if (import.meta.env[viteKey] !== undefined) {
      return import.meta.env[viteKey];
    }
    // Try REACT_APP_ prefix (Vite supports this via envPrefix config)
    const craKey = `REACT_APP_${name}`;
    if (import.meta.env[craKey] !== undefined) {
      return import.meta.env[craKey];
    }
    // Try direct name
    if (import.meta.env[name] !== undefined) {
      return import.meta.env[name];
    }
  }
  
  return undefined;
}

/**
 * Centralized environment configuration.
 * Import this instead of using process.env or import.meta.env directly.
 */
const env = {
  // App config
  NODE_ENV: import.meta.env.MODE || 'development',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  
  // API URLs
  API_URL: getEnv('API_URL') || 'http://localhost:5000',
  SOCKET_URL: getEnv('SOCKET_URL') || 'ws://localhost:5000',
  
  // AI Services
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY') || '',
  VERTEX_API_KEY: getEnv('VERTEX_API_KEY') || '',
  GCP_PROJECT_ID: getEnv('GCP_PROJECT_ID') || '',
  
  // Google Cloud Storage
  GOOGLE_CLOUD_STORAGE_BUCKET_MAIN: getEnv('GOOGLE_CLOUD_STORAGE_BUCKET_MAIN') || '',
  GOOGLE_CLOUD_STORAGE_BUCKET_MEDIA: getEnv('GOOGLE_CLOUD_STORAGE_BUCKET_MEDIA') || '',
  
  // Feature flags
  USE_MOCK_SERVICES: getEnv('USE_MOCK_SERVICES') === 'true',
  USE_MOCK_DATA: getEnv('USE_MOCK_DATA') === 'true',
  ENABLE_LOGGING: getEnv('ENABLE_LOGGING') === 'true',
  DEBUG_MODE: getEnv('DEBUG_MODE') === 'true',
  ENABLE_ANALYTICS: getEnv('ENABLE_ANALYTICS') === 'true',
  ENABLE_PERFORMANCE_MONITORING: getEnv('ENABLE_PERFORMANCE_MONITORING') === 'true',
  
  // Error reporting
  SENTRY_DSN: getEnv('SENTRY_DSN') || '',
  ERROR_REPORTING_ENDPOINT: getEnv('ERROR_REPORTING_ENDPOINT') || '',
  PERFORMANCE_ENDPOINT: getEnv('PERFORMANCE_ENDPOINT') || '',
  VERSION: getEnv('VERSION') || '1.0.0',
};

export default env;
