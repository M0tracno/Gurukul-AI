/// <reference types="vite/client" />

interface ImportMetaEnv {
  // App config
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;

  // AI Services
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_VERTEX_API_KEY: string;
  readonly VITE_GCP_PROJECT_ID: string;

  // Error Reporting
  readonly VITE_SENTRY_DSN: string;

  // Feature flags
  readonly VITE_USE_MOCK_SERVICES: string;
  readonly VITE_ENABLE_LOGGING: string;
  readonly VITE_DEBUG_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
