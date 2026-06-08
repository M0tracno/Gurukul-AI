import React from 'react';
import { createRoot } from 'react-dom/client';

import { initSentry } from './config/sentry';
import App from './App';

// Initialize Sentry as early as possible so it captures bootstrap errors.
// Sentry automatically hooks into window.onerror and unhandledrejection.
initSentry();

// Global error handler — catch errors that escape React's boundary
const handleGlobalError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn('Uncaught error:', message);
};

window.addEventListener('error', (event: ErrorEvent) => {
  handleGlobalError(event.error);
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  handleGlobalError(event.reason);
});

// Log environment on startup (dev only)
if (import.meta.env.DEV) {
  console.log('Environment:', {
    MODE: import.meta.env.MODE,
    API_URL: import.meta.env.REACT_APP_API_URL || import.meta.env.VITE_API_URL || 'not set',
  });
}

// Render the app with React 18 createRoot API and StrictMode
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Check index.html has <div id="root"></div>');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
